import os
import ssl
import time
from datetime import datetime
import re
from flask import Flask, jsonify, render_template, request
import feedparser

# Bypass SSL verification for Python on macOS to prevent local issuer certificate errors
try:
    ssl._create_default_https_context = ssl._create_unverified_context
except AttributeError:
    pass

app = Flask(__name__)

# Simple in-memory cache to prevent hitting Google's feeds on every page reload
feed_cache = {
    "data": None,
    "last_fetched": 0
}
CACHE_DURATION = 3600  # 1 hour in seconds

FEED_URL = 'https://docs.cloud.google.com/feeds/bigquery-release-notes.xml'

def parse_release_notes():
    """Fetches the Google BigQuery release notes XML feed and parses it into JSON structure."""
    feed = feedparser.parse(FEED_URL)
    
    # If the feed parsing encountered an issue and there are no entries, raise an error
    if feed.get('bozo') and not feed.entries:
        raise Exception(f"Failed to fetch or parse feed: {feed.get('bozo_exception')}")
        
    entries = []
    for entry_idx, entry in enumerate(feed.entries):
        title = entry.get('title', 'Unknown Date').strip()
        link = entry.get('link', '').strip()
        updated = entry.get('updated', '').strip()
        summary = entry.get('summary', '').strip()
        
        # Split summary into categories based on <h3> tags
        sub_updates = []
        if '<h3>' in summary:
            # We split the summary by <h3>(.*?)</h3>.
            # This returns: [non-matching-prefix, match1, match1-suffix, match2, match2-suffix, ...]
            # E.g., ['', 'Security', '<p>description</p>', 'Feature', '<p>description2</p>']
            matches = re.split(r'<h3>(.*?)</h3>', summary)
            
            for i in range(1, len(matches), 2):
                category = matches[i].strip()
                content = matches[i+1].strip() if i+1 < len(matches) else ''
                sub_updates.append({
                    'id': f"sub-{entry_idx}-{i//2}",
                    'category': category,
                    'content': content
                })
        else:
            # Fallback if no <h3> tags are present in the summary
            sub_updates.append({
                'id': f"sub-{entry_idx}-0",
                'category': 'General',
                'content': summary
            })
            
        entries.append({
            'id': f"entry-{entry_idx}",
            'title': title,
            'link': link,
            'updated': updated,
            'sub_updates': sub_updates
        })
        
    return entries

@app.route('/')
def index():
    """Renders the main page."""
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    """API endpoint to get the list of release notes. Supports ?refresh=true."""
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    now = time.time()
    
    if force_refresh or not feed_cache['data'] or (now - feed_cache['last_fetched'] > CACHE_DURATION):
        try:
            entries = parse_release_notes()
            feed_cache['data'] = entries
            feed_cache['last_fetched'] = now
            status = "success"
            error_message = None
        except Exception as e:
            status = "error"
            # Return cached data if available even on failure, but flag the error
            entries = feed_cache['data'] or []
            error_message = str(e)
    else:
        entries = feed_cache['data']
        status = "success"
        error_message = None
        
    return jsonify({
        'status': status,
        'error': error_message,
        'fetched_at': datetime.fromtimestamp(feed_cache['last_fetched']).isoformat(),
        'entries': entries
    })

if __name__ == '__main__':
    # Listen on port 5001 to avoid default port 5000 conflict with macOS AirPlay receiver
    app.run(debug=True, host='127.0.0.1', port=5001)
