/**
 * 顶部导航组件
 */
import { getThemeIcon } from '../theme.js';
import { t, getLang, LANGUAGES } from '../i18n.js';

export function renderHeader() {
  const currentLang = getLang();
  const langOptions = LANGUAGES
    .map((l) => `<option value="${l.code}"${l.code === currentLang ? ' selected' : ''}>${l.label}</option>`)
    .join('');

  return `
    <header class="site-header">
      <div class="site-header__logo" id="header-logo">
        <span class="site-header__logo-icon">🛠️</span>
        <span class="site-header__logo-text">QFAITool</span>
      </div>
      <nav class="site-header__nav">
        <a href="#/" class="site-header__link">${t('home')}</a>
        <select class="lang-select" id="lang-select" title="Language">${langOptions}</select>
        <button class="theme-toggle" id="theme-toggle" title="切换主题">${getThemeIcon()}</button>
      </nav>
    </header>
  `;
}

/**
 * 绑定 Header 事件
 */
export function bindHeaderEvents(router) {
  const logo = document.getElementById('header-logo');
  if (logo) {
    logo.addEventListener('click', () => router.navigate(''));
  }
}
