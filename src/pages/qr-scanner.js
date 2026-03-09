/**
 * 二维码识别工具页
 * 支持：文件上传、剪切板粘贴、拖拽上传
 * 解码策略：BarcodeDetector API（原生，最强）→ jsQR 多分辨率降级
 */
import jsQR from 'jsqr';
import { t } from '../i18n.js';

const HISTORY_KEY = 'qr-history';
const MAX_HISTORY = 20;

function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('toast--visible');
    setTimeout(() => toast.classList.remove('toast--visible'), 2000);
}

/** 读取解码历史 */
function getHistory() {
    try {
        return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    } catch { return []; }
}

/** 保存一条解码记录 */
function saveHistory(result, thumbnail) {
    const history = getHistory();
    history.unshift({
        result,
        thumbnail,
        time: Date.now(),
    });
    if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

/** 清空历史 */
function clearHistory() {
    localStorage.removeItem(HISTORY_KEY);
}

/** 格式化时间 */
function formatTime(ts) {
    const d = new Date(ts);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 判断是否为 URL */
function isUrl(s) {
    try { new URL(s); return true; } catch { return false; }
}

// ========== 解码引擎 ==========

function tryJsQR(img, scale) {
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);
    const code = jsQR(imageData.data, w, h);
    return code ? code.data : null;
}

function tryJsQRBinarized(img) {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        const val = gray < 128 ? 0 : 255;
        data[i] = data[i + 1] = data[i + 2] = val;
    }
    const code = jsQR(data, canvas.width, canvas.height);
    return code ? code.data : null;
}

async function decodeImage(img) {
    // 策略 1：浏览器原生 BarcodeDetector
    if ('BarcodeDetector' in window) {
        try {
            const detector = new BarcodeDetector({ formats: ['qr_code'] });
            const results = await detector.detect(img);
            if (results.length > 0) return results[0].rawValue;
        } catch { /* fall through */ }
    }

    // 策略 2：jsQR 多分辨率
    const scales = [1, 0.75, 0.5, 1.5, 2];
    for (const scale of scales) {
        const result = tryJsQR(img, scale);
        if (result) return result;
    }

    // 策略 3：jsQR 二值化增强
    return tryJsQRBinarized(img);
}

function processImage(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = async () => {
            // 缩略图
            const thumbCanvas = document.createElement('canvas');
            const thumbSize = 80;
            const ratio = Math.min(thumbSize / img.width, thumbSize / img.height, 1);
            thumbCanvas.width = Math.round(img.width * ratio);
            thumbCanvas.height = Math.round(img.height * ratio);
            thumbCanvas.getContext('2d').drawImage(img, 0, 0, thumbCanvas.width, thumbCanvas.height);

            // 预览图
            const previewCanvas = document.createElement('canvas');
            const maxPreview = 400;
            const pRatio = Math.min(maxPreview / img.width, maxPreview / img.height, 1);
            previewCanvas.width = Math.round(img.width * pRatio);
            previewCanvas.height = Math.round(img.height * pRatio);
            previewCanvas.getContext('2d').drawImage(img, 0, 0, previewCanvas.width, previewCanvas.height);

            const result = await decodeImage(img);
            resolve({
                result,
                imgSrc: previewCanvas.toDataURL(),
                thumbnail: thumbCanvas.toDataURL('image/jpeg', 0.6),
            });
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = URL.createObjectURL(file);
    });
}

function getImageFile(dataTransfer) {
    const items = dataTransfer.items || [];
    for (const item of items) {
        if (item.type.startsWith('image/')) return item.getAsFile();
    }
    const files = dataTransfer.files || [];
    for (const file of files) {
        if (file.type.startsWith('image/')) return file;
    }
    return null;
}

// ========== 渲染 ==========

