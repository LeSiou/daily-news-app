/**
 * App.js — Actu du Jour Mobile PWA
 * Pure Apple News Typographic Integration with Real-Time Google Translation
 */

let newsData = null;
let activeCategory = 'all';

const categoriesList = ['all', 'eco-fin', 'politique', 'tech', 'faits-divers'];

// Per-article translation state tracker (true = translated to French, false = English original)
const articleTranslationState = {};
const translatingArticles = {};

// Touch Swipe State
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;

// DOM Elements
const newsContainer = document.getElementById('news-container');
const emptyState = document.getElementById('empty-state');
const currentDateBadge = document.getElementById('current-date-badge');

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
  await loadNewsData();
  setupEventListeners();
  setupSwipeGestures();
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

// Client-side Google Translate API helper
async function translateText(text) {
  if (!text) return '';
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=fr&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data && data[0]) {
      return data[0].map(s => s[0]).join('');
    }
    return text;
  } catch (err) {
    console.error('Google Translate error:', err);
    return text;
  }
}

// Filter and Render Articles with Pure Apple News Typography
function renderArticles() {
  if (!newsData || !newsData.categories) return;

  let totalVisible = 0;
  let html = '';

  newsData.categories.forEach(cat => {
    if (activeCategory !== 'all' && activeCategory !== cat.id) return;

    const filteredItems = cat.items;
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
            const isFrenchNative = item.language === 'fr';
            const isTranslated = !!articleTranslationState[item.id];
            const isTranslating = !!translatingArticles[item.id];

            const displayTitle = (isTranslated && item.titleFr) ? item.titleFr : item.title;
            const displaySummary = (isTranslated && item.summaryFr) ? item.summaryFr : item.summary;
            const displayImpact = (isTranslated && item.impactFr) ? item.impactFr : item.impact;

            return `
              <article class="news-card group rounded-2xl bg-[#1c1c1e] border border-white/10 p-5 transition-all shadow-xl">
                
                <!-- Apple News Header Line: Source • Category • Time + Translation Action -->
                <div class="flex items-center justify-between text-xs text-[#8e8e93] uppercase font-semibold tracking-wider mb-2.5">
                  <div class="flex items-center gap-1.5 truncate">
                    <span>${item.source}</span>
                    <span>•</span>
                    <span class="text-slate-400 font-bold">${item.badge || cat.name}</span>
                    <span>•</span>
                    <span>${item.time}</span>
                  </div>

                  ${!isFrenchNative ? `
                    <button type="button" onclick="event.stopPropagation(); toggleTranslation('${item.id}');" class="text-xs font-semibold text-[#0a84ff] hover:underline focus:outline-none active:text-[#0a84ff] normal-case shrink-0 ml-2">
                      ${isTranslating ? 'Traduction...' : (isTranslated ? 'Afficher VO (EN)' : 'Traduire en FR')}
                    </button>
                  ` : `
                    <span class="text-[10px] font-mono text-[#8e8e93] bg-[#2c2c2e] px-1.5 py-0.5 rounded">FR</span>
                  `}
                </div>

                <!-- Article Title (ALWAYS Pure White) -->
                <h3 class="font-bold text-lg text-white mb-2.5 leading-snug tracking-tight">
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

// Toggle translation per article (with automatic client-side fallback)
window.toggleTranslation = async function(articleId) {
  if (translatingArticles[articleId]) return;

  const willBeTranslated = !articleTranslationState[articleId];
  articleTranslationState[articleId] = willBeTranslated;

  let targetItem = null;
  if (newsData && newsData.categories) {
    for (const cat of newsData.categories) {
      const found = cat.items.find(i => i.id === articleId);
      if (found) { targetItem = found; break; }
    }
  }

  // If user turns on translation and translation is missing or identical to EN
  if (willBeTranslated && targetItem && (!targetItem.titleFr || targetItem.titleFr === targetItem.title)) {
    translatingArticles[articleId] = true;
    renderArticles();

    try {
      targetItem.titleFr = await translateText(targetItem.title);
      targetItem.summaryFr = await translateText(targetItem.summary);
      if (targetItem.impact) {
        targetItem.impactFr = await translateText(targetItem.impact);
      }
    } catch (e) {
      console.error('Erreur traduction dynamic:', e);
    } finally {
      delete translatingArticles[articleId];
    }
  }

  renderArticles();
};

// Switch Category Helper
function switchCategory(catId) {
  activeCategory = catId;
  document.querySelectorAll('.nav-tab').forEach(t => {
    if (t.dataset.category === catId) {
      t.classList.add('active', 'bg-[#2c2c2e]', 'text-white', 'shadow-sm', 'font-semibold');
      t.classList.remove('text-[#8e8e93]', 'font-medium');
      t.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    } else {
      t.classList.remove('active', 'bg-[#2c2c2e]', 'text-white', 'shadow-sm', 'font-semibold');
      t.classList.add('text-[#8e8e93]', 'font-medium');
    }
  });
  renderArticles();
}

// Setup Event Listeners
function setupEventListeners() {
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      const catId = e.currentTarget.dataset.category;
      switchCategory(catId);
    });
  });
}

// iOS Swipe Gesture Engine (Slide Left / Right to Switch Categories)
function setupSwipeGestures() {
  document.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    touchEndY = e.changedTouches[0].screenY;
    handleSwipeGesture();
  }, { passive: true });
}

function handleSwipeGesture() {
  const deltaX = touchEndX - touchStartX;
  const deltaY = touchEndY - touchStartY;
  
  if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
    const currentIndex = categoriesList.indexOf(activeCategory);
    if (currentIndex === -1) return;

    if (deltaX < 0) {
      if (currentIndex < categoriesList.length - 1) {
        switchCategory(categoriesList[currentIndex + 1]);
      }
    } else {
      if (currentIndex > 0) {
        switchCategory(categoriesList[currentIndex - 1]);
      }
    }
  }
}
