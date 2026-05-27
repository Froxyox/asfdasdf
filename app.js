/* ── Scoring engine ─────────────────────────────────────────── */

const MAX_REVIEW_COUNT = Math.max(...RAW_BUSINESSES.map(b => b.reviewCount));

function reputationScore(b) {
  // Rating component: 0-5 → 0-100 (non-linear — penalise below 4.0)
  const ratingNorm = Math.max(0, (b.googleRating - 3.0) / 2.0) * 100; // 3.0 = floor

  // Review count component: log-scaled so big chains don't dominate
  const logCount = Math.log10(Math.max(1, b.reviewCount));
  const logMax   = Math.log10(Math.max(1, MAX_REVIEW_COUNT));
  const countNorm = (logCount / logMax) * 100;

  // Recency: % of reviews in last 12 months → 0-100
  const recencyNorm = (b.recentReviewPct ?? 0.5) * 100;

  return 0.55 * ratingNorm + 0.30 * countNorm + 0.15 * recencyNorm;
}

function searchScore(b) {
  // Local pack position: 1→100, 2→82, 3→65, 4→48, 5→35, 6+→25, not ranked→10
  const packMap = { 1: 100, 2: 82, 3: 65, 4: 48, 5: 35 };
  const packNorm = packMap[b.packPosition] ?? (b.packPosition <= 10 ? 25 : 10);

  // Keyword rank: rank 1 = 100, degrades logarithmically, rank 30+ ≈ 0
  const kwNorm = Math.max(0, 100 - (b.keywordRankAvg - 1) * 3.5);

  return 0.60 * packNorm + 0.40 * kwNorm;
}

function siteScore(b) {
  return 0.50 * b.pageSpeed + 0.30 * b.auditScore + 0.20 * b.mobileScore;
}

function finalScore(b, wRep, wSearch, wSite) {
  const total = wRep + wSearch + wSite;
  if (total === 0) return 0;
  const r = reputationScore(b);
  const s = searchScore(b);
  const q = siteScore(b);
  return (wRep * r + wSearch * s + wSite * q) / total;
}

/* ── State ──────────────────────────────────────────────────── */
let sortCol = 'score';
let sortAsc  = false;

/* ── DOM refs ───────────────────────────────────────────────── */
const wRepEl      = document.getElementById('wRep');
const wSearchEl   = document.getElementById('wSearch');
const wSiteEl     = document.getElementById('wSite');
const wRepValEl   = document.getElementById('wRepVal');
const wSearchValEl= document.getElementById('wSearchVal');
const wSiteValEl  = document.getElementById('wSiteVal');
const weightTotal = document.getElementById('weightTotal');
const minReviews  = document.getElementById('minReviews');
const minRating   = document.getElementById('minRating');
const searchBox   = document.getElementById('searchBox');
const tbody       = document.getElementById('tbody');
const dqNote      = document.getElementById('dqNote');
const statRanked  = document.getElementById('statRanked');
const statAvg     = document.getElementById('statAvg');
const statTop     = document.getElementById('statTop');
const statDQ      = document.getElementById('statDQ');

