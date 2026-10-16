/* ═══════════════════════════════════════════
   Sick169 — Application Logic
   ═══════════════════════════════════════════ */

'use strict';

/* ─── Storage ─────────────────────────────── */
const STORAGE_KEY = 'sick169_v1';

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const s = JSON.parse(raw);
    return {
      solved:          new Set(s.solved  || []),
      starred:         new Set(s.starred || []),
      visibleRatings:  new Set(s.visibleRatings || []),
      globalRating:    s.globalRating    || false,
      hideSolved:      s.hideSolved      || false,
      showStarred:     s.showStarred     || false,
      difficulty:      s.difficulty      || 'all',
      searchQuery:     s.searchQuery     || '',
    };
  } catch { return defaultState(); }
}

function defaultState() {
  return {
    solved:         new Set(),
    starred:        new Set(),
    visibleRatings: new Set(),
    globalRating:   false,
    hideSolved:     false,
    showStarred:    false,
    difficulty:     'all',
    searchQuery:    '',
  };
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      solved:         [...state.solved],
      starred:        [...state.starred],
      visibleRatings: [...state.visibleRatings],
      globalRating:   state.globalRating,
      hideSolved:     state.hideSolved,
      showStarred:    state.showStarred,
      difficulty:     state.difficulty,
      searchQuery:    state.searchQuery,
    }));
  } catch (e) {
    console.warn('Could not save state:', e);
  }
}

/* ─── Sound Engine ────────────────────────── */
let audioCtx = null;

function getAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playCheck() {
  try {
    const ctx = getAudio();
    const t = ctx.currentTime;
    // Satisfying "ding" – two quick sine tones
    [[440, 0.08], [660, 0.06]].forEach(([freq, delay]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, t + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.25);
      osc.start(t + delay);
      osc.stop(t + delay + 0.25);
    });
  } catch {}
}

function playUncheck() {
  try {
    const ctx = getAudio();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.exponentialRampToValueAtTime(250, t + 0.15);
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.start(t); osc.stop(t + 0.15);
  } catch {}
}

function playStar() {
  try {
    const ctx = getAudio();
    const t = ctx.currentTime;
    // Quick shimmer
    [0, 0.06, 0.12].forEach((delay, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.value = 880 * (i + 1) * 0.5;
      gain.gain.setValueAtTime(0.08, t + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.2);
      osc.start(t + delay); osc.stop(t + delay + 0.2);
    });
  } catch {}
}

function playUnstar() {
  try {
    const ctx = getAudio();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.2);
    gain.gain.setValueAtTime(0.07, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.start(t); osc.stop(t + 0.2);
  } catch {}
}

function playClick() {
  try {
    const ctx = getAudio();
    const t = ctx.currentTime;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass'; filter.frequency.value = 3000;
    src.buffer = buf;
    src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    gain.gain.value = 0.12;
    src.start(t);
  } catch {}
}

/* ─── State ───────────────────────────────── */
let state = loadState();
let focusedIndex = -1;   // index in filtered list
let filteredList = [];   // current visible problems

/* ─── DOM Refs ────────────────────────────── */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

let elList, elStats, elPercent, elRingFill, elRingText, elFilterCount;

/* ─── Burst Effect ────────────────────────── */
function spawnBurst(el, type) {
  const rect = el.getBoundingClientRect();
  const burst = document.createElement('div');
  burst.className = `burst ${type}-burst`;
  burst.style.cssText = `
    left: ${rect.left + rect.width / 2 - 15}px;
    top:  ${rect.top  + rect.height / 2 - 15}px;
    position: fixed;
    z-index: 9999;
  `;
  document.body.appendChild(burst);
  burst.addEventListener('animationend', () => burst.remove());
}

/* ─── Toast ───────────────────────────────── */
function toast(msg, type = 'info') {
  const container = $('#toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<div class="toast-dot"></div><span>${msg}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('removing');
    el.addEventListener('animationend', () => el.remove());
  }, 2500);
}

/* ─── Filtering ───────────────────────────── */
function applyFilters() {
  let list = PROBLEMS;

  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    list = list.filter(p =>
      p.title.toLowerCase().includes(q) ||
      String(p.id).includes(q)
    );
  }

  if (state.hideSolved) {
    list = list.filter(p => !state.solved.has(p.id));
  }

  if (state.showStarred) {
    list = list.filter(p => state.starred.has(p.id));
  }

  if (state.difficulty !== 'all') {
    list = list.filter(p => p.difficulty === state.difficulty);
  }

  return list;
}

