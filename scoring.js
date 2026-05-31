// Shared scoring engine — works on any businesses array

function reputationScore(b, maxReviewCount) {
  const ratingNorm  = Math.max(0, (b.googleRating - 3.0) / 2.0) * 100;
  const logCount    = Math.log10(Math.max(1, b.reviewCount));
  const logMax      = Math.log10(Math.max(1, maxReviewCount));
  const countNorm   = (logCount / logMax) * 100;
  const recencyNorm = (b.recentReviewPct ?? 0.5) * 100;
  return 0.55 * ratingNorm + 0.30 * countNorm + 0.15 * recencyNorm;
}

function searchScore(b) {
  const packMap = { 1: 100, 2: 82, 3: 65, 4: 48, 5: 35 };
  const packNorm = packMap[b.packPosition] ?? (b.packPosition <= 10 ? 25 : 10);
  const kwNorm   = Math.max(0, 100 - (b.keywordRankAvg - 1) * 3.5);
  return 0.60 * packNorm + 0.40 * kwNorm;
}

function siteScore(b) {
  return 0.50 * b.pageSpeed + 0.30 * b.auditScore + 0.20 * b.mobileScore;
}

function finalScore(b, wRep, wSearch, wSite, maxReviewCount) {
  const total = wRep + wSearch + wSite;
  if (total === 0) return 0;
  return (wRep * reputationScore(b, maxReviewCount) + wSearch * searchScore(b) + wSite * siteScore(b)) / total;
}

function scoreAll(businesses, wRep, wSearch, wSite) {
  const maxCount = Math.max(...businesses.map(b => b.reviewCount));
  return businesses.map(b => ({
    ...b,
    repScore:    reputationScore(b, maxCount),
    searchScore: searchScore(b),
    siteScore:   siteScore(b),
    score:       finalScore(b, wRep, wSearch, wSite, maxCount),
  }));
}
