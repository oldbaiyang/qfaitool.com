import { t } from '../i18n.js';
import { jsPDF } from 'jspdf';

/**
 * 渲染吧唧打印排版页面
 *
 * 功能：
 *  - 上传一张或多张图片，自动按所选吧唧尺寸在 A4 纸上铺满排版
 *  - 可选 3mm 出血与切刀十字线，便于精确裁切
 *  - 生成分辨率充足的 PDF 下载并打印
 */
export function renderBadgePrinter(router) {
  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="tool-page">
      <div class="tool-page__header">
        <button class="tool-page__back" id="btn-back">${t('backHome')}</button>
        <h1 class="tool-page__title">${t('bpTitle')}</h1>
        <p class="tool-page__desc">${t('bpDesc')}</p>
      </div>

      <div class="bp-layout">
        <!-- 左侧：控制面板 -->
        <div class="bp-controls card">
          <div class="bp-control-group">
            <label>${t('bpLabelSize')}</label>
            <select id="bp-size" class="ip-select">
              <option value="37" selected>${t('bpSize37')}</option>
              <option value="44">${t('bpSize44')}</option>
              <option value="58">${t('bpSize58')}</option>
              <option value="75">${t('bpSize75')}</option>
              <option value="100">${t('bpSize100')}</option>
            </select>
          </div>

          <div class="bp-control-group">
            <label>${t('bpLabelPage')}</label>
            <select id="bp-page" class="ip-select">
              <option value="a4" selected>A4 (210×297mm)</option>
              <option value="a3">A3 (297×420mm)</option>
              <option value="letter">Letter (216×279mm)</option>
            </select>
          </div>

          <div class="bp-control-group">
            <label>${t('bpLabelOrientation')}</label>
            <select id="bp-orientation" class="ip-select">
              <option value="portrait" selected>${t('bpOrientPortrait')}</option>
              <option value="landscape">${t('bpOrientLandscape')}</option>
            </select>
          </div>

          <div class="bp-control-group">
            <label>${t('bpLabelMargin')}: <span id="bp-margin-val">0</span>mm</label>
            <input type="range" id="bp-margin" min="0" max="20" step="1" value="0" class="ic-slider">
          </div>

          <div class="bp-control-group">
            <label class="bp-check">
              <input type="checkbox" id="bp-fill" checked />
              <span>${t('bpLabelFill')}</span>
            </label>
            <p class="bp-check-hint">${t('bpLabelFillHint')}</p>
          </div>

          <div class="bp-control-group" id="bp-spacing-group">
            <label>${t('bpLabelSpacing')}: <span id="bp-spacing-val">1</span>mm</label>
            <input type="range" id="bp-spacing" min="0" max="20" step="1" value="1" class="ic-slider">
          </div>

          <div class="bp-control-group bp-control-group--check">
            <label class="bp-check">
              <input type="checkbox" id="bp-bleed" />
              <span>${t('bpLabelBleed')}</span>
            </label>
            <p class="bp-check-hint">${t('bpLabelBleedHint')}</p>
          </div>

          <div class="bp-control-group bp-control-group--check">
            <label class="bp-check">
              <input type="checkbox" id="bp-crop" />
              <span>${t('bpLabelCropMarks')}</span>
            </label>
          </div>

          <div class="bp-control-group bp-control-group--check">
            <label class="bp-check">
              <input type="checkbox" id="bp-border" checked />
              <span>${t('bpLabelBorder')}</span>
            </label>
            <p class="bp-check-hint">${t('bpLabelBorderHint')}</p>
          </div>

          <div class="bp-control-group">
            <label>${t('bpLabelOffset')}: <span id="bp-offset-val">0</span>%</label>
            <input type="range" id="bp-offset" min="-100" max="100" step="5" value="0" class="ic-slider">
            <p class="bp-check-hint">${t('bpLabelOffsetHint')}</p>
          </div>

          <div class="ip-actions">
            <button id="bp-generate" class="btn btn--primary" disabled>${t('bpBtnGenerate')}</button>
            <button id="bp-clear-all" class="btn btn--outline">${t('bpBtnClearAll')}</button>
          </div>
        </div>

        <!-- 右侧：工作区 -->
        <div class="bp-workspace card">
          <div class="bp-workspace-header">
            <div class="bp-meta">
              <span id="bp-count" class="ip-info-badge">${t('bpCount', 0)}</span>
              <span id="bp-layout-info" class="ip-info-badge ip-info-badge--accent"></span>
            </div>
            <!-- 选中图片缩放控制 -->
            <div id="bp-per-img-controls" class="bp-per-img" style="display:none">
              <span class="bp-per-img__label">${t('bpSelectedScale')}: <span id="bp-selected-name"></span></span>
              <input type="range" id="bp-img-scale" min="20" max="200" step="5" value="100" class="ic-slider">
              <span id="bp-img-scale-val" class="ip-info-badge">100%</span>
            </div>
          </div>

          <div id="bp-dropzone" class="ic-dropzone">
            <div class="ic-dropzone__content">
              <span class="ic-dropzone__icon">🎨</span>
              <p>${t('bpPlaceholder')}</p>
              <span class="ip-hint">${t('bpHint')}</span>
              <button class="btn btn--small" id="bp-pick-btn">${t('bpBtnAdd')}</button>
            </div>
            <input type="file" id="bp-file-input" accept="image/*" multiple style="display:none">
          </div>

          <!-- 缩略图列表 + A4 预览 -->
          <div id="bp-preview" class="bp-preview" style="display:none">
            <div id="bp-thumbs" class="bp-thumbs"></div>
            <div class="bp-page-preview">
              <canvas id="bp-canvas"></canvas>
            </div>
          </div>
        </div>
      </div>

      <!-- 功能介绍 -->
      <div class="ip-features">
        <h3 class="ip-features-title">${t('bpFeaturesTitle')}</h3>
        <div class="ip-features-grid">
          <div class="ip-feature-card card">
            <span class="ip-feature-icon">📐</span>
            <h4>${t('bpFeature1Title')}</h4>
            <p>${t('bpFeature1Desc')}</p>
          </div>
          <div class="ip-feature-card card">
            <span class="ip-feature-icon">✂️</span>
            <h4>${t('bpFeature2Title')}</h4>
            <p>${t('bpFeature2Desc')}</p>
          </div>
          <div class="ip-feature-card card">
            <span class="ip-feature-icon">🔒</span>
            <h4>${t('bpFeature3Title')}</h4>
            <p>${t('bpFeature3Desc')}</p>
          </div>
        </div>
      </div>
    </div>
  `;

  bindEvents();
}

/* ------------------------------------------------------------------ */
/* 状态                                                                */
/* ------------------------------------------------------------------ */

/** 已添加的图片：每项 = { id, dataUrl, width, height, img, scale } */
const images = [];
let nextId = 1;
/** 当前选中的图片 id（用于右侧"选中图片缩放"控件） */
let selectedId = null;

/* ------------------------------------------------------------------ */
/* 事件绑定                                                            */
/* ------------------------------------------------------------------ */

function bindEvents() {
  const fileInput = document.getElementById('bp-file-input');
  const dropzone = document.getElementById('bp-dropzone');
  const pickBtn = document.getElementById('bp-pick-btn');

  // 返回首页
  document.getElementById('btn-back').addEventListener('click', () => {
    window.location.hash = '#/';
  });

  // 添加图片按钮
  pickBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });
  dropzone.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(addImageFromFile);
    fileInput.value = '';
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
    const files = Array.from(e.dataTransfer.files || []);
    files.forEach((f) => {
      if (f.type.startsWith('image/')) addImageFromFile(f);
    });
  });

  // 粘贴
  document.addEventListener('paste', (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        addImageFromFile(item.getAsFile());
        break;
      }
    }
  });

  // 控件变化（任一变化都更新预览与布局信息）
  ['bp-size', 'bp-page', 'bp-orientation', 'bp-margin', 'bp-spacing', 'bp-bleed', 'bp-crop', 'bp-fill', 'bp-offset', 'bp-border']
    .forEach((id) => {
      const el = document.getElementById(id);
      const evt = el.type === 'checkbox' ? 'change' : 'input';
      el.addEventListener(evt, () => {
        document.getElementById('bp-margin-val').textContent = document.getElementById('bp-margin').value;
        document.getElementById('bp-spacing-val').textContent = document.getElementById('bp-spacing').value;
        document.getElementById('bp-offset-val').textContent = document.getElementById('bp-offset').value;
        syncFillState();
        renderAll();
      });
    });

  // 生成 PDF
  document.getElementById('bp-generate').addEventListener('click', generatePdf);

  // 清空
  document.getElementById('bp-clear-all').addEventListener('click', clearAll);

  // 选中图片缩放滑块
  document.getElementById('bp-img-scale').addEventListener('input', (e) => {
    if (selectedId === null) return;
    const item = images.find((it) => it.id === selectedId);
    if (!item) return;
    item.scale = parseInt(e.target.value, 10);
    document.getElementById('bp-img-scale-val').textContent = item.scale + '%';
    renderAll();
  });

  // 初始同步控件状态
  syncFillState();
}

/** “填满页面”开启时禁用并隐藏间距滑块 */
function syncFillState() {
  const fill = document.getElementById('bp-fill').checked;
  const spacingGroup = document.getElementById('bp-spacing-group');
  const spacingInput = document.getElementById('bp-spacing');
  spacingInput.disabled = fill;
  if (spacingGroup) spacingGroup.style.opacity = fill ? '0.4' : '1';
}

/* ------------------------------------------------------------------ */
/* 图片管理                                                            */
/* ------------------------------------------------------------------ */

function addImageFromFile(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const newItem = {
        id: nextId++,
        dataUrl: e.target.result,
        width: img.naturalWidth,
        height: img.naturalHeight,
        img,
        scale: 100, // 100 = cover（默认），<100 = contain（缩小留白）
      };
      images.push(newItem);
      // 新上传的图片自动选中
      selectedId = newItem.id;
      renderAll();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function removeImage(id) {
  const idx = images.findIndex((x) => x.id === id);
  if (idx >= 0) images.splice(idx, 1);
  renderAll();
}

function clearAll() {
  images.length = 0;
  selectedId = null;
  renderAll();
}

/* ------------------------------------------------------------------ */
/* 计算：每张 A4 能放几个                                                */
/* ------------------------------------------------------------------ */

function getPageDimensions() {
  const sizeMap = {
    a4: { w: 210, h: 297 },
    a3: { w: 297, h: 420 },
    letter: { w: 215.9, h: 279.4 },
  };
  const size = document.getElementById('bp-page').value;
  const orientation = document.getElementById('bp-orientation').value;
  const dim = sizeMap[size] || sizeMap.a4;
  return orientation === 'landscape' ? { w: dim.h, h: dim.w } : dim;
}

function computeLayout() {
  const badgeSize = parseFloat(document.getElementById('bp-size').value); // mm
  const margin = parseFloat(document.getElementById('bp-margin').value);
  const userSpacing = parseFloat(document.getElementById('bp-spacing').value);
  const fillPage = document.getElementById('bp-fill').checked;
  const pageDim = getPageDimensions();

  // 有效排版区域
  const availW = pageDim.w - margin * 2;
  const availH = pageDim.h - margin * 2;

  // 1. 求最大可能的列数 / 行数（间距为 0 时）
  //    N 个徽章贴在一起占用 N*badgeSize，反向：N <= avail/badgeSize
  let cols = Math.max(1, Math.floor(availW / badgeSize));
  let rows = Math.max(1, Math.floor(availH / badgeSize));

  // 2. 决定最终使用的间距
  let spacing;
  if (fillPage) {
    // “填满页面”：反向求间距，让 cols×rows 恰好占满可用区域
    // N*badgeSize + (N-1)*spacing = avail  =>  spacing = (avail - N*badgeSize) / (N - 1)
    const fillSpacingW = cols > 1 ? (availW - cols * badgeSize) / (cols - 1) : 0;
    const fillSpacingH = rows > 1 ? (availH - rows * badgeSize) / (rows - 1) : 0;
    // 取两者较小值，确保两个方向都不超出，且非负
    spacing = Math.max(0, Math.min(fillSpacingW, fillSpacingH));
  } else {
    // 自定义间距模式：若间距过大导致装不下，回退到一个能放得下的列/行数
    spacing = userSpacing;
    cols = Math.max(1, Math.floor((availW + spacing) / (badgeSize + spacing)));
    rows = Math.max(1, Math.floor((availH + spacing) / (badgeSize + spacing)));
  }

  const perPage = cols * rows;

  // 实际占用尺寸与起始坐标（让排版区域居中）
  const totalUsedW = cols * badgeSize + (cols - 1) * spacing;
  const totalUsedH = rows * badgeSize + (rows - 1) * spacing;
  const offsetX = margin + (availW - totalUsedW) / 2;
  const offsetY = margin + (availH - totalUsedH) / 2;

  return { badgeSize, pageDim, cols, rows, perPage, spacing, offsetX, offsetY, fillPage };
}

/* ------------------------------------------------------------------ */
/* 渲染：缩略图列表 + A4 预览 + 顶部信息                                  */
/* ------------------------------------------------------------------ */

function renderAll() {
  const previewBox = document.getElementById('bp-preview');
  const dropzone = document.getElementById('bp-dropzone');
  const generateBtn = document.getElementById('bp-generate');

  if (images.length === 0) {
    previewBox.style.display = 'none';
    dropzone.style.display = 'flex';
    generateBtn.disabled = true;
    document.getElementById('bp-count').textContent = t('bpCount', 0);
    document.getElementById('bp-layout-info').textContent = '';
    return;
  }

  previewBox.style.display = 'block';
  dropzone.style.display = 'none';
  generateBtn.disabled = false;

  document.getElementById('bp-count').textContent = t('bpCount', images.length);

  // 同步"选中图片缩放"控件
  const perImgBox = document.getElementById('bp-per-img-controls');
  const selected = images.find((it) => it.id === selectedId);
  if (selected) {
    perImgBox.style.display = 'inline-flex';
    document.getElementById('bp-selected-name').textContent = `#${selected.id}`;
    const scaleInput = document.getElementById('bp-img-scale');
    scaleInput.value = selected.scale;
    document.getElementById('bp-img-scale-val').textContent = selected.scale + '%';
  } else {
    perImgBox.style.display = 'none';
  }

  renderThumbs();
  renderPagePreview();
}

