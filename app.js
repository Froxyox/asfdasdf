// Leaderboard — depends on data.js and scoring.js

/* ── State ─────────────────────────────────────────────────── */
let sortCol        = 'score';
let sortAsc        = false;
let activeDataset  = DEFAULT_DATASET;

/* ── DOM refs ───────────────────────────────────────────────── */
const wRepEl       = document.getElementById('wRep');
const wSearchEl    = document.getElementById('wSearch');
const wSiteEl      = document.getElementById('wSite');
const wRepValEl    = document.getElementById('wRepVal');
const wSearchValEl = document.getElementById('wSearchVal');
const wSiteValEl   = document.getElementById('wSiteVal');
const minReviews   = document.getElementById('minReviews');
const minRating    = document.getElementById('minRating');
const searchBox    = document.getElementById('searchBox');
const tbody        = document.getElementById('tbody');
const dqNote       = document.getElementById('dqNote');
const statRanked   = document.getElementById('statRanked');
const statAvg      = document.getElementById('statAvg');
const statTop      = document.getElementById('statTop');
const statDQ       = document.getElementById('statDQ');
const datasetTabs  = document.getElementById('datasetTabs');
const lbTitle      = document.getElementById('lbTitle');
const lbSubtitle   = document.getElementById('lbSubtitle');
const sampleBadge  = document.getElementById('sampleBadge');

const SLIDERS = [wRepEl, wSearchEl, wSiteEl];

/* ── Linked sliders (always sum to 100) ─────────────────────── */
function onSliderMove(movedEl) {
  const movedVal = +movedEl.value;
  const others   = SLIDERS.filter(s => s !== movedEl);
  const needed   = 100 - movedVal;

  const othersSum = others.reduce((s, el) => s + +el.value, 0);

  if (needed <= 0) {
    others.forEach(el => { el.value = 0; });
  } else if (othersSum === 0) {
    others[0].value = Math.floor(needed / 2);
    others[1].value = needed - +others[0].value;
  } else {
    let allocated = 0;
    others.forEach((el, i) => {
      if (i === others.length - 1) {
        el.value = needed - allocated;
      } else {
        const share = Math.round(needed * (+el.value / othersSum));
        el.value = share;
        allocated += share;
      }
    });
  }

  updateSliderLabels();
  render();
}

function updateSliderLabels() {
  wRepValEl.textContent    = wRepEl.value    + '%';
  wSearchValEl.textContent = wSearchEl.value + '%';
  wSiteValEl.textContent   = wSiteEl.value   + '%';
}

/* ── Dataset switching ──────────────────────────────────────── */
function buildDatasetTabs() {
  datasetTabs.innerHTML = '';
  Object.entries(DATASETS).forEach(([key, ds]) => {
    const btn = document.createElement('button');
    btn.className = 'ds-tab' + (key === activeDataset ? ' active' : '');
    btn.dataset.key = key;
    btn.innerHTML = `<span class="ds-city">${ds.city}</span><span class="ds-cat">${ds.label}</span>`;
    btn.addEventListener('click', () => switchDataset(key));
    datasetTabs.appendChild(btn);
  });
}

function switchDataset(key) {
  activeDataset = key;
  document.querySelectorAll('.ds-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.key === key);
  });
  const ds = DATASETS[key];
  lbTitle.textContent    = ds.category;
  lbSubtitle.textContent = ds.city;
  if (sampleBadge) sampleBadge.style.display = ds.sampleData ? 'inline-block' : 'none';
  render();
}

/* ── Render ─────────────────────────────────────────────────── */
function render() {
  const wR    = +wRepEl.value;
  const wS    = +wSearchEl.value;
  const wQ    = +wSiteEl.value;
  const minR  = +minReviews.value || 0;
  const minRat = +minRating.value || 0;
  const query = searchBox.value.trim().toLowerCase();

  const businesses = DATASETS[activeDataset].businesses;
  const scored     = scoreAll(businesses, wR, wS, wQ);

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
  statAvg.textContent    = scores.length ? (scores.reduce((a,b) => a+b, 0) / scores.length).toFixed(1) : '—';

  tbody.innerHTML = '';
  qualified.forEach((b, i) => {
    const rank = i + 1;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="col-rank">
        <span class="rank-badge ${rankClass(rank)}">${rank}</span>
      </td>
      <td class="col-name">
        <div class="biz-name">
          <a href="${esc(b.websiteUrl || '#')}" target="_blank" rel="noopener" class="biz-link">${esc(b.name)}</a>
        </div>
        <div class="biz-address">${esc(b.address)}</div>
        ${b.dataSource ? `<div class="biz-source">${esc(b.dataSource)}</div>` : ''}
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
    icon.textContent = th.dataset.col === sortCol ? (sortAsc ? '↑' : '↓') : '↕';
  });
}

/* ── Helpers ────────────────────────────────────────────────── */
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
function packClass(p) { return p <= 3 ? `pack-${p}` : p <= 10 ? 'pack-low' : 'pack-none'; }

/* ── Event listeners ────────────────────────────────────────── */
SLIDERS.forEach(el => el.addEventListener('input', () => onSliderMove(el)));
[minReviews, minRating, searchBox].forEach(el => el.addEventListener('input', render));

document.getElementById('resetWeights').addEventListener('click', () => {
  wRepEl.value = 50; wSearchEl.value = 30; wSiteEl.value = 20;
  updateSliderLabels();
  render();
});

document.querySelectorAll('th.sortable').forEach(th => {
  th.addEventListener('click', () => {
    sortCol === th.dataset.col ? (sortAsc = !sortAsc) : (sortCol = th.dataset.col, sortAsc = sortCol === 'name');
    render();
  });
});

/* ── Init ───────────────────────────────────────────────────── */
buildDatasetTabs();
updateSliderLabels();
switchDataset(DEFAULT_DATASET);
