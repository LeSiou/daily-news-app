/**
 * App.js — Actu du Jour Mobile PWA (Pure Apple HIG Edition)
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
    newsContainer.innerHTML = `<div class="p-4 bg-apple-card border border-apple-separator text-apple-gray rounded-xl text-center text-sm">Impossible de charger les actualités.</div>`;
  }
}

// Render Header & Content
function renderApp() {
  if (!newsData) return;

  if (currentDateBadge) {
    currentDateBadge.textContent = newsData.formattedDate || newsData.date;
  }
  if (dailySummaryTextEl) {
    dailySummaryTextEl.textContent = newsData.summary;
  }

  if (keyTakeawaysListEl) {
    keyTakeawaysListEl.innerHTML = newsData.keyTakeaways.map((item, idx) => `
      <li class="flex items-start gap-3 text-xs text-slate-200">
        <span class="w-5 h-5 rounded-full bg-apple-gray5 text-apple-gray border border-apple-separator flex items-center justify-center shrink-0 font-semibold text-[10px] mt-0.5">${idx + 1}</span>
        <span class="leading-relaxed text-slate-300 font-normal">${item}</span>
      </li>
    `).join('');
  }

  renderArticles();
}

// Filter and Render Articles (Pure Apple HIG Monochrome Palette)
function renderArticles() {
  if (!newsData || !newsData.categories) return;

  let totalVisible = 0;
  let html = '';

  newsData.categories.forEach(cat => {
    if (activeCategory !== 'all' && activeCategory !== cat.id) return;

    const filteredItems = cat.items.filter(item => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return item.title.toLowerCase().includes(q) ||
             item.summary.toLowerCase().includes(q) ||
             (item.source && item.source.toLowerCase().includes(q));
    });

    if (filteredItems.length === 0) return;
    totalVisible += filteredItems.length;

    html += `
      <section class="space-y-3">
        <div class="flex items-center justify-between px-1 border-b border-apple-separator pb-1.5">
          <h2 class="font-bold text-xs tracking-wider text-apple-gray uppercase">${cat.name}</h2>
          <span class="text-[11px] font-medium text-apple-gray">${filteredItems.length} article${filteredItems.length > 1 ? 's' : ''}</span>
        </div>

        <div class="grid grid-cols-1 gap-3">
          ${filteredItems.map(item => `
            <article class="news-card group rounded-2xl bg-apple-card border border-apple-separator p-4 hover:border-apple-gray4 transition-all news-card-inner">
              <div class="flex items-center justify-between mb-2">
                <span class="text-[10px] font-semibold tracking-wider px-2.5 py-0.5 rounded-full bg-apple-gray5 text-slate-300 border border-apple-separator">
                  ${item.badge || cat.name}
                </span>
                <span class="text-[11px] text-apple-gray font-medium">
                  ${item.time}
                </span>
              </div>

              <h3 class="font-bold text-sm text-white group-hover:text-apple-blue transition-colors mb-2 leading-snug tracking-tight">
                ${item.title}
              </h3>

              <p class="text-xs text-slate-300 leading-relaxed mb-3 font-normal">
                ${item.summary}
              </p>

              ${item.impact ? `
                <div class="p-3 rounded-xl bg-apple-gray5 border border-apple-separator text-xs text-slate-300 mb-3 flex items-start gap-2.5">
                  <i data-lucide="info" class="w-4 h-4 text-apple-blue shrink-0 mt-0.5"></i>
                  <span class="leading-relaxed"><strong class="text-white font-medium">Impact :</strong> ${item.impact}</span>
                </div>
              ` : ''}

              <div class="flex items-center justify-between text-[11px] text-apple-gray pt-2 border-t border-apple-separator">
                <span class="font-medium text-apple-gray">
                  ${item.source}
                </span>

                <button onclick="readArticleAudio('${item.id}')" class="text-apple-blue hover:underline flex items-center gap-1 font-semibold active:scale-95 transition-all">
                  <i data-lucide="play" class="w-3 h-3 fill-current"></i> Écouter
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
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.nav-tab').forEach(t => {
        t.classList.remove('active', 'bg-apple-card', 'text-white', 'shadow-sm', 'font-semibold');
        t.classList.add('text-apple-gray', 'font-medium');
      });

      const target = e.currentTarget;
      target.classList.add('active', 'bg-apple-card', 'text-white', 'shadow-sm', 'font-semibold');
      target.classList.remove('text-apple-gray', 'font-medium');

      activeCategory = target.dataset.category;
      renderArticles();
    });
  });

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

  btnReadAll.addEventListener('click', () => readFullSummaryAudio());
  btnAudioPlayPause.addEventListener('click', () => toggleAudioPlayPause());
  btnAudioStop.addEventListener('click', () => stopAudio());

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

function setupTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light') {
    document.documentElement.classList.remove('dark');
  } else {
    document.documentElement.classList.add('dark');
  }
}
