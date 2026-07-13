# BigQuery Release Notes Hub & Social Composer

A beautiful, modern web application built using a Python Flask backend and vanilla HTML, JavaScript, and CSS (with glassmorphism and a responsive, tailorable design system) that retrieves the official Google Cloud BigQuery release notes and allows you to select, customize, and Tweet about updates.

## Key Features

- **Automated Feeding & Parsing**: Fetches the official Google Cloud BigQuery RSS/Atom release notes feed and splits each day's entry into categories (e.g. `Feature`, `Security`, `Fixed`, `Changed`, `Deprecated`).
- **Interactive Search & Filter Tags**: Real-time keyword search and fast category badge filtering (Features, Security, Fixed, etc.).
- **Live Tweet Composer Modal**: Clicking the "Tweet Update" button on any release note opens a custom Tweet composer mockup matching Twitter/X's styling:
  - Custom draft text tailored to fit X's limits.
  - High-fidelity circular character counter that replicates how X counts characters (including adjusting all URLs to the 23-character limit).
  - Ability to customize the text prior to posting.
- **Theme Toggle**: Support for light and dark modes, persisting user preferences using `localStorage`.
- **Spinner & Loading States**: Clean animations and skeleton screens while fetching data, with robust error recovery states.

## Getting Started

### Prerequisites

You need Python 3 installed. To install the dependencies, run:

```bash
pip install -r requirements.txt
```

### Running the App

Start the Flask development server:

```bash
python3 app.py
```

The application will run on **[http://127.0.0.1:5001](http://127.0.0.1:5001)**. 

*(Note: We run on port `5001` to avoid conflicting with the AirPlay Receiver service which occupies port `5000` by default on modern macOS versions).*

## Project Structure

- `app.py`: Flask server code containing API feed-fetching endpoints and cache handling.
- `requirements.txt`: Python package dependencies.
- `templates/index.html`: The markup structure of the main feed and the custom Tweet Composer modal.
- `static/css/style.css`: The responsive styling, visual themes (light/dark modes), skeleton screens, and character rings.
- `static/js/app.js`: State management, event handlers, client-side filtering, and Tweet formatting/publishing logic.
