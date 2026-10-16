# Sick169

> **169 elite LeetCode problems. All from 2024 contests. Track your grind.**

[![GitHub Pages](https://img.shields.io/badge/Live-GitHub%20Pages-black?style=flat-square&logo=github)](https://sickboydroid.github.io/Leetcode69/)

---

## What is this?

Sick169 is a minimalist, premium problem tracker built around a hand-curated list of **169 LeetCode contest problems from 2024+**:

- **129 Hard** (rating ≥ 2000)
- **40 Medium** (rating 1400–2000)
- All sourced from Weekly/Biweekly contests starting January 2024
- Spread across rating bands for maximum variety — not just one topic

Problems are rated using the [Elo-based system](https://github.com/zerotrac/leetcode_problem_rating) by **zerotrac**, which gives a far more precise difficulty signal than LeetCode's own Easy/Medium/Hard labels.

---

## Features

| Feature | Detail |
|---------|--------|
| **Progress tracking** | Mark problems solved, see % completion and stats |
| **Star system** | Bookmark problems to revisit |
| **Hidden ratings** | Reveal individual or all ratings on demand |
| **Filters** | Hide solved, show starred, filter by difficulty |
| **Search** | Live title/ID search |
| **Keyboard nav** | Full keyboard control — `j/k`, `Space`, `s`, `r`, `/` |
| **Export / Import** | Save progress as JSON; import it back |
| **Sound effects** | Satisfying audio feedback via Web Audio API |
| **No account needed** | All data stored locally in your browser |

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `j` / `↓` | Move focus down |
| `k` / `↑` | Move focus up |
| `Enter` | Open focused problem in new tab |
| `Space` | Toggle solved on focused problem |
| `s` | Toggle star on focused problem |
| `r` | Toggle rating visibility on focused problem |
| `/` | Focus search bar |
| `Esc` | Clear focus |

---

## Data & Privacy

- **Zero backend.** All state is stored in `localStorage`.
- **No tracking.** No analytics, no cookies, no accounts.
- **Export anytime.** Use the Export button to download a `.json` backup.
- **Import anywhere.** Load your backup on any browser.

---

## Updating the Problem List

See [`PROBLEMS.md`](PROBLEMS.md) for a complete guide (written for humans and LLMs) on how to:
- Fetch fresh rating data from [zerotrac/leetcode_problem_rating](https://github.com/zerotrac/leetcode_problem_rating)
- Re-generate the curated list with custom filters
- Manually add or remove specific problems

---

## Tech Stack

- Pure **HTML + CSS + Vanilla JS** — zero dependencies, zero build step
- **Inter** + **JetBrains Mono** fonts (Google Fonts)
- **Web Audio API** for synthesized sound effects
- **GitHub Pages** for hosting (deploys automatically from `main`)

---

## Credits

- Problem ratings by [zerotrac/leetcode_problem_rating](https://github.com/zerotrac/leetcode_problem_rating)
- Built by [sickboydroid](https://github.com/sickboydroid)

---

## License

MIT
