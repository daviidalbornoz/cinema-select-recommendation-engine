# Cinema Select — Movie Recommendation Engine 🎬

A Netflix-style, client-side movie recommendation site built through an AI-assisted “vibecoding” workflow (started from a GitHub Copilot scaffold, then iterated into a polished product).

## Features
- **Search + Filters:** title search, genre buttons, actor + director dropdown filters  
- **Sorting:** highest rated, newest/oldest, A–Z  
- **Recommendations:** weighted similarity scoring + **“why this was recommended”** explanations  
- **Watchlist:** persistent favorites saved in `localStorage`  
- **Shareable Links:** deep-link state via URL parameters (reproducible views)  
- **Resilient Posters:** TMDB poster URLs (when available) + local fallback image  
- **Responsive UI:** dark cinema theme, hover animations, sidebar details panel

## Tech Stack
- HTML, CSS, JavaScript (vanilla)
- Git + GitHub

## Run Locally
```bash
cd movie-recommender
python3 -m http.server 8000
# open http://localhost:8000
