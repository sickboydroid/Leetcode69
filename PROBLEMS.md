# Updating the Problem List — LLM Guide

This document explains how to fetch fresh problem data and update the curated list in `problems.js`.

---

## Data Source

All problem ratings come from **[zerotrac/leetcode_problem_rating](https://github.com/zerotrac/leetcode_problem_rating)**.

The primary data file is:
```
https://raw.githubusercontent.com/zerotrac/leetcode_problem_rating/main/data.json
```

Each entry in `data.json` has this structure:
```json
{
  "Rating": 2345.67,
  "ID": 3456,
  "Title": "Some Problem Title",
  "TitleZH": "某问题标题",
  "TitleSlug": "some-problem-title",
  "ContestSlug": "weekly-contest-410",
  "ProblemIndex": "Q3",
  "ContestID_en": "Weekly Contest 410",
  "ContestID_zh": "第 410 场周赛"
}
```

---

## Current List Criteria

The current `problems.js` was built with these rules:
- **2024+ only**: Weekly Contest ≥ 380, Biweekly Contest ≥ 120
- **129 Hard** (Rating ≥ 2000), **40 Medium** (Rating 1400–2000)
- Spread across rating bands for variety (not clustered at top)
- Sorted by LeetCode problem ID (ascending) for fixed display order

---

## How to Refresh / Extend the List

### Step 1 — Fetch fresh data
```bash
curl -o data.json https://raw.githubusercontent.com/zerotrac/leetcode_problem_rating/main/data.json
```

### Step 2 — Run the selection script
Use the Python script below (save as `gen_problems.py`):

```python
import json

with open('data.json') as f:
    data = json.load(f)

# ─── CONFIGURE THESE ───────────────────────────────────────────────────────
# Adjust contest thresholds to change the "2024+" cutoff
WEEKLY_MIN    = 380   # Weekly Contest 380 ≈ January 2024
BIWEEKLY_MIN  = 120   # Biweekly Contest 120 ≈ January 2024
HARD_COUNT    = 129   # Number of Hard problems to pick
MEDIUM_COUNT  = 40    # Number of Medium problems to pick
HARD_RATING   = 2000  # Rating threshold for Hard vs Medium
MEDIUM_MIN    = 1400  # Minimum rating for Medium selection
# ───────────────────────────────────────────────────────────────────────────

def is_recent(p):
    cid = p.get('ContestID_en', '')
    if 'Weekly Contest' in cid:
        n = int(cid.split()[-1])
        return n >= WEEKLY_MIN
    if 'Biweekly Contest' in cid:
        n = int(cid.split()[-1])
        return n >= BIWEEKLY_MIN
    return False

recent = [p for p in data if is_recent(p)]
recent.sort(key=lambda x: x['Rating'], reverse=True)

hard_pool   = [p for p in recent if p['Rating'] >= HARD_RATING]
medium_pool = [p for p in recent if MEDIUM_MIN <= p['Rating'] < HARD_RATING]

def spread_pick(pool, count):
    """Evenly sample 'count' items across the pool by rating."""
    if len(pool) <= count:
        return pool[:]
    step = len(pool) / count
    return [pool[int(i * step)] for i in range(count)]

hard_sel   = spread_pick(hard_pool, HARD_COUNT)
medium_sel = spread_pick(medium_pool, MEDIUM_COUNT)

all_sel = hard_sel + medium_sel
all_sel.sort(key=lambda x: x['ID'])

lines = ['const PROBLEMS = [']
for i, p in enumerate(all_sel):
    comma = ',' if i < len(all_sel) - 1 else ''
    diff  = 'Hard' if p['Rating'] >= HARD_RATING else 'Medium'
    lines.append(
        f'  {{ id: {p["ID"]}, title: {json.dumps(p["Title"])}, '
        f'titleSlug: {json.dumps(p["TitleSlug"])}, rating: {round(p["Rating"])}, '
        f'difficulty: "{diff}", contest: {json.dumps(p["ContestID_en"])}, '
        f'problemIndex: "{p["ProblemIndex"]}" }}{comma}'
    )
lines.append('];')
lines.append(f'\n// Total: {len(all_sel)} | Hard: {HARD_COUNT} | Medium: {MEDIUM_COUNT}')

with open('problems.js', 'w') as f:
    f.write('\n'.join(lines))

print(f"Generated {len(all_sel)} problems → problems.js")
```

### Step 3 — Commit the updated file
```bash
python3 gen_problems.py
git add problems.js
git commit -m "chore: update problem list ($(date +%Y-%m-%d))"
git push
```

---

## Adding / Removing Specific Problems

To manually add or remove a problem, edit `problems.js` directly.

Each entry must have:
```js
{
  id: 3456,                          // LeetCode problem number
  title: "Some Problem Title",       // Display title
  titleSlug: "some-problem-title",   // Used to build the LC URL
  rating: 2345,                      // Integer rating from zerotrac
  difficulty: "Hard",                // "Hard" or "Medium"
  contest: "Weekly Contest 410",     // Source contest
  problemIndex: "Q3"                 // Q1/Q2/Q3/Q4
}
```

The LeetCode URL is built as:
```
https://leetcode.com/problems/{titleSlug}/
```

---

## Notes for the LLM

- `data.json` is sorted by rating descending. The higher the rating, the harder the problem.
- Rating ≥ 2000 → typically **Hard** on LeetCode
- Rating 1400–2000 → typically **Medium** on LeetCode  
- Rating < 1400 → typically **Easy** (not included in Sick169)
- Problems are sorted by `ID` ascending in `problems.js` — this is the **fixed display order**.
- Do **not** change the `id` values; they map to LeetCode problem numbers.
- The `titleSlug` must exactly match the LeetCode URL slug.
