#!/usr/bin/env python3
"""Resumable Bunkr -> Discord courier.

Uses bunkr_download.py for signed downloads, ffmpeg for oversized media parts,
and Discord's bot channel message endpoint for ordinary attachments.
"""
import argparse, json, mimetypes, os, re, subprocess, tempfile, time, uuid
from pathlib import Path
from urllib import request, parse, error

DISCORD = 'https://discord.com/api/v10'

def clean(name): return re.sub(r'[\\/:*?"<>|]', '_', name)[:180]

def post_file(token, channel, path, content, webhook=None):
    boundary = '----Courier' + uuid.uuid4().hex
    mime = mimetypes.guess_type(path.name)[0] or 'application/octet-stream'
    body = []
    body.append(f'--{boundary}\r\nContent-Disposition: form-data; name="payload_json"\r\nContent-Type: application/json\r\n\r\n{json.dumps({"content": content})}\r\n'.encode())
    body.append(f'--{boundary}\r\nContent-Disposition: form-data; name="files[0]"; filename="{path.name}"\r\nContent-Type: {mime}\r\n\r\n'.encode())
    body.append(path.read_bytes()); body.append(f'\r\n--{boundary}--\r\n'.encode())
    endpoint = webhook or f'{DISCORD}/channels/{parse.quote(channel)}/messages'
    headers = {'Content-Type': f'multipart/form-data; boundary={boundary}'} if webhook else {'Authorization': f'Bot {token}', 'Content-Type': f'multipart/form-data; boundary={boundary}'}
    req = request.Request(endpoint, data=b''.join(body), method='POST', headers=headers)
    try:
        with request.urlopen(req, timeout=120) as response: return response.status
    except error.HTTPError as exc: return exc.code

def split_video(source, max_mb, work):
    size = max_mb * 1024 * 1024
    if source.stat().st_size <= size: return [source]
    pattern = work / f'{source.stem}.part-%03d{source.suffix}'
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', str(source), '-c', 'copy', '-map', '0', '-f', 'segment', '-segment_time', '300', '-reset_timestamps', '1', str(pattern)], check=True)
    parts = sorted(work.glob(f'{source.stem}.part-*{source.suffix}'))
    return [p for p in parts if p.stat().st_size <= size]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--token', default=os.getenv('DISCORD_BOT_TOKEN'))
    ap.add_argument('--channels', required=True, help='comma-separated channel IDs')
    ap.add_argument('--webhooks', default='', help='comma-separated webhook execute URLs')
    ap.add_argument('--album')
    ap.add_argument('--list')
    ap.add_argument('--out', default='courier-data')
    ap.add_argument('--concurrency', type=int, default=8, help='download concurrency used by bunkr_download.py')
    ap.add_argument('--split-mb', type=int, default=10)
    args = ap.parse_args()
    if not args.token: ap.error('set --token or DISCORD_BOT_TOKEN')
    if not args.album and not args.list: ap.error('provide --album or --list')
    channels = [x.strip() for x in args.channels.split(',') if x.strip()]
    webhooks = [x.strip() for x in args.webhooks.split(',') if x.strip()]
    root, downloads, state_file = Path(args.out), Path(args.out) / 'downloads', Path(args.out) / 'done.json'
    root.mkdir(parents=True, exist_ok=True); downloads.mkdir(parents=True, exist_ok=True)
    state = json.loads(state_file.read_text()) if state_file.exists() else {}
    import bunkr_download
    targets = bunkr_download.crawl_album(args.album, None) if args.album else [x.strip() for x in Path(args.list).read_text().splitlines() if x.strip()]
    for index, target in enumerate(targets):
        if state.get(target, {}).get('status') == 'complete': continue
        status = {'status': 'downloading', 'updated': time.time()}; state[target] = status; state_file.write_text(json.dumps(state, indent=2))
        try:
            result = bunkr_download.download_one(target, downloads, 3)
            if not result.startswith('OK') and 'SKIP' not in result: raise RuntimeError(result)
            files = sorted(downloads.iterdir(), key=lambda p: p.stat().st_mtime, reverse=True)
            source = files[0]
            with tempfile.TemporaryDirectory(dir=root) as temp:
                parts = split_video(source, args.split_mb, Path(temp))
                for part_index, part in enumerate(parts):
                    code = post_file(args.token, channels[index % len(channels)], part, f'{source.stem} — part {part_index + 1}/{len(parts)}', webhooks[index % len(webhooks)] if webhooks else None)
                    if code == 429: raise RuntimeError('Discord rate limited the upload')
                    if code >= 300: raise RuntimeError(f'Discord upload failed ({code})')
            state[target] = {'status': 'complete', 'updated': time.time(), 'result': result}; state_file.write_text(json.dumps(state, indent=2)); print(f'[{index + 1}/{len(targets)}] COMPLETE {target}')
        except Exception as exc:
            state[target] = {'status': 'failed', 'updated': time.time(), 'error': str(exc)}; state_file.write_text(json.dumps(state, indent=2)); print(f'[{index + 1}/{len(targets)}] FAILED {exc}')

if __name__ == '__main__': main()