/* ── Render ─────────────────────────────────────────────────── */
function render() {
  const wR = +wRepEl.value;
  const wS = +wSearchEl.value;
  const wQ = +wSiteEl.value;
  const total = wR + wS + wQ;
  const minR  = +minReviews.value || 0;
  const minRat = +minRating.value || 0;
  const query  = searchBox.value.trim().toLowerCase();

  // Update weight display
  wRepValEl.textContent    = wR + '%';
  wSearchValEl.textContent = wS + '%';
  wSiteValEl.textContent   = wQ + '%';
  weightTotal.textContent  = `= ${total}%`;
  weightTotal.classList.toggle('error', total !== 100);

  // Score all businesses
  const scored = RAW_BUSINESSES.map(b => ({
    ...b,
    repScore:    reputationScore(b),
    searchScore: searchScore(b),
    siteScore:   siteScore(b),
    score:       finalScore(b, wR, wS, wQ),
    qualified:   b.reviewCount >= minR && b.googleRating >= minRat,
  }));

  // Filter by qualification + text search
  const qualified   = scored.filter(b => b.qualified && (!query || b.name.toLowerCase().includes(query)));
  const disqualified = scored.filter(b => !b.qualified);

  // Sort
  qualified.sort((a, b) => {
    let va = a[sortCol], vb = b[sortCol];
    if (typeof va === 'string') va = va.toLowerCase();
    if (typeof vb === 'string') vb = vb.toLowerCase();
    if (va < vb) return sortAsc ? -1 : 1;
    if (va > vb) return sortAsc ?  1 : -1;
    return 0;
  });

  // Stats
  const scores = qualified.map(b => b.score);
  statRanked.textContent = qualified.length;
  statDQ.textContent     = disqualified.length;
  statTop.textContent    = scores.length ? scores[0].toFixed(1) : '—';
  statAvg.textContent    = scores.length
    ? (scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(1)
    : '—';

  // Rows
  tbody.innerHTML = '';
  qualified.forEach((b, i) => {
    const rank = i + 1;
    const row  = document.createElement('tr');
    row.innerHTML = `
      <td class="col-rank">
        <span class="rank-badge ${rankClass(rank)}">${rank}</span>
      </td>
      <td class="col-name">
        <div class="biz-name">${esc(b.name)}</div>
        <div class="biz-address">${esc(b.address)}</div>
      </td>
      <td class="col-score">
        <span class="score-pill ${scoreClass(b.score)}">${b.score.toFixed(1)}</span>
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
    tbody.appendChild(row);
  });

  // DQ note
  if (disqualified.length > 0) {
    dqNote.textContent = `${disqualified.length} business${disqualified.length > 1 ? 'es' : ''} excluded — below minimum review count (${minR}) or rating (${minRat}) threshold.`;
  } else {
    dqNote.textContent = '';
  }

  // Update active sort header highlight
  document.querySelectorAll('th.sortable').forEach(th => {
    th.classList.toggle('active-sort', th.dataset.col === sortCol);
    const icon = th.querySelector('.sort-icon');
    if (th.dataset.col === sortCol) {
      icon.textContent = sortAsc ? '↑' : '↓';
    } else {
      icon.textContent = '↕';
    }
  });
}

/* ── Helpers ────────────────────────────────────────────────── */
function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function rankClass(r) {
  return r === 1 ? 'rank-1' : r === 2 ? 'rank-2' : r === 3 ? 'rank-3' : 'rank-other';
}

function scoreClass(s) {
  return s >= 75 ? 'score-high' : s >= 55 ? 'score-medium' : 'score-low';
}

function bar(label, value, type) {
  const pct = Math.min(100, Math.max(0, value)).toFixed(0);
  return `
    <div class="bar-row">
      <span class="bar-label">${label}</span>
      <div class="bar-track">
        <div class="bar-fill bar-fill-${type}" style="width:${pct}%"></div>
      </div>
      <span class="bar-num">${value.toFixed(0)}</span>
    </div>`;
}

function stars(rating) {
  const full  = Math.floor(rating);
  const half  = rating - full >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
}

function packLabel(pos) {
  if (pos === 1) return '#1 Pack';
  if (pos === 2) return '#2 Pack';
  if (pos === 3) return '#3 Pack';
  if (pos <= 10) return `#${pos}`;
  return `>#10`;
}

function packClass(pos) {
  if (pos === 1) return 'pack-1';
  if (pos === 2) return 'pack-2';
  if (pos === 3) return 'pack-3';
  if (pos <= 10) return 'pack-low';
  return 'pack-none';
}

/* ── Event listeners ────────────────────────────────────────── */
[wRepEl, wSearchEl, wSiteEl].forEach(el => el.addEventListener('input', render));
[minReviews, minRating, searchBox].forEach(el => el.addEventListener('input', render));

document.getElementById('resetWeights').addEventListener('click', () => {
  wRepEl.value    = 50;
  wSearchEl.value = 30;
  wSiteEl.value   = 20;
  render();
});

document.querySelectorAll('th.sortable').forEach(th => {
  th.addEventListener('click', () => {
    if (sortCol === th.dataset.col) {
      sortAsc = !sortAsc;
    } else {
      sortCol = th.dataset.col;
      sortAsc = sortCol === 'name';
    }
    render();
  });
});

/* ── Init ───────────────────────────────────────────────────── */
render();
