/**
 * App.js — Actu du Jour Mobile PWA
 * All Articles English by Default with EN->FR Translation & iOS Speech Synthesis Fix
 */

let newsData = null;
let activeCategory = 'all';
let searchQuery = '';
let isPlayingAudio = false;

// Per-article translation state tracker (true = translated to French, false = English original)
const articleTranslationState = {};

// Keep SpeechSynthesisUtterance in window scope to prevent iOS Safari garbage collection
window.currentUtterance = null;

// DOM Elements
const newsContainer = document.getElementById('news-container');
const emptyState = document.getElementById('empty-state');
const currentDateBadge = document.getElementById('current-date-badge');
const dailySummaryTextEl = document.getElementById('daily-summary-text');
const keyTakeawaysListEl = document.getElementById('key-takeaways-list');
const keyTakeawaysCard = document.getElementById('key-takeaways-card');
const searchInput = document.getElementById('search-input');
const btnClearSearch = document.getElementById('btn-clear-search');
const btnReadAll = document.getElementById('btn-read-all');
const audioPlayerBar = document.getElementById('audio-player-bar');
const audioCurrentTitle = document.getElementById('audio-current-title');
const btnAudioPlayPause = document.getElementById('btn-audio-play-pause');
const btnAudioStop = document.getElementById('btn-audio-stop');
const iconAudioPlay = document.getElementById('icon-audio-play');
const iconAudioPause = document.getElementById('icon-audio-pause');

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
  await loadNewsData();
  setupEventListeners();
  initSpeechSynthesisVoices();
});

// Warm up SpeechSynthesis voices for iOS Safari
function initSpeechSynthesisVoices() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.getVoices();
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
  }
}

// Load News JSON Data
async function loadNewsData() {
  try {
    const res = await fetch('data/news.json?v=' + Date.now());
    newsData = await res.json();
    renderApp();
  } catch (err) {
    console.error('Erreur chargement news:', err);
    newsContainer.innerHTML = `<div class="p-4 bg-[#1c1c1e] border border-white/10 text-[#8e8e93] rounded-xl text-center text-sm">Impossible de charger les actualités.</div>`;
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
      <li class="flex items-start gap-3 text-sm text-zinc-200">
        <span class="w-6 h-6 rounded-full bg-[#2c2c2e] text-[#8e8e93] border border-white/10 flex items-center justify-center shrink-0 font-semibold text-xs mt-0.5">${idx + 1}</span>
        <span class="leading-relaxed text-zinc-300 font-normal text-sm">${item}</span>
      </li>
    `).join('');
  }

  renderArticles();
}

// Filter and Render Articles (100% English Default with EN->FR Translation Button on EVERY Article)
function renderArticles() {
  if (!newsData || !newsData.categories) return;

  // Toggle "L'Essentiel du Matin" visibility: Show ONLY on "À la une" (all) tab when search is empty
  if (keyTakeawaysCard) {
    if (activeCategory === 'all' && searchQuery === '') {
      keyTakeawaysCard.classList.remove('hidden');
    } else {
      keyTakeawaysCard.classList.add('hidden');
    }
  }

  let totalVisible = 0;
  let html = '';

  newsData.categories.forEach(cat => {
    if (activeCategory !== 'all' && activeCategory !== cat.id) return;

    const filteredItems = cat.items.filter(item => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      const title = articleTranslationState[item.id] ? (item.titleFr || item.title) : item.title;
      const summary = articleTranslationState[item.id] ? (item.summaryFr || item.summary) : item.summary;
      return title.toLowerCase().includes(q) ||
             summary.toLowerCase().includes(q) ||
             (item.source && item.source.toLowerCase().includes(q));
    });

    if (filteredItems.length === 0) return;
    totalVisible += filteredItems.length;

    html += `
      <section class="space-y-3.5">
        <div class="flex items-center justify-between px-1 border-b border-white/10 pb-2">
          <h2 class="font-bold text-sm tracking-wider text-[#8e8e93] uppercase">${cat.name}</h2>
          <span class="text-xs font-medium text-[#8e8e93]">${filteredItems.length} article${filteredItems.length > 1 ? 's' : ''}</span>
        </div>

        <div class="grid grid-cols-1 gap-4">
          ${filteredItems.map(item => {
            const isTranslated = !!articleTranslationState[item.id];
            const displayTitle = isTranslated && item.titleFr ? item.titleFr : item.title;
            const displaySummary = isTranslated && item.summaryFr ? item.summaryFr : item.summary;
            const displayImpact = isTranslated && item.impactFr ? item.impactFr : item.impact;

            return `
              <article class="news-card group rounded-2xl bg-[#1c1c1e] border border-white/10 p-5 hover:border-white/20 transition-all news-card-inner shadow-lg">
                <div class="flex items-center justify-between mb-2.5">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-semibold tracking-wider px-3 py-1 rounded-full bg-[#3a3a3c] text-zinc-200">
                      ${item.badge || cat.name}
                    </span>
                    <button onclick="toggleTranslation('${item.id}')" class="text-xs font-medium px-3 py-1 rounded-full bg-[#2c2c2e] text-[#0a84ff] border border-white/10 hover:bg-[#3a3a3c] active:scale-95 transition-all flex items-center gap-1.5">
                      <span>${isTranslated ? 'Français' : 'English'}</span>
                      <span class="text-[11px] text-[#8e8e93] font-normal">(${isTranslated ? 'Original English' : 'Traduire en Français'})</span>
                    </button>
                  </div>
                  <span class="text-xs text-[#8e8e93] font-medium">
                    ${item.time}
                  </span>
                </div>

                <h3 class="font-bold text-base text-white group-hover:text-[#0a84ff] transition-colors mb-2 leading-snug tracking-tight">
                  ${displayTitle}
                </h3>

                <p class="text-sm text-zinc-300 leading-relaxed mb-3.5 font-normal">
                  ${displaySummary}
                </p>

                ${displayImpact ? `
                  <div class="p-3.5 rounded-xl bg-[#2c2c2e]/70 border border-white/5 text-sm text-zinc-300 mb-3.5 flex items-start gap-2.5">
                    <i data-lucide="info" class="w-4 h-4 text-[#0a84ff] shrink-0 mt-0.5"></i>
                    <span class="leading-relaxed text-sm"><strong class="text-white font-medium">Impact :</strong> ${displayImpact}</span>
                  </div>
                ` : ''}

                <div class="flex items-center justify-between text-xs text-[#8e8e93] pt-2.5 border-t border-white/10">
                  <span class="font-medium text-[#8e8e93] text-xs">
                    ${item.source}
                  </span>

                  <button onclick="readArticleAudio('${item.id}')" class="text-[#0a84ff] hover:underline flex items-center gap-1.5 font-semibold text-xs active:scale-95 transition-all">
                    <i data-lucide="play" class="w-3.5 h-3.5 fill-current"></i> Écouter
                  </button>
                </div>
              </article>
            `;
          }).join('')}
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

// Toggle translation per article
window.toggleTranslation = function(articleId) {
  articleTranslationState[articleId] = !articleTranslationState[articleId];
  renderArticles();
};

// Setup Event Listeners
function setupEventListeners() {
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.nav-tab').forEach(t => {
        t.classList.remove('active', 'bg-[#1c1c1e]', 'text-white', 'shadow-sm', 'font-semibold');
        t.classList.add('text-[#8e8e93]', 'font-medium');
      });

      const target = e.currentTarget;
      target.classList.add('active', 'bg-[#1c1c1e]', 'text-white', 'shadow-sm', 'font-semibold');
      target.classList.remove('text-[#8e8e93]', 'font-medium');

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
}

