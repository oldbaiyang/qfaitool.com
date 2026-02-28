/**
 * 工具卡片组件
 */
export function renderToolCard(tool) {
    const tagsHtml = tool.tags
        .map((tag) => `<span class="tool-card__tag">${tag}</span>`)
        .join('');

    return `
    <div class="tool-card" data-route="${tool.route}" id="tool-card-${tool.id}">
      <span class="tool-card__icon">${tool.icon}</span>
      <h3 class="tool-card__name">${tool.name}</h3>
      <p class="tool-card__desc">${tool.description}</p>
      <div class="tool-card__tags">${tagsHtml}</div>
    </div>
  `;
}