function renderThumbs() {
  const wrap = document.getElementById('bp-thumbs');
  wrap.innerHTML = images
    .map(
      (it) => `
      <div class="bp-thumb${it.id === selectedId ? ' bp-thumb--selected' : ''}" data-id="${it.id}">
        <img src="${it.dataUrl}" alt="" />
        ${it.scale !== 100 ? `<span class="bp-thumb__scale">${it.scale}%</span>` : ''}
        <button class="bp-thumb__remove" title="${t('bpBtnRemove')}">✕</button>
      </div>
    `,
    )
    .join('');

  wrap.querySelectorAll('.bp-thumb').forEach((thumb) => {
    thumb.addEventListener('click', (e) => {
      if (e.target.closest('.bp-thumb__remove')) return;
      const id = parseInt(thumb.dataset.id, 10);
      // 再次点击同一张 → 取消选中
      selectedId = selectedId === id ? null : id;
      renderAll();
    });
  });

  wrap.querySelectorAll('.bp-thumb__remove').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = parseInt(btn.parentElement.dataset.id, 10);
      // 如果删的是选中的，清除选中
      if (selectedId === id) selectedId = null;
      removeImage(id);
    });
  });
}

function renderPagePreview() {
  const layout = computeLayout();
  // 每页重复使用图片：每张原图会被复制 (perPage / images.length) 次（向上取整）
  const repeatPerImage = images.length > 0 ? Math.ceil(layout.perPage / images.length) : 0;
  // 实际页数：ceil(images.length / perPage)；但因为重复，单张图就只生成 1 页
  const pages = Math.max(1, Math.ceil(images.length / layout.perPage));
  document.getElementById('bp-layout-info').textContent = t(
    'bpLayout',
    layout.cols,
    layout.rows,
    layout.perPage,
    images.length,
    pages,
    repeatPerImage,
  );

  // 仅绘制首页预览（最具代表性的一页）
  const canvas = document.getElementById('bp-canvas');
  const ctx = canvas.getContext('2d');

  // 预览尺寸：以 360px 宽为基准
  const PREVIEW_W = 360;
  const mmPerPx = layout.pageDim.w / PREVIEW_W;
  const PREVIEW_H = layout.pageDim.h / mmPerPx;

  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = PREVIEW_W + 'px';
  canvas.style.height = PREVIEW_H + 'px';
  canvas.width = Math.round(PREVIEW_W * dpr);
  canvas.height = Math.round(PREVIEW_H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // 纸张底色
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, PREVIEW_W, PREVIEW_H);

  // 绘制首页的徽章（圆形裁切 + 细黑边框 + 图片重复平铺 + 每张可选缩放）
  const offsetRatio = parseInt(document.getElementById('bp-offset').value, 10) / 100;
  for (let slot = 0; slot < layout.perPage; slot++) {
    if (slot >= images.length) break;
    const it = images[slot % images.length];

    const col = slot % layout.cols;
    const row = Math.floor(slot / layout.cols);
    const x = (layout.offsetX + col * (layout.badgeSize + layout.spacing)) / mmPerPx;
    const y = (layout.offsetY + row * (layout.badgeSize + layout.spacing)) / mmPerPx;
    const size = layout.badgeSize / mmPerPx;
    const cx = x + size / 2;
    const cy = y + size / 2;
    const r = size / 2;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    drawCoverImage(ctx, it.img, x, y, size, size, offsetRatio, it.scale);
    ctx.restore();

    // 细黑色边框（与 PDF 输出一致，受 bp-border 复选框控制）
    if (document.getElementById('bp-border').checked) {
      ctx.beginPath();
      ctx.arc(cx, cy, r - 0.5 / mmPerPx, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.lineWidth = Math.max(0.5, size * 0.006);
      ctx.stroke();
    }
  }

  // 切刀十字线
  if (document.getElementById('bp-crop').checked) {
    drawCropMarks(ctx, layout, mmPerPx);
  }

  // 页码（若有第二页）
  if (pages > 1) {
    ctx.fillStyle = '#0ea5e9';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`1 / ${pages}`, PREVIEW_W - 8, PREVIEW_H - 8);
  }
}

