import { t } from '../i18n.js';
import { jsPDF } from 'jspdf';

/**
 * 渲染长图转 PDF 页面
 */
export function renderImageToPdf(router) {
  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="tool-container">
      <div class="tool-header">
        <a href="#/" class="back-link">${t('backHome')}</a>
        <h2 class="tool-title">${t('ipTitle')}</h2>
        <p class="tool-desc">${t('ipDesc')}</p>
      </div>

      <div class="tool-main ip-layout">
        <!-- 控制栏 -->
        <div class="ip-controls card">
          <div class="ip-control-group">
            <label>${t('ipLabelPageSize')}</label>
            <select id="ip-page-size" class="ip-select">
              <option value="a4" selected>A4 (210×297mm)</option>
              <option value="a3">A3 (297×420mm)</option>
              <option value="letter">Letter (216×279mm)</option>
            </select>
          </div>
          <div class="ip-control-group">
            <label>${t('ipLabelOrientation')}</label>
            <select id="ip-orientation" class="ip-select">
              <option value="portrait" selected>${t('ipOrientPortrait')}</option>
              <option value="landscape">${t('ipOrientLandscape')}</option>
            </select>
          </div>
          <div class="ip-control-group">
            <label>${t('ipLabelMargin')}: <span id="ip-margin-val">10</span>mm</label>
            <input type="range" id="ip-margin-range" min="0" max="30" step="1" value="10" class="ic-slider">
          </div>
          <div class="ip-control-group">
            <label>${t('ipLabelFitMode')}</label>
            <select id="ip-fit-mode" class="ip-select">
              <option value="fit-width" selected>${t('ipFitWidth')}</option>
              <option value="original">${t('ipFitOriginal')}</option>
            </select>
          </div>
          <div class="ip-actions">
            <button id="ip-generate" class="btn btn--primary" disabled>${t('ipBtnGenerate')}</button>
            <button id="ip-clear" class="btn btn--outline">${t('btnClear')}</button>
          </div>
        </div>

        <!-- 工作区 -->
        <div class="ip-workspace card">
          <div id="ip-dropzone" class="ic-dropzone">
            <div class="ic-dropzone__content">
              <span class="ic-dropzone__icon">📄</span>
              <p>${t('ipPlaceholder')}</p>
              <span class="ip-hint">${t('ipHint')}</span>
              <button class="btn btn--small">${t('qrBtnUpload')}</button>
            </div>
            <input type="file" id="ip-file-input" accept="image/*" style="display:none">
          </div>

          <!-- 预览区 -->
          <div id="ip-preview" class="ip-preview" style="display:none">
            <div class="ip-preview-header">
              <div class="ip-img-info">
                <span id="ip-info-name" class="ip-info-badge"></span>
                <span id="ip-info-size" class="ip-info-badge"></span>
                <span id="ip-info-res" class="ip-info-badge"></span>
                <span id="ip-info-pages" class="ip-info-badge ip-info-badge--accent"></span>
              </div>
            </div>
            <div class="ip-split-preview" id="ip-split-preview">
              <!-- 分割预览条 -->
            </div>
          </div>
        </div>
      </div>

      <!-- 功能介绍 -->
      <div class="ip-features">
        <h3 class="ip-features-title">${t('ipFeaturesTitle')}</h3>
        <div class="ip-features-grid">
          <div class="ip-feature-card card">
            <span class="ip-feature-icon">🔒</span>
            <h4>${t('ipFeature1Title')}</h4>
            <p>${t('ipFeature1Desc')}</p>
          </div>
          <div class="ip-feature-card card">
            <span class="ip-feature-icon">✂️</span>
            <h4>${t('ipFeature2Title')}</h4>
            <p>${t('ipFeature2Desc')}</p>
          </div>
          <div class="ip-feature-card card">
            <span class="ip-feature-icon">⚡</span>
            <h4>${t('ipFeature3Title')}</h4>
            <p>${t('ipFeature3Desc')}</p>
          </div>
        </div>
      </div>
    </div>
  `;

  bindEvents();
}

let originalFile = null;
let loadedImage = null;

function bindEvents() {
  const fileInput = document.getElementById('ip-file-input');
  const dropzone = document.getElementById('ip-dropzone');
  const marginRange = document.getElementById('ip-margin-range');
  const marginVal = document.getElementById('ip-margin-val');
  const generateBtn = document.getElementById('ip-generate');
  const clearBtn = document.getElementById('ip-clear');

  // 点击上传
  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.querySelector('button').addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });

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
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        handleFile(item.getAsFile());
        break;
      }
    }
  });

  // 边距变化
  marginRange.addEventListener('input', () => {
    marginVal.textContent = marginRange.value;
    if (loadedImage) updatePreview();
  });

  // 页面大小 / 方向 / 适配模式变化
  ['ip-page-size', 'ip-orientation', 'ip-fit-mode'].forEach((id) => {
    document.getElementById(id).addEventListener('change', () => {
      if (loadedImage) updatePreview();
    });
  });

  // 生成 PDF
  generateBtn.addEventListener('click', generatePdf);

  // 清空
  clearBtn.addEventListener('click', () => {
    originalFile = null;
    loadedImage = null;
    fileInput.value = '';
    document.getElementById('ip-preview').style.display = 'none';
    document.getElementById('ip-dropzone').style.display = 'flex';
    generateBtn.disabled = true;
  });
}

function handleFile(file) {
  originalFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      loadedImage = img;
      showPreview(file, img);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

/** 获取页面尺寸（单位 mm） */
function getPageDimensions() {
  const sizeMap = {
    a4: { w: 210, h: 297 },
    a3: { w: 297, h: 420 },
    letter: { w: 215.9, h: 279.4 },
  };
  const size = document.getElementById('ip-page-size').value;
  const orientation = document.getElementById('ip-orientation').value;
  const dim = sizeMap[size] || sizeMap.a4;
  return orientation === 'landscape' ? { w: dim.h, h: dim.w } : dim;
}

function showPreview(file, img) {
  document.getElementById('ip-dropzone').style.display = 'none';
  document.getElementById('ip-preview').style.display = 'block';
  document.getElementById('ip-generate').disabled = false;

  // 显示信息
  document.getElementById('ip-info-name').textContent = file.name;
  document.getElementById('ip-info-size').textContent = formatSize(file.size);
  document.getElementById('ip-info-res').textContent = `${img.naturalWidth} × ${img.naturalHeight}`;

  updatePreview();
}

function updatePreview() {
  const img = loadedImage;
  if (!img) return;

  const margin = parseInt(document.getElementById('ip-margin-range').value, 10);
  const fitMode = document.getElementById('ip-fit-mode').value;
  const pageDim = getPageDimensions();

  // 可用打印区域（mm）
  const printW = pageDim.w - margin * 2;
  const printH = pageDim.h - margin * 2;

  // 计算缩放比例
  let scale;
  if (fitMode === 'fit-width') {
    scale = printW / img.naturalWidth; // mm per px
  } else {
    // original: 假设 96dpi => 1px = 25.4/96 mm
    scale = 25.4 / 96;
  }

  const scaledHeight = img.naturalHeight * scale;
  const pageCount = Math.ceil(scaledHeight / printH);

  document.getElementById('ip-info-pages').textContent = t('ipPageCount', pageCount);

  // 渲染分割预览
  renderSplitPreview(img, pageCount, printH / scale);
}

function renderSplitPreview(img, pageCount, sliceHeightPx) {
  const container = document.getElementById('ip-split-preview');
  container.innerHTML = '';

  // 创建预览画布，显示分割线
  const wrapper = document.createElement('div');
  wrapper.className = 'ip-split-wrapper';

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // 缩放至预览尺寸
  const maxPreviewWidth = 360;
  const previewScale = Math.min(1, maxPreviewWidth / img.naturalWidth);
  canvas.width = img.naturalWidth * previewScale;
  canvas.height = img.naturalHeight * previewScale;

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // 画分割线
  ctx.strokeStyle = '#0ea5e9';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 4]);

  for (let i = 1; i < pageCount; i++) {
    const y = Math.min(sliceHeightPx * i * previewScale, canvas.height);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();

    // 页码标签
    ctx.setLineDash([]);
    ctx.fillStyle = '#0ea5e9';
    ctx.font = `bold ${12}px Inter, sans-serif`;
    const label = `P${i}`;
    const labelWidth = ctx.measureText(label).width;
    const labelX = canvas.width - labelWidth - 8;
    const labelY = y - 6;
    ctx.fillStyle = 'rgba(14, 165, 233, 0.15)';
    ctx.beginPath();
    ctx.roundRect(labelX - 4, labelY - 12, labelWidth + 8, 16, 4);
    ctx.fill();
    ctx.fillStyle = '#0ea5e9';
    ctx.fillText(label, labelX, labelY);
    ctx.setLineDash([8, 4]);
  }

  wrapper.appendChild(canvas);
  container.appendChild(wrapper);
}

async function generatePdf() {
  const img = loadedImage;
  if (!img) return;

  const generateBtn = document.getElementById('ip-generate');
  const originalText = generateBtn.textContent;
  generateBtn.disabled = true;
  generateBtn.textContent = t('ipGenerating');

  try {
    const margin = parseInt(document.getElementById('ip-margin-range').value, 10);
    const fitMode = document.getElementById('ip-fit-mode').value;
    const pageDim = getPageDimensions();
    const orientation = document.getElementById('ip-orientation').value;
    const pageSize = document.getElementById('ip-page-size').value;

    const printW = pageDim.w - margin * 2;
    const printH = pageDim.h - margin * 2;

    let scale;
    if (fitMode === 'fit-width') {
      scale = printW / img.naturalWidth;
    } else {
      scale = 25.4 / 96;
    }

    const scaledWidth = img.naturalWidth * scale;
    const scaledHeight = img.naturalHeight * scale;

    // 实际在 PDF 中绘制的宽度
    const drawWidth = Math.min(scaledWidth, printW);
    const drawScale = drawWidth / img.naturalWidth;
    const sliceHeightPx = printH / drawScale;

    const pageCount = Math.ceil(img.naturalHeight / sliceHeightPx);

    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: pageSize,
    });

    for (let i = 0; i < pageCount; i++) {
      if (i > 0) pdf.addPage();

      const srcY = i * sliceHeightPx;
      const srcH = Math.min(sliceHeightPx, img.naturalHeight - srcY);
      const drawH = srcH * drawScale;

      // 用 canvas 截取当前区域
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = img.naturalWidth;
      sliceCanvas.height = srcH;
      const ctx = sliceCanvas.getContext('2d');
      ctx.drawImage(img, 0, srcY, img.naturalWidth, srcH, 0, 0, img.naturalWidth, srcH);

      const sliceDataUrl = sliceCanvas.toDataURL('image/jpeg', 0.92);

      // 居中绘制
      const offsetX = margin + (printW - drawWidth) / 2;
      pdf.addImage(sliceDataUrl, 'JPEG', offsetX, margin, drawWidth, drawH);
    }

    // 下载
    const fileName = originalFile.name.replace(/\.[^.]+$/, '') + '.pdf';
    pdf.save(fileName);

    showToast(t('ipToastSuccess', pageCount));
  } catch (err) {
    console.error('PDF generation failed:', err);
    showToast(t('ipToastError'));
  } finally {
    generateBtn.disabled = false;
    generateBtn.textContent = originalText;
  }
}

function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function showToast(msg) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('toast--visible');
  setTimeout(() => toast.classList.remove('toast--visible'), 2500);
}
