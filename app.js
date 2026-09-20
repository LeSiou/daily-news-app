/**
 * App.js — Actu du Jour Mobile PWA (Apple HIG Edition)
 */

let newsData = null;
let activeCategory = 'all';
let searchQuery = '';
let currentSpeechUtterance = null;
let isPlayingAudio = false;

// DOM Elements
const newsContainer = document.getElementById('news-container');
const emptyState = document.getElementById('empty-state');
const currentDateBadge = document.getElementById('current-date-badge');
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

// Apple Colors map
const categoryStyles = {
  'eco-fin': { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', icon: 'trending-up' },
  'politique': { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30', icon: 'landmark' },
  'tech': { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30', icon: 'cpu' },
  'faits-divers': { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', icon: 'shield-alert' }
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
    newsContainer.innerHTML = `<div class="p-4 bg-red-500/10 text-red-400 rounded-2xl text-center text-sm">Impossible de charger les actualités.</div>`;
  }
}

// Render Header & Content
function renderApp() {
  if (!newsData) return;

  // Set date
  if (currentDateBadge) {
    currentDateBadge.textContent = newsData.formattedDate || newsData.date;
  }
  if (dailySummaryTextEl) {
    dailySummaryTextEl.textContent = newsData.summary;
  }

  // Key Takeaways list
  if (keyTakeawaysListEl) {
    keyTakeawaysListEl.innerHTML = newsData.keyTakeaways.map((item, idx) => `
      <li class="flex items-start gap-3 text-xs text-slate-200">
        <span class="w-5 h-5 rounded-full bg-ios-blue/20 text-ios-blue border border-ios-blue/30 flex items-center justify-center shrink-0 font-bold text-[10px] mt-0.5">${idx + 1}</span>
        <span class="leading-relaxed text-slate-300">${item}</span>
      </li>
    `).join('');
  }

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

    const style = categoryStyles[cat.id] || { bg: 'bg-ios-blue/15', text: 'text-ios-blue', border: 'border-ios-blue/30', icon: 'bookmark' };

    html += `
      <section class="space-y-3">
        <div class="flex items-center justify-between px-1">
          <div class="flex items-center gap-2">
            <span class="p-1 rounded-md ${style.bg} ${style.text}">
              <i data-lucide="${cat.icon}" class="w-4 h-4"></i>
            </span>
            <h2 class="font-bold text-sm tracking-tight text-white uppercase">${cat.name}</h2>
          </div>
          <span class="text-[11px] font-semibold text-ios-gray">${filteredItems.length} article${filteredItems.length > 1 ? 's' : ''}</span>
        </div>

        <div class="grid grid-cols-1 gap-3">
          ${filteredItems.map(item => `
            <article class="news-card group rounded-2xl bg-ios-gray6/90 border border-white/10 p-4 hover:border-white/20 transition-all news-card-inner backdrop-blur-lg shadow-lg">
              <div class="flex items-center justify-between mb-2">
                <span class="text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded-full ${style.bg} ${style.text} border ${style.border}">
                  ${item.badge || cat.name}
                </span>
                <span class="text-[11px] text-ios-gray flex items-center gap-1 font-medium">
                  <i data-lucide="clock" class="w-3 h-3"></i> ${item.time}
                </span>
              </div>

              <h3 class="font-bold text-sm text-white group-hover:text-ios-blue transition-colors mb-2 leading-snug tracking-tight">
                ${item.title}
              </h3>

              <p class="text-xs text-slate-300 leading-relaxed mb-3 font-normal">
                ${item.summary}
              </p>

              ${item.impact ? `
                <div class="p-3 rounded-xl bg-black/40 border border-white/5 text-xs text-slate-300 mb-3 flex items-start gap-2.5">
                  <i data-lucide="info" class="w-4 h-4 text-ios-blue shrink-0 mt-0.5"></i>
                  <span class="leading-relaxed"><strong class="text-white font-semibold">Impact :</strong> ${item.impact}</span>
                </div>
              ` : ''}

              <div class="flex items-center justify-between text-[11px] text-ios-gray pt-2 border-t border-white/5">
                <span class="font-medium text-ios-gray flex items-center gap-1.5">
                  <i data-lucide="newspaper" class="w-3.5 h-3.5 text-ios-gray2"></i> ${item.source}
                </span>

                <button onclick="readArticleAudio('${item.id}')" class="text-ios-blue hover:underline flex items-center gap-1 font-semibold active:scale-95 transition-all">
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

  if (window.lucide) window.lucide.createIcons();
}

// Setup Event Listeners
function setupEventListeners() {
  // Category Segmented Control Tabs
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.nav-tab').forEach(t => {
        t.classList.remove('active', 'bg-ios-card', 'text-white', 'shadow-md', 'border', 'border-white/10', 'font-semibold');
        t.classList.add('text-ios-gray', 'font-medium');
      });

      const target = e.currentTarget;
      target.classList.add('active', 'bg-ios-card', 'text-white', 'shadow-md', 'border', 'border-white/10', 'font-semibold');
      target.classList.remove('text-ios-gray', 'font-medium');

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

  speakText("Flash Actualités du Jour", textToRead);
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
    alert("La synthèse vocale n'est pas disponible.");
    return;
  }

  window.speechSynthesis.cancel();

  currentSpeechUtterance = new SpeechSynthesisUtterance(text);
  currentSpeechUtterance.lang = 'fr-FR';
  currentSpeechUtterance.rate = 1.0;

  audioCurrentTitle.textContent = title;
  audioPlayerBar.classList.remove('translate-y-36');
  iconAudioPlay.classList.add('hidden');
  iconAudioPause.classList.remove('hidden');
  isPlayingAudio = true;

  currentSpeechUtterance.onend = () => stopAudio();
  currentSpeechUtterance.onerror = () => stopAudio();

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
  audioPlayerBar.classList.add('translate-y-36');
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
