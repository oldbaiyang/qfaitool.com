/**
 * 白名单列表对比工具页
 */
import { t } from '../i18n.js';

/**
 * 解析输入文本为去空行、去空格的集合
 */
function parseLines(text) {
    return new Set(
        text.split('\n')
            .map((l) => l.trim().toLowerCase())
            .filter((l) => l)
    );
}

/**
 * 对比两个白名单，返回 { removed, added }
 */
function diffWhitelist(oldText, newText) {
    const oldSet = parseLines(oldText);
    const newSet = parseLines(newText);

    const removed = [...oldSet].filter((item) => !newSet.has(item));
    const added = [...newSet].filter((item) => !oldSet.has(item));

    return { removed, added };
}

/**
 * 渲染白名单对比工具页
 */
export function renderWhitelistDiff(router) {
    const content = document.getElementById('page-content');
    content.innerHTML = `
    <div class="tool-page">
      <div class="tool-page__header">
        <button class="tool-page__back" id="btn-back">${t('backHome')}</button>
        <h1 class="tool-page__title">${t('wdTitle')}</h1>
        <p class="tool-page__desc">${t('wdDesc')}</p>
      </div>

      <div class="wd-inputs">
        <div class="converter-panel">
          <label class="converter-panel__label">${t('wdOldLabel')}</label>
          <textarea
            id="input-old"
            class="converter-panel__textarea"
            placeholder="${t('wdOldPlaceholder')}"
          ></textarea>
        </div>
        <div class="converter-panel">
          <label class="converter-panel__label">${t('wdNewLabel')}</label>
          <textarea
            id="input-new"
            class="converter-panel__textarea"
            placeholder="${t('wdNewPlaceholder')}"
          ></textarea>
        </div>
      </div>

      <div class="wd-actions">
        <button class="btn btn--primary" id="btn-compare">
          <span class="btn--icon">🔍</span> ${t('wdBtnCompare')}
        </button>
        <button class="btn btn--secondary" id="btn-clear">
          <span class="btn--icon">🗑️</span> ${t('btnClear')}
        </button>
      </div>

      <div class="wd-results" id="wd-results" style="display:none;">
        <div class="wd-result-panel wd-result-panel--removed">
          <div class="wd-result-panel__header">
            <span class="wd-result-panel__icon">🔴</span>
            <span class="wd-result-panel__title">${t('wdRemovedTitle')}</span>
            <span class="wd-result-panel__count" id="removed-count">0</span>
            <button class="btn btn--secondary btn--sm" id="btn-copy-removed">
              <span class="btn--icon">📋</span> ${t('btnCopy')}
            </button>
          </div>
          <textarea
            id="output-removed"
            class="converter-panel__textarea converter-panel__textarea--readonly wd-result-textarea"
            readonly
          ></textarea>
        </div>
        <div class="wd-result-panel wd-result-panel--added">
          <div class="wd-result-panel__header">
            <span class="wd-result-panel__icon">🟢</span>
            <span class="wd-result-panel__title">${t('wdAddedTitle')}</span>
            <span class="wd-result-panel__count" id="added-count">0</span>
            <button class="btn btn--secondary btn--sm" id="btn-copy-added">
              <span class="btn--icon">📋</span> ${t('btnCopy')}
            </button>
          </div>
          <textarea
            id="output-added"
            class="converter-panel__textarea converter-panel__textarea--readonly wd-result-textarea"
            readonly
          ></textarea>
        </div>
      </div>
    </div>

    <div class="toast" id="toast"></div>
  `;

    bindEvents(router);
}

function bindEvents(router) {
    document.getElementById('btn-back').addEventListener('click', () => {
        router.navigate('');
    });

    document.getElementById('btn-compare').addEventListener('click', () => {
        const oldText = document.getElementById('input-old').value;
        const newText = document.getElementById('input-new').value;
        const { removed, added } = diffWhitelist(oldText, newText);

        document.getElementById('output-removed').value = removed.join('\n');
        document.getElementById('output-added').value = added.join('\n');
        document.getElementById('removed-count').textContent = removed.length;
        document.getElementById('added-count').textContent = added.length;
        document.getElementById('wd-results').style.display = '';

        showToast(t('wdToastDone', removed.length, added.length));
    });

    document.getElementById('btn-clear').addEventListener('click', () => {
        document.getElementById('input-old').value = '';
        document.getElementById('input-new').value = '';
        document.getElementById('wd-results').style.display = 'none';
    });

    document.getElementById('btn-copy-removed').addEventListener('click', () => {
        copyText(document.getElementById('output-removed').value);
    });

    document.getElementById('btn-copy-added').addEventListener('click', () => {
        copyText(document.getElementById('output-added').value);
    });
}

async function copyText(text) {
    if (!text.trim()) {
        showToast(t('toastNothingToCopy'));
        return;
    }
    try {
        await navigator.clipboard.writeText(text);
        showToast(t('toastCopied'));
    } catch {
        showToast(t('toastCopyFail'));
    }
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('toast--visible');
    setTimeout(() => toast.classList.remove('toast--visible'), 2000);
}
