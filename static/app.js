/* ──────────────────────────────────────────────────────────────
   AI Pulse — Frontend Logic
   ────────────────────────────────────────────────────────────── */

"use strict";

// ── State ──────────────────────────────────────────────────────
let allItems   = [];
let activeFilter = "all";
let searchQuery = "";
let readArticles = JSON.parse(localStorage.getItem("readArticles") || "[]");

// Company colors (mirrors server-side config)
const COMPANY_COLORS = {
  openai:   "#10a37f",
  anthropic:"#c96442",
  deepmind: "#4285f4",
  mistral:  "#f97316",
};

// ── Helpers ────────────────────────────────────────────────────

function formatDate(isoString) {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

function relativeTime(isoString) {
  if (!isoString) return "";
  const now  = Date.now();
  const then = new Date(isoString).getTime();
  const secs = Math.floor((now - then) / 1000);
  if (secs < 60)   return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  if (secs < 604800) return `${Math.floor(secs / 86400)}d ago`;
  return formatDate(isoString);
}

function buildTweetUrl(item) {
  const text = `📰 "${item.title}" — via ${item.source_name}\n\n${item.link}`;
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function markAsRead(link, element) {
  if (!readArticles.includes(link)) {
    readArticles.push(link);
    localStorage.setItem("readArticles", JSON.stringify(readArticles));
  }
  const card = element.closest(".news-card");
  if (card) {
    card.classList.add("read");
  }
}

// ── Render ──────────────────────────────────────────────────────

function buildSkeletonHTML() {
  return `
    <div class="skeleton-card">
      <div class="sk-row"></div>
      <div class="sk-title"></div>
      <div class="sk-title2"></div>
      <div class="sk-body"></div>
      <div class="sk-body2"></div>
      <div class="sk-body3"></div>
    </div>`;
}

function buildCardHTML(item, index) {
  const color   = item.source_color || "#818cf8";
  const tweetUrl = buildTweetUrl(item);
  const delay   = Math.min(index * 35, 500);
  const isRead  = readArticles.includes(item.link);
  const readClass = isRead ? " read" : "";
  const readTime  = item.read_time ? `${item.read_time} min read` : "4 min read";

  return `
    <article class="news-card${readClass}" data-source="${escapeHtml(item.source_id)}"
             style="animation-delay:${delay}ms; --card-accent-color:${color};"
             aria-label="${escapeHtml(item.title)}">
      <div class="card-header">
        <div class="card-meta">
          <span class="source-badge" style="background:${color};">
            <span class="source-badge-dot"></span>
            ${escapeHtml(item.source_name)}
          </span>
          <time class="pub-date" datetime="${escapeHtml(item.published_iso)}"
                title="${formatDate(item.published_iso)}">
            ${relativeTime(item.published_iso)}
          </time>
          <span class="read-time-dot">•</span>
          <span class="read-time">${readTime}</span>
        </div>
      </div>

      <h2 class="card-title">
        <a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer" onclick="markAsRead('${escapeHtml(item.link)}', this)">
          ${escapeHtml(item.title)}
        </a>
      </h2>

      ${item.summary
        ? `<p class="card-summary">${escapeHtml(item.summary)}</p>`
        : ""}

      <div class="card-footer">
        <a class="read-link" href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer" onclick="markAsRead('${escapeHtml(item.link)}', this)">
          Read article <span class="read-link-arrow">→</span>
        </a>
        <div class="card-actions">
          <button class="copy-btn"
                  data-copy-title="${escapeHtml(item.title)}"
                  data-copy-source="${escapeHtml(item.source_name)}"
                  data-copy-link="${escapeHtml(item.link)}"
                  onclick="copyCard(this)"
                  title="Copy to clipboard"
                  aria-label="Copy article details">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            <span class="copy-label">Copy</span>
          </button>
          <a class="tweet-btn"
             href="${escapeHtml(tweetUrl)}"
             target="_blank"
             rel="noopener noreferrer"
             title="Share on X / Twitter"
             aria-label="Share on X">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.263 5.638L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/>
            </svg>
             Tweet
          </a>
        </div>
      </div>
    </article>`;
}

function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m
    ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) }
    : null;
}

// ── Toast Notifications ───────────────────────────────────────

function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  
  // Fade in
  setTimeout(() => toast.classList.add("show"), 10);
  
  // Fade out and remove after 3s
  setTimeout(() => {
    toast.classList.remove("show");
    toast.addEventListener("transitionend", () => toast.remove());
  }, 3000);
}

// ── Clipboard ─────────────────────────────────────────────────

function copyCard(btn) {
  const title  = btn.dataset.copyTitle;
  const source = btn.dataset.copySource;
  const link   = btn.dataset.copyLink;
  const text   = `${title}\nSource: ${source}\n${link}`;

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text)
      .then(() => showToast("Copied card details to clipboard!", "success"))
      .catch(() => showToast("Failed to copy clipboard", "error"));
  } else {
    // Fallback for non-HTTPS / older browsers
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;opacity:0;pointer-events:none;";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      if (document.execCommand("copy")) {
        showToast("Copied card details to clipboard!", "success");
      } else {
        showToast("Failed to copy clipboard", "error");
      }
    } catch {
      showToast("Failed to copy clipboard", "error");
    }
    document.body.removeChild(ta);
  }
}

// ── CSV Export ─────────────────────────────────────────────────

