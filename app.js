/**
 * App.js — Actu du Jour Mobile PWA
 * Dynamic rendering, category filtering, search, and Web Speech API audio reader
 */

let newsData = null;
let activeCategory = 'all';
let searchQuery = '';
let currentSpeechUtterance = null;
let isPlayingAudio = false;

// DOM Elements
const newsContainer = document.getElementById('news-container');
const emptyState = document.getElementById('empty-state');
const currentDateEl = document.getElementById('current-date');
const dailySummaryTextEl = document.getElementById('daily-summary-text');
const keyTakeawaysListEl = document.getElementById('key-takeaways-list');
const searchInput = document.getElementById('search-input');
const btnClearSearch = document.getElementById('btn-clear-search');
const btnReadAll = document.getElementById('btn-read-all');
const audioPlayerBar = document.getElementById('audio-player-bar');
const audioCurrentTitle = document.getElementById('audio-current-title');
const btnAudioPlayPause = document.getElementById('btn-audio-play-pause');
const btnAudioStop = document.getElementById('btn-audio-stop');
const iconAudioPlay = document.getElementById('icon-audio-play');
const iconAudioPause = document.getElementById('icon-audio-pause');
const btnThemeToggle = document.getElementById('btn-theme-toggle');

// Colors helper
const categoryColors = {
  'eco-fin': { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  'politique': { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  'tech': { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
  'faits-divers': { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' }
};

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
  setupTheme();
  await loadNewsData();
  setupEventListeners();
});

// Load News JSON Data
async function loadNewsData() {
  try {
    const res = await fetch('data/news.json');
    newsData = await res.json();
    renderApp();
  } catch (err) {
    console.error('Erreur chargement news:', err);
    newsContainer.innerHTML = `<div class="p-4 bg-red-500/10 text-red-400 rounded-xl text-center text-sm">Impossible de charger les actualités.</div>`;
  }
}

// Render Header & Content
function renderApp() {
  if (!newsData) return;

  // Set date
  currentDateEl.textContent = newsData.formattedDate || newsData.date;
  dailySummaryTextEl.textContent = newsData.summary;

  // Key Takeaways
  keyTakeawaysListEl.innerHTML = newsData.keyTakeaways.map((item, idx) => `
    <li class="flex items-start gap-2.5 text-xs text-slate-200">
      <span class="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 font-bold text-[10px] mt-0.5">${idx + 1}</span>
      <span class="leading-snug">${item}</span>
    </li>
  `).join('');

  renderArticles();
}

// Filter and Render Articles
function renderArticles() {
  if (!newsData || !newsData.categories) return;

  let totalVisible = 0;
  let html = '';

  newsData.categories.forEach(cat => {
    // Category level filter
    if (activeCategory !== 'all' && activeCategory !== cat.id) return;

    // Filter items by search query
    const filteredItems = cat.items.filter(item => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return item.title.toLowerCase().includes(q) ||
             item.summary.toLowerCase().includes(q) ||
             (item.source && item.source.toLowerCase().includes(q));
    });

    if (filteredItems.length === 0) return;
    totalVisible += filteredItems.length;

    const style = categoryColors[cat.id] || { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/30' };

    html += `
      <section class="space-y-3">
        <div class="flex items-center gap-2 px-1">
          <span class="p-1 rounded-lg ${style.bg} ${style.text}">
            <i data-lucide="${cat.icon || 'bookmark'}" class="w-4 h-4"></i>
          </span>
          <h2 class="font-bold text-sm tracking-tight text-slate-200 uppercase">${cat.name}</h2>
          <span class="text-[11px] text-slate-500 font-medium font-mono">(${filteredItems.length})</span>
        </div>

        <div class="grid grid-cols-1 gap-3">
          ${filteredItems.map(item => `
            <article class="news-card group rounded-xl bg-slate-900/90 border border-slate-800/80 p-4 hover:border-slate-700 transition-all news-card-inner">
              <div class="flex items-center justify-between mb-2">
                <span class="text-[10px] font-semibold tracking-wider px-2 py-0.5 rounded-full ${style.bg} ${style.text} border ${style.border}">
                  ${item.badge || cat.name}
                </span>
                <span class="text-[11px] text-slate-500 flex items-center gap-1">
                  <i data-lucide="clock" class="w-3 h-3"></i> ${item.time}
                </span>
              </div>

              <h3 class="font-bold text-sm text-slate-100 group-hover:text-sky-400 transition-colors mb-2 leading-snug">
                ${item.title}
              </h3>

              <p class="text-xs text-slate-300 leading-relaxed mb-3">
                ${item.summary}
              </p>

              ${item.impact ? `
                <div class="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60 text-xs text-slate-400 mb-3 flex items-start gap-2">
                  <i data-lucide="alert-circle" class="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5"></i>
                  <span><strong class="text-slate-200 font-medium">Impact :</strong> ${item.impact}</span>
                </div>
              ` : ''}

              <div class="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/40">
                <span class="font-medium text-slate-400 flex items-center gap-1">
                  <i data-lucide="newspaper" class="w-3 h-3 text-slate-500"></i> ${item.source}
                </span>

                <button onclick="readArticleAudio('${item.id}')" class="text-sky-400 hover:text-sky-300 flex items-center gap-1 font-semibold hover:underline">
                  <i data-lucide="volume-2" class="w-3.5 h-3.5"></i> Écouter
                </button>
              </div>
            </article>
          `).join('')}
        </div>
      </section>
    `;
  });

  newsContainer.innerHTML = html;
  
  if (totalVisible === 0) {
    emptyState.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');
  }

  // Re-initialize Lucide Icons for dynamic content
  if (window.lucide) window.lucide.createIcons();
}

// Setup Event Listeners
function setupEventListeners() {
  // Category Navigation Tabs
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.nav-tab').forEach(t => {
        t.classList.remove('active', 'bg-sky-500', 'text-white', 'shadow-md');
        t.classList.add('bg-slate-900', 'text-slate-400');
      });

      const target = e.currentTarget;
      target.classList.add('active', 'bg-sky-500', 'text-white', 'shadow-md');
      target.classList.remove('bg-slate-900', 'text-slate-400');

      activeCategory = target.dataset.category;
      renderArticles();
    });
  });

  // Search Input
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    btnClearSearch.classList.toggle('hidden', searchQuery === '');
    renderArticles();
  });

  btnClearSearch.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    btnClearSearch.classList.add('hidden');
    renderArticles();
  });

  // Audio Controls
  btnReadAll.addEventListener('click', () => readFullSummaryAudio());
  btnAudioPlayPause.addEventListener('click', () => toggleAudioPlayPause());
  btnAudioStop.addEventListener('click', () => stopAudio());

  // Theme Toggle
  btnThemeToggle.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  });
}

