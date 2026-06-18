# BigQuery Release Notes Dashboard 📊✨

A premium, modern web dashboard interface for fetching, parsing, and interacting with Google Cloud BigQuery Release Notes. Built using a **Python Flask** backend and a **vanilla HTML, CSS, and JavaScript** frontend with a sleek, glassmorphic dark-theme design.

---

## 🚀 Key Features

* **High-Performance XML Parsing & Caching**: Bypasses browser CORS restrictions by fetching Google's XML Atom feed on the backend and parsing it using namespace-aware XML trees. Includes a 15-minute in-memory caching system.
* **Granular Update Segmentation**: Rather than showing raw HTML blobs per date, the JavaScript engine parses daily entries, separates individual updates (e.g. `Feature`, `Announcement`, `Deprecation`, `Bug Fix`), and formats them as individual glassmorphic cards.
* **Interactive X (Twitter) Share Composer**: Includes a native HTML dialog modal with automatic character budget calculation (fitting within the 280-character limit by dynamically truncating text descriptions, while keeping hashtags and source URLs intact).
* **Instant Client-Side Filtering**: Real-time keyword searching and category filtering chips without triggering additional server calls.
* **Modern Premium Styling**: Styled using custom CSS variables, glassmorphic blur filters, glowing hover outlines, custom scrollbars, and keyframe animations for spinner rotations and modal entries.

---

## 📁 Folder Structure

```
my-event-talks-app/
├── app.py                 # Python Flask server (API & Caching)
├── requirements.txt       # Python dependencies (Flask, Requests)
├── .gitignore             # Git exclusion rule definitions
├── templates/
│   └── index.html         # Main dashboard HTML template
└── static/
    ├── css/
    │   └── style.css      # Core styles, glassmorphism design system & animations
    └── js/
        └── app.js         # Client-side engine (DOM parsing, search, share, modal)
```

---

## 🛠️ Installation & Setup

Ensure you have **Python 3.12+** installed on your system.

### 1. Clone & Set Up Directory
In your terminal, navigate to the project directory:
```bash
cd my-event-talks-app
```

### 2. Create and Activate Virtual Environment
Create a clean environment and activate it:
```bash
# On macOS/Linux
python3 -m venv .venv
source .venv/bin/activate

# On Windows
python3 -m venv .venv
.venv\Scripts\activate
```

### 3. Install Dependencies
Install the required packages using the requirements file:
```bash
pip install -r requirements.txt
```

### 4. Run the Development Server
Launch the Flask development server:
```bash
python3 app.py
```
*The server will start running locally at: **`http://127.0.0.1:5000`***

---

## 🌐 API Reference

### Get Release Notes
* **Endpoint**: `GET /api/notes`
* **Description**: Returns the parsed list of release notes (loads from in-memory cache if retrieved within the last 15 minutes).
* **Response Format**:
  ```json
  {
    "status": "success",
    "last_fetched": "2026-06-18 10:19:00",
    "notes": [
      {
        "id": "tag:google.com,2016:bigquery-release-notes#June_17_2026",
        "title": "June 17, 2026",
        "link": "https://docs.cloud.google.com/bigquery/docs/release-notes#June_17_2026",
        "content": "<h3>Feature</h3><p>You can enable autonomous embedding generation...</p>"
      }
    ]
  }
  ```

### Force Feed Refresh
* **Endpoint**: `POST /api/refresh`
* **Description**: Triggers a manual network request to Google Cloud's servers, updates the cache, and returns the fresh dataset.

---

## 📜 License
Distributed under the MIT License. See `LICENSE` for more information (if added).
