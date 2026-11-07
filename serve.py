#!/usr/bin/env python3
import argparse
import functools
import http.server
import json
import os
import re
import shutil
import signal
import socketserver
import subprocess
import tempfile
import threading
import urllib.parse
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent
TOOLS = ROOT.parent / "ccbp_tools"
RENDER_SCRIPT = TOOLS / "render_slides.js"
FFMPEG = shutil.which("ffmpeg") or "/data/data/com.termux/files/usr/bin/ffmpeg"
NODE = shutil.which("node") or "node"
TMP_ROOT = Path(os.environ.get("CCBP_TMP", str(Path(tempfile.gettempdir()) / "ccbp-downloads")))
SLIDES_LOCK = threading.Semaphore(1)
SLIDE_PATH_RE = re.compile(r"^/presentation/d/e/2PACX-[A-Za-z0-9_-]+/(?:pub|pubembed)$")


def safe_name(value, fallback):
    name = re.sub(r"[\x00-\x1f\x7f/\\:*?\"<>|]+", "_", str(value or "")).strip(" ._")
    name = re.sub(r"\s+", " ", name)[:140]
    return name or fallback


def attachment(name):
    ascii_name = re.sub(r"[^A-Za-z0-9._ -]+", "_", name).strip(" ._") or "download"
    encoded = urllib.parse.quote(name, safe="")
    return f'attachment; filename="{ascii_name}"; filename*=UTF-8\'\'{encoded}'


def parse_target(raw, host, suffix, prefixes=()):
    if not raw:
        raise ValueError("missing url")
    parsed = urllib.parse.urlsplit(raw)
    if parsed.scheme != "https" or parsed.hostname != host:
        raise ValueError("unsupported host")
    path = parsed.path.rstrip("/")
    if suffix and not path.lower().endswith(suffix):
        raise ValueError("unsupported path")
    if prefixes and not any(path.startswith(prefix) for prefix in prefixes):
        raise ValueError("unsupported path")
    return urllib.parse.urlunsplit(parsed)


def render_slide_images(url, out_dir, max_slides):
    if not RENDER_SCRIPT.is_file():
        raise RuntimeError("slide renderer is missing")
    cmd = [NODE, str(RENDER_SCRIPT), "--url", url, "--out", str(out_dir)]
    if max_slides:
        cmd.extend(["--max", str(max_slides)])
    proc = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        start_new_session=True,
    )
    try:
        stdout, stderr = proc.communicate(timeout=1800)
    except subprocess.TimeoutExpired:
        os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
        stdout, stderr = proc.communicate()
        raise RuntimeError("slide rendering timed out")
    if proc.returncode != 0:
        detail = (stderr or stdout or "").strip()
        raise RuntimeError(detail[-2000:] or "slide renderer failed")
    return sorted(out_dir.glob("slide-*.png"))


def images_to_pdf(files, pdf_path):
    images = []
    try:
        for file in files:
            image = Image.open(file)
            image.load()
            images.append(image.convert("RGB"))
        if not images:
            raise RuntimeError("no slides were rendered")
        images[0].save(
            pdf_path,
            "PDF",
            resolution=150.0,
            save_all=True,
            append_images=images[1:],
        )
    finally:
        for image in images:
            image.close()


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        print(f"{self.address_string()} {fmt % args}", flush=True)

    def send_text(self, status, message):
        body = (message.rstrip() + "\n").encode("utf-8", "replace")
        self.send_response(status)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Connection", "close")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = urllib.parse.urlsplit(self.path)
        if parsed.path == "/download/video":
            self.download_video(parsed)
        elif parsed.path == "/download/slides":
            self.download_slides(parsed)
        else:
            super().do_GET()

    def download_video(self, parsed):
        query = urllib.parse.parse_qs(parsed.query)
        try:
            url = parse_target(
                (query.get("url") or [""])[0],
                "media-content.ccbp.in",
                ".m3u8",
            )
            name = safe_name((query.get("name") or [""])[0], "ccbp-video")
            if not name.lower().endswith(".mp4"):
                name += ".mp4"
        except ValueError as error:
            self.send_text(400, str(error))
            return

        cmd = [
            FFMPEG,
            "-nostdin",
            "-hide_banner",
            "-loglevel", "error",
            "-i", url,
            "-c", "copy",
            "-movflags", "frag_keyframe+empty_moov",
            "-f", "mp4",
            "pipe:1",
        ]
        with tempfile.TemporaryFile() as errors:
            proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=errors, bufsize=0)
            first = proc.stdout.read(65536)
            if not first:
                proc.wait()
                errors.seek(0)
                detail = errors.read().decode("utf-8", "replace").strip()
                self.send_text(502, detail[-1000:] or "video stream could not be prepared")
                return
            self.send_response(200)
            self.send_header("Content-Type", "video/mp4")
            self.send_header("Content-Disposition", attachment(name))
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Connection", "close")
            self.end_headers()
            try:
                self.wfile.write(first)
                while True:
                    chunk = proc.stdout.read(65536)
                    if not chunk:
                        break
                    self.wfile.write(chunk)
            except (BrokenPipeError, ConnectionResetError):
                pass
            finally:
                if proc.poll() is None:
                    proc.terminate()
                try:
                    proc.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    proc.kill()
                    proc.wait()

    def download_slides(self, parsed):
        query = urllib.parse.parse_qs(parsed.query)
        try:
            url = parse_target(
                (query.get("url") or [""])[0],
                "docs.google.com",
                "",
                ("/presentation/d/e/",),
            )
            path = urllib.parse.urlsplit(url).path.rstrip("/")
            if not SLIDE_PATH_RE.fullmatch(path):
                raise ValueError("unsupported slides path")
            name = safe_name((query.get("name") or [""])[0], "ccbp-slides")
            if not name.lower().endswith(".pdf"):
                name += ".pdf"
            max_slides = int((query.get("max") or ["0"])[0])
            if max_slides < 0 or max_slides > 250:
                raise ValueError("invalid slide limit")
        except (ValueError, TypeError) as error:
            self.send_text(400, str(error))
            return

        TMP_ROOT.mkdir(parents=True, exist_ok=True)
        work_dir = Path(tempfile.mkdtemp(prefix="ccbp-slides-", dir=TMP_ROOT))
        try:
            with SLIDES_LOCK:
                files = render_slide_images(url, work_dir, max_slides)
                pdf_path = work_dir / "slides.pdf"
                images_to_pdf(files, pdf_path)
            size = pdf_path.stat().st_size
            self.send_response(200)
            self.send_header("Content-Type", "application/pdf")
            self.send_header("Content-Length", str(size))
            self.send_header("Content-Disposition", attachment(name))
            self.send_header("X-Content-Type-Options", "nosniff")
            self.end_headers()
            with pdf_path.open("rb") as pdf:
                shutil.copyfileobj(pdf, self.wfile)
        except (RuntimeError, OSError, ValueError) as error:
            self.send_text(502, str(error))
        finally:
            shutil.rmtree(work_dir, ignore_errors=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=8001)
    args = ap.parse_args()
    handler = functools.partial(Handler, directory=str(ROOT))
    socketserver.ThreadingTCPServer.allow_reuse_address = True
    socketserver.ThreadingTCPServer.daemon_threads = True
    with socketserver.ThreadingTCPServer((args.host, args.port), handler) as httpd:
        print(f"CCBP clone: http://{args.host}:{args.port}", flush=True)
        httpd.serve_forever()


if __name__ == "__main__":
    main()
