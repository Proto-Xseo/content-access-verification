#!/usr/bin/env python3
"""Authorized Bunkr album/file downloader using short-lived signed URLs."""

import argparse
import concurrent.futures
import json
import os
import re
import ssl
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

UA = os.environ.get("UA", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36")
API_META = os.environ.get("API_META", "https://bunkr.cr/api/_001_v2")
API_SIGN = os.environ.get("API_SIGN", "https://glb-apisign.cdn.cr/sign")
DEFAULT_HOST = os.environ.get("DEFAULT_HOST", "https://bunkr.cr")
CTX = ssl.create_default_context()


def request(url, *, method="GET", data=None, headers=None, timeout=60):
    merged = {"User-Agent": UA}
    if headers:
        merged.update(headers)
    body = data.encode() if isinstance(data, str) else data
    req = urllib.request.Request(url, data=body, headers=merged, method=method)
    return urllib.request.urlopen(req, timeout=timeout, context=CTX)


def text(url, **kwargs):
    try:
        with request(url, **kwargs) as response:
            return response.status, response.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as error:
        return error.code, error.read().decode("utf-8", "replace")
    except Exception:
        return None, ""


def json_get(url, **kwargs):
    status, body = text(url, **kwargs)
    if status != 200:
        return None
    try:
        return json.loads(body)
    except ValueError:
        return None


def host_from_url(url):
    parsed = urllib.parse.urlparse(url)
    return f"{parsed.scheme}://{parsed.netloc}" if parsed.scheme and parsed.netloc else DEFAULT_HOST


def crawl_album(album_url, max_pages=None):
    host = host_from_url(album_url)
    base = album_url.split("?", 1)[0]
    found, seen = [], set()
    page = 1
    while max_pages is None or page <= max_pages:
        status, html = text(f"{base}?page={page}", timeout=30)
        if status != 200:
            break
        links = re.findall(r'href=["\'](/f/[A-Za-z0-9_-]+)["\']', html)
        new = 0
        for path in links:
            if path not in seen:
                seen.add(path)
                found.append(host + path)
                new += 1
        print(f"page {page}: +{new} files (total {len(found)})")
        if not re.search(rf"[?&]page={page + 1}\\b", html):
            break
        page += 1
        time.sleep(0.25)
    return found


def file_id_from_page(file_url):
    status, html = text(file_url, timeout=30)
    if status != 200:
        return None
    match = re.search(r"/file/(\d+)", html) or re.search(r'data-file-id=["\'](\d+)["\']', html)
    return match.group(1) if match else None


def resolve_media(file_id):
    return json_get(API_META, method="POST", data=json.dumps({"id": str(file_id)}), headers={"Content-Type": "application/json"}, timeout=30)


def sign_path(path):
    return json_get(f"{API_SIGN}?path={urllib.parse.quote(path, safe='')}", timeout=30)


def media_url(meta, signed):
    base = meta["mediafiles"].rstrip("/") + meta["path"]
    query = urllib.parse.urlencode({"n": meta.get("original", ""), "token": signed["token"], "ex": signed["ex"]})
    return f"{base}?{query}"


def download_stream(url, destination):
    partial = destination.with_suffix(destination.suffix + ".part")
    with request(url, headers={"Referer": f"{DEFAULT_HOST}/"}, timeout=120) as response:
        if response.status not in (200, 206):
            return False
        with partial.open("wb") as output:
            while chunk := response.read(1 << 20):
                output.write(chunk)
    partial.replace(destination)
    return True


def download_one(file_url, out_dir, retries):
    file_id = file_id_from_page(file_url)
    if not file_id:
        return f"FAIL: no file id {file_url}"
    meta = resolve_media(file_id)
    if not meta or "path" not in meta or "mediafiles" not in meta:
        return f"FAIL: metadata unavailable {file_url}"
    filename = re.sub(r'[\\/:*?"<>|]', "_", meta.get("original") or f"{file_id}.bin")
    destination = out_dir / filename
    if destination.exists() and destination.stat().st_size > 0:
        return f"SKIP {filename}"
    for attempt in range(1, retries + 1):
        signed = sign_path(meta["path"])
        if signed and signed.get("token") and signed.get("ex"):
            try:
                if download_stream(media_url(meta, signed), destination):
                    return f"OK {filename} ({destination.stat().st_size} bytes)"
            except Exception:
                pass
        time.sleep(1.5 * attempt)
    return f"FAIL: exhausted retries {file_url}"


def main():
    parser = argparse.ArgumentParser(description="Authorized Bunkr signed-token downloader")
    parser.add_argument("urls", nargs="*", help="individual /f/ URLs")
    parser.add_argument("--album")
    parser.add_argument("--list")
    parser.add_argument("--out", default="downloads")
    parser.add_argument("--concurrency", type=int, default=3)
    parser.add_argument("--retries", type=int, default=3)
    parser.add_argument("--pages", type=int)
    parser.add_argument("--list-only", action="store_true")
    parser.add_argument("--save-list")
    args = parser.parse_args()
    targets = []
    if args.album:
        targets.extend(crawl_album(args.album, args.pages))
    if args.list:
        targets.extend(line.strip() for line in Path(args.list).read_text(encoding="utf-8").splitlines() if "/f/" in line)
    targets.extend(args.urls)
    targets = list(dict.fromkeys(targets))
    if not targets:
        parser.error("pass --album, --list, or one or more /f/ URLs")
    if args.save_list:
        Path(args.save_list).write_text("\n".join(targets) + "\n", encoding="utf-8")
    if args.list_only:
        print("\n".join(targets))
        print(f"{len(targets)} file URLs collected")
        return
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, args.concurrency)) as pool:
        futures = [pool.submit(download_one, url, out_dir, max(1, args.retries)) for url in targets]
        for index, future in enumerate(concurrent.futures.as_completed(futures), 1):
            print(f"[{index}/{len(futures)}] {future.result()}")


if __name__ == "__main__":
    main()
