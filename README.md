Movie Recommender (local demo)

Files:
- index.html — main page
- styles.css — styles
- app.js — frontend logic and recommendation algorithm
- movies.json — sample movie dataset

Run locally:
- Option 1: Open `index.html` in your browser (some browsers restrict local fetch of JSON).
- Option 2 (recommended): Run a simple local server from the project folder:

  python3 -m http.server 8000

Then open http://localhost:8000 in your browser.

How it works:
- Click a movie to see details and get 5 similar recommendations.
- Use the search box, genre buttons, or "Surprise me" button to explore.

TMDB posters (optional):
- To fetch real posters from The Movie Database (TMDB), add your API key to `tmdb-config.js`:

  window.TMDB_API_KEY = 'your_tmdb_api_key_here'

  After adding the key, reload the page — the app will call the TMDB search API for each movie and attach poster images when found.

Notes:
- Do not commit your API key publicly. This demo uses client-side requests which expose the key in network traces; for production use, proxy requests through a server.
- If you prefer, I can fetch posters server-side and store them locally in `posters/`.

If you want more features (user preferences, server proxy for TMDB, deploy to GitHub Pages), tell me which and I'll extend it.