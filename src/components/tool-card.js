/**
 * 工具卡片组件
 */
import { t } from '../i18n.js';

export function renderToolCard(tool) {
  const name = t(tool.nameKey);
  const desc = t(tool.descKey);
  const tagsHtml = tool.tags
    .map((tag) => `<span class="tool-card__tag">${t('tag.' + tag)}</span>`)
    .join('');

  return `
    <div class="tool-card" data-route="${tool.route}" id="tool-card-${tool.id}">
      <span class="tool-card__icon">${tool.icon}</span>
      <h3 class="tool-card__name">${name}</h3>
      <p class="tool-card__desc">${desc}</p>
      <div class="tool-card__tags">${tagsHtml}</div>
    </div>
  `;
}
