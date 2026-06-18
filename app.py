import xml.etree.ElementTree as ET
import datetime
import requests
from flask import Flask, jsonify, render_template

app = Flask(__name__)

# In-memory cache
cache = {
    "data": None,
    "last_fetched": None
}

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
CACHE_EXPIRY_MINUTES = 15

def fetch_and_parse_feed():
    try:
        response = requests.get(FEED_URL, timeout=10)
        response.raise_for_status()
        
        # Parse XML
        root = ET.fromstring(response.content)
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        entries = []
        for entry in root.findall('atom:entry', ns):
            title = entry.find('atom:title', ns)
            title_text = title.text.strip() if title is not None and title.text else ""
            
            entry_id = entry.find('atom:id', ns)
            id_text = entry_id.text.strip() if entry_id is not None and entry_id.text else ""
            
            updated = entry.find('atom:updated', ns)
            updated_text = updated.text.strip() if updated is not None and updated.text else ""
            
            # Find alt link
            link_elem = entry.find('atom:link[@rel="alternate"]', ns)
            if link_elem is None:
                link_elem = entry.find('atom:link', ns)
            link_href = link_elem.get('href') if link_elem is not None else ""
            
            content_elem = entry.find('atom:content', ns)
            content_html = content_elem.text if content_elem is not None and content_elem.text else ""
            
            entries.append({
                "id": id_text,
                "title": title_text,
                "updated": updated_text,
                "link": link_href,
                "content": content_html
            })
            
        cache["data"] = entries
        cache["last_fetched"] = datetime.datetime.now()
        return entries, None
    except Exception as e:
        return None, str(e)

def get_notes(force_refresh=False):
    now = datetime.datetime.now()
    if (
        force_refresh or 
        cache["data"] is None or 
        cache["last_fetched"] is None or 
        (now - cache["last_fetched"]).total_seconds() > CACHE_EXPIRY_MINUTES * 60
    ):
        return fetch_and_parse_feed()
    return cache["data"], None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/notes', methods=['GET'])
def api_get_notes():
    notes, error = get_notes(force_refresh=False)
    if error:
        return jsonify({"status": "error", "message": error}), 500
    
    last_fetched_str = cache["last_fetched"].strftime("%Y-%m-%d %H:%M:%S") if cache["last_fetched"] else ""
    return jsonify({
        "status": "success",
        "last_fetched": last_fetched_str,
        "notes": notes
    })

@app.route('/api/refresh', methods=['POST'])
def api_refresh_notes():
    notes, error = get_notes(force_refresh=True)
    if error:
        return jsonify({"status": "error", "message": error}), 500
    
    last_fetched_str = cache["last_fetched"].strftime("%Y-%m-%d %H:%M:%S") if cache["last_fetched"] else ""
    return jsonify({
        "status": "success",
        "last_fetched": last_fetched_str,
        "notes": notes
    })

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)
