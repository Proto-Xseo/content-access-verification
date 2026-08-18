#!/usr/bin/env python3
"""Resumable Bunkr -> Discord courier.

Uses bunkr_download.py for signed downloads, ffmpeg for oversized media parts,
and Discord webhooks for ordinary (non-embed) video attachments.

Writes two machine-readable files into the output directory so the web UI can
show real progress without parsing stdout:
  - done.json      per-target ledger (resume state)
  - progress.json  rolling summary {total, complete, failed, pending, current, ...}
"""
import argparse, json, mimetypes, os, re, subprocess, tempfile, threading, time, uuid
from pathlib import Path
from urllib import request, parse, error

DISCORD = 'https://discord.com/api/v10'
_lock = threading.Lock()


def clean(name):
    return re.sub(r'[\\/:*?"<>|]', '_', name)[:180]


def post_file(token, channel, path, content, webhook=None, max_attempts=6):
    """Upload one file as a normal message/attachment. Handles 429 backoff.

    Returns the final HTTP status code (200/204 = success)."""
    for attempt in range(1, max_attempts + 1):
        boundary = '----Courier' + uuid.uuid4().hex
        mime = mimetypes.guess_type(path.name)[0] or 'application/octet-stream'
        body = []
        body.append(f'--{boundary}\r\nContent-Disposition: form-data; name="payload_json"\r\nContent-Type: application/json\r\n\r\n{json.dumps({"content": content})}\r\n'.encode())
        body.append(f'--{boundary}\r\nContent-Disposition: form-data; name="files[0]"; filename="{clean(path.name)}"\r\nContent-Type: {mime}\r\n\r\n'.encode())
        body.append(path.read_bytes())
        body.append(f'\r\n--{boundary}--\r\n'.encode())
        endpoint = webhook or f'{DISCORD}/channels/{parse.quote(channel)}/messages'
        headers = {'Content-Type': f'multipart/form-data; boundary={boundary}'}
        if not webhook:
            headers['Authorization'] = f'Bot {token}'
        req = request.Request(endpoint, data=b''.join(body), method='POST', headers=headers)
        try:
            with request.urlopen(req, timeout=300) as response:
                return response.status
        except error.HTTPError as exc:
            if exc.code == 429:
                try:
                    retry_after = float(json.loads(exc.read().decode()).get('retry_after', 2))
                except Exception:
                    retry_after = 2.0
                time.sleep(min(retry_after + 0.5, 30))
                continue
            if exc.code >= 500:
                time.sleep(1.5 * attempt)
                continue
            return exc.code
        except Exception:
            time.sleep(1.5 * attempt)
    return 429


def media_duration(source):
    # ffprobe's format=duration is unreliable on some builds; parse ffmpeg -i,
    # which consistently reports "Duration: HH:MM:SS.ss".
    try:
        out = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(source)], capture_output=True, text=True, timeout=60)
        match = re.search(r'Duration:\s*(\d+):(\d+):(\d+\.?\d*)', out.stderr)
        if match:
            hours, minutes, seconds = match.groups()
            return int(hours) * 3600 + int(minutes) * 60 + float(seconds)
    except Exception:
        pass
    try:
        out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', str(source)], capture_output=True, text=True, timeout=60)
        return float(out.stdout.strip())
    except Exception:
        return 0.0


def _reencode_to_fit(source, max_mb, work):
    """Last resort: re-encode into time segments small enough to fit the limit."""
    limit = max_mb * 1024 * 1024
    duration = media_duration(source) or 60.0
    # target bitrate so a segment of `seg` seconds fits; pick 8s segments.
    seg = 8
    target_bits = int((limit * 0.85) * 8 / seg)
    target_k = max(200, target_bits // 1000)
    pattern = work / f'{source.stem}.renc-%03d{source.suffix}'
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', str(source),
                    '-c:v', 'libx264', '-b:v', f'{target_k}k', '-preset', 'veryfast',
                    '-c:a', 'aac', '-b:a', '96k', '-f', 'segment', '-segment_time', str(seg),
                    '-reset_timestamps', '1', str(pattern)], check=True)
    return sorted(work.glob(f'{source.stem}.renc-*{source.suffix}'))


def split_video(source, max_mb, work):
    """Split a file that exceeds max_mb into playable parts sized to fit.

    First tries fast stream-copy segmenting sized from the file's own bitrate.
    If any resulting part is still over the limit (keyframe spacing), those are
    re-encoded down. Never silently drops data."""
    limit = max_mb * 1024 * 1024
    total = source.stat().st_size
    if total <= limit:
        return [source]
    duration = media_duration(source)
    if duration > 0:
        bytes_per_second = total / duration
        segment_time = max(3, int((limit * 0.9) / bytes_per_second))
    else:
        segment_time = 30
    pattern = work / f'{source.stem}.part-%03d{source.suffix}'
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', str(source), '-c', 'copy', '-map', '0',
                    '-f', 'segment', '-segment_time', str(segment_time), '-reset_timestamps', '1', str(pattern)], check=True)
    parts = sorted(work.glob(f'{source.stem}.part-*{source.suffix}'))
    if not parts:
        parts = [source]
    if any(p.stat().st_size > limit for p in parts):
        try:
            reencoded = _reencode_to_fit(source, max_mb, work)
            if reencoded and all(p.stat().st_size <= limit for p in reencoded):
                return reencoded
        except Exception:
            pass
    return parts


