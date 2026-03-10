/**
 * 二维码识别工具页
 * 支持：文件上传（图片/PDF）、剪切板粘贴、拖拽上传
 * 解码策略：BarcodeDetector API（原生，最强）→ jsQR 多分辨率降级
 */
import jsQR from 'jsqr';
import * as pdfjsLib from 'pdfjs-dist';
import { t } from '../i18n.js';

// 配置 pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).toString();

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

/** 解码图像中的所有二维码，返回去重数组 */
async function decodeImage(img) {
  const found = [];

  // 策略 1：浏览器原生 BarcodeDetector（天然支持多结果）
  if ('BarcodeDetector' in window) {
    try {
      const detector = new BarcodeDetector({ formats: ['qr_code'] });
      const results = await detector.detect(img);
      for (const r of results) {
        if (r.rawValue && !found.includes(r.rawValue)) found.push(r.rawValue);
      }
      if (found.length > 0) return found;
    } catch { /* fall through */ }
  }

  // 策略 2：jsQR 多分辨率（仅能识别单个，作为降级兜底）
  const scales = [1, 0.75, 0.5, 1.5, 2];
  for (const scale of scales) {
    const result = tryJsQR(img, scale);
    if (result && !found.includes(result)) {
      found.push(result);
      return found;
    }
  }

  // 策略 3：jsQR 二值化增强
  const binResult = tryJsQRBinarized(img);
  if (binResult && !found.includes(binResult)) found.push(binResult);

  return found;
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

      const results = await decodeImage(img);
      resolve({
        results,
        imgSrc: previewCanvas.toDataURL(),
        thumbnail: thumbCanvas.toDataURL('image/jpeg', 0.6),
      });
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/** PDF 文件处理：逐页渲染并扫描所有二维码 */
async function processPdf(file, onProgress) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const totalPages = pdf.numPages;
  const allResults = [];
  let firstPreviewSrc = null;
  let firstThumbSrc = null;

  // 每页尝试多个渲染倍率，提高识别率
  const renderScales = [2, 3, 1.5, 1, 4];

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    if (onProgress) onProgress(pageNum, totalPages, allResults.length);

    const page = await pdf.getPage(pageNum);
    let pageResults = [];

    for (const scale of renderScales) {
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport }).promise;

      // 第一页、第一个倍率生成预览和缩略图
      if (pageNum === 1 && !firstPreviewSrc) {
        const previewCanvas = document.createElement('canvas');
        const maxPreview = 400;
        const pRatio = Math.min(maxPreview / canvas.width, maxPreview / canvas.height, 1);
        previewCanvas.width = Math.round(canvas.width * pRatio);
        previewCanvas.height = Math.round(canvas.height * pRatio);
        previewCanvas.getContext('2d').drawImage(canvas, 0, 0, previewCanvas.width, previewCanvas.height);
        firstPreviewSrc = previewCanvas.toDataURL();

        const thumbCanvas = document.createElement('canvas');
        const thumbSize = 80;
        const tRatio = Math.min(thumbSize / canvas.width, thumbSize / canvas.height, 1);
        thumbCanvas.width = Math.round(canvas.width * tRatio);
        thumbCanvas.height = Math.round(canvas.height * tRatio);
        thumbCanvas.getContext('2d').drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
        firstThumbSrc = thumbCanvas.toDataURL('image/jpeg', 0.6);
      }

      const bitmap = await createImageBitmap(canvas);
      pageResults = await decodeImage(bitmap);
      if (pageResults.length > 0) break; // 该倍率识别成功，跳出重试
    }

    for (const r of pageResults) {
      if (!allResults.includes(r)) allResults.push(r);
    }
  }

  return {
    results: allResults,
    imgSrc: firstPreviewSrc,
    thumbnail: firstThumbSrc,
  };
}

function isSupportedFile(type) {
  return type.startsWith('image/') || type === 'application/pdf';
}

