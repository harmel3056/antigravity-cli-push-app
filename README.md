# BigQuery Release Hub & Sharer

Welcome to the **BigQuery Release Hub & Sharer**, a premium, high-performance web application that fetches Google Cloud's BigQuery Release Notes, presents them in a highly interactive timeline dashboard, and empowers you to selectively draft and share updates directly on X (Twitter).

The application is built with a lightweight, robust **Python Flask** backend and a stunning **Vanilla HTML/CSS/JavaScript** frontend with rich visual animations, glassmorphic dark-mode styling, and accurate real-time social drafting.

---

## 🏛️ Application Architecture

```mermaid
graph TD
    User([User's Browser]) <-->|Serves / & /static| Flask[Flask Web Server]
    Flask <-->|API Calls /api/releases| FeedAPI[BigQuery XML Feed]
    Flask <-->|In-Memory Cache| Cache[5-Minute API Cache]
    User <-->|Twitter Web Intent| Twitter[X / Twitter API]
```

---

## 🚀 Key Features

### 1. Robust Server-Side Feed Parsing
- **XML to JSON Parser**: Built on standard `xml.etree.ElementTree` and `BeautifulSoup4`, our Flask server fetches the raw Google XML feed, parses the Atom entries, and dynamically categorizes individual update segments into labeled objects (**Feature**, **Issue**, **Announcement**, **Deprecation**).
- **In-Memory Caching System**: Integrates a 5-minute server cache. Subsequent requests fetch instantly, protecting the app from being rate-limited by Google Cloud and boosting user feel. You can bypass the cache at any time using the client-side **Refresh** button.
- **Fail-Safe Fallback**: If a live fetch fails due to a network disruption, the server seamlessly falls back to cached data, ensuring uninterrupted availability.

### 2. High-Fidelity Premium UI/UX
- **Ambient Space Dark Theme**: Tailored with a deep charcoal-and-slate canvas (`#0a0e1a`), illuminated by glowing visual orb gradients that float in the background.
- **Visual Color Coding**: Each category has customized gradients and indicator borders:
  - **Feature**: Emerald &amp; Cyan
  - **Issue**: Coral &amp; Crimson
  - **Announcement**: Gold &amp; Amber
  - **Deprecation**: Purple &amp; Violet
- **Animated Timeline**: A beautiful, custom-coded vertical timeline layout. Elements render with cascading entry animations to feel premium and alive.

### 3. Advanced Filtering &amp; Real-Time Search
- **Instant Search**: Type keywords into the search bar to query both the headers and body copy.
- **Category Chips**: Quickly toggle views between All, Features, Issues, Announcements, and Deprecations.

### 4. Interactive Tweet Composer Modal
- **Context Preview**: Displays a blockquote of the original release note item inside the modal.
- **Auto-Generated Drafts**: Autocomposes highly structured, visually engaging tweets with appropriate emojis and automatic hashtag inclusion (`#BigQuery #GoogleCloud #DataEngineering`).
- **t.co-Aware Character Counter**: Includes realistic character tracking—interpreting web links as exactly 23 characters (as Twitter/X's official `t.co` shortener does).
- **Visual Circular Progress Ring**: An SVG circle path that dynamically fills as you approach the 280-character limit, transitioning to orange (warning) at 20 characters and red (danger) if you exceed the limit, dynamically blocking submissions to prevent errors.

---

## 📂 Project Directory Structure

```
agy-cli-projects/
├── .venv/                      # Python local virtual environment
├── app.py                      # Core Python Flask Application & API
├── templates/
│   └── index.html              # Responsive main layout & modal structures
└── static/
    ├── css/
    │   └── style.css           # Premium styling, variables, glassmorphism, animations
    └── js/
        └── app.js              # State engine, UI render, search/filter, Tweet Composer
```

---

## 🛠️ Launch & Development

The Flask application is already pre-configured and running in your workspace!

To view or access the application:
1. Open your browser and navigate to **[http://127.0.0.1:5000](http://127.0.0.1:5000)**.
2. Click **Refresh** to perform a live XML reload from Google Cloud.
3. Use the search bar, category chips, or click **Share Update** to try out the Twitter Composer.

### Manual Commands (if restarting or deploying in the future)

To install dependencies, activate the virtual environment, and launch Flask manually:
```powershell
# 1. Install dependencies from requirements.txt
pip install -r requirements.txt

# 2. Activate the virtual environment
.venv\Scripts\Activate.ps1

# 3. Run the Flask server
python app.py
```
