# BigQuery Release Notes Radar 🛰️

A premium, responsive web application built with Python Flask and plain vanilla HTML, CSS, and JavaScript. This application parses Google's official BigQuery Release Notes Atom/RSS feed and provides a beautiful, searchable, timeline-based dashboard. 

It splits daily entries into individual updates (Features, Announcements, Issues, etc.) so you can select specific items and easily Tweet about them.

---

## 🌟 Key Features

1. **Granular Update Partitioning**: Splits large multi-topic daily release entries into individual cards (Features, Announcements, Issues, Deprecations, Fixes) using HTML DOM parsing.
2. **Dynamic Search & Filtering**: Fast client-side searching and navigation filtering matching keywords, SQL syntax, or specific categories.
3. **Smart Tweet Composer**: Pre-composes structured updates with templates, automatically calculating text budgets and applying elegant truncation under the 280-character limit.
4. **Circular Progress Indicator**: Uses SVG styling to show remaining character count (turns blue ➡️ yellow ➡️ red on approaching limits).
5. **Multi-Selection support**: Select multiple updates to compile a bulleted summary tweet in one go.
6. **Server Memory Cache & Resilience**: Caches results for 5 minutes. If Google's feed is down during a refresh, it serves cached records with a warning.
7. **Premium Glassmorphism Design**: High-fidelity dark mode matching modern GCP standards, complete with hover scaling, status trackers, skeleton loads, and toast notices.

---

## 🚀 Getting Started

### Prerequisites
- Python 3.x
- pip (Python package installer)

### 1. Installation
Navigate to the project subdirectory and install the required dependencies:
```bash
# Enter the application folder
cd bq-releases-notes

# Set up virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Flask, Requests, and BeautifulSoup4
pip install Flask requests beautifulsoup4
```

### 2. Start the Server
Run the Flask server:
```bash
python3 app.py
```
By default, the server runs on: **[http://127.0.0.1:5001](http://127.0.0.1:5001)**

---

## 📂 Project Architecture

```
├── README.md                      # Git root documentation
├── .gitignore                     # Workspace git ignore configurations
├── news.txt                       # Raw notes source
├── summary.txt                    # Project summary
└── bq-releases-notes/             # Flask Application Root
    ├── app.py                     # Python Flask backend (XML/HTML parsing, Cache)
    ├── README.md                  # Project README instructions
    ├── .gitignore                 # Application specific gitignore
    ├── templates/
    │   └── index.html             # Vanilla UI template (Layout, Modals, Banner)
    └── static/
        ├── style.css              # Premium dark-theme variables and layout rules
        └── app.js                 # Frontend state manager and composer logic
```

---

## 🖥️ How it Works (Sample Request Flow)

1. **Feed Fetching**: The client clicks the **Refresh** button, hitting `/api/releases?refresh=true`.
2. **Ingestion & Parsing**: Flask requests the feed XML, parses entries using `xml.etree.ElementTree`, and divides inner HTML tags using `BeautifulSoup`.
3. **Flattening**: The frontend client maps updates into a flat list of cards, grouping them by date.
4. **Tweet Intent**: Clicking **Tweet** opens a modal with preview text and a custom character counter, redirecting to `https://twitter.com/intent/tweet?text=...` when clicked.

---

## 🛠️ Built With
- **Backend**: Python Flask, Requests, BeautifulSoup4
- **Frontend**: Plain Vanilla HTML5, CSS3, ES6 JavaScript, FontAwesome
- **Data Source**: [Google Cloud feeds/bigquery-release-notes.xml](https://docs.cloud.google.com/feeds/bigquery-release-notes.xml)
