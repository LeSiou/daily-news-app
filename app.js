/**
 * App.js — Actu du Jour Mobile PWA
 * Pure Apple News Typographic Integration (ZERO Clutter, No Badges/Pills, Elegant Inline Translation)
 */

let newsData = null;
let activeCategory = 'all';
let searchQuery = '';

// Per-article translation state tracker (true = translated to French, false = English original)
const articleTranslationState = {};

// DOM Elements
const newsContainer = document.getElementById('news-container');
const emptyState = document.getElementById('empty-state');
const currentDateBadge = document.getElementById('current-date-badge');
const searchInput = document.getElementById('search-input');
const btnClearSearch = document.getElementById('btn-clear-search');

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
  await loadNewsData();
  setupEventListeners();
});

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

  renderArticles();
}

// Filter and Render Articles with Pure Apple News Typography
function renderArticles() {
  if (!newsData || !newsData.categories) return;

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
      <section class="space-y-4">
        <div class="flex items-center justify-between px-1 border-b border-white/10 pb-2">
          <h2 class="font-bold text-xs tracking-wider text-[#8e8e93] uppercase font-mono">${cat.name}</h2>
          <span class="text-xs font-medium text-[#8e8e93] font-mono">${filteredItems.length} article${filteredItems.length > 1 ? 's' : ''}</span>
        </div>

        <div class="grid grid-cols-1 gap-4">
          ${filteredItems.map(item => {
            const isTranslated = !!articleTranslationState[item.id];
            const displayTitle = isTranslated && item.titleFr ? item.titleFr : item.title;
            const displaySummary = isTranslated && item.summaryFr ? item.summaryFr : item.summary;
            const displayImpact = isTranslated && item.impactFr ? item.impactFr : item.impact;

            return `
              <article class="news-card group rounded-2xl bg-[#1c1c1e] border border-white/10 p-5 hover:border-white/20 transition-all shadow-xl">
                
                <!-- Apple News Header Line: Source • Category • Time + Translation Action -->
                <div class="flex items-center justify-between text-xs text-[#8e8e93] uppercase font-semibold tracking-wider mb-2.5">
                  <div class="flex items-center gap-1.5 truncate">
                    <span>${item.source}</span>
                    <span>•</span>
                    <span class="text-slate-400 font-bold">${item.badge || cat.name}</span>
                    <span>•</span>
                    <span>${item.time}</span>
                  </div>

                  <button onclick="toggleTranslation('${item.id}')" class="text-xs font-semibold text-[#0a84ff] hover:underline normal-case shrink-0 ml-2">
                    ${isTranslated ? 'Show EN' : 'Traduire FR'}
                  </button>
                </div>

                <!-- Article Title -->
                <h3 class="font-bold text-lg text-white group-hover:text-[#0a84ff] transition-colors mb-2.5 leading-snug tracking-tight">
                  ${displayTitle}
                </h3>

                <!-- Article Summary -->
                <p class="text-sm text-zinc-300 leading-relaxed font-normal mb-3">
                  ${displaySummary}
                </p>

                <!-- Impact Callout (Clean Left Border Line) -->
                ${displayImpact ? `
                  <div class="border-l-2 border-[#0a84ff] pl-3.5 py-1 text-xs text-zinc-400 font-normal mt-3 bg-black/20 rounded-r-lg">
                    <span class="text-white font-medium">Impact :</span> ${displayImpact}
                  </div>
                ` : ''}

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
        t.classList.remove('active', 'bg-[#2c2c2e]', 'text-white', 'shadow-sm', 'font-semibold');
        t.classList.add('text-[#8e8e93]', 'font-medium');
      });

      const target = e.currentTarget;
      target.classList.add('active', 'bg-[#2c2c2e]', 'text-white', 'shadow-sm', 'font-semibold');
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
}
