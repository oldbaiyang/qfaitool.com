import './styles/index.css';
import { Router } from './router.js';
import { renderHeader, bindHeaderEvents } from './components/header.js';
import { renderHome } from './pages/home.js';
import { renderDomainConverter } from './pages/domain-converter.js';
import { initTheme } from './theme.js';

const app = document.getElementById('app');
const router = new Router();

function renderLayout(pageRenderer) {
  app.innerHTML = `
    ${renderHeader()}
    <main class="main-content" id="page-content"></main>
  `;
  bindHeaderEvents(router);
  pageRenderer(router);
}

// 注册路由
router
  .register('/', () => renderLayout(renderHome))
  .register('/domain-converter', () => renderLayout(renderDomainConverter));

// 初始化主题 + 启动路由
initTheme();
router.start();