function renderHistoryList() {
    const history = getHistory();
    const container = document.getElementById('qr-history-list');
    const emptyEl = document.getElementById('qr-history-empty');
    const clearBtn = document.getElementById('btn-clear-history');

    if (history.length === 0) {
        container.innerHTML = '';
        emptyEl.style.display = '';
        clearBtn.style.display = 'none';
        return;
    }

    emptyEl.style.display = 'none';
    clearBtn.style.display = '';
    container.innerHTML = history.map((item) => {
        const resultText = item.result.length > 80 ? item.result.slice(0, 80) + '...' : item.result;
        const urlBadge = isUrl(item.result) ? `<span class="qr-history__badge">URL</span>` : '';
        return `
      <div class="qr-history__item" data-result="${item.result.replace(/"/g, '&quot;')}">
        <img class="qr-history__thumb" src="${item.thumbnail}" alt="QR" />
        <div class="qr-history__info">
          <p class="qr-history__text">${resultText} ${urlBadge}</p>
          <p class="qr-history__time">${formatTime(item.time)}</p>
        </div>
        <button class="qr-history__copy" title="${t('btnCopy')}">📋</button>
      </div>
    `;
    }).join('');
}

export function renderQrScanner(router) {
    const content = document.getElementById('page-content');
    content.innerHTML = `
    <div class="tool-page">
      <button class="btn btn--ghost btn--sm" id="btn-back">${t('backHome')}</button>

      <div class="tool-page__header">
        <h1 class="tool-page__title">${t('qrTitle')}</h1>
        <p class="tool-page__desc">${t('qrDesc')}</p>
      </div>

      <!-- 上传区 -->
      <div class="qr-drop-zone" id="qr-drop-zone">
        <div class="qr-drop-zone__content">
          <span class="qr-drop-zone__icon">📷</span>
          <p class="qr-drop-zone__text">${t('qrDropText')}</p>
          <p class="qr-drop-zone__hint">${t('qrDropHint')}</p>
          <div class="qr-drop-zone__actions">
            <label class="btn btn--primary btn--md" for="qr-file-input">
              <span class="btn--icon">📁</span> ${t('qrBtnUpload')}
            </label>
            <button class="btn btn--secondary btn--md" id="btn-paste">
              <span class="btn--icon">📋</span> ${t('qrBtnPaste')}
            </button>
          </div>
          <input type="file" id="qr-file-input" accept="image/*" style="display:none;" />
        </div>
      </div>

      <!-- 识别结果 -->
      <div class="qr-result" id="qr-result" style="display:none;">
        <div class="qr-result__preview">
          <img id="qr-preview-img" class="qr-result__img" src="" alt="QR code" />
        </div>
        <div class="qr-result__content">
          <label class="converter-panel__label">${t('qrResultLabel')}</label>
          <div class="qr-result__text-wrap">
            <pre class="qr-result__text" id="qr-result-text"></pre>
            <button class="btn btn--secondary btn--sm qr-copy-btn" id="btn-copy-result">
              <span class="btn--icon">📋</span> ${t('btnCopy')}
            </button>
          </div>
          <div class="qr-result__actions" id="qr-result-actions"></div>
        </div>
      </div>

      <!-- 功能介绍 -->
      <div class="qr-features">
        <h2 class="qr-features__title">${t('qrFeaturesTitle')}</h2>
        <div class="qr-features__grid">
          <div class="qr-feature-card">
            <span class="qr-feature-card__icon">🔒</span>
            <h3 class="qr-feature-card__title">${t('qrFeature1Title')}</h3>
            <p class="qr-feature-card__desc">${t('qrFeature1Desc')}</p>
          </div>
          <div class="qr-feature-card">
            <span class="qr-feature-card__icon">⚡</span>
            <h3 class="qr-feature-card__title">${t('qrFeature2Title')}</h3>
            <p class="qr-feature-card__desc">${t('qrFeature2Desc')}</p>
          </div>
          <div class="qr-feature-card">
            <span class="qr-feature-card__icon">📋</span>
            <h3 class="qr-feature-card__title">${t('qrFeature3Title')}</h3>
            <p class="qr-feature-card__desc">${t('qrFeature3Desc')}</p>
          </div>
          <div class="qr-feature-card">
            <span class="qr-feature-card__icon">🕐</span>
            <h3 class="qr-feature-card__title">${t('qrFeature4Title')}</h3>
            <p class="qr-feature-card__desc">${t('qrFeature4Desc')}</p>
          </div>
        </div>
      </div>

      <!-- 最近解码历史 -->
      <div class="qr-history">
        <div class="qr-history__header">
          <h2 class="qr-history__title">${t('qrHistoryTitle')}</h2>
          <button class="btn btn--ghost btn--sm" id="btn-clear-history" style="display:none;">${t('qrHistoryClear')}</button>
        </div>
        <div class="qr-history__list" id="qr-history-list"></div>
        <p class="qr-history__empty" id="qr-history-empty">${t('qrHistoryEmpty')}</p>
      </div>
    </div>

    <div class="toast" id="toast"></div>
  `;

    renderHistoryList();
    bindEvents(router);
}

