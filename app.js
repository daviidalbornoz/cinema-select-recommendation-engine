let movies = []
let searchQuery = ''
let selectedGenre = ''
let selectedActor = ''
let selectedDirector = ''
let selectedSort = ''
let currentSelectedMovieId = null
let currentSelectedMovie = null
let currentFilteredList = []
let watchlistOnly = false

async function load() {
  const res = await fetch('movies.json')
  movies = await res.json()

  buildGenreFilters()
  buildActorDirectorFilters()
  setupControls()

  syncStateFromURL()

  if (window.TMDB_API_KEY && window.TMDB_API_KEY.length > 0) {
    fetchPostersFromTMDB()
  }
}

async function fetchPostersFromTMDB() {
  const apiKey = window.TMDB_API_KEY
  if (!apiKey) return

  const base = 'https://api.themoviedb.org/3'
  const imgBase = 'https://image.tmdb.org/t/p/w342'

  const jobs = movies.map(async (m) => {
    try {
      const q = encodeURIComponent(m.title)
      const year = m.year || ''
      const url = `${base}/search/movie?api_key=${apiKey}&query=${q}${year ? `&year=${year}` : ''}`

      const r = await fetch(url)
      if (!r.ok) return

      const data = await r.json()
      if (data && data.results && data.results.length) {
        const pick = data.results[0]

        if (pick.poster_path) {
          m.poster = imgBase + pick.poster_path
        }
        if (pick.overview) {
          m.overview = pick.overview
        }
      }
    } catch (e) {
      console.warn('TMDB fetch failed for', m.title, e)
    }
  })

  await Promise.all(jobs)

  // re-render list/details with posters
  applyFilters()

  // If a movie is currently selected, refresh its details so the poster updates
  if (currentSelectedMovieId != null) {
    const selected = movies.find(m => m.id === currentSelectedMovieId)
    if (selected) showDetails(selected)
  }
}

function setupControls() {
  document.getElementById('search').addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase()
    applyFilters()
  })

  document.getElementById('watchlistViewBtn').addEventListener('click', () => {
    watchlistOnly = !watchlistOnly
    document.getElementById('watchlistViewBtn').classList.toggle('active', watchlistOnly)
    applyFilters()
  })

  document.getElementById('randomBtn').addEventListener('click', () => {
    const pick = movies[Math.floor(Math.random() * movies.length)]
    showDetails(pick)
  })

  document.getElementById('actor-filter').addEventListener('change', (e) => {
    selectedActor = e.target.value
    applyFilters()
  })

  document.getElementById('director-filter').addEventListener('change', (e) => {
    selectedDirector = e.target.value
    applyFilters()
  })

  document.getElementById('sort-filter').addEventListener('change', (e) => {
    selectedSort = e.target.value
    applyFilters()
  })

  document.getElementById('watchlist-btn').addEventListener('click', () => {
    if (currentSelectedMovie) {
      toggleWatchlist(currentSelectedMovie)
    }
  })
}

function buildGenreFilters() {
  const all = new Set()
  movies.forEach((m) => m.genres.forEach((g) => all.add(g)))

  const container = document.getElementById('genre-filters')
  container.innerHTML = ''

  all.forEach((g) => {
    const btn = document.createElement('button')
    btn.textContent = g
    btn.className = 'genre-btn'

    btn.addEventListener('click', () => {
      if (selectedGenre === g) selectedGenre = ''
      else selectedGenre = g

      // mark selected state
      Array.from(container.children).forEach((b) =>
        b.classList.toggle('selected', b.textContent === selectedGenre)
      )

      applyFilters()
    })

    container.appendChild(btn)
  })
}

function buildActorDirectorFilters() {
  const actors = new Set()
  const directors = new Set()

  movies.forEach((m) => {
    m.actors.forEach((a) => actors.add(a))
    directors.add(m.director)
  })

  const actorSel = document.getElementById('actor-filter')
  const directorSel = document.getElementById('director-filter')

  // reset
  actorSel.innerHTML = '<option value="">All actors</option>'
  directorSel.innerHTML = '<option value="">All directors</option>'

  Array.from(actors)
    .sort()
    .forEach((a) => {
      const o = document.createElement('option')
      o.value = a
      o.textContent = a
      actorSel.appendChild(o)
    })

  Array.from(directors)
    .sort()
    .forEach((d) => {
      const o = document.createElement('option')
      o.value = d
      o.textContent = d
      directorSel.appendChild(o)
    })
}

