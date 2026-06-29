import os
import time
import threading
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

import feedparser
import requests
from flask import Flask, jsonify, render_template
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ──────────────────────────────────────────────────────────────
# Feed configuration
# ──────────────────────────────────────────────────────────────
FEEDS = [
    {
        "id": "openai",
        "name": "OpenAI",
        "url": "https://openai.com/news/rss.xml",
        "color": "#10a37f",
    },
    {
        "id": "anthropic",
        "name": "Anthropic",
        "url": "https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_anthropic_news.xml",
        "color": "#c96442",
    },
    {
        "id": "deepmind",
        "name": "DeepMind",
        "url": "https://deepmind.google/blog/rss.xml",
        "color": "#4285f4",
    },
    {
        "id": "mistral",
        "name": "Mistral AI",
        "url": "https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_mistral.xml",
        "color": "#f97316",
    },
]

# Simple in‑memory cache
_cache: dict = {"items": [], "last_updated": None}
_cache_lock = threading.Lock()
CACHE_TTL = 300  # seconds

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; AINewsAggregator/1.0; "
        "+https://github.com/example/ai-news)"
    )
}


# ──────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────

def parse_date(entry) -> datetime:
    """Return a timezone-aware datetime from an RSS entry."""
    # feedparser gives us a time_struct in 'published_parsed' or 'updated_parsed'
    for attr in ("published_parsed", "updated_parsed"):
        ts = getattr(entry, attr, None)
        if ts:
            try:
                dt = datetime(*ts[:6], tzinfo=timezone.utc)
                return dt
            except Exception:
                pass
    # Fallback: try raw string
    for attr in ("published", "updated"):
        raw = getattr(entry, attr, None)
        if raw:
            try:
                return parsedate_to_datetime(raw)
            except Exception:
                pass
    # No date found – put at the bottom
    return datetime.min.replace(tzinfo=timezone.utc)


def clean_summary(text: str, max_len: int = 280) -> str:
    """Strip HTML tags and truncate."""
    import re
    text = re.sub(r"<[^>]+>", "", text or "")
    text = text.strip()
    if len(text) > max_len:
        text = text[:max_len].rsplit(" ", 1)[0] + "…"
    return text


def fetch_feed(feed_cfg: dict) -> list[dict]:
    """Fetch and parse a single RSS feed, returning a list of item dicts."""
    import re
    items = []
    try:
        resp = requests.get(feed_cfg["url"], headers=HEADERS, timeout=15)
        resp.raise_for_status()
        parsed = feedparser.parse(resp.text)
        for entry in parsed.entries:
            pub_dt = parse_date(entry)
            
            # Find the longest available raw content from the feed to calculate read time
            summary_raw = (
                getattr(entry, "summary", "")
                or getattr(entry, "description", "")
                or getattr(entry, "content", [{}])[0].get("value", "")
                if hasattr(entry, "content") and entry.content
                else ""
            )
            
            # Attempt to get full content block for word count estimation
            full_content_raw = ""
            if hasattr(entry, "content") and entry.content:
                full_content_raw = getattr(entry, "content", [{}])[0].get("value", "")
            if not full_content_raw:
                full_content_raw = getattr(entry, "description", "") or getattr(entry, "summary", "")
            
            # Clean HTML to estimate actual text word count
            cleaned_full_text = re.sub(r"<[^>]+>", "", full_content_raw or "")
            word_count = len(cleaned_full_text.split())
            
            # Heuristic calculation:
            # Corporate/Research AI blog posts average ~200 words per minute.
            # If the RSS feed entry contains only an abstract/summary (< 150 words),
            # we apply a realistic post-length heuristic based on the company's typical blog post length.
            if word_count > 150:
                read_time = max(1, round(word_count / 200))
            else:
                # Fallback heuristics for truncated feed descriptions
                heuristics = {
                    "openai": 4,      # OpenAI announcements are usually 3-5 mins read
                    "anthropic": 7,   # Anthropic posts/research papers are usually longer (6-8 mins)
                    "deepmind": 6,    # DeepMind research blogs are dense (~5-7 mins)
                    "mistral": 4      # Mistral releases are medium length (~3-5 mins)
                }
                read_time = heuristics.get(feed_cfg["id"], 4)
            
            items.append(
                {
                    "id": getattr(entry, "id", entry.get("link", "")),
                    "title": getattr(entry, "title", "Untitled"),
                    "link": getattr(entry, "link", "#"),
                    "summary": clean_summary(summary_raw),
                    "published_iso": pub_dt.isoformat(),
                    "published_ts": pub_dt.timestamp(),
                    "source_id": feed_cfg["id"],
                    "source_name": feed_cfg["name"],
                    "source_color": feed_cfg["color"],
                    "read_time": read_time,
                }
            )
    except Exception as exc:
        app.logger.error("Failed to fetch %s: %s", feed_cfg["name"], exc)
    return items


def refresh_all_feeds() -> list[dict]:
    """Fetch all feeds concurrently and merge into a sorted list."""
    results: list[dict] = []
    threads = []
    lock = threading.Lock()

    def worker(cfg):
        data = fetch_feed(cfg)
        with lock:
            results.extend(data)

    for cfg in FEEDS:
        t = threading.Thread(target=worker, args=(cfg,), daemon=True)
        threads.append(t)
        t.start()

    for t in threads:
        t.join(timeout=20)

    results.sort(key=lambda x: x["published_ts"], reverse=True)
    return results


def get_cached_items(force_refresh: bool = False) -> list[dict]:
    with _cache_lock:
        now = time.time()
        stale = (
            _cache["last_updated"] is None
            or (now - _cache["last_updated"]) > CACHE_TTL
        )
        if force_refresh or stale:
            _cache["items"] = refresh_all_feeds()
            _cache["last_updated"] = now
        return _cache["items"]


# ──────────────────────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html", feeds=FEEDS)


@app.route("/api/news")
def api_news():
    items = get_cached_items()
    return jsonify(
        {
            "items": items,
            "last_updated": _cache["last_updated"],
            "count": len(items),
        }
    )


@app.route("/api/news/refresh")
def api_news_refresh():
    items = get_cached_items(force_refresh=True)
    return jsonify(
        {
            "items": items,
            "last_updated": _cache["last_updated"],
            "count": len(items),
        }
    )


if __name__ == "__main__":
    # Warm up cache on startup
    threading.Thread(target=get_cached_items, daemon=True).start()
    app.run(debug=True, port=5000)