/**
 * 将图片绘制到指定矩形，根据 scale 选择 cover 或 contain 模式
 * - scale >= 100：cover 模式（默认），充满矩形，超出部分被裁切，verticalOffsetRatio 控制上下偏移
 * - scale < 100：contain 模式，完整显示图片在矩形中央，剩余区域留白（透明）
 *
 * @param {number} verticalOffsetRatio - 垂直偏移比例（仅 cover 模式生效），-1~1
 * @param {number} userScale - 用户缩放百分比，100=原始 cover，<100=缩小留白，>100=放大（仍 cover）
 */
function drawCoverImage(ctx, img, x, y, w, h, verticalOffsetRatio = 0, userScale = 100) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;

  // baseScale：cover 模式需要的最小缩放
  const baseScale = Math.max(w / iw, h / ih);
  // 最终缩放：cover 模式时直接用 baseScale；用户缩放按比例缩小
  // 例如 scale=50 时，最终宽高是 cover 模式的 50%
  const finalScale = baseScale * (userScale / 100);
  const dw = iw * finalScale;
  const dh = ih * finalScale;
  const dx = x + (w - dw) / 2;
  // cover 模式：垂直偏移才有意义；contain 模式下图片已完整显示，偏移只用于微调
  const travel = Math.max(0, dh - h);
  const dy = y + (h - dh) / 2 + travel * verticalOffsetRatio;
  ctx.drawImage(img, dx, dy, dw, dh);
}