function exportToCSV() {
  const visible = getVisibleItems();
  if (!visible.length) {
    showToast("No articles available to export.", "error");
    return;
  }

  const escape = (val) => `"${String(val || "").replace(/"/g, '""')}"`;

  const headers = ["Title", "Source", "Published", "Link", "Summary"];
  const rows = visible.map(item => [
    escape(item.title),
    escape(item.source_name),
    escape(formatDate(item.published_iso)),
    escape(item.link),
    escape(item.summary),
  ]);

  const csv  = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  const date = new Date().toISOString().split("T")[0];
  const filter = activeFilter === "all" ? "all-sources" : activeFilter;

  a.href     = url;
  a.download = `ai-pulse-${filter}-${date}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast(`Successfully exported ${visible.length} articles!`, "success");
}

// ── Filter & Render Pipeline ───────────────────────────────────

function getVisibleItems() {
  let items = allItems;
  if (activeFilter !== "all") {
    items = items.filter(i => i.source_id === activeFilter);
  }
  if (searchQuery) {
    items = items.filter(i => {
      const titleMatch = (i.title || "").toLowerCase().includes(searchQuery);
      const summaryMatch = (i.summary || "").toLowerCase().includes(searchQuery);
      return titleMatch || summaryMatch;
    });
  }
  return items;
}

function renderFeed() {
  const feed = document.getElementById("feed");
  const emptyState = document.getElementById("emptyState");
  const visible = getVisibleItems();

  if (visible.length === 0) {
    feed.innerHTML = "";
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");
  feed.innerHTML = visible.map((item, idx) => buildCardHTML(item, idx)).join("");
  updateStats(visible);
}

function updateStats(visible) {
  const statsText  = document.getElementById("statsText");
  const sourcePills = document.getElementById("sourcePills");

  statsText.textContent = `${visible.length} article${visible.length !== 1 ? "s" : ""}`;

  // Count per source
  const counts = {};
  visible.forEach(i => {
    counts[i.source_id] = (counts[i.source_id] || 0) + 1;
  });

  sourcePills.innerHTML = Object.entries(counts)
    .map(([src, cnt]) => {
      const color = COMPANY_COLORS[src] || "#818cf8";
      const label = allItems.find(i => i.source_id === src)?.source_name || src;
      return `<span class="source-pill" style="background:${color};">${label} ${cnt}</span>`;
    })
    .join("");
}

function updateLastUpdated(ts) {
  const el = document.getElementById("lastUpdated");
  if (!ts) { el.textContent = ""; return; }
  const d = new Date(ts * 1000);
  el.textContent = `Updated ${relativeTime(d.toISOString())}`;
  el._ts = ts; // save timestamp reference
}

// ── Search & Reset Filters ─────────────────────────────────────

function handleSearch(val) {
  searchQuery = val.toLowerCase().trim();
  const clearBtn = document.getElementById("clearSearchBtn");
  if (clearBtn) {
    if (searchQuery) {
      clearBtn.classList.remove("hidden");
    } else {
      clearBtn.classList.add("hidden");
    }
  }
  renderFeed();
}

function clearSearch() {
  const input = document.getElementById("searchInput");
  if (input) input.value = "";
  handleSearch("");
}

function clearFilters() {
  setFilter("all");
  clearSearch();
}

// ── Navigation & Scroll ────────────────────────────────────────

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ── Filter ─────────────────────────────────────────────────────

function setFilter(value) {
  activeFilter = value;
  // Update button states
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.filter === value);
  });
  renderFeed();
}

// ── Fetch Logic ─────────────────────────────────────────────────

async function loadFeed(url) {
  const feed      = document.getElementById("feed");
  const errorState = document.getElementById("errorState");
  const refreshIcon = document.getElementById("refreshIcon");
  const refreshBtn  = document.getElementById("refreshBtn");

  // Show skeleton
  feed.innerHTML = Array(5).fill(buildSkeletonHTML()).join("");
  errorState.classList.add("hidden");

  // Spinner on
  refreshIcon.classList.add("spinning");
  refreshBtn.disabled = true;

  try {
    const res  = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    allItems = data.items || [];
    updateLastUpdated(data.last_updated);
    renderFeed();
  } catch (err) {
    feed.innerHTML = "";
    errorState.classList.remove("hidden");
    document.getElementById("errorMsg").textContent =
      `Failed to load feed: ${err.message}`;
  } finally {
    refreshIcon.classList.remove("spinning");
    refreshBtn.disabled = false;
  }
}

function refreshFeed() {
  loadFeed("/api/news/refresh");
}

// ── Theme Switcher ─────────────────────────────────────────────

function toggleTheme(isLight) {
  if (isLight) {
    document.documentElement.setAttribute("data-theme", "light");
    localStorage.setItem("theme", "light");
  } else {
    document.documentElement.removeAttribute("data-theme");
    localStorage.setItem("theme", "dark");
  }
}

// ── Init ───────────────────────────────────────────────────────

(function init() {
  // Load saved theme preference
  const savedTheme = localStorage.getItem("theme");
  const isLight = (savedTheme === "light");
  const themeCheck = document.getElementById("themeCheck");
  if (themeCheck) {
    themeCheck.checked = isLight;
  }
  toggleTheme(isLight);

  loadFeed("/api/news");

  // Scroll event for scroll to top display
  window.addEventListener("scroll", () => {
    const btn = document.getElementById("scrollToTopBtn");
    if (btn) {
      if (window.scrollY > 400) {
        btn.classList.remove("hidden");
      } else {
        btn.classList.add("hidden");
      }
    }
  });

  // Periodically refresh the relative timestamps (every 60 s)
  setInterval(() => {
    document.querySelectorAll("time.pub-date").forEach(el => {
      const iso = el.getAttribute("datetime");
      if (iso) el.textContent = relativeTime(iso);
    });
    // Also refresh the "Updated X ago" label
    const lu = document.getElementById("lastUpdated");
    if (lu && lu._ts) updateLastUpdated(lu._ts);
  }, 60_000);
})();