function applyFilters() {
  const list = movies.filter((m) => {
    if (searchQuery && !m.title.toLowerCase().includes(searchQuery)) return false
    if (selectedGenre && !m.genres.includes(selectedGenre)) return false
    if (selectedActor && !m.actors.includes(selectedActor)) return false
    if (selectedDirector && m.director !== selectedDirector) return false
    if (watchlistOnly && !isInWatchlist(m.id)) return false
    return true
  })

  const sorted = sortList(list)
  currentFilteredList = sorted

  renderMovieList(sorted)
  renderInsights(sorted)
  renderFeatured(sorted)

  syncURL()   // ✅ add this line
}

function sortList(list) {
  const copy = [...list]
  switch (selectedSort) {
    case 'rating':
      return copy.sort((a, b) => (b.rating || 0) - (a.rating || 0))
    case 'newest':
      return copy.sort((a, b) => b.year - a.year)
    case 'oldest':
      return copy.sort((a, b) => a.year - b.year)
    case 'title':
      return copy.sort((a, b) => a.title.localeCompare(b.title))
    default:
      return copy
  }
}

function renderMovieList(list) {
  const el = document.getElementById('list')
  el.innerHTML = ''

  list.forEach((m) => {
    const div = document.createElement('div')
    div.className = 'movie'

    const thumb = getPoster(m, 160, 240)
    const fallback = getFallbackPoster()

    div.innerHTML = `<img class="thumb" src="${thumb}" onerror="this.onerror=null;this.src='${fallback}'" alt="${m.title} poster" title="${m.title} (${m.year})">`
    div.setAttribute('data-title', m.title)

    div.addEventListener('click', () => showDetails(m))
    el.appendChild(div)
  })
}

function showDetails(m) {
  currentSelectedMovieId = m.id
  currentSelectedMovie = m
  syncURL()

  const d = document.getElementById('movie-detail')
  const poster = getPoster(m, 240, 360)
  const fallback = getFallbackPoster()

  const descHtml = m.overview ? `<p class="movie-desc">${m.overview}</p>` : ''
  
  // Update watchlist button state
  updateWatchlistButton(m)

  d.innerHTML = `
    <div class="detail-grid">
      <div class="poster-frame">
  <img class="detail-poster"
       src="${poster}"
       onerror="this.onerror=null;this.src='${fallback}'"
       alt="${m.title} poster">
</div>
      <div class="detail-info">
        <h3>${m.title} <span class="movie-meta">(${m.year})</span></h3>
        <p class="movie-meta">Genres: ${m.genres.join(', ')}</p>
        <p class="movie-meta">Director: ${m.director}</p>
        <p class="movie-meta">Actors: ${m.actors.join(', ')}</p>
        <p class="movie-meta">Rating: ${m.rating}</p>
        ${descHtml}
      </div>
    </div>
  `

  const recs = recommendSimilar(m)
  renderRecommendations(recs)
}

