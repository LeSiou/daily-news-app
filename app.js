/**
 * App.js — Actu du Jour Mobile PWA
 * Clean Apple HIG Interface (100% English Default with EN->FR Translation Toggle)
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
const dailySummaryTextEl = document.getElementById('daily-summary-text');
const keyTakeawaysListEl = document.getElementById('key-takeaways-list');
const keyTakeawaysCard = document.getElementById('key-takeaways-card');
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

// Filter and Render Articles
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
}
