const KEY  = import.meta.env.VITE_RAWG_KEY;
const BASE = 'https://api.rawg.io/api';

async function req(path) {
  const sep = path.includes('?') ? '&' : '?';
  const r = await fetch(`${BASE}${path}${sep}key=${KEY}`);
  if (!r.ok) throw new Error(`RAWG ${r.status}`);
  return r.json();
}

export function fmtGame(g) {
  return {
    id:          g.id,
    title:       g.name,
    cover:       g.background_image  || null,
    year:        g.released          ? +g.released.slice(0, 4) : null,
    genre:       g.genres?.[0]?.name ?? null,
    rating:      +(g.rating          ?? 0).toFixed(1),
    metascore:   g.metacritic        || null,
    developer:   g.developers?.[0]?.name ?? null,
    description: g.description_raw   ? g.description_raw.slice(0, 500) : null,
    platforms:   g.platforms?.map(p => p.platform.name) ?? [],
  };
}

export const getPopular = (page = 1, genreSlug = '') => {
  const today = new Date().toISOString().slice(0, 10);
  const from  = new Date(Date.now() - 3 * 365.25 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return req(`/games?page=${page}&page_size=24&ordering=-added&dates=${from},${today}${genreSlug ? `&genres=${genreSlug}` : ''}`)
    .then(d => (d.results ?? []).map(g => fmtGame({...g, genres: g.genres || [], platforms: g.platforms || []})));
};

export const searchGames = (q, page = 1) =>
  req(`/games?search=${encodeURIComponent(q)}&page=${page}&page_size=24&search_precise=true`)
    .then(d => (d.results ?? []).map(fmtGame));

export const getDetail = (id) =>
  req(`/games/${id}`).then(fmtGame);