function recommendSimilar(target, count = 5) {
  const scores = movies
    .filter((m) => m.id !== target.id)
    .map((m) => {
      let score = 0
      let reasons = []
      
      const hasDirector = m.director === target.director
      if (hasDirector) {
        score += 3
        reasons.push('director')
      }

      const sharedGenres = m.genres.filter((g) => target.genres.includes(g)).length
      score += sharedGenres * 2
      if (sharedGenres > 0) reasons.push(`${sharedGenres} genre${sharedGenres > 1 ? 's' : ''}`)

      const sharedActors = m.actors.filter((a) => target.actors.includes(a)).length
      score += sharedActors * 1.5
      if (sharedActors > 0) reasons.push(`${sharedActors} actor${sharedActors > 1 ? 's' : ''}`)

      score += (m.rating || 0) / 10
      return { m, score, reasons }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, count)

  return scores
}

function renderRecommendations(list) {
  const el = document.getElementById('recommendations')
  el.innerHTML = ''

  list.forEach((item) => {
    const m = item.m || item
    const reasons = item.reasons || []
    const reasonText = reasons.length > 0 ? `Recommended because it shares ${reasons.join(' and ')}.` : 'Recommended'
    
    const div = document.createElement('div')
    div.className = 'reco-item'

    const thumb = getPoster(m, 60, 90)
    const fallback = getFallbackPoster()

    div.innerHTML = `
      <img class="reco-thumb"
           src="${thumb}"
           onerror="this.onerror=null;this.src='${fallback}'"
           alt="${m.title} poster">
      <div class="reco-body">
        <div><strong>${m.title}</strong> <span class="movie-meta">(${m.year})</span></div>
        <div class="movie-meta">Genres: ${m.genres.join(', ')} • Rating: ${m.rating}</div>
        <div class="reco-reason">${reasonText}</div>
      </div>
    `

    div.addEventListener('click', () => showDetails(m))
    el.appendChild(div)
  })
}

window.addEventListener('DOMContentLoaded', load)

/**
 * Poster selection logic:
 * - Prefer TMDB poster URL stored in m.poster (set by TMDB fetch)
 * - Otherwise use a local fallback image (no external DNS dependency)
 */
function getPoster(m, w = 150, h = 225) {
  const url = (m && typeof m.poster === 'string') ? m.poster.trim() : ''
  return url ? url : getFallbackPoster()
}

function getFallbackPoster() {
  return 'poster-fallback.png'
}

function getWatchlist() {
  const stored = localStorage.getItem('movieWatchlist')
  return stored ? JSON.parse(stored) : []
}

function saveWatchlist(list) {
  localStorage.setItem('movieWatchlist', JSON.stringify(list))
}

function isInWatchlist(movieId) {
  return getWatchlist().some((m) => m.id === movieId)
}

function toggleWatchlist(movie) {
  const watchlist = getWatchlist()
  const idx = watchlist.findIndex((m) => m.id === movie.id)
  
  if (idx > -1) {
    watchlist.splice(idx, 1)
  } else {
    watchlist.push(movie)
  }
  
  saveWatchlist(watchlist)
  updateWatchlistButton(movie)
}

function updateWatchlistButton(movie) {
  const btn = document.getElementById('watchlist-btn')
  if (btn) {
    const inList = isInWatchlist(movie.id)
    btn.textContent = inList ? '❤️ Remove from Watchlist' : '❤️ Add to Watchlist'
    btn.classList.toggle('in-watchlist', inList)
  }
}

function renderFeatured(list) {
  const el = document.getElementById('featured')
  if (!el) return

  if (!list || list.length === 0) {
    el.innerHTML = `
      <div class="featured-inner">
        <div>
          <h2 class="featured-title"><span>No results</span></h2>
          <div class="featured-meta">Try clearing filters or searching a different title.</div>
        </div>
      </div>
    `
    return
  }

  // Top-rated movie in current view = featured
  const featured = [...list].sort((a, b) => (b.rating || 0) - (a.rating || 0))[0]
  const poster = getPoster(featured, 342, 513)
  const fallback = getFallbackPoster()

  el.innerHTML = `
    <div class="featured-bg" style="background-image:url('${poster}')"></div>
    <div class="featured-inner">
      <img class="featured-poster"
           src="${poster}"
           onerror="this.onerror=null;this.src='${fallback}'"
           alt="${featured.title} poster">
      <div>
        <h2 class="featured-title"><span>Featured:</span> ${featured.title} <span style="color:#cbd5e1;font-weight:700">(${featured.year})</span></h2>
        <div class="featured-meta">⭐ ${featured.rating} • Director: ${featured.director}</div>
        <div class="featured-tags">
          ${(featured.genres || []).slice(0, 4).map(g => `<span class="tag-pill">${g}</span>`).join('')}
        </div>
      </div>
      <div class="featured-actions">
        <button class="featured-btn" id="featured-open">View details</button>
        <button class="featured-btn" id="featured-random">Surprise me</button>
      </div>
    </div>
  `

  const openBtn = document.getElementById('featured-open')
  if (openBtn) {
    openBtn.onclick = () => {
      showDetails(featured)
      document.getElementById('details')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const randBtn = document.getElementById('featured-random')
  if (randBtn) {
    randBtn.onclick = () => {
      const pick = list[Math.floor(Math.random() * list.length)]
      showDetails(pick)
      document.getElementById('details')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }
}

function renderInsights(list) {
  const el = document.getElementById('insights')
  if (!el) return

  const total = list.length
  const avgRating = total ? (list.reduce((s, m) => s + (Number(m.rating) || 0), 0) / total) : 0

  const genreCounts = {}
  const actorCounts = {}
  const directorCounts = {}

  list.forEach(m => {
    ;(m.genres || []).forEach(g => genreCounts[g] = (genreCounts[g] || 0) + 1)
    ;(m.actors || []).forEach(a => actorCounts[a] = (actorCounts[a] || 0) + 1)
    if (m.director) directorCounts[m.director] = (directorCounts[m.director] || 0) + 1
  })

  const topN = (obj, n = 3) =>
    Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n)

  const topGenres = topN(genreCounts, 3)
  const topActor = topN(actorCounts, 1)[0]
  const topDirector = topN(directorCounts, 1)[0]

  const buckets = { "7.0–7.9": 0, "8.0–8.4": 0, "8.5–8.9": 0, "9.0+": 0 }
  list.forEach(m => {
    const r = Number(m.rating) || 0
    if (r >= 9.0) buckets["9.0+"]++
    else if (r >= 8.5) buckets["8.5–8.9"]++
    else if (r >= 8.0) buckets["8.0–8.4"]++
    else if (r >= 7.0) buckets["7.0–7.9"]++
  })
  const maxB = Math.max(1, ...Object.values(buckets))

  el.innerHTML = `
    <h3 class="insights-title">Insights</h3>
    <div class="insights-grid">
      <div class="insight-card">
        <div class="insight-label">Movies shown</div>
        <div class="insight-value">${total}</div>
        <div class="insight-sub">Based on your current filters/sort.</div>
      </div>

      <div class="insight-card">
        <div class="insight-label">Average rating</div>
        <div class="insight-value">${avgRating.toFixed(2)}</div>
        <div class="insight-sub">Quick quality gauge of results.</div>
      </div>

      <div class="insight-card">
        <div class="insight-label">Top genres</div>
        <div class="insight-value">${topGenres.map(x => x[0]).join(', ') || '—'}</div>
        <div class="insight-sub">${topGenres.map(([g, c]) => `${g}: ${c}`).join(' • ') || ''}</div>
      </div>

      <div class="insight-card">
        <div class="insight-label">Most common</div>
        <div class="insight-value">${topDirector ? topDirector[0] : '—'}</div>
        <div class="insight-sub">
          Director count: ${topDirector ? topDirector[1] : 0}<br>
          Actor: ${topActor ? `${topActor[0]} (${topActor[1]})` : '—'}
        </div>
      </div>
    </div>

    <div style="margin-top:12px">
      <div class="insight-label">Rating distribution</div>
      <div class="hist">
        ${Object.entries(buckets).map(([label, count]) => {
          const h = Math.round((count / maxB) * 44)
          return `<div class="bar" style="height:${h}px" title="${label}: ${count}"></div>`
        }).join('')}
      </div>
      <div class="insight-sub">${Object.entries(buckets).map(([k, v]) => `${k}: ${v}`).join(' • ')}</div>
    </div>
  `
}

function syncStateFromURL() {
  const params = new URLSearchParams(window.location.search)

  // Read state
  searchQuery = (params.get('search') || '').toLowerCase()
  selectedGenre = params.get('genre') || ''
  selectedActor = params.get('actor') || ''
  selectedDirector = params.get('director') || ''
  selectedSort = params.get('sort') || ''

  // Set UI controls to match
  const searchEl = document.getElementById('search')
  const actorEl = document.getElementById('actor-filter')
  const directorEl = document.getElementById('director-filter')
  const sortEl = document.getElementById('sort-filter')

  if (searchEl) searchEl.value = params.get('search') || ''
  if (actorEl) actorEl.value = selectedActor
  if (directorEl) directorEl.value = selectedDirector
  if (sortEl) sortEl.value = selectedSort

  // Genre buttons: reflect selected state
  const container = document.getElementById('genre-filters')
  if (container) {
    Array.from(container.children).forEach((b) =>
      b.classList.toggle('selected', b.textContent === selectedGenre)
    )
  }

  // Apply filters AFTER UI is set
  applyFilters()

  // If movieId is present, open it (prefer after filters)
  const movieId = Number(params.get('movieId') || '')
  if (!Number.isNaN(movieId) && movieId) {
    const m = movies.find(x => x.id === movieId)
    if (m) showDetails(m)
  }
}

function updateURLFromState() {
  const params = new URLSearchParams()

  // Save only non-empty values (keeps URL clean)
  const rawSearch = (document.getElementById('search')?.value || '').trim()
  if (rawSearch) params.set('search', rawSearch)
  if (selectedGenre) params.set('genre', selectedGenre)
  if (selectedActor) params.set('actor', selectedActor)
  if (selectedDirector) params.set('director', selectedDirector)
  if (selectedSort) params.set('sort', selectedSort)
  if (currentSelectedMovieId != null) params.set('movieId', String(currentSelectedMovieId))

  const newUrl = `${window.location.pathname}?${params.toString()}`
  history.replaceState(null, '', newUrl)
}

// Call this any time filters/sort/search/movie selection changes
function syncURL() {
  updateURLFromState()
}