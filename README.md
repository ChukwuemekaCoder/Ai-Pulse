# AI Pulse 🤖📡

> A real-time, unified AI news aggregator that merges RSS feeds from the world's leading AI labs into one clean, filterable feed.



Instead of juggling four different blogs and newsletters, AI Pulse pulls the latest announcements from **OpenAI**, **Anthropic**, **Google DeepMind**, and **Mistral AI** into a single chronological stream — refreshed on demand, filterable by company, and shareable in one click.

Built with Python Flask on the backend and plain HTML, CSS, and JavaScript on the frontend. No frontend framework, no bloat — just clean, purposeful code.

---

## ✨ Features

- **Unified Feed** — Aggregates and merges RSS feeds from four major AI companies, sorted newest-first.
- **Company Filters & Keyword Search** — Filter articles by source or use the instant search input bar to match keywords across titles and summaries.
- **Light & Dark Mode** — Clean, animated, glassmorphic layout switcher which persists via `localStorage`.
- **Toast Alert System** — Non-blocking notifications for feed refreshes, clipboard copies, and CSV exports.
- **Read Tracker** — Dim-opacity styling indicators persist articles marked as read using browser memory.
- **Accurate Read Time Heuristics** — Backend word count analysis estimates reading times, incorporating custom lab length defaults.
- **CSV Export Utility** — One-click download of all visible/filtered articles to UTF-8 encoded spreadsheets.
- **Clipboard & Tweet Intent Sharing** — Instant card detail extraction and pre-populated X/Twitter posting.
- **Relative Timestamps** — Refresh dates display dynamically ("5m ago") and update in real-time.
- **Skeleton Loading State** — Shimmer screen layouts visually notify users of fetching status.

---

## 🛠 Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Backend    | Python 3, Flask, feedparser, requests |
| Frontend   | Vanilla HTML5, CSS3, JavaScript (ES6+) |
| Styling    | Custom adaptive design system, CSS animations |
| Fonts      | Inter (Google Fonts)                |
| Data       | RSS 2.0 / Atom feeds via `feedparser` |
| Deployment | Vercel Serverless Functions (Python runtime) |

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
├── vercel.json          # Serverless deployment configuration
├── .gitignore
│
├── templates/
│   └── index.html       # Jinja2 HTML template
│
└── static/
    ├── style.css        # Adaptive layout styles (dark/light, toast overlays, scroll actions)
    └── app.js           # Client-side controls (toasts, filtering, local search, bookmarks)
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

1. **Persistent Cache with Redis** — Replace the in-memory dict cache with Redis so the cache survives serverless instance recycles and spans multiple workers.
2. **More Feed Sources** — Extend to include Hugging Face, Meta AI, xAI, and other labs to broaden coverage.
3. **Email Digest** — Add a scheduled job (via APScheduler or Celery) that emails a daily summary of the top stories.
4. **Push Notifications** — Implement web push protocols alerting users of immediate hot AI research launches.

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<p align="center">Built by <a href="https://github.com/ChukwuemekaCoder">Chukwuemeka</a> · Powered by Flask & RSS</p>