function getSupportedFile(dataTransfer) {
  const items = dataTransfer.items || [];
  for (const item of items) {
    if (isSupportedFile(item.type)) return item.getAsFile();
  }
  const files = dataTransfer.files || [];
  for (const file of files) {
    if (isSupportedFile(file.type)) return file;
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
  container.innerHTML = history.map((item, index) => {
    const resultText = item.result.length > 80 ? item.result.slice(0, 80) + '...' : item.result;
    const urlBadge = isUrl(item.result) ? `<span class="qr-history__badge">URL</span>` : '';
    return `
      <div class="qr-history__item" data-result="${item.result.replace(/"/g, '&quot;')}" data-index="${index}">
        <img class="qr-history__thumb" src="${item.thumbnail}" alt="QR" />
        <div class="qr-history__info">
          <p class="qr-history__text">${resultText} ${urlBadge}</p>
          <p class="qr-history__time">${formatTime(item.time)}</p>
        </div>
        <button class="qr-history__copy" title="${t('btnCopy')}">📋</button>
        <button class="qr-history__delete" title="删除">✕</button>
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

      <!-- 工作区：上传 + 结果 -->
      <div class="qr-workspace">
        <!-- 上传区 -->
        <div class="qr-drop-zone" id="qr-drop-zone">
          <div class="qr-drop-zone__content" id="qr-upload-content">
            <span class="qr-drop-zone__icon">📷</span>
            <p class="qr-drop-zone__hint">${t('qrDropHint')}</p>
            <div class="qr-drop-zone__actions">
              <label class="btn btn--primary btn--sm" for="qr-file-input">
                <span class="btn--icon">📁</span> ${t('qrBtnUpload')}
              </label>
              <button class="btn btn--secondary btn--sm" id="btn-paste">
                <span class="btn--icon">📋</span> ${t('qrBtnPaste')}
              </button>
            </div>
            <input type="file" id="qr-file-input" accept="image/*,.pdf" style="display:none;" />
          </div>
          <div class="qr-drop-zone__preview" id="qr-upload-preview" style="display:none;">
            <img id="qr-preview-img" class="qr-drop-zone__preview-img" src="" alt="QR" />
            <label class="btn btn--ghost btn--sm qr-drop-zone__re-upload" for="qr-file-input">重新上传</label>
            <input type="file" id="qr-file-input-2" accept="image/*,.pdf" style="display:none;" />
          </div>
        </div>

        <!-- 识别结果 -->
        <div class="qr-result" id="qr-result">
          <div class="qr-result__placeholder" id="qr-result-placeholder">
            <p>${t('qrResultPlaceholder')}</p>
          </div>
          <div class="qr-result__body" id="qr-result-body" style="display:none;">
            <div class="qr-result__header">
              <label class="converter-panel__label" id="qr-result-label">${t('qrResultLabel')}</label>
              <button class="btn btn--secondary btn--sm" id="btn-copy-all">
                <span class="btn--icon">📋</span> ${t('qrBtnCopyAll')}
              </button>
            </div>
            <div class="qr-result__list" id="qr-result-list"></div>
          </div>
        </div>
      </div>

      <!-- Tab 切换区 -->
      <div class="qr-tabs">
        <div class="qr-tabs__nav">
          <button class="qr-tabs__btn qr-tabs__btn--active" data-tab="features">${t('qrFeaturesTitle')}</button>
          <button class="qr-tabs__btn" data-tab="history">${t('qrHistoryTitle')}</button>
        </div>

        <!-- Tab: 功能介绍 -->
        <div class="qr-tabs__panel" id="tab-features">
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

        <!-- Tab: 最近解码 -->
        <div class="qr-tabs__panel" id="tab-history" style="display:none;">
          <div class="qr-history__header">
            <span></span>
            <button class="btn btn--ghost btn--sm" id="btn-clear-history" style="display:none;">${t('qrHistoryClear')}</button>
          </div>
          <div class="qr-history__list" id="qr-history-list"></div>
          <p class="qr-history__empty" id="qr-history-empty">${t('qrHistoryEmpty')}</p>
        </div>
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
    const file = getSupportedFile(e.dataTransfer);
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
    const file = getSupportedFile(e.clipboardData);
    if (file) {
      e.preventDefault();
      await handleFile(file);
    }
  });

  document.getElementById('btn-copy-all').addEventListener('click', async () => {
    const items = document.querySelectorAll('.qr-result-item__text');
    const texts = Array.from(items).map((el) => el.textContent).join('\n');
    if (!texts) return;
    try {
      await navigator.clipboard.writeText(texts);
      showToast(t('toastCopied'));
    } catch {
      showToast(t('toastCopyFail'));
    }
  });

  // 结果列表点击（事件委托：单条复制）
  document.getElementById('qr-result-list').addEventListener('click', async (e) => {
    const copyBtn = e.target.closest('.qr-result-item__copy');
    if (!copyBtn) return;
    const text = copyBtn.dataset.value;
    try {
      await navigator.clipboard.writeText(text);
      showToast(t('toastCopied'));
    } catch {
      showToast(t('toastCopyFail'));
    }
  });

  // Tab 切换
  document.querySelector('.qr-tabs__nav').addEventListener('click', (e) => {
    const btn = e.target.closest('.qr-tabs__btn');
    if (!btn) return;
    const tab = btn.dataset.tab;
    // 切换按钮激活态
    document.querySelectorAll('.qr-tabs__btn').forEach((b) => b.classList.remove('qr-tabs__btn--active'));
    btn.classList.add('qr-tabs__btn--active');
    // 切换面板
    document.querySelectorAll('.qr-tabs__panel').forEach((p) => (p.style.display = 'none'));
    document.getElementById(`tab-${tab}`).style.display = '';
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
    const deleteBtn = e.target.closest('.qr-history__delete');
    if (copyBtn) {
      const item = copyBtn.closest('.qr-history__item');
      const result = item.dataset.result;
      try {
        await navigator.clipboard.writeText(result);
        showToast(t('toastCopied'));
      } catch {
        showToast(t('toastCopyFail'));
      }
    } else if (deleteBtn) {
      const item = deleteBtn.closest('.qr-history__item');
      const index = parseInt(item.dataset.index, 10);
      const history = getHistory();
      history.splice(index, 1);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
      renderHistoryList();
    }
  });
}

async function handleFile(file) {
  try {
    const isPdf = file.type === 'application/pdf' || (file.name && file.name.toLowerCase().endsWith('.pdf'));

    const placeholderEl = document.getElementById('qr-result-placeholder');
    const bodyEl = document.getElementById('qr-result-body');
    const listEl = document.getElementById('qr-result-list');
    const labelEl = document.getElementById('qr-result-label');
    const copyAllBtn = document.getElementById('btn-copy-all');

    // PDF 扫描时先显示进度
    if (isPdf) {
      placeholderEl.style.display = 'none';
      bodyEl.style.display = '';
      copyAllBtn.style.display = 'none';
      labelEl.textContent = t('qrResultLabel');
      listEl.innerHTML = `<div class="qr-scan-progress"><span class="qr-scan-progress__spinner"></span><span id="qr-scan-status">${t('qrPdfScanning', 1, '...')}</span></div>`;
    }

    const { results, imgSrc, thumbnail } = isPdf
      ? await processPdf(file, (page, total, found) => {
        const statusEl = document.getElementById('qr-scan-status');
        if (statusEl) statusEl.textContent = t('qrPdfScanning', page, total) + (found > 0 ? ` | ${t('qrFoundCount', found)}` : '');
      })
      : await processImage(file);
    const imgEl = document.getElementById('qr-preview-img');
    const uploadContent = document.getElementById('qr-upload-content');
    const uploadPreview = document.getElementById('qr-upload-preview');

    // 上传区显示图片预览
    imgEl.src = imgSrc;
    uploadContent.style.display = 'none';
    uploadPreview.style.display = '';

    // 结果区
    placeholderEl.style.display = 'none';
    bodyEl.style.display = '';

    if (results.length > 0) {
      copyAllBtn.style.display = '';
      labelEl.textContent = `${t('qrResultLabel')}（${results.length}）`;
      listEl.innerHTML = results.map((r, i) => {
        const urlLink = isUrl(r)
          ? `<a class="qr-result-item__link" href="${r}" target="_blank" rel="noopener noreferrer">🔗</a>`
          : '';
        return `
          <div class="qr-result-item">
            <span class="qr-result-item__index">${i + 1}</span>
            <pre class="qr-result-item__text">${r}</pre>
            <div class="qr-result-item__actions">
              ${urlLink}
              <button class="qr-result-item__copy" data-value="${r.replace(/"/g, '&quot;')}" title="${t('btnCopy')}">📋</button>
            </div>
          </div>
        `;
      }).join('');

      // 每条结果独立保存到历史
      for (const r of results) {
        saveHistory(r, thumbnail);
      }
      renderHistoryList();
      showToast(t('qrToastSuccess', results.length));
    } else {
      labelEl.textContent = t('qrResultLabel');
      listEl.innerHTML = `<div class="qr-result-item qr-result-item--empty"><pre class="qr-result-item__text">${t('qrToastFail')}</pre></div>`;
      showToast(t('qrToastFail'));
    }
  } catch {
    showToast(t('qrToastError'));
  }
}
