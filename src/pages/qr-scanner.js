/**
 * 二维码识别工具页
 * 支持：文件上传、剪切板粘贴、拖拽上传
 * 解码策略：BarcodeDetector API（原生，最强）→ jsQR 多分辨率降级
 */
import jsQR from 'jsqr';
import { t } from '../i18n.js';

function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('toast--visible');
    setTimeout(() => toast.classList.remove('toast--visible'), 2000);
}

/**
 * 用 jsQR 在指定缩放比例下尝试识别
 */
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

/**
 * 用 jsQR 做二值化增强后尝试识别
 */
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

/**
 * 多策略解码：BarcodeDetector → jsQR 多分辨率 → jsQR 二值化
 */
async function decodeImage(img) {
    // 策略 1：浏览器原生 BarcodeDetector（Chrome/Edge，识别能力最强）
    if ('BarcodeDetector' in window) {
        try {
            const detector = new BarcodeDetector({ formats: ['qr_code'] });
            const results = await detector.detect(img);
            if (results.length > 0) return results[0].rawValue;
        } catch { /* fall through */ }
    }

    // 策略 2：jsQR 多分辨率尝试
    const scales = [1, 0.75, 0.5, 1.5, 2];
    for (const scale of scales) {
        const result = tryJsQR(img, scale);
        if (result) return result;
    }

    // 策略 3：jsQR 二值化增强
    return tryJsQRBinarized(img);
}

/**
 * 将图片文件加载为 Image 元素并识别
 */
function processImage(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = async () => {
            const previewCanvas = document.createElement('canvas');
            const maxPreview = 400;
            const ratio = Math.min(maxPreview / img.width, maxPreview / img.height, 1);
            previewCanvas.width = Math.round(img.width * ratio);
            previewCanvas.height = Math.round(img.height * ratio);
            const pCtx = previewCanvas.getContext('2d');
            pCtx.drawImage(img, 0, 0, previewCanvas.width, previewCanvas.height);

            const result = await decodeImage(img);
            resolve({ result, imgSrc: previewCanvas.toDataURL() });
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = URL.createObjectURL(file);
    });
}

/**
 * 从 DataTransfer 中提取图片文件
 */
function getImageFile(dataTransfer) {
    const items = dataTransfer.items || [];
    for (const item of items) {
        if (item.type.startsWith('image/')) {
            return item.getAsFile();
        }
    }
    const files = dataTransfer.files || [];
    for (const file of files) {
        if (file.type.startsWith('image/')) return file;
    }
    return null;
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

      <!-- 预览 + 结果 -->
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
    </div>

    <div class="toast" id="toast"></div>
  `;

    bindEvents(router);
}

function bindEvents(router) {
    document.getElementById('btn-back').addEventListener('click', () => {
        router.navigate('');
    });

    const dropZone = document.getElementById('qr-drop-zone');
    const fileInput = document.getElementById('qr-file-input');

    // 文件上传
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) await handleFile(file);
    });

    // 拖拽上传
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

    // 剪切板粘贴按钮
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

    // 全局粘贴事件
    document.addEventListener('paste', async (e) => {
        const file = getImageFile(e.clipboardData);
        if (file) {
            e.preventDefault();
            await handleFile(file);
        }
    });

    // 复制结果
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
}

async function handleFile(file) {
    try {
        const { result, imgSrc } = await processImage(file);
        const resultEl = document.getElementById('qr-result');
        const textEl = document.getElementById('qr-result-text');
        const imgEl = document.getElementById('qr-preview-img');
        const actionsEl = document.getElementById('qr-result-actions');

        imgEl.src = imgSrc;
        resultEl.style.display = '';

        if (result) {
            textEl.textContent = result;
            actionsEl.innerHTML = '';
            try {
                new URL(result);
                actionsEl.innerHTML = `
          <a class="btn btn--primary btn--sm" href="${result}" target="_blank" rel="noopener noreferrer">
            <span class="btn--icon">🔗</span> ${t('qrBtnOpen')}
          </a>
        `;
            } catch { /* not a URL */ }
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