// Web Speech API Integration
function readFullSummaryAudio() {
  if (!newsData) return;

  let textToRead = `Résumé de l'actualité du ${newsData.formattedDate}. `;
  textToRead += newsData.summary + " ";
  textToRead += "Voici les 3 points majeurs à retenir. ";
  newsData.keyTakeaways.forEach((k, i) => {
    textToRead += `Point ${i + 1} : ${k}. `;
  });

  speakText("Résumé Général", textToRead);
}

window.readArticleAudio = function(articleId) {
  if (!newsData) return;

  let foundItem = null;
  newsData.categories.forEach(c => {
    const item = c.items.find(i => i.id === articleId);
    if (item) foundItem = item;
  });

  if (foundItem) {
    const text = `${foundItem.title}. Source : ${foundItem.source}. ${foundItem.summary} ${foundItem.impact ? "Impact : " + foundItem.impact : ""}`;
    speakText(foundItem.title, text);
  }
};

function speakText(title, text) {
  if (!('speechSynthesis' in window)) {
    alert("La synthèse vocale n'est pas supportée par votre navigateur.");
    return;
  }

  window.speechSynthesis.cancel(); // Stop current speech

  currentSpeechUtterance = new SpeechSynthesisUtterance(text);
  currentSpeechUtterance.lang = 'fr-FR';
  currentSpeechUtterance.rate = 1.0;

  audioCurrentTitle.textContent = title;
  audioPlayerBar.classList.remove('translate-y-32');
  iconAudioPlay.classList.add('hidden');
  iconAudioPause.classList.remove('hidden');
  isPlayingAudio = true;

  currentSpeechUtterance.onend = () => {
    stopAudio();
  };

  currentSpeechUtterance.onerror = () => {
    stopAudio();
  };

  window.speechSynthesis.speak(currentSpeechUtterance);
}

function toggleAudioPlayPause() {
  if (!('speechSynthesis' in window)) return;

  if (window.speechSynthesis.speaking) {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      iconAudioPlay.classList.add('hidden');
      iconAudioPause.classList.remove('hidden');
      isPlayingAudio = true;
    } else {
      window.speechSynthesis.pause();
      iconAudioPlay.classList.remove('hidden');
      iconAudioPause.classList.add('hidden');
      isPlayingAudio = false;
    }
  }
}

function stopAudio() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  audioPlayerBar.classList.add('translate-y-32');
  isPlayingAudio = false;
}

// Theme setup
function setupTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light') {
    document.documentElement.classList.remove('dark');
  } else {
    document.documentElement.classList.add('dark');
  }
}