function drawCropMarks(ctx, layout, mmPerPx) {
  ctx.save();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.lineWidth = 0.6;

  const markLen = 4 / mmPerPx; // 4mm 切刀线
  const gap = 1 / mmPerPx;     // 1mm 间隔

  for (let r = 0; r < layout.rows; r++) {
    for (let c = 0; c < layout.cols; c++) {
      const cx = (layout.offsetX + c * (layout.badgeSize + layout.spacing)) / mmPerPx;
      const cy = (layout.offsetY + r * (layout.badgeSize + layout.spacing)) / mmPerPx;
      const size = layout.badgeSize / mmPerPx;

      // 四角十字短线
      const corners = [
        [cx, cy], [cx + size, cy], [cx, cy + size], [cx + size, cy + size],
      ];
      for (const [px, py] of corners) {
        ctx.beginPath();
        ctx.moveTo(px - markLen, py);
        ctx.lineTo(px - gap, py);
        ctx.moveTo(px + gap, py);
        ctx.lineTo(px + markLen, py);
        ctx.moveTo(px, py - markLen);
        ctx.lineTo(px, py - gap);
        ctx.moveTo(px, py + gap);
        ctx.lineTo(px, py + markLen);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* 生成 PDF                                                            */
/* ------------------------------------------------------------------ */

async function generatePdf() {
  if (images.length === 0) {
    showToast(t('bpToastEmpty'));
    return;
  }

  const btn = document.getElementById('bp-generate');
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = t('bpGenerating');

  try {
    const layout = computeLayout();
    const bleed = document.getElementById('bp-bleed').checked;
    const crop = document.getElementById('bp-crop').checked;
    const drawBorder = document.getElementById('bp-border').checked;
    const offsetRatio = parseInt(document.getElementById('bp-offset').value, 10) / 100;
    const pages = Math.ceil(images.length / layout.perPage);
    const pageSize = document.getElementById('bp-page').value;
    const orientation = document.getElementById('bp-orientation').value;

    // 每个吧唧的实际绘制尺寸（mm）：含出血时向外扩 3mm（单边 1.5mm，但通常两侧各 3mm，
    // 这里采用整张图四周各 3mm 出血标准）
    const BLEED_MM = bleed ? 3 : 0;
    const drawSize = layout.badgeSize + BLEED_MM * 2;
    const cellDrawSize = drawSize + layout.spacing;

    const pdf = new jsPDF({ orientation, unit: 'mm', format: pageSize });

    for (let p = 0; p < pages; p++) {
      if (p > 0) pdf.addPage();

      const start = p * layout.perPage;
      const end = Math.min(start + layout.perPage, images.length);

      const colsOnPage = layout.cols;
      const rowsOnPage = Math.ceil((end - start) / colsOnPage);
      const ox = layout.offsetX;
      const oy = layout.offsetY;

      // 按用户意图循环使用图片：上传 1 张就重复铺满一页；上传 N 张则按顺序平铺到所有位置
      // 后续位置超出 images.length 时，回到 images[i % images.length]
      for (let slot = 0; slot < layout.perPage; slot++) {
        const sourceIdx = start + slot;
        if (sourceIdx >= images.length) break; // 真正不足时直接停止（后续为空）
        // 用户希望：上传 1 张就铺满整页（15 张），上传 2 张则每张 7-8 张，等等
        // 实现：每个 slot 优先取当前 index；超出后用 (sourceIdx % images.length)
        const imgItem = images[sourceIdx % images.length];

        const col = slot % colsOnPage;
        const row = Math.floor(slot / colsOnPage);
        const x = ox + col * cellDrawSize - BLEED_MM;
        const y = oy + row * cellDrawSize - BLEED_MM;

        // 圆形吧唧 + 可选细黑边框 + 垂直偏移 + 每张可选缩放
        await drawCircularBadgeToPdf(pdf, imgItem, x, y, drawSize, drawSize, offsetRatio, drawBorder, imgItem.scale);
      }

      // 切刀十字线（仅在有图片的位置画，避免空位干扰）
      // 当前默认 fill 模式下整页都有图；非 fill 时跳过无图位置
      const filledSlots = Math.min(layout.perPage - start, Math.max(0, images.length - start));
      if (crop && filledSlots > 0) {
        drawCropMarksToPdf(pdf, ox, oy, colsOnPage, rowsOnPage, drawSize, layout.spacing);
      }

      // 页码角标
      if (pages > 1) {
        pdf.setFontSize(9);
        pdf.setTextColor(120);
        pdf.text(
          `${p + 1} / ${pages}`,
          layout.pageDim.w - 12,
          layout.pageDim.h - 6,
          { align: 'right' },
        );
      }
    }

    pdf.save(`badges-${Date.now()}.pdf`);
    showToast(t('bpToastSuccess', pages));
  } catch (err) {
    console.error('Badge PDF generation failed:', err);
    showToast(t('bpToastError'));
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

/**
 * 将图片以 cover 模式绘制到 jsPDF，圆形裁切、透明背景 PNG，可选细黑色边框、可选缩放。
 * jsPDF 的 addImage 支持带 alpha 的 PNG，所以可以保留圆形外的透明区域。
 *
 * @param {number} verticalOffsetRatio - 垂直偏移比例，-1~1，0=居中
 * @param {boolean} drawBorder - 是否绘制圆形黑色边框
 * @param {number} userScale - 用户缩放百分比，100=cover（默认），<100=contain（缩小留白），>100=放大
 */
function drawCircularBadgeToPdf(pdf, item, x, y, w, h, verticalOffsetRatio = 0, drawBorder = true, userScale = 100) {
  return new Promise((resolve, reject) => {
    const img = item.img;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;

    const canvas = document.createElement('canvas');
    // 目标分辨率：以 8px/mm 印刷质量为基准（≈203dpi），避免文件过大
    const TARGET_PX_PER_MM = 8;
    const sizePx = Math.round(Math.max(w, h) * TARGET_PX_PER_MM);
    canvas.width = sizePx;
    canvas.height = sizePx;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 第 1 步：圆形裁切 + cover/contain 绘制图片
    ctx.save();
    ctx.beginPath();
    ctx.arc(sizePx / 2, sizePx / 2, sizePx / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // baseScale 是 cover 模式所需缩放；userScale 控制实际缩放比例
    // userScale=100 时即原始 cover；userScale=50 时图片缩小到 cover 的 50%
    const baseScale = Math.max(sizePx / iw, sizePx / ih);
    const finalScale = baseScale * (userScale / 100);
    const dw = iw * finalScale;
    const dh = ih * finalScale;
    const dx = (sizePx - dw) / 2;
    // cover 模式下垂直偏移才有意义；contain 模式下图片已完整显示，偏移仅用于微调
    const travel = Math.max(0, dh - sizePx);
    const dy = (sizePx - dh) / 2 + travel * verticalOffsetRatio;
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.restore();

    // 第 2 步（可选）：在裁切区外绘制细黑色边框，正好落在圆形边缘
    if (drawBorder) {
      ctx.beginPath();
      ctx.arc(sizePx / 2, sizePx / 2, sizePx / 2 - 0.5, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.lineWidth = Math.max(1, sizePx * 0.006); // ~0.6% 直径，约 0.3-0.4mm
      ctx.stroke();
    }

    // PNG 保留透明背景
    const dataUrl = canvas.toDataURL('image/png');
    try {
      pdf.addImage(dataUrl, 'PNG', x, y, w, h, undefined, 'FAST');
      resolve();
    } catch (err) {
      reject(err);
    }
  });
}

function drawCropMarksToPdf(pdf, ox, oy, cols, rows, drawSize, spacing) {
  pdf.setDrawColor(120);
  pdf.setLineWidth(0.15);
  const len = 3;     // mm
  const gap = 1;     // mm

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = ox + c * (drawSize + spacing);
      const y = oy + r * (drawSize + spacing);

      const corners = [
        [x, y], [x + drawSize, y], [x, y + drawSize], [x + drawSize, y + drawSize],
      ];
      for (const [px, py] of corners) {
        pdf.line(px - len, py, px - gap, py);
        pdf.line(px + gap, py, px + len, py);
        pdf.line(px, py - len, px, py - gap);
        pdf.line(px, py + gap, px, py + len);
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* 工具：Toast、尺寸格式化                                              */
/* ------------------------------------------------------------------ */

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
