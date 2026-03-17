import { t } from '../i18n.js';

/**
 * 渲染图片压缩页面
 */
export function renderImageCompressor(router) {
  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="tool-container">
      <div class="tool-header">
        <a href="#/" class="back-link">${t('backHome')}</a>
        <h2 class="tool-title">${t('icTitle')}</h2>
        <p class="tool-desc">${t('icDesc')}</p>
      </div>

      <div class="tool-main ic-layout">
        <!-- 控制栏 -->
        <div class="ic-controls card">
          <div class="ic-control-group">
            <label>${t('icLabelQuality')}: <span id="quality-val">0.8</span></label>
            <input type="range" id="quality-range" min="0.1" max="1.0" step="0.05" value="0.8" class="ic-slider">
          </div>
          <div class="ic-control-group">
            <label>${t('icLabelScale')}: <span id="scale-val">1.0</span></label>
            <input type="range" id="scale-range" min="0.1" max="1.0" step="0.05" value="1.0" class="ic-slider">
          </div>
          <div class="ic-actions">
             <button id="ic-download" class="btn btn--primary" disabled>${t('icBtnDownload')}</button>
             <button id="ic-clear" class="btn btn--outline">${t('btnClear')}</button>
          </div>
        </div>

        <!-- 处理区域 -->
        <div class="ic-workspace card">
          <div id="ic-dropzone" class="ic-dropzone">
            <div class="ic-dropzone__content">
              <span class="ic-dropzone__icon">🖼️</span>
              <p>${t('icPlaceholder')}</p>
              <button class="btn btn--small">${t('qrBtnUpload')}</button>
            </div>
            <input type="file" id="ic-file-input" accept="image/*" style="display:none">
          </div>

          <div id="ic-result" class="ic-result" style="display:none">
            <div class="ic-comparison">
              <div class="ic-image-box">
                <h4>${t('icLabelOriginal')}</h4>
                <div class="ic-preview-container">
                  <img id="img-orig" src="" alt="Original">
                </div>
                <div class="ic-info">
                  <p>${t('icSize')}: <span id="info-orig-size">-</span></p>
                  <p>${t('icResolution')}: <span id="info-orig-res">-</span></p>
                </div>
              </div>
              <div class="ic-arrow">➡️</div>
              <div class="ic-image-box">
                <h4>${t('icLabelCompressed')}</h4>
                <div class="ic-preview-container">
                  <img id="img-comp" src="" alt="Compressed">
                </div>
                <div class="ic-info">
                  <p>${t('icSize')}: <span id="info-comp-size">-</span></p>
                  <p>${t('icCompressionRatio')}: <span id="info-comp-ratio">-</span></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  bindEvents();
}

let originalFile = null;
let compressedBlob = null;

function bindEvents() {
  const fileInput = document.getElementById('ic-file-input');
  const dropzone = document.getElementById('ic-dropzone');
  const qualityRange = document.getElementById('quality-range');
  const scaleRange = document.getElementById('scale-range');
  const qualityVal = document.getElementById('quality-val');
  const scaleVal = document.getElementById('scale-val');
  const downloadBtn = document.getElementById('ic-download');
  const clearBtn = document.getElementById('ic-clear');

  // 点击上传
  dropzone.addEventListener('click', (e) => {
    if (e.target.tagName !== 'BUTTON' && e.target.closest('.btn')) return;
    fileInput.click();
  });
  dropzone.querySelector('button').addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
  });

  // 拖拽
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('ic-dropzone--active');
  });
  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('ic-dropzone--active');
  });
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('ic-dropzone--active');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) handleFile(file);
  });

  // 粘贴
  document.addEventListener('paste', (e) => {
    const item = e.clipboardData.items[0];
    if (item && item.type.startsWith('image/')) {
      handleFile(item.getAsFile());
    }
  });

  // 参数变化
  qualityRange.addEventListener('input', () => {
    qualityVal.textContent = qualityRange.value;
    if (originalFile) compressImage();
  });
  scaleRange.addEventListener('input', () => {
    scaleVal.textContent = scaleRange.value;
    if (originalFile) compressImage();
  });

  // 下载
  downloadBtn.addEventListener('click', () => {
    if (!compressedBlob) return;
    const url = URL.createObjectURL(compressedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compressed_${originalFile.name}`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // 清空
  clearBtn.addEventListener('click', () => {
    originalFile = null;
    compressedBlob = null;
    document.getElementById('ic-file-input').value = '';
    document.getElementById('ic-result').style.display = 'none';
    document.getElementById('ic-dropzone').style.display = 'flex';
    document.getElementById('ic-download').disabled = true;
  });
}

async function handleFile(file) {
  originalFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = document.getElementById('img-orig');
    img.src = e.target.result;
    img.onload = () => {
      document.getElementById('info-orig-size').textContent = formatSize(file.size);
      document.getElementById('info-orig-res').textContent = `${img.naturalWidth}x${img.naturalHeight}`;
      document.getElementById('ic-dropzone').style.display = 'none';
      document.getElementById('ic-result').style.display = 'block';
      compressImage();
    };
  };
  reader.readAsDataURL(file);
}

function compressImage() {
  const img = document.getElementById('img-orig');
  const quality = parseFloat(document.getElementById('quality-range').value);
  const scale = parseFloat(document.getElementById('scale-range').value);
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  const targetWidth = img.naturalWidth * scale;
  const targetHeight = img.naturalHeight * scale;
  
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
  
  // 按照原始文件的类型来决定压缩类型，如果是 PNG，由于 canvas.toBlob 对 PNG 的 quality 支持有限，
  // 默认转为 image/jpeg 进行有损压缩，或者根据需要自定策略。
  // 这里简化处理：如果是 PNG 且有透明度，保持 PNG（但 quality 无效）；大部分情况用户想要压缩大小，建议转为 WebP 或 JPEG。
  let type = originalFile.type;
  if (type === 'image/png' && quality < 1) {
      type = 'image/jpeg'; // 强行转为 jpeg 以实现真正的大小压缩
  }

  canvas.toBlob((blob) => {
    if (!blob) return;
    compressedBlob = blob;
    const url = URL.createObjectURL(blob);
    document.getElementById('img-comp').src = url;
    document.getElementById('info-comp-size').textContent = formatSize(blob.size);
    
    const ratio = ((1 - blob.size / originalFile.size) * 100).toFixed(1);
    document.getElementById('info-comp-ratio').textContent = `-${ratio}%`;
    
    document.getElementById('ic-download').disabled = false;
  }, type, quality);
}

function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
