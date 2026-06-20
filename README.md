# AI Pulse 🤖📡

> A real-time, unified AI news aggregator that merges RSS feeds from the world's leading AI labs into one clean, filterable feed.

Instead of juggling four different blogs and newsletters, AI Pulse pulls the latest announcements from **OpenAI**, **Anthropic**, **Google DeepMind**, and **Mistral AI** into a single chronological stream — refreshed on demand, filterable by company, and shareable in one click.

Built with Python Flask on the backend and plain HTML, CSS, and JavaScript on the frontend. No frontend framework, no bloat — just clean, purposeful code.

---

## ✨ Features

- **Unified Feed** — Aggregates and merges RSS feeds from four major AI companies, sorted newest-first
- **Company Filters** — Filter articles by source (OpenAI, Anthropic, DeepMind, Mistral AI) or view all at once
- **Color-Coded Labels** — Each company has a distinct badge color so you can identify sources at a glance
- **Refresh Button** — Force-pulls the latest articles with a live loading spinner; no page reload needed
- **Smart Caching** — Responses are cached for 5 minutes to avoid hammering RSS endpoints on every visit
- **Tweet Button** — Every article card has a one-click Tweet button that opens a pre-filled X/Twitter compose window (no API key required)
- **Relative Timestamps** — Publication dates display as "2h ago", "3d ago", etc., and auto-update every 60 seconds
- **Skeleton Loaders** — Shimmer placeholders shown while fetching, so the UI never feels broken
- **Responsive Design** — Works cleanly on desktop and mobile

---

## 🛠 Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Backend    | Python 3, Flask, feedparser, requests |
| Frontend   | Vanilla HTML5, CSS3, JavaScript (ES6+) |
| Styling    | Custom dark-mode design system, CSS animations |
| Fonts      | Inter (Google Fonts)                |
| Data       | RSS 2.0 / Atom feeds via `feedparser` |
| Deployment | Flask dev server (easily adaptable to Gunicorn + any cloud host) |

---

## 🚀 Getting Started

### Prerequisites

- Python 3.8+
- `pip3` available in your terminal

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/ChukwuemekaCoder/Ai-Pulse.git
cd Ai-Pulse

# 2. (Optional but recommended) Create a virtual environment
python3 -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate

# 3. Install dependencies
pip3 install -r requirements.txt

# 4. Run the app
python3 app.py
```

Then open **http://127.0.0.1:5000** in your browser.

> **Note:** The first load may take 5–10 seconds as the server fetches all four RSS feeds simultaneously. Subsequent visits are served from cache instantly.

---

## 📁 Project Structure

```
Ai-Pulse/
├── app.py               # Flask app — feed fetching, caching, API routes
├── requirements.txt     # Python dependencies
├── .gitignore
│
├── templates/
│   └── index.html       # Jinja2 HTML template
│
└── static/
    ├── style.css        # Full design system (dark mode, animations, layout)
    └── app.js           # Client-side logic (fetch, render, filter, tweet)
```

---

## 📡 Feed Sources

| Company           | RSS Feed URL |
|-------------------|-------------|
| OpenAI            | https://openai.com/news/rss.xml |
| Anthropic         | https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_anthropic_news.xml |
| Google DeepMind   | https://deepmind.google/blog/rss.xml |
| Mistral AI        | https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_mistral.xml |

---

## 🔮 Future Improvements

1. **Persistent Cache with Redis** — Replace the in-memory dict cache with Redis so the cache survives server restarts and scales across multiple workers
2. **Keyword Search** — Add a search bar to filter articles by title or summary content in real time
3. **Read / Bookmarks** — Allow users to mark articles as read or save them for later using `localStorage`
4. **More Feed Sources** — Extend to include Hugging Face, Meta AI, xAI, and other labs to broaden coverage
5. **Email Digest** — Add a scheduled job (via APScheduler or Celery) that emails a daily summary of the top stories

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<p align="center">Built by <a href="https://github.com/ChukwuemekaCoder">Chukwuemeka</a> · Powered by Flask & RSS</p>
