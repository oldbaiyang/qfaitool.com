import { tools, getAllTags, filterByTag } from '../tools/registry.js';
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
    </section>

    <div class="tag-filter" id="tag-filter">
      <button class="tag-filter__btn tag-filter__btn--active" data-tag="">${t('tagAll')}</button>
      ${allTags.map((tag) => `<button class="tag-filter__btn" data-tag="${tag}">${t('tag.' + tag)}</button>`).join('')}
    </div>

    <div class="tools-grid" id="tools-grid">
      ${tools.map((tool) => renderToolCard(tool)).join('')}
    </div>
  `;

  bindHomeEvents(router);
}

function bindHomeEvents(router) {
  // 标签过滤
  const filterContainer = document.getElementById('tag-filter');
  filterContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.tag-filter__btn');
    if (!btn) return;

    // 更新激活状态
    filterContainer.querySelectorAll('.tag-filter__btn').forEach((b) => b.classList.remove('tag-filter__btn--active'));
    btn.classList.add('tag-filter__btn--active');

    // 过滤工具
    const tag = btn.dataset.tag;
    const filtered = filterByTag(tag);
    const grid = document.getElementById('tools-grid');
    grid.innerHTML = filtered.map((tool) => renderToolCard(tool)).join('');

    // 重新绑定卡片点击
    bindCardClicks(router);
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
