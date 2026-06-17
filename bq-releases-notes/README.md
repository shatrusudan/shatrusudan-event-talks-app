# BigQuery Release Notes Radar

A premium, responsive web application built with Python Flask and vanilla HTML, JavaScript, and CSS that fetches Google's BigQuery Release Notes RSS/Atom feed and allows you to browse, search, filter, and Tweet about specific updates.

## Key Features

- **Automated RSS Ingestion**: Parses the Google BigQuery release notes Atom feed dynamically.
- **Smart Splitting**: Splits entry updates (e.g. Features, Announcements, Issues) into individually selectable cards so you don't have to share a whole day's updates at once.
- **Full Search & Categorization**: Type keywords or filter by Category (Features, Issues, Announcements, Deprecated, Fixed) to find exactly what you're looking for.
- **Multi-Selection Tracker**: Select multiple release notes and combine them into a single summary Tweet.
- **Character Count & Limit Guard**: Real-time Twitter visual progress ring with character count feedback. Max 280-char limit enforcement before opening Twitter's Composer.
- **Rich Dark-Theme Aesthetics**: High-end futuristic design with glassmorphism, responsive navigation sidebar, shimmer loader states, and toast notifications.
- **Resilient Cache & Offline Guard**: Automatically caches feed results in memory for 5 minutes. If offline or network fails on refresh, falls back gracefully to cache and displays warning indicators.

## Running the Application

### 1. Set Up Virtual Environment

```bash
# Navigate to the project directory
cd bq-releases-notes

# Create a virtual environment
python3 -m venv venv

# Activate the virtual environment
source venv/bin/activate

# Install dependencies
pip install Flask requests beautifulsoup4
```

### 2. Start the Server

```bash
python3 app.py
```

The application will launch locally on **http://127.0.0.1:5001**. Open this URL in your web browser.

### 3. Usage Guide

- **Sync Feed**: Press the **Refresh** button in the upper right. The button will animate, and skeleton screens will display while loading.
- **Filter**: Use the sidebar to toggle between "All Updates", "Features", "Announcements", and "Issues". You can also filter via the round chips below the search bar.
- **Search**: Start typing in the search bar. Keywords will matches dates, titles, descriptions, and code snippets instantly.
- **Tweet Single Update**: Hover over any update card and click the **Tweet** button. A customized composer will open with pre-composed text fitted to the 280 character limit.
- **Tweet Multiple Updates**: Select multiple updates by clicking on their cards or checkboxes. A floating banner will slide in at the bottom. Click **Tweet Selected** to open the composer with a combined list of updates.
- **Edit & Post**: Inside the Composer modal, customize your tweet text, check character limits, and click **Post to X** to redirect directly to Twitter's web intent.
