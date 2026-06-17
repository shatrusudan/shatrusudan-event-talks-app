import os
import time
import requests
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
from flask import Flask, jsonify, request, render_template, send_from_directory

app = Flask(__name__)

# Cache configuration
FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
CACHE_DURATION_SEC = 300  # 5 minutes
cache = {
    "data": None,
    "last_fetched": 0
}

def parse_html_content(content_html):
    """
    Parses the feed's HTML content, splitting it into separate updates
    based on <h3> header elements (e.g. Feature, Issue, Deprecation).
    """
    if not content_html:
        return []

    soup = BeautifulSoup(content_html, 'html.parser')
    updates = []
    
    # Check if there are any h3 tags
    h3_tags = soup.find_all('h3')
    if not h3_tags:
        # If no h3 headings, treat the entire block as one single general update
        text = soup.get_text().strip()
        # Clean up double linebreaks or odd spacing
        text = " ".join(text.split())
        return [{
            "type": "Update",
            "description_html": str(soup),
            "description_text": text
        }]

    current_update = None
    for element in soup.contents:
        # Element can be a Tag or NavigableString
        if getattr(element, 'name', None) == 'h3':
            if current_update:
                updates.append(current_update)
            current_update = {
                "type": element.get_text().strip(),
                "description_html": "",
                "description_text": ""
            }
        else:
            # If we have content before the first h3, initialize a "General" block
            if current_update is None:
                # Skip leading whitespaces
                if isinstance(element, str) and not element.strip():
                    continue
                current_update = {
                    "type": "General",
                    "description_html": "",
                    "description_text": ""
                }
            
            # Append HTML and text representation of this child element
            if hasattr(element, 'decode'):
                current_update["description_html"] += str(element)
                current_update["description_text"] += element.get_text()
            else:
                current_update["description_html"] += str(element)
                current_update["description_text"] += str(element)
                
    if current_update:
        updates.append(current_update)

    # Clean up results
    final_updates = []
    for update in updates:
        html_str = update["description_html"].strip()
        text_str = update["description_text"].strip()
        
        # Clean up whitespace in text description
        text_str = " ".join(text_str.split())
        
        if html_str or text_str:
            update["description_html"] = html_str
            update["description_text"] = text_str
            final_updates.append(update)
            
    return final_updates

def fetch_and_parse_feed():
    """
    Fetches the BigQuery XML feed and parses it.
    """
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    response = requests.get(FEED_URL, headers=headers, timeout=15)
    response.raise_for_status()

    # Atom Feed XML parsing
    # Atom uses the default namespace xmlns="http://www.w3.org/2005/Atom"
    root = ET.fromstring(response.content)
    
    # We can register the namespace or prefix searches
    ns = {"atom": "http://www.w3.org/2005/Atom"}
    
    entries = []
    
    # Iterate over every <entry> element
    for entry_el in root.findall("atom:entry", ns):
        title_el = entry_el.find("atom:title", ns)
        id_el = entry_el.find("atom:id", ns)
        updated_el = entry_el.find("atom:updated", ns)
        content_el = entry_el.find("atom:content", ns)
        
        # Find link with rel="alternate" or just any link if alternate doesn't exist
        link = ""
        links = entry_el.findall("atom:link", ns)
        for l in links:
            rel = l.get("rel")
            if rel == "alternate" or not rel:
                link = l.get("href")
                break
        if not link and links:
            link = links[0].get("href")

        title = title_el.text if title_el is not None else ""
        entry_id = id_el.text if id_el is not None else ""
        updated = updated_el.text if updated_el is not None else ""
        content_html = content_el.text if content_el is not None else ""
        
        # Split HTML content into individual updates
        individual_updates = parse_html_content(content_html)
        
        entries.append({
            "title": title,
            "id": entry_id,
            "updated": updated,
            "link": link,
            "updates": individual_updates
        })
        
    return entries

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/releases")
def get_releases():
    force_refresh = request.args.get("refresh", "").lower() == "true"
    now = time.time()
    
    if force_refresh or not cache["data"] or (now - cache["last_fetched"]) > CACHE_DURATION_SEC:
        try:
            data = fetch_and_parse_feed()
            cache["data"] = data
            cache["last_fetched"] = now
            return jsonify({
                "status": "success",
                "source": "network",
                "last_fetched": cache["last_fetched"],
                "data": data
            })
        except Exception as e:
            # If network fetch fails but we have cached data, return the cache
            if cache["data"]:
                return jsonify({
                    "status": "warning",
                    "error": f"Failed to fetch updates, returning cached data. Error: {str(e)}",
                    "source": "cache",
                    "last_fetched": cache["last_fetched"],
                    "data": cache["data"]
                })
            else:
                return jsonify({
                    "status": "error",
                    "error": f"Failed to fetch release notes: {str(e)}",
                    "data": []
                }), 500
    
    return jsonify({
        "status": "success",
        "source": "cache",
        "last_fetched": cache["last_fetched"],
        "data": cache["data"]
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
