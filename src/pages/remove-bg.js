import { t } from '../i18n.js';

/**
 * 渲染去除图片背景页面
 */
export function renderRemoveBg(router) {
  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="tool-container">
      <div class="tool-header">
        <a href="#/" class="back-link">${t('backHome')}</a>
        <h2 class="tool-title">${t('rbTitle')}</h2>
        <p class="tool-desc">${t('rbDesc')}</p>
      </div>

      <div class="tool-main rb-layout">
        <!-- 处理区域 -->
        <div class="rb-content">
          <!-- 去背景按钮 -->
          <button id="rb-process" class="btn btn--primary btn--large">${t('rbBtnProcess')}</button>

          <!-- 上传/结果区域 -->
          <div id="rb-dropzone" class="rb-dropzone">
            <div id="rb-dropzone-empty" class="rb-dropzone__content">
              <span class="rb-dropzone__icon">✂️</span>
              <p class="rb-dropzone__text">${t('rbPlaceholder')}</p>
              <p class="rb-dropzone__hint">${t('rbDropHint')}</p>
            </div>
            <div id="rb-dropzone-preview" class="rb-dropzone__preview" style="display:none">
              <img id="rb-preview-img" src="" alt="Preview">
            </div>
            <div id="rb-loading" class="rb-loading" style="display:none">
              <div class="rb-spinner"></div>
              <p>${t('rbProcessing')}</p>
            </div>
            <input type="file" id="rb-file-input" accept="image/*" style="display:none">
          </div>

          <!-- 图片信息 -->
          <div id="rb-info" class="rb-info" style="display:none">
            <span>${t('icSize')}: <span id="info-orig-size">-</span></span>
            <span>${t('icResolution')}: <span id="info-orig-res">-</span></span>
          </div>

          <!-- 操作按钮 -->
          <div class="rb-actions">
            <button id="rb-download" class="btn btn--primary" disabled>${t('rbBtnDownload')}</button>
            <button id="rb-clear" class="btn btn--outline">${t('btnClear')}</button>
          </div>
        </div>
      </div>
    </div>
  `;

  bindEvents();
}

let originalFile = null;
let resultBlob = null;

function bindEvents() {
  const fileInput = document.getElementById('rb-file-input');
  const dropzone = document.getElementById('rb-dropzone');
  const previewImg = document.getElementById('rb-preview-img');
  const processBtn = document.getElementById('rb-process');
  const downloadBtn = document.getElementById('rb-download');
  const clearBtn = document.getElementById('rb-clear');

  // 点击上传/预览区域
  dropzone.addEventListener('click', (e) => {
    e.stopPropagation();
    // 如果有结果图，点击打开预览
    if (resultBlob) {
      const url = URL.createObjectURL(resultBlob);
      window.open(url, '_blank');
      return;
    }
    // 否则触发上传
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
  });

  // 拖拽
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('rb-dropzone--active');
  });
  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('rb-dropzone--active');
  });
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('rb-dropzone--active');
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

  // 去背景按钮
  processBtn.addEventListener('click', () => {
    if (!originalFile) {
      alert(t('rbToastNoImage'));
      return;
    }
    processImage();
  });

  // 下载
  downloadBtn.addEventListener('click', () => {
    if (!resultBlob) return;
    const url = URL.createObjectURL(resultBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `removed_bg_${originalFile.name}`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // 清空
  clearBtn.addEventListener('click', () => {
    originalFile = null;
    resultBlob = null;
    document.getElementById('rb-file-input').value = '';
    document.getElementById('rb-dropzone-empty').style.display = 'flex';
    document.getElementById('rb-dropzone-preview').style.display = 'none';
    document.getElementById('rb-preview-img').src = '';
    document.getElementById('rb-preview-img').classList.remove('rb-preview--transparent');
    document.getElementById('rb-info').style.display = 'none';
    document.getElementById('rb-loading').style.display = 'none';
    document.getElementById('rb-process').disabled = true;
    document.getElementById('rb-download').disabled = true;
    // 清空后触发上传
    fileInput.click();
  });
}

async function handleFile(file) {
  originalFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    // 显示预览图
    const previewImg = document.getElementById('rb-preview-img');
    previewImg.src = e.target.result;
    previewImg.classList.remove('rb-preview--transparent');
    document.getElementById('rb-dropzone-empty').style.display = 'none';
    document.getElementById('rb-dropzone-preview').style.display = 'flex';
    // 显示图片信息
    previewImg.onload = () => {
      document.getElementById('info-orig-size').textContent = formatSize(file.size);
      document.getElementById('info-orig-res').textContent = `${previewImg.naturalWidth}x${previewImg.naturalHeight}`;
    };
    document.getElementById('rb-info').style.display = 'flex';
    // 启用去背景按钮
    document.getElementById('rb-process').disabled = false;
  };
  reader.readAsDataURL(file);
}

async function processImage() {
  if (!originalFile) return;

  const loading = document.getElementById('rb-loading');
  const dropzonePreview = document.getElementById('rb-dropzone-preview');

  loading.style.display = 'flex';

  try {
    const blob = await removeBackground(originalFile);

    resultBlob = blob;
    const url = URL.createObjectURL(blob);
    // 在原区域显示结果图（带透明背景）
    const resultImg = document.getElementById('rb-preview-img');
    resultImg.src = url;
    resultImg.classList.add('rb-preview--transparent');

    document.getElementById('info-orig-size').textContent = formatSize(blob.size);

    loading.style.display = 'none';
    document.getElementById('rb-process').disabled = true;
    document.getElementById('rb-download').disabled = false;
  } catch (err) {
    loading.style.display = 'none';
    const msg = err.message || t('rbToastError');
    if (msg.includes('Failed to fetch') || msg.includes('404') || msg.includes('NetworkError')) {
      alert(t('rbToastLocalDev'));
    } else {
      alert(msg);
    }
  }
}

async function removeBackground(file) {
  const formData = new FormData();
  formData.append('image_file', file);

  let response;
  try {
    response = await fetch('/api/remove-bg', {
      method: 'POST',
      body: formData
    });
  } catch (err) {
    console.error('Fetch error:', err);
    throw new Error('网络请求失败，请检查网络连接');
  }

  if (!response.ok) {
    let errorMsg = `请求失败: ${response.status}`;
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const err = await response.json();
        errorMsg = err.error || err.message || errorMsg;
      } else {
        const text = await response.text();
        if (text) errorMsg = text;
      }
    } catch (e) {
      console.error('Error parsing response:', e);
    }
    throw new Error(errorMsg);
  }

  return await response.blob();
}

function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