// Robust iOS Web Speech API Engine
function readFullSummaryAudio() {
  if (!newsData) return;

  let textToRead = `Daily News Summary for ${newsData.formattedDate}. `;
  textToRead += newsData.summary + " ";
  textToRead += "Here are the top three key takeaways. ";
  newsData.keyTakeaways.forEach((k, i) => {
    textToRead += `Point ${i + 1}: ${k}. `;
  });

  speakText("Daily News Summary", textToRead, 'en-US');
}

window.readArticleAudio = function(articleId) {
  if (!newsData) return;

  let foundItem = null;
  newsData.categories.forEach(c => {
    const item = c.items.find(i => i.id === articleId);
    if (item) foundItem = item;
  });

  if (foundItem) {
    const isTranslated = !!articleTranslationState[articleId];
    const title = isTranslated && foundItem.titleFr ? foundItem.titleFr : foundItem.title;
    const summary = isTranslated && foundItem.summaryFr ? foundItem.summaryFr : foundItem.summary;
    const impact = isTranslated && foundItem.impactFr ? foundItem.impactFr : foundItem.impact;
    const lang = isTranslated ? 'fr-FR' : 'en-US';

    const text = `${title}. Source: ${foundItem.source}. ${summary} ${impact ? "Impact: " + impact : ""}`;
    speakText(title, text, lang);
  }
};

function speakText(title, text, lang = 'en-US') {
  if (!('speechSynthesis' in window)) {
    alert("Speech synthesis is not supported on this browser.");
    return;
  }

  // iOS Safari Fix: Resume audio context inside direct user gesture
  window.speechSynthesis.resume();
  window.speechSynthesis.cancel();

  // Store utterance globally to prevent iOS Safari garbage collection
  window.currentUtterance = new SpeechSynthesisUtterance(text);
  window.currentUtterance.lang = lang;
  window.currentUtterance.rate = 1.0;
  window.currentUtterance.pitch = 1.0;

  // Try to find native voice matching lang
  const voices = window.speechSynthesis.getVoices();
  if (voices && voices.length > 0) {
    const targetVoice = voices.find(v => v.lang.toLowerCase().replace('_', '-').startsWith(lang.slice(0, 2)));
    if (targetVoice) {
      window.currentUtterance.voice = targetVoice;
    }
  }

  audioCurrentTitle.textContent = title;
  audioPlayerBar.classList.remove('translate-y-36');
  iconAudioPlay.classList.add('hidden');
  iconAudioPause.classList.remove('hidden');
  isPlayingAudio = true;

  window.currentUtterance.onend = () => stopAudio();
  window.currentUtterance.onerror = (e) => {
    console.error('Speech synthesis error:', e);
    stopAudio();
  };

  window.speechSynthesis.speak(window.currentUtterance);
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
