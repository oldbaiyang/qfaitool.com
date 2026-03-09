/**
 * 二维码识别工具页
 * 支持：文件上传、剪切板粘贴、拖拽上传
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
 * 从 ImageData 中识别二维码
 */
function decodeQR(imageData) {
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    return code ? code.data : null;
}

/**
 * 将图片文件绘制到 canvas 并识别
 */
function processImage(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const result = decodeQR(imageData);
            resolve({ result, imgSrc: canvas.toDataURL() });
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
    // fallback: check files
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
            // 如果是 URL，显示打开链接按钮
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
