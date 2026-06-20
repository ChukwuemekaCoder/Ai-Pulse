# `app.py` — Explained

A full walkthrough of the Flask backend, section by section.

---

## 1. Imports & App Setup — Lines 1–13

```python
import os, time, threading
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

import feedparser, requests
from flask import Flask, jsonify, render_template
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
```

| Import | Why it's here |
|---|---|
| `threading` | Run 4 HTTP requests at the same time |
| `feedparser` | Parse raw XML from RSS feeds into Python objects |
| `requests` | Make the actual HTTP GET calls to the feed URLs |
| `jsonify` | Convert Python dicts into JSON HTTP responses |
| `render_template` | Serve the `index.html` Jinja2 template |
| `CORS` | Allows the browser to call `/api/*` from any origin |

---

## 2. Feed Config — Lines 18–43

```python
FEEDS = [
    { "id": "openai", "name": "OpenAI", "url": "...", "color": "#10a37f" },
    ...
]
```

A plain list of dicts — one per company. This is the **single source of truth** for feed URLs and brand colors. Adding a new source is just appending one dict here. The `color` value flows all the way through to the badge labels in the browser.

---

## 3. Cache & Headers — Lines 45–55

```python
_cache: dict = {"items": [], "last_updated": None}
_cache_lock = threading.Lock()
CACHE_TTL = 300  # 5 minutes
```

- **`_cache`** — a simple in-memory dict that stores the last fetched article list and when it was fetched
- **`_cache_lock`** — a `threading.Lock` that prevents two requests from triggering a simultaneous refresh (a race condition). Only one thread can write to the cache at a time
- **`CACHE_TTL = 300`** — articles are considered "fresh" for 5 minutes. Change this one number to tune caching behaviour
- **`HEADERS`** — sends a descriptive `User-Agent` string so RSS servers know who's calling (some block generic or empty user agents)

---

## 4. `parse_date()` — Lines 62–82

```python
def parse_date(entry) -> datetime:
```

RSS feeds are notoriously inconsistent with date formats. This function handles that gracefully with **three fallback layers**:

1. **`published_parsed` / `updated_parsed`** — `feedparser` auto-parses the date into a `time_struct` tuple. Most feeds have this
2. **`published` / `updated` raw strings** — if the tuple isn't there, try parsing the raw date string with `parsedate_to_datetime` from Python's standard library
3. **`datetime.min`** — if no date is found at all, return the earliest possible datetime so the article sinks to the bottom of the feed rather than crashing

---

## 5. `clean_summary()` — Lines 85–92

```python
def clean_summary(text: str, max_len: int = 280) -> str:
    text = re.sub(r"<[^>]+>", "", text or "")  # strip HTML tags
    text = text.strip()
    if len(text) > max_len:
        text = text[:max_len].rsplit(" ", 1)[0] + "…"  # truncate at word boundary
    return text
```

RSS summaries often contain raw HTML (`<p>`, `<b>`, `<a>` tags). This strips all of it with a regex, then truncates to 280 characters at the nearest word boundary (no mid-word cuts). The `…` is the actual Unicode ellipsis character, not three dots.

---

## 6. `fetch_feed()` — Lines 95–127

```python
def fetch_feed(feed_cfg: dict) -> list[dict]:
```

This is the **core worker** — it fetches and processes **one** RSS feed end-to-end:

1. `requests.get(url, timeout=15)` — fetches the raw XML with a 15s timeout
2. `resp.raise_for_status()` — throws if the server returns a 4xx or 5xx error
3. `feedparser.parse(resp.text)` — turns XML into a Python object with a `.entries` list
4. Loops over every entry and builds a clean dict with exactly the fields the frontend needs
5. If **anything** fails (bad URL, timeout, malformed XML), it logs the error and returns an empty list — the other feeds still work fine

The summary field tries three locations in order: `summary` → `description` → `content[0].value`, because different RSS implementations store it differently.

### Article dict shape (what gets sent to the browser)

```json
{
  "id":            "https://openai.com/blog/gpt-5",
  "title":         "Introducing GPT-5",
  "link":          "https://openai.com/blog/gpt-5",
  "summary":       "GPT-5 is our most capable model yet...",
  "published_iso": "2026-06-15T10:00:00+00:00",
  "published_ts":  1750000000.0,
  "source_id":     "openai",
  "source_name":   "OpenAI",
  "source_color":  "#10a37f"
}
```

---

## 7. `refresh_all_feeds()` — Lines 130–150

```python
def refresh_all_feeds() -> list[dict]:
```

This is where the **concurrency** happens:

```python
for cfg in FEEDS:
    t = threading.Thread(target=worker, args=(cfg,), daemon=True)
    t.start()          # ← all 4 threads start immediately

for t in threads:
    t.join(timeout=20) # ← wait for all of them to finish (max 20s)

results.sort(key=lambda x: x["published_ts"], reverse=True)
```

- Each thread calls `fetch_feed()` independently
- The inner `lock` prevents threads from writing to `results` at the same time (list append race condition)
- `daemon=True` means if the main process dies, the threads die with it — no zombie threads
- After all threads finish, the combined list is sorted by `published_ts` (Unix timestamp) **descending** — newest article first

### Why threads beat sequential fetching

```
Sequential:  OpenAI(2s) + Anthropic(1s) + DeepMind(3s) + Mistral(1s) = ~7s total
Threaded:    max(2s, 1s, 3s, 1s)                                      = ~3s total
```

---

## 8. `get_cached_items()` — Lines 153–163

```python
def get_cached_items(force_refresh: bool = False) -> list[dict]:
    with _cache_lock:
        stale = _cache["last_updated"] is None or (now - _cache["last_updated"]) > CACHE_TTL
        if force_refresh or stale:
            _cache["items"] = refresh_all_feeds()
            _cache["last_updated"] = now
        return _cache["items"]
```

The **cache gatekeeper**. Every API call passes through here:

```
Is the cache empty or older than 5 minutes?  OR  was force_refresh=True?
    YES → fetch fresh data, update the cache, return it
    NO  → return the cached list immediately (fast path)
```

The entire block runs inside `_cache_lock` so two simultaneous requests can't both decide the cache is stale and trigger duplicate refreshes.

---

## 9. Routes — Lines 170–196

Three routes, that's it:

| Route | Method | Behaviour |
|---|---|---|
| `/` | GET | Renders `index.html`, passes `FEEDS` list for filter buttons |
| `/api/news` | GET | Returns cached JSON — fast path for normal page loads |
| `/api/news/refresh` | GET | Forces a fresh fetch regardless of cache age |

All three return the same JSON shape:

```json
{
  "items": [ ...article dicts... ],
  "last_updated": 1750000000.0,
  "count": 47
}
```

---

## 10. Startup — Lines 199–202

```python
if __name__ == "__main__":
    threading.Thread(target=get_cached_items, daemon=True).start()
    app.run(debug=True, port=5000)
```

Before the server starts accepting requests, it fires a background thread to **pre-populate the cache**. That way the very first user doesn't wait for all 4 feeds to load — they're already being fetched the moment `python3 app.py` runs.