/* ─── Render Stats ────────────────────────── */
function renderStats() {
  const totalSolved   = state.solved.size;
  const totalProblems = PROBLEMS.length;
  const hardProblems  = PROBLEMS.filter(p => p.difficulty === 'Hard');
  const medProblems   = PROBLEMS.filter(p => p.difficulty === 'Medium');
  const hardSolved    = hardProblems.filter(p => state.solved.has(p.id)).length;
  const medSolved     = medProblems.filter(p => state.solved.has(p.id)).length;
  const starCount     = state.starred.size;
  const pct           = totalProblems > 0 ? Math.round(totalSolved / totalProblems * 100) : 0;

  // Animate percent
  animateNumber(elPercent, parseInt(elPercent.textContent) || 0, pct, '%');

  // Ring
  const circumference = 201;
  const offset = circumference - (pct / 100) * circumference;
  elRingFill.style.strokeDashoffset = offset;
  elRingText.innerHTML = `${totalSolved}<small>/${totalProblems}</small>`;

  // Linear track
  const trackFill = document.getElementById('stats-track-fill');
  if (trackFill) trackFill.style.width = pct + '%';

  // Chips
  const hardChip    = $('#chip-hard');
  const medChip     = $('#chip-medium');
  const starChip    = $('#chip-starred');
  const hardTotal   = hardProblems.length;
  const medTotal    = medProblems.length;

  hardChip.querySelector('.count').textContent  = `${hardSolved}/${hardTotal}`;
  medChip.querySelector('.count').textContent   = `${medSolved}/${medTotal}`;
  starChip.querySelector('.count').textContent  = starCount;
}

