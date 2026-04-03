/**
 * Markdown 编辑器页面
 */
import { t } from '../i18n.js';
import { marked } from 'marked';

// 配置 marked 选项
marked.setOptions({
  breaks: true,
  gfm: true,
});

/**
 * 渲染 Markdown 编辑器页面
 */
export function renderMarkdownEditor(router) {
  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="tool-container">
      <div class="tool-header">
        <a href="#/" class="back-link">${t('backHome')}</a>
        <h2 class="tool-title">${t('mdTitle')}</h2>
        <p class="tool-desc">${t('mdDesc')}</p>
      </div>

      <div class="md-editor card">
        <div class="md-toolbar">
          <button class="btn btn--small" id="md-btn-fullscreen" title="${t('mdFullscreen')}">
            <span class="btn--icon">⛶</span> ${t('mdFullscreen')}
          </button>
          <button class="btn btn--small btn--outline" id="md-btn-copy">
            <span class="btn--icon">📋</span> ${t('btnCopy')}
          </button>
          <button class="btn btn--small btn--outline" id="md-btn-clear">
            <span class="btn--icon">🗑️</span> ${t('btnClear')}
          </button>
        </div>

        <div class="md-workspace">
          <div class="md-input-wrapper">
            <label class="md-label">${t('mdInputLabel')}</label>
            <textarea
              id="md-input"
              class="md-textarea"
              placeholder="${t('mdInputPlaceholder')}"
            ></textarea>
          </div>

          <div class="md-preview-wrapper">
            <label class="md-label">${t('mdPreviewLabel')}</label>
            <div id="md-preview" class="md-preview"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 全屏预览模态框 -->
    <div id="md-fullscreen-modal" class="md-modal">
      <div class="md-modal__header">
        <span class="md-modal__title">${t('mdPreviewLabel')}</span>
        <button class="md-modal__close" id="md-modal-close">✕</button>
      </div>
      <div id="md-modal-content" class="md-modal__content"></div>
    </div>
  `;

  bindMarkdownEvents();
}

function bindMarkdownEvents() {
  const input = document.getElementById('md-input');
  const preview = document.getElementById('md-preview');
  const fullscreenBtn = document.getElementById('md-btn-fullscreen');
  const copyBtn = document.getElementById('md-btn-copy');
  const clearBtn = document.getElementById('md-btn-clear');
  const modal = document.getElementById('md-fullscreen-modal');
  const modalClose = document.getElementById('md-modal-close');
  const modalContent = document.getElementById('md-modal-content');

  // 实时预览
  input.addEventListener('input', () => {
    updatePreview();
    injectCopyButtons(preview);
  });

  // 全屏预览
  fullscreenBtn.addEventListener('click', () => {
    modalContent.innerHTML = preview.innerHTML;
    injectCopyButtons(modalContent);
    modal.classList.add('md-modal--visible');
    document.body.style.overflow = 'hidden';
  });

  // 关闭全屏
  modalClose.addEventListener('click', () => {
    modal.classList.remove('md-modal--visible');
    document.body.style.overflow = '';
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('md-modal--visible');
      document.body.style.overflow = '';
    }
  });

  // 复制
  copyBtn.addEventListener('click', async () => {
    const text = input.value;
    if (!text.trim()) {
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      showToast(t('toastCopied'));
    } catch {
      showToast(t('toastCopyFail'));
    }
  });

  // 清空
  clearBtn.addEventListener('click', () => {
    input.value = '';
    updatePreview();
  });

  // 初始化示例内容
  input.value = `# ${t('mdSampleTitle')}

## ${t('mdSampleFeatures')}

- **${t('mdSampleBold')}** ${t('mdSampleBoldText')}
- *${t('mdSampleItalic')}* ${t('mdSampleItalicText')}
- \`${t('mdSampleCode')}\` ${t('mdSampleCodeText')}

## ${t('mdSampleList')}

1. ${t('mdSampleListItem1')}
2. ${t('mdSampleListItem2')}
3. ${t('mdSampleListItem3')}

## ${t('mdSampleLink')}

[${t('mdSampleLinkText')}](https://github.com)

## ${t('mdSampleQuote')}

> ${t('mdSampleQuoteText')}

---

${t('mdSampleHint')}
`;
  updatePreview();
}

function updatePreview() {
  const input = document.getElementById('md-input');
  const preview = document.getElementById('md-preview');
  const markdown = input.value;
  preview.innerHTML = marked.parse(markdown);
  injectCopyButtons(preview);
}

function injectCopyButtons(container) {
  const codeBlocks = container.querySelectorAll('pre');
  codeBlocks.forEach((pre) => {
    if (pre.querySelector('.copy-btn')) return;

    const code = pre.querySelector('code');
    if (!code) return;

    const btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.textContent = '📋';
    btn.title = t('btnCopy');

    btn.addEventListener('click', async () => {
      const text = code.textContent;
      try {
        await navigator.clipboard.writeText(text);
        btn.textContent = '✅';
        setTimeout(() => {
          btn.textContent = '📋';
        }, 1500);
      } catch {
        btn.textContent = '❌';
      }
    });

    pre.style.position = 'relative';
    pre.appendChild(btn);
  });
}

function showToast(message) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('toast--visible');
  setTimeout(() => toast.classList.remove('toast--visible'), 2000);
}