def write_progress(root, progress):
    with _lock:
        progress['updated'] = time.time()
        (root / 'progress.json').write_text(json.dumps(progress, indent=2))


def save_state(state_file, state, target, value):
    with _lock:
        state[target] = value
        state_file.write_text(json.dumps(state, indent=2))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--token', default=os.getenv('DISCORD_BOT_TOKEN'))
    ap.add_argument('--channels', required=True, help='comma-separated channel IDs')
    ap.add_argument('--webhooks', default='', help='comma-separated webhook execute URLs')
    ap.add_argument('--album')
    ap.add_argument('--list')
    ap.add_argument('--out', default='courier-data')
    ap.add_argument('--concurrency', type=int, default=4)
    ap.add_argument('--split-mb', type=int, default=10)
    ap.add_argument('--limit', type=int, default=0, help='cap number of files (0 = all); useful for testing')
    args = ap.parse_args()
    if not args.token:
        ap.error('set --token or DISCORD_BOT_TOKEN')
    if not args.album and not args.list:
        ap.error('provide --album or --list')

    channels = [x.strip() for x in args.channels.split(',') if x.strip()]
    webhooks = [x.strip() for x in args.webhooks.split(',') if x.strip()]
    root = Path(args.out)
    downloads = root / 'downloads'
    state_file = root / 'done.json'
    root.mkdir(parents=True, exist_ok=True)
    downloads.mkdir(parents=True, exist_ok=True)
    state = json.loads(state_file.read_text()) if state_file.exists() else {}

    import bunkr_download
    if args.album:
        targets = bunkr_download.crawl_album(args.album, None)
    else:
        targets = [x.strip() for x in Path(args.list).read_text().splitlines() if x.strip()]
    if args.limit > 0:
        targets = targets[:args.limit]

    progress = {'total': len(targets), 'complete': 0, 'failed': 0, 'pending': 0, 'current': '', 'started': time.time(), 'last_error': ''}
    for value in state.values():
        if value.get('status') == 'complete':
            progress['complete'] += 1
        elif value.get('status') == 'failed':
            progress['failed'] += 1
    progress['pending'] = len(targets) - progress['complete'] - progress['failed']
    write_progress(root, progress)

    def handle(index, target):
        if state.get(target, {}).get('status') == 'complete':
            return
        save_state(state_file, state, target, {'status': 'downloading', 'updated': time.time()})
        with _lock:
            progress['current'] = target
        try:
            result = bunkr_download.resolve_download(target, downloads, 3)
            if not result['ok'] or not result['path']:
                raise RuntimeError(result['message'])
            source = result['path']
            channel = channels[index % len(channels)] if channels else ''
            webhook = webhooks[index % len(webhooks)] if webhooks else None
            with tempfile.TemporaryDirectory(dir=root) as temp:
                parts = split_video(source, args.split_mb, Path(temp))
                for part_index, part in enumerate(parts):
                    label = source.stem if len(parts) == 1 else f'{source.stem} — part {part_index + 1}/{len(parts)}'
                    code = post_file(args.token, channel, part, label, webhook)
                    if code not in (200, 204):
                        raise RuntimeError(f'Discord upload failed ({code})')
            save_state(state_file, state, target, {'status': 'complete', 'updated': time.time(), 'result': result['message']})
            with _lock:
                progress['complete'] += 1
                progress['pending'] = max(0, len(targets) - progress['complete'] - progress['failed'])
            write_progress(root, progress)
            print(f'[{progress["complete"]}/{len(targets)}] COMPLETE {target}', flush=True)
        except Exception as exc:
            save_state(state_file, state, target, {'status': 'failed', 'updated': time.time(), 'error': str(exc)})
            with _lock:
                progress['failed'] += 1
                progress['pending'] = max(0, len(targets) - progress['complete'] - progress['failed'])
                progress['last_error'] = str(exc)
            write_progress(root, progress)
            print(f'FAILED {target}: {exc}', flush=True)

    import concurrent.futures
    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, args.concurrency)) as pool:
        list(pool.map(lambda pair: handle(*pair), list(enumerate(targets))))

    with _lock:
        progress['current'] = ''
    write_progress(root, progress)
    print(f'DONE complete={progress["complete"]} failed={progress["failed"]}', flush=True)


if __name__ == '__main__':
    main()
