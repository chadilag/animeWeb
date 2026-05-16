// lib/watchlist.js
// إدارة قوائم المشاهدة في localStorage

export const LIST_TYPES = {
  watching:  { label: 'أشاهده الآن',      icon: '▶️', color: '#4caf50' },
  completed: { label: 'أنهيته',            icon: '✅', color: '#2196f3' },
  planTo:    { label: 'أريد مشاهدته',      icon: '🔖', color: '#ff9800' },
  dropped:   { label: 'توقفت عن مشاهدته', icon: '⏹️', color: '#f44336' },
};

export function getWatchlist() {
  try {
    return JSON.parse(localStorage.getItem('watchlist_v2') || '{}');
  } catch { return {}; }
}

export function getAnimeStatus(animeId) {
  const wl = getWatchlist();
  for (const type of Object.keys(LIST_TYPES)) {
    if (wl[type]?.some(a => a.id === animeId)) return type;
  }
  return null;
}

export function setAnimeStatus(anime, status) {
  const wl = getWatchlist();
  // Remove from all lists first
  for (const type of Object.keys(LIST_TYPES)) {
    if (wl[type]) wl[type] = wl[type].filter(a => a.id !== anime.id);
  }
  // Add to new list
  if (status) {
    if (!wl[status]) wl[status] = [];
    wl[status].unshift(anime);
  }
  localStorage.setItem('watchlist_v2', JSON.stringify(wl));
  window.dispatchEvent(new Event('watchlist-updated'));
}

export function removeFromAll(animeId) {
  const wl = getWatchlist();
  for (const type of Object.keys(LIST_TYPES)) {
    if (wl[type]) wl[type] = wl[type].filter(a => a.id !== animeId);
  }
  localStorage.setItem('watchlist_v2', JSON.stringify(wl));
  window.dispatchEvent(new Event('watchlist-updated'));
}

export function getTotalCount() {
  const wl = getWatchlist();
  return Object.values(wl).reduce((sum, arr) => sum + (arr?.length || 0), 0);
}

// سجل المشاهدة
export function addToHistory(anime) {
  try {
    const history = JSON.parse(localStorage.getItem('watch_history') || '[]');
    const filtered = history.filter(a => a.id !== anime.id);
    filtered.unshift({ ...anime, visitedAt: Date.now() });
    localStorage.setItem('watch_history', JSON.stringify(filtered.slice(0, 50)));
  } catch {}
}

export function getHistory() {
  try {
    return JSON.parse(localStorage.getItem('watch_history') || '[]');
  } catch { return []; }
}

export function clearHistory() {
  localStorage.removeItem('watch_history');
}
