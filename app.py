import os
import time
import requests
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# Cache to avoid hammering the Google Cloud Feed API and speed up loads
CACHE_DURATION = 300  # 5 minutes in seconds
feed_cache = {
    'data': None,
    'timestamp': 0
}

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
NAMESPACES = {'atom': 'http://www.w3.org/2005/Atom'}

def parse_release_notes_xml(xml_content):
    """
    Parses the Atom XML feed into a clean, structured list of releases.
    Each release contains metadata and parsed sections (Feature, Issue, Announcement, etc.).
    """
    try:
        root = ET.fromstring(xml_content)
    except ET.ParseError as e:
        print(f"XML Parsing Error: {e}")
        return []

    entries = root.findall('atom:entry', NAMESPACES)
    if not entries:
        entries = root.findall('entry')  # Fallback in case of namespace issues

    releases = []

    for entry in entries:
        title_elem = entry.find('atom:title', NAMESPACES)
        title = title_elem.text.strip() if title_elem is not None else "Unknown Date"

        id_elem = entry.find('atom:id', NAMESPACES)
        entry_id = id_elem.text.strip() if id_elem is not None else ""

        updated_elem = entry.find('atom:updated', NAMESPACES)
        updated = updated_elem.text.strip() if updated_elem is not None else ""

        # Google feed uses <link rel="alternate" href="..."/>
        link_elem = entry.find("atom:link[@rel='alternate']", NAMESPACES)
        if link_elem is None:
            link_elem = entry.find("atom:link", NAMESPACES)
        link = link_elem.get('href', '') if link_elem is not None else ""

        content_elem = entry.find('atom:content', NAMESPACES)
        content_html = content_elem.text if content_elem is not None else ""

        # Parse HTML inside entry to break it down into clean sections
        soup = BeautifulSoup(content_html, 'html.parser')
        
        sections = []
        current_type = "General"
        current_elements = []

        # Iterate through the HTML contents and chunk them by <h3> types (Feature, Issue, etc.)
        for child in soup.contents:
            if child.name in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
                # Save previous section if it contains elements
                if current_elements:
                    # Render accumulated elements back to HTML
                    html_snippet = "".join(str(e) for e in current_elements).strip()
                    # Extract plain text for Tweeting
                    text_snippet = " ".join(
                        e.get_text() if hasattr(e, 'get_text') else str(e) for e in current_elements
                    ).strip()
                    # Clean up multiple whitespaces
                    text_snippet = " ".join(text_snippet.split())
                    
                    if html_snippet or text_snippet:
                        sections.append({
                            'type': current_type,
                            'html': html_snippet,
                            'text': text_snippet
                        })
                    current_elements = []
                current_type = child.get_text().strip()
            elif child.name is not None or (isinstance(child, str) and child.strip()):
                current_elements.append(child)

        # Append final section
        if current_elements:
            html_snippet = "".join(str(e) for e in current_elements).strip()
            text_snippet = " ".join(
                e.get_text() if hasattr(e, 'get_text') else str(e) for e in current_elements
            ).strip()
            text_snippet = " ".join(text_snippet.split())
            
            if html_snippet or text_snippet:
                sections.append({
                    'type': current_type,
                    'html': html_snippet,
                    'text': text_snippet
                })

        # If no sections could be parsed, fall back to the entire HTML
        if not sections and content_html:
            text_snippet = soup.get_text().strip()
            text_snippet = " ".join(text_snippet.split())
            sections.append({
                'type': 'General',
                'html': content_html,
                'text': text_snippet
            })

        releases.append({
            'id': entry_id,
            'title': title,
            'updated': updated,
            'link': link,
            'sections': sections,
            'raw_content': content_html
        })

    return releases

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    current_time = time.time()

    # Use cache if valid and refresh is not forced
    if not force_refresh and feed_cache['data'] and (current_time - feed_cache['timestamp'] < CACHE_DURATION):
        return jsonify({
            'releases': feed_cache['data'],
            'cached': True,
            'cache_age_seconds': int(current_time - feed_cache['timestamp'])
        })

    try:
        response = requests.get(FEED_URL, timeout=15)
        response.raise_for_status()
        
        releases = parse_release_notes_xml(response.content)
        
        # Update cache
        feed_cache['data'] = releases
        feed_cache['timestamp'] = current_time
        
        return jsonify({
            'releases': releases,
            'cached': False
        })
    except requests.RequestException as e:
        # Fallback to cache on network failure if cache is available
        if feed_cache['data']:
            return jsonify({
                'releases': feed_cache['data'],
                'cached': True,
                'network_error': str(e),
                'error_fallback': True
            })
        return jsonify({
            'error': f"Failed to fetch release notes: {str(e)}"
        }), 500

if __name__ == '__main__':
    # Run server on port 5000 in debug mode
    app.run(host='127.0.0.1', port=5000, debug=True)