function bindEvents(router) {
    document.getElementById('btn-back').addEventListener('click', () => {
        router.navigate('');
    });

    const dropZone = document.getElementById('qr-drop-zone');
    const fileInput = document.getElementById('qr-file-input');

    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) await handleFile(file);
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('qr-drop-zone--active');
    });
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('qr-drop-zone--active');
    });
    dropZone.addEventListener('drop', async (e) => {
        e.preventDefault();
        dropZone.classList.remove('qr-drop-zone--active');
        const file = getImageFile(e.dataTransfer);
        if (file) await handleFile(file);
    });

    document.getElementById('btn-paste').addEventListener('click', async () => {
        try {
            const clipboardItems = await navigator.clipboard.read();
            for (const item of clipboardItems) {
                const imageType = item.types.find((t) => t.startsWith('image/'));
                if (imageType) {
                    const blob = await item.getType(imageType);
                    await handleFile(blob);
                    return;
                }
            }
            showToast(t('qrToastNoImage'));
        } catch {
            showToast(t('qrToastClipError'));
        }
    });

    document.addEventListener('paste', async (e) => {
        const file = getImageFile(e.clipboardData);
        if (file) {
            e.preventDefault();
            await handleFile(file);
        }
    });

    document.getElementById('btn-copy-result').addEventListener('click', async () => {
        const text = document.getElementById('qr-result-text').textContent;
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            showToast(t('toastCopied'));
        } catch {
            showToast(t('toastCopyFail'));
        }
    });

    // 清空历史
    document.getElementById('btn-clear-history').addEventListener('click', () => {
        clearHistory();
        renderHistoryList();
        showToast(t('qrHistoryCleared'));
    });

    // 历史列表点击（事件委托）
    document.getElementById('qr-history-list').addEventListener('click', async (e) => {
        const copyBtn = e.target.closest('.qr-history__copy');
        if (copyBtn) {
            const item = copyBtn.closest('.qr-history__item');
            const result = item.dataset.result;
            try {
                await navigator.clipboard.writeText(result);
                showToast(t('toastCopied'));
            } catch {
                showToast(t('toastCopyFail'));
            }
        }
    });
}

async function handleFile(file) {
    try {
        const { result, imgSrc, thumbnail } = await processImage(file);
        const resultEl = document.getElementById('qr-result');
        const textEl = document.getElementById('qr-result-text');
        const imgEl = document.getElementById('qr-preview-img');
        const actionsEl = document.getElementById('qr-result-actions');

        imgEl.src = imgSrc;
        resultEl.style.display = '';

        if (result) {
            textEl.textContent = result;
            actionsEl.innerHTML = '';
            if (isUrl(result)) {
                actionsEl.innerHTML = `
          <a class="btn btn--primary btn--sm" href="${result}" target="_blank" rel="noopener noreferrer">
            <span class="btn--icon">🔗</span> ${t('qrBtnOpen')}
          </a>
        `;
            }
            // 保存到历史并刷新列表
            saveHistory(result, thumbnail);
            renderHistoryList();
            showToast(t('qrToastSuccess'));
        } else {
            textEl.textContent = t('qrToastFail');
            actionsEl.innerHTML = '';
            showToast(t('qrToastFail'));
        }
    } catch {
        showToast(t('qrToastError'));
    }
}
