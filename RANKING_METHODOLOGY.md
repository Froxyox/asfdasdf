# Business Ranking Methodology

This document explains how the business ranking leaderboard works — the data each
business carries, how the three sub-scores are computed and normalized, how they
combine into a single 0–100 score, and how the leaderboard filters and displays
results. It reflects the actual logic in `scoring.js`, `data.js`, and `app.js`.

---

## 1. Overview

Every business is reduced to a single **0–100 score** that is a *weighted average*
of three normalized sub-scores:

| Sub-score | Default weight | What it captures |
|-----------|---------------|------------------|
| **Reputation** (`wRep`) | 50% | Google rating, review volume, review recency |
| **Search Visibility** (`wSearch`) | 30% | Local pack position + average keyword rank |
| **Site Quality** (`wSite`) | 20% | PageSpeed, site audit, mobile usability |

The weights are adjustable via sliders on the leaderboard. They are a *judgment
call*, not objective truth — exposing the sliders lets users see how rankings
shift instead of presenting one number as final.

---

## 2. The final score formula

From `scoring.js`:

```
Score = (wRep × Reputation + wSearch × Search + wSite × SiteQuality)
        ÷ (wRep + wSearch + wSite)
```

Dividing by the **sum of the weights** keeps the 0–100 scale correct even when the
slider values do not add up to 100 — the relative weighting is always preserved.
If all three weights are 0, the score is 0.

Default weights: `wRep = 50`, `wSearch = 30`, `wSite = 20`.

---

## 3. Reputation sub-score

```
Reputation = 0.55 × ratingNorm
           + 0.30 × countNorm
           + 0.15 × recencyNorm
```

| Signal | Weight | Normalization |
|--------|--------|---------------|
| Google rating | 55% | `max(0, (googleRating − 3.0) / 2.0) × 100`. A 5.0 → 100, a 3.0 → 0, anything below 3.0 → 0. |
| Review count | 30% | `log10(reviewCount) / log10(maxReviewCount) × 100`. Log-scaling prevents a chain with 10,000 reviews from crushing a solid shop with 200. `maxReviewCount` is the highest review count *in the current dataset*. |
| Review recency | 15% | `(recentReviewPct ?? 0.5) × 100` — the share of reviews posted in the last 12 months. Defaults to 0.5 if missing. |

Because `countNorm` depends on the dataset's maximum review count, **adding a
business with a very high review count re-scales this signal for every business**
in that category.

---

## 4. Search Visibility sub-score

```
Search = 0.60 × packNorm + 0.40 × kwNorm
```

| Signal | Weight | Mapping |
|--------|--------|---------|
| Local pack position (`packPosition`) | 60% | `#1 → 100`, `#2 → 82`, `#3 → 65`, `#4 → 48`, `#5 → 35`, `#6–#10 → 25`, `> #10 → 10`. All measurements taken from the same city-center GPS point. |
| Average keyword rank (`keywordRankAvg`) | 40% | `max(0, 100 − (keywordRankAvg − 1) × 3.5)`. Rank 1 → 100, and it decays to ~0 by rank 29+. |

**Note on the pack mapping:** any `packPosition` greater than 10 collapses to a
flat `10`. So for businesses ranked beyond the first page, the *keyword rank* is
what differentiates their search score.

---

## 5. Site Quality sub-score

```
SiteQuality = 0.50 × pageSpeed + 0.30 × auditScore + 0.20 × mobileScore
```

| Signal | Weight | Source |
|--------|--------|--------|
| PageSpeed score | 50% | Google PageSpeed Insights performance score (0–100). |
| Site audit score | 30% | Site audit — broken links, missing meta tags, duplicate content, etc. |
| Mobile usability | 20% | PageSpeed mobile score (separate run). |

All three inputs are already on a 0–100 scale, so no extra normalization is
applied.

---

## 6. Filtering & display (leaderboard)

Handled in `app.js`:

- **Minimum review threshold** — businesses below the minimum review count (or
  below a minimum rating) are *excluded* from the ranked list rather than shown
  with a misleading score. The methodology page documents a default floor of 10
  reviews; the threshold is adjustable on the leaderboard.
- **Search box** — filters the qualified list by name substring.
- **Sorting** — any column (score, rating, reviews, pack) is sortable; score
  descending is the default.
- **Stats bar** — shows count ranked, count disqualified, top score, and average
  score of the qualified set.
- **Linked sliders** — moving one weight slider only adjusts the *next* slider
  below it (wrapping around), clamped so the total never exceeds 100.

---

## 7. Data schema

Each business object in `data.js` uses this shape:

```js
{
  id: 1,                          // unique within the dataset
  name: "Business Name",
  address: "Street, City, ST ZIP",
  googleRating: 4.8,              // 0.0–5.0
  reviewCount: 1234,              // integer
  recentReviewPct: 0.40,          // 0.0–1.0, share of reviews in last 12 months
  packPosition: 1,                // local pack rank (1 = top)
  keywordRankAvg: 2.5,            // average organic keyword rank
  pageSpeed: 72,                  // 0–100
  auditScore: 75,                 // 0–100
  mobileScore: 68,                // 0–100
  websiteUrl: "https://…",
  dataSource: "where the numbers came from",
  dataSourceUrl: "https://…"      // optional
}
```

Datasets live in the `DATASETS` map, keyed like `austin-plumbers`, each with
`{ label, city, category, sampleData?, businesses: [...] }`. The first / default
category is **`austin-plumbers`** (`DEFAULT_DATASET`).

---

## 8. Worked example (default weights 50 / 30 / 20)

| Business | Reputation | Search | Site | Final |
|----------|-----------|--------|------|-------|
| Ace Plumbing | 92 | 78 | 89 | 86.1 |
| TrueFlow | 88 | 85 | 89 | 87.2 |
| Flow Masters | 91 | 60 | 55 | 77.0 |
| Drip Stop | 72 | 48 | 92 | 67.8 |
| East Side Pipe | 68 | 35 | 65 | 57.5 |

Flow Masters has a strong reputation (91) but a weak site (55), so it lands
mid-table. Raise the Site Quality weight to 35% and drop Search to 15% and Drip
Stop (92 site score) climbs above it — the formula surfacing its own sensitivity
rather than hiding it.