function animateNumber(el, from, to, suffix = '') {
  if (from === to) { el.textContent = to + suffix; return; }
  const duration = 600;
  const start = performance.now();
  function step(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    const val = Math.round(from + (to - from) * ease);
    el.textContent = val + suffix;
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ─── Render Problem Card ─────────────────── */
function cardHTML(p, index) {
  const isSolved  = state.solved.has(p.id);
  const isStarred = state.starred.has(p.id);
  const ratingVis = state.globalRating || state.visibleRatings.has(p.id);

  const cardClasses = ['problem-card',
    isSolved  ? 'solved'  : '',
    isStarred ? 'starred' : '',
    focusedIndex === index ? 'focused' : '',
  ].filter(Boolean).join(' ');

  const ratingLabel = ratingVis
    ? `<span class="rating-val">${p.rating}</span>`
    : '···';

  const contestShort = p.contest
    .replace('Weekly Contest ', 'WC ')
    .replace('Biweekly Contest ', 'BC ');

  return `
  <div class="${cardClasses}"
       data-id="${p.id}"
       data-index="${index}"
       tabindex="0"
       role="row"
       aria-label="${p.title}, ${p.difficulty}${isSolved ? ', solved' : ''}">

    <div class="card-num">${index + 1}</div>

    <div class="card-main">
      <div class="card-title-row">
        <a class="problem-title"
           href="https://leetcode.com/problems/${p.titleSlug}/"
           target="_blank"
           rel="noopener noreferrer"
           title="${p.title} — LeetCode #${p.id}">
          ${p.title}
        </a>
        <span class="diff-badge ${p.difficulty}">${p.difficulty}</span>
      </div>
      <div class="card-meta">
        <span class="lc-id">#${p.id}</span>
        <span class="dot-sep"></span>
        <span class="contest-name">${contestShort} · ${p.problemIndex}</span>
      </div>
    </div>

    <div class="rating-cell">
      <button class="rating-btn ${ratingVis ? 'visible' : ''}"
              data-id="${p.id}"
              title="${ratingVis ? 'Rating: ' + p.rating : 'Reveal rating'}"
              aria-label="Toggle rating visibility">
        ${ratingLabel}
      </button>
    </div>

    <button class="star-btn ${isStarred ? 'starred' : ''}"
            data-id="${p.id}"
            title="${isStarred ? 'Unstar' : 'Star'}"
            aria-label="${isStarred ? 'Remove star' : 'Add star'}">
      <svg viewBox="0 0 24 24" fill="${isStarred ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
      </svg>
    </button>

    <button class="check-btn ${isSolved ? 'solved' : ''}"
            data-id="${p.id}"
            title="${isSolved ? 'Mark unsolved' : 'Mark solved'}"
            aria-label="${isSolved ? 'Mark as unsolved' : 'Mark as solved'}">
      <div class="check-box">
        <svg class="check-tick" viewBox="0 0 10 10" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="1.5,5 4,7.5 8.5,2"/>
        </svg>
      </div>
    </button>

  </div>`;
}

/* ─── Render List ─────────────────────────── */
function renderList() {
  filteredList = applyFilters();
  const count = filteredList.length;

  elFilterCount.textContent = `${count} problem${count !== 1 ? 's' : ''}`;

  if (count === 0) {
    elList.innerHTML = `
      <div class="empty-state" role="status">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <p>No problems match your filters.</p>
      </div>`;
    return;
  }

  // Clamp focused index
  if (focusedIndex >= count) focusedIndex = count - 1;

  elList.innerHTML = filteredList.map((p, i) => cardHTML(p, i)).join('');

  // Re-attach delegation (already on parent, no extra needed)
  // Scroll focused into view
  if (focusedIndex >= 0) {
    const el = elList.querySelector(`[data-index="${focusedIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }
}

/* ─── Toggle Handlers ─────────────────────── */
function toggleSolved(id, sourceEl) {
  const wasSolved = state.solved.has(id);
  if (wasSolved) {
    state.solved.delete(id);
    playUncheck();
  } else {
    state.solved.add(id);
    playCheck();
    if (sourceEl) spawnBurst(sourceEl, 'check');
  }
  saveState();
  renderStats();
  renderList();
}

function toggleStar(id, sourceEl) {
  const wasStarred = state.starred.has(id);
  if (wasStarred) {
    state.starred.delete(id);
    playUnstar();
  } else {
    state.starred.add(id);
    playStar();
    if (sourceEl) spawnBurst(sourceEl, 'star');
  }
  saveState();
  renderStats();
  renderList();
}

function toggleRating(id) {
  if (state.visibleRatings.has(id)) {
    state.visibleRatings.delete(id);
  } else {
    state.visibleRatings.add(id);
  }
  playClick();
  saveState();
  renderList();
}

/* ─── Event Delegation ────────────────────── */
function setupListEvents() {
  elList.addEventListener('click', (e) => {
    // Check button
    const checkBtn = e.target.closest('.check-btn');
    if (checkBtn) {
      e.preventDefault();
      const id = parseInt(checkBtn.dataset.id);
      toggleSolved(id, checkBtn);
      return;
    }

    // Star button
    const starBtn = e.target.closest('.star-btn');
    if (starBtn) {
      e.preventDefault();
      const id = parseInt(starBtn.dataset.id);
      toggleStar(id, starBtn);
      return;
    }

    // Rating button
    const ratingBtn = e.target.closest('.rating-btn');
    if (ratingBtn) {
      e.preventDefault();
      const id = parseInt(ratingBtn.dataset.id);
      toggleRating(id);
      return;
    }

    // Problem title (open in new tab) — handled by <a> naturally, but update focus
    const card = e.target.closest('.problem-card');
    if (card) {
      const idx = parseInt(card.dataset.index);
      if (!isNaN(idx)) {
        focusedIndex = idx;
        renderList();
      }
    }
  });
}

/* ─── Keyboard Navigation ─────────────────── */
function setupKeyboard() {
  document.addEventListener('keydown', (e) => {
    // Don't intercept when typing in inputs
    if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
      if (e.key === 'Escape') { e.target.blur(); return; }
      return;
    }

    const count = filteredList.length;

    switch (e.key) {
      case 'j':
      case 'ArrowDown':
        e.preventDefault();
        focusedIndex = Math.min(focusedIndex + 1, count - 1);
        renderList();
        break;

      case 'k':
      case 'ArrowUp':
        e.preventDefault();
        focusedIndex = Math.max(focusedIndex - 1, 0);
        renderList();
        break;

      case ' ':
      case 'Enter':
        if (focusedIndex >= 0 && focusedIndex < count) {
          e.preventDefault();
          const p = filteredList[focusedIndex];
          if (e.key === 'Enter') {
            // Open problem
            window.open(`https://leetcode.com/problems/${p.titleSlug}/`, '_blank');
          } else {
            // Space = toggle solved
            const card = elList.querySelector(`[data-index="${focusedIndex}"] .check-btn`);
            toggleSolved(p.id, card);
          }
        }
        break;

      case 's':
        if (focusedIndex >= 0 && focusedIndex < count) {
          e.preventDefault();
          const p = filteredList[focusedIndex];
          const card = elList.querySelector(`[data-index="${focusedIndex}"] .star-btn`);
          toggleStar(p.id, card);
        }
        break;

      case 'r':
        if (focusedIndex >= 0 && focusedIndex < count) {
          e.preventDefault();
          const p = filteredList[focusedIndex];
          toggleRating(p.id);
        }
        break;

      case '/':
        e.preventDefault();
        $('#search-input').focus();
        break;

      case 'Escape':
        focusedIndex = -1;
        renderList();
        break;
    }
  });
}

