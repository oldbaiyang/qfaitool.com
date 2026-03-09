import { tools, getAllTags, filterByTag, searchTools } from '../tools/registry.js';
import { renderToolCard } from '../components/tool-card.js';
import { t } from '../i18n.js';

/**
 * 渲染首页
 */
export function renderHome(router) {
  const allTags = getAllTags();

  const content = document.getElementById('page-content');
  content.innerHTML = `
    <section class="home-hero">
      <h1 class="home-hero__title">${t('heroTitle')}</h1>
      <p class="home-hero__subtitle">${t('heroSubtitle')}</p>

      <div class="search-bar" id="search-bar">
        <span class="search-bar__icon">🔍</span>
        <input type="text" id="search-input" class="search-bar__input"
          placeholder="${t('searchPlaceholder')}" autocomplete="off" />
        <button class="search-bar__clear" id="search-clear" style="display:none;">✕</button>
      </div>
    </section>

    <div class="tag-filter" id="tag-filter">
      <button class="tag-filter__btn tag-filter__btn--active" data-tag="">${t('tagAll')}</button>
      ${allTags.map((tag) => `<button class="tag-filter__btn" data-tag="${tag}">${t('tag.' + tag)}</button>`).join('')}
    </div>

    <div class="tools-grid" id="tools-grid">
      ${tools.map((tool) => renderToolCard(tool)).join('')}
    </div>

    <p class="search-empty" id="search-empty" style="display:none;">${t('searchEmpty')}</p>
  `;

  bindHomeEvents(router);
}

function renderGrid(filtered, router) {
  const grid = document.getElementById('tools-grid');
  const empty = document.getElementById('search-empty');
  grid.innerHTML = filtered.map((tool) => renderToolCard(tool)).join('');
  empty.style.display = filtered.length === 0 ? '' : 'none';
  bindCardClicks(router);
}

function bindHomeEvents(router) {
  const searchInput = document.getElementById('search-input');
  const clearBtn = document.getElementById('search-clear');
  const filterContainer = document.getElementById('tag-filter');

  // 搜索
  searchInput.addEventListener('input', () => {
    const keyword = searchInput.value.trim();
    clearBtn.style.display = keyword ? '' : 'none';

    // 搜索时重置标签为"全部"
    filterContainer.querySelectorAll('.tag-filter__btn').forEach((b) => b.classList.remove('tag-filter__btn--active'));
    filterContainer.querySelector('[data-tag=""]').classList.add('tag-filter__btn--active');

    const filtered = searchTools(keyword, t);
    renderGrid(filtered, router);
  });

  // 清除搜索
  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearBtn.style.display = 'none';
    renderGrid(tools, router);
  });

  // 标签过滤
  filterContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.tag-filter__btn');
    if (!btn) return;

    // 清空搜索
    searchInput.value = '';
    clearBtn.style.display = 'none';

    // 更新激活状态
    filterContainer.querySelectorAll('.tag-filter__btn').forEach((b) => b.classList.remove('tag-filter__btn--active'));
    btn.classList.add('tag-filter__btn--active');

    // 过滤工具
    const tag = btn.dataset.tag;
    const filtered = filterByTag(tag);
    renderGrid(filtered, router);
  });

  // 卡片点击
  bindCardClicks(router);
}

function bindCardClicks(router) {
  document.querySelectorAll('.tool-card').forEach((card) => {
    card.addEventListener('click', () => {
      const route = card.dataset.route;
      if (route) {
        router.navigate(route.replace(/^\//, ''));
      }
    });
  });
}
