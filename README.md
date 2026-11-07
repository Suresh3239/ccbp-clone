# CCBP Learning — Offline Clone

A local, offline-first browser for collected CCBP course content. The UI reads course metadata from JSON files and can proxy approved CCBP media and Google Slides URLs for download.

## Features

- Course, topic, unit, and lesson browsing
- Global search, library, practice, and playground views
- Video and slide playback from collected source URLs
- CSV exports and a normalized SQLite database
- Local video download via `ffmpeg`
- Local slide-to-PDF export via the optional `ccbp_tools` renderer

## Run

```bash
python3 -m pip install -r requirements.txt
python3 serve.py
```

Open `http://127.0.0.1:8001`.

Options:

```bash
python3 serve.py --host 0.0.0.0 --port 8001
```

## Data

- `data/` — course metadata and search indexes
- `thumbs/` — course artwork
- `downloads/` — CSV exports and the normalized SQLite database
- `vendor/` — local HLS and Markdown browser helpers

## Optional Dependencies

- `ffmpeg` on `PATH` for `/download/video`
- `../ccbp_tools/render_slides.js` plus its Node dependencies for `/download/slides`

The slide downloader is disabled with a clear error if the renderer is missing.

## Download Endpoints

The local server only proxies allowlisted hosts:

- `media-content.ccbp.in` HLS videos ending in `.m3u8`
- Published Google Slides URLs under `docs.google.com/presentation/d/e/`

Both endpoints validate the URL before invoking external tools.