/* ─── Filter Controls ─────────────────────── */
function setupFilters() {
  // Hide Solved
  $('#btn-hide-solved').addEventListener('click', () => {
    state.hideSolved = !state.hideSolved;
    playClick();
    $('#btn-hide-solved').classList.toggle('active', state.hideSolved);
    saveState();
    focusedIndex = -1;
    renderList();
  });

  // Show Starred
  $('#btn-show-starred').addEventListener('click', () => {
    state.showStarred = !state.showStarred;
    playClick();
    $('#btn-show-starred').classList.toggle('active', state.showStarred);
    saveState();
    focusedIndex = -1;
    renderList();
  });

  // Difficulty buttons
  $$('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const diff = btn.dataset.diff;
      state.difficulty = diff;
      playClick();
      $$('.diff-btn').forEach(b => b.classList.toggle('active', b.dataset.diff === diff));
      saveState();
      focusedIndex = -1;
      renderList();
    });
  });

  // Global rating toggle
  $('#btn-global-rating').addEventListener('click', () => {
    state.globalRating = !state.globalRating;
    playClick();
    const btn = $('#btn-global-rating');
    btn.classList.toggle('active', state.globalRating);
    btn.title = state.globalRating ? 'Hide all ratings' : 'Show all ratings';
    saveState();
    renderList();
  });

  // Search
  $('#search-input').addEventListener('input', (e) => {
    state.searchQuery = e.target.value.trim();
    saveState();
    focusedIndex = -1;
    renderList();
  });
}

/* ─── Export / Import ─────────────────────── */
function exportData() {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    appName: 'Sick169',
    solved:  [...state.solved],
    starred: [...state.starred],
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `sick169_backup_${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Progress exported!', 'success');
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.version || !Array.isArray(data.solved)) {
        toast('Invalid backup file.', 'error');
        return;
      }
      // Validate IDs against known problems
      const validIds = new Set(PROBLEMS.map(p => p.id));
      const validSolved  = data.solved.filter(id => validIds.has(id));
      const validStarred = (data.starred || []).filter(id => validIds.has(id));
      state.solved  = new Set(validSolved);
      state.starred = new Set(validStarred);
      saveState();
      renderStats();
      renderList();
      toast(`Imported: ${validSolved.length} solved, ${validStarred.length} starred`, 'success');
    } catch {
      toast('Could not parse file.', 'error');
    }
  };
  reader.readAsText(file);
}

function setupImportExport() {
  $('#btn-export').addEventListener('click', () => { exportData(); });

  const importInput = $('#import-input');
  $('#btn-import').addEventListener('click', () => { importInput.click(); });

  importInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) { importData(file); }
    importInput.value = '';
  });

  // Drop zone on the whole page
  document.addEventListener('dragover', (e) => { e.preventDefault(); });
  document.addEventListener('drop', (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.json')) { importData(file); }
  });
}

/* ─── Restore Filter UI State ─────────────── */
function restoreFilterUI() {
  $('#btn-hide-solved').classList.toggle('active', state.hideSolved);
  $('#btn-show-starred').classList.toggle('active', state.showStarred);
  $('#btn-global-rating').classList.toggle('active', state.globalRating);
  $$('.diff-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.diff === state.difficulty);
  });
  if (state.searchQuery) {
    $('#search-input').value = state.searchQuery;
  }
}

/* ─── Init ────────────────────────────────── */
function init() {
  elList       = $('#problems-list');
  elStats      = $('#stats-bar');
  elPercent    = $('#stat-percent');
  elRingFill   = $('#ring-fill');
  elRingText   = $('#ring-text');
  elFilterCount = $('#filter-count');

  restoreFilterUI();
  setupListEvents();
  setupFilters();
  setupKeyboard();
  setupImportExport();

  // Initial render (animate in)
  renderStats();
  renderList();

  // Greeting
  const solvedCount = state.solved.size;
  if (solvedCount === 0) {
    setTimeout(() => toast('Welcome to Sick169 — 169 elite problems await.', 'info'), 800);
  } else {
    setTimeout(() => toast(`${solvedCount}/169 solved — keep going! 🔥`, 'info'), 800);
  }
}

document.addEventListener('DOMContentLoaded', init);
