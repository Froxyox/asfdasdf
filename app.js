// Leaderboard page — depends on data.js and scoring.js being loaded first

let sortCol = 'score';
let sortAsc  = false;

const wRepEl       = document.getElementById('wRep');
const wSearchEl    = document.getElementById('wSearch');
const wSiteEl      = document.getElementById('wSite');
const wRepValEl    = document.getElementById('wRepVal');
const wSearchValEl = document.getElementById('wSearchVal');
const wSiteValEl   = document.getElementById('wSiteVal');
const weightTotal  = document.getElementById('weightTotal');
const minReviews   = document.getElementById('minReviews');
const minRating    = document.getElementById('minRating');
const searchBox    = document.getElementById('searchBox');
const tbody        = document.getElementById('tbody');
const dqNote       = document.getElementById('dqNote');
const statRanked   = document.getElementById('statRanked');
const statAvg      = document.getElementById('statAvg');
const statTop      = document.getElementById('statTop');
const statDQ       = document.getElementById('statDQ');

function render() {
  const wR = +wRepEl.value;
  const wS = +wSearchEl.value;
  const wQ = +wSiteEl.value;
  const total  = wR + wS + wQ;
  const minR   = +minReviews.value || 0;
  const minRat = +minRating.value  || 0;
  const query  = searchBox.value.trim().toLowerCase();

  wRepValEl.textContent    = wR + '%';
  wSearchValEl.textContent = wS + '%';
  wSiteValEl.textContent   = wQ + '%';
  weightTotal.textContent  = `= ${total}%`;
  weightTotal.classList.toggle('error', total !== 100);

  const scored = scoreAll(RAW_BUSINESSES, wR, wS, wQ);

  const qualified    = scored.filter(b => b.reviewCount >= minR && b.googleRating >= minRat && (!query || b.name.toLowerCase().includes(query)));
  const disqualified = scored.filter(b => b.reviewCount < minR || b.googleRating < minRat);

  qualified.sort((a, b) => {
    let va = a[sortCol], vb = b[sortCol];
    if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
    if (va < vb) return sortAsc ? -1 : 1;
    if (va > vb) return sortAsc ?  1 : -1;
    return 0;
  });

  const scores = qualified.map(b => b.score);
  statRanked.textContent = qualified.length;
  statDQ.textContent     = disqualified.length;
  statTop.textContent    = scores.length ? scores[0].toFixed(1) : '—';
  statAvg.textContent    = scores.length ? (scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(1) : '—';

  tbody.innerHTML = '';
  qualified.forEach((b, i) => {
    const rank = i + 1;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="col-rank">
        <span class="rank-badge ${rankClass(rank)}">${rank}</span>
      </td>
      <td class="col-name">
        <div class="biz-name">${esc(b.name)}</div>
        <div class="biz-address">${esc(b.address)}</div>
      </td>
      <td class="col-score">
        <span class="score-pill score-pill-lg ${scoreClass(b.score)}">${b.score.toFixed(1)}</span>
      </td>
      <td class="col-breakdown">
        <div class="breakdown-bars">
          ${bar('R', b.repScore,    'rep')}
          ${bar('S', b.searchScore, 'search')}
          ${bar('Q', b.siteScore,   'site')}
        </div>
      </td>
      <td class="col-rating">
        <div class="rating-val">${b.googleRating.toFixed(1)}</div>
        <div class="stars">${stars(b.googleRating)}</div>
      </td>
      <td class="col-reviews">${b.reviewCount.toLocaleString()}</td>
      <td class="col-pack">
        <span class="pack-chip ${packClass(b.packPosition)}">${packLabel(b.packPosition)}</span>
      </td>
    `;
    tbody.appendChild(tr);
  });

  dqNote.textContent = disqualified.length
    ? `${disqualified.length} business${disqualified.length > 1 ? 'es' : ''} excluded — below minimum review count (${minR}) or rating (${minRat}) threshold.`
    : '';

  document.querySelectorAll('th.sortable').forEach(th => {
    th.classList.toggle('active-sort', th.dataset.col === sortCol);
    const icon = th.querySelector('.sort-icon');
    if (th.dataset.col === sortCol) icon.textContent = sortAsc ? '↑' : '↓';
    else icon.textContent = '↕';
  });
}

function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function rankClass(r) { return r <= 3 ? `rank-${r}` : 'rank-other'; }

function scoreClass(s) { return s >= 75 ? 'score-high' : s >= 55 ? 'score-medium' : 'score-low'; }

function bar(label, value, type) {
  const pct = Math.min(100, Math.max(0, value)).toFixed(0);
  return `<div class="bar-row">
    <span class="bar-label">${label}</span>
    <div class="bar-track"><div class="bar-fill bar-fill-${type}" style="width:${pct}%"></div></div>
    <span class="bar-num">${value.toFixed(0)}</span>
  </div>`;
}

function stars(r) {
  const f = Math.floor(r), h = r - f >= 0.5 ? 1 : 0;
  return '★'.repeat(f) + (h ? '½' : '') + '☆'.repeat(5 - f - h);
}

function packLabel(p) { return p === 1 ? '#1 Pack' : p === 2 ? '#2 Pack' : p === 3 ? '#3 Pack' : p <= 10 ? `#${p}` : '>#10'; }
function packClass(p)  { return p <= 3 ? `pack-${p}` : p <= 10 ? 'pack-low' : 'pack-none'; }

[wRepEl, wSearchEl, wSiteEl].forEach(el => el.addEventListener('input', render));
[minReviews, minRating, searchBox].forEach(el => el.addEventListener('input', render));

document.getElementById('resetWeights').addEventListener('click', () => {
  wRepEl.value = 50; wSearchEl.value = 30; wSiteEl.value = 20;
  render();
});

document.querySelectorAll('th.sortable').forEach(th => {
  th.addEventListener('click', () => {
    sortCol === th.dataset.col ? (sortAsc = !sortAsc) : (sortCol = th.dataset.col, sortAsc = sortCol === 'name');
    render();
  });
});

render();
