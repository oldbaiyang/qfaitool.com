import './styles/index.css';
import { Router } from './router.js';
import { renderHeader, bindHeaderEvents } from './components/header.js';
import { renderHome } from './pages/home.js';
import { renderDomainConverter } from './pages/domain-converter.js';
import { renderWhitelistDiff } from './pages/whitelist-diff.js';
import { renderYoutubeDownloader } from './pages/youtube-downloader.js';
import { renderQrScanner } from './pages/qr-scanner.js';
import { renderImageCompressor } from './pages/image-compressor.js';
import { renderRemoveBg } from './pages/remove-bg.js';
import { initTheme } from './theme.js';
import { setLang, t } from './i18n.js';

const app = document.getElementById('app');
const router = new Router();

/** 页面 SEO 配置 */
const pageMeta = {
  '/': () => ({
    title: `QFAITool - ${t('heroTitle')}`,
    desc: t('heroSubtitle'),
  }),
  '/domain-converter': () => ({
    title: `${t('dcTitle')} | QFAITool`,
    desc: t('dcDesc'),
  }),
  '/whitelist-diff': () => ({
    title: `${t('wdTitle')} | QFAITool`,
    desc: t('wdDesc'),
  }),
  '/youtube-downloader': () => ({
    title: `${t('ytTitle')} | QFAITool`,
    desc: t('ytDesc'),
  }),
  '/qr-scanner': () => ({
    title: `${t('qrTitle')} | QFAITool`,
    desc: t('qrDesc'),
  }),
  '/image-compressor': () => ({
    title: `${t('icTitle')} | QFAITool`,
    desc: t('icDesc'),
  }),
  '/remove-bg': () => ({
    title: `${t('rbTitle')} | QFAITool`,
    desc: t('rbDesc'),
  }),
};

function updateMeta(path) {
  const meta = (pageMeta[path] || pageMeta['/'])();
  document.title = meta.title;
  const descEl = document.querySelector('meta[name="description"]');
  if (descEl) descEl.setAttribute('content', meta.desc);
}

function renderLayout(pageRenderer, path) {
  app.innerHTML = `
    ${renderHeader()}
    <main class="main-content" id="page-content"></main>
  `;
  bindHeaderEvents(router);
  pageRenderer(router);
  updateMeta(path);
}

// 注册路由
router
  .register('/', (path) => renderLayout(renderHome, path))
  .register('/domain-converter', (path) => renderLayout(renderDomainConverter, path))
  .register('/whitelist-diff', (path) => renderLayout(renderWhitelistDiff, path))
  .register('/youtube-downloader', (path) => renderLayout(renderYoutubeDownloader, path))
  .register('/qr-scanner', (path) => renderLayout(renderQrScanner, path))
  .register('/image-compressor', (path) => renderLayout(renderImageCompressor, path))
  .register('/remove-bg', (path) => renderLayout(renderRemoveBg, path));

// 语言切换（事件委托，切换后重新渲染当前页面）
document.addEventListener('change', (e) => {
  if (e.target.id === 'lang-select') {
    setLang(e.target.value);
    router.start();
  }
});

// 初始化主题 + 启动路由
initTheme();
router.start();

