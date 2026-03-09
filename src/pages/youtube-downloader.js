/**
 * YouTube 下载工具页 — yt-dlp 命令生成器
 * 粘贴 YouTube 链接 → 选择格式/画质/选项 → 生成 yt-dlp 命令
 */
import { t } from '../i18n.js';

/**
 * 从任意文本中提取 YouTube URL（支持从命令行、消息等杂文本中提取）
 */
function extractYoutubeUrl(text) {
  const trimmed = text.trim();
  if (!trimmed) return null;

  // 尝试从文本中提取完整的 YouTube URL
  const urlMatch = trimmed.match(/(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?[^\s"']+|youtu\.be\/[a-zA-Z0-9_-]{11}[^\s"']*|youtube\.com\/embed\/[a-zA-Z0-9_-]{11}[^\s"']*|youtube\.com\/shorts\/[a-zA-Z0-9_-]{11}[^\s"']*))/i);
  if (urlMatch) return urlMatch[1];

  // 纯 11 位 ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return `https://www.youtube.com/watch?v=${trimmed}`;
  }

  return null;
}

/**
 * 从 URL 中提取视频 ID（用于缩略图预览）
 */
function extractVideoId(text) {
  const url = extractYoutubeUrl(text);
  if (!url) return null;

  const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];

  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];

  const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];

  const shortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shortsMatch) return shortsMatch[1];

  return null;
}

/**
 * 生成 yt-dlp 命令
 */
function generateCommand(url, options) {
  const parts = ['yt-dlp'];

  // 使用 android_vr 客户端绕过 n challenge（不能和 cookies 共存）
  parts.push('--extractor-args', '"youtube:player_client=android_vr"');

  // 格式
  if (options.format === 'mp3') {
    parts.push('-x', '--audio-format', 'mp3');
    if (options.quality === 'best') {
      parts.push('--audio-quality', '0');
    }
  } else if (options.format === 'mp4') {
    // 强制 H.264 编码，兼容性最好
    if (options.quality === 'best') {
      parts.push('-f', '"bestvideo[ext=mp4][vcodec^=avc]+bestaudio[ext=m4a]/best[ext=mp4]"');
    } else {
      parts.push('-f', `"bestvideo[height<=${options.quality}][ext=mp4][vcodec^=avc]+bestaudio[ext=m4a]/best[height<=${options.quality}][ext=mp4]"`);
    }
    parts.push('--merge-output-format', 'mp4');
  } else if (options.format === 'webm') {
    if (options.quality === 'best') {
      parts.push('-f', '"bestvideo[ext=webm]+bestaudio[ext=webm]/best[ext=webm]/best"');
    } else {
      parts.push('-f', `"bestvideo[height<=${options.quality}][ext=webm]+bestaudio[ext=webm]/best[height<=${options.quality}]"`);
    }
    parts.push('--merge-output-format', 'mkv');
  }
  // 'best' 格式不需要额外参数

  // 字幕
  if (options.subtitles) {
    parts.push('--write-subs', '--sub-langs', '"all"');
  }

  // 缩略图
  if (options.thumbnail) {
    parts.push('--write-thumbnail');
  }

  // 输出文件名模板
  if (options.filenameTemplate) {
    parts.push('-o', `"${options.filenameTemplate}"`);
  }

  // 代理
  if (options.proxy) {
    parts.push('--proxy', `"${options.proxy}"`);
  }

  parts.push(`"${url.trim()}"`);

  return parts.join(' ');
}

/**
 * 渲染 yt-dlp 命令生成器页面
 */
export function renderYoutubeDownloader(router) {
  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="tool-page">
      <div class="tool-page__header">
        <button class="tool-page__back" id="btn-back">${t('backHome')}</button>
        <h1 class="tool-page__title">${t('ytTitle')}</h1>
        <p class="tool-page__desc">${t('ytDesc')}</p>
      </div>

      <!-- 输入区 -->
      <div class="yt-input-section">
        <label class="converter-panel__label">${t('ytInputLabel')}</label>
        <div class="yt-input-wrap">
          <input
            type="text"
            id="input-url"
            class="yt-input"
            placeholder="${t('ytInputPlaceholder')}"
            autocomplete="off"
          />
        </div>
      </div>

      <!-- 预览区 -->
      <div class="yt-preview" id="yt-preview" style="display:none;">
        <div class="yt-preview__thumb-wrap">
          <img id="yt-thumb" class="yt-preview__thumb" src="" alt="Video thumbnail" />
        </div>
        <div class="yt-preview__info">
          <p class="yt-preview__id" id="yt-vid-id"></p>
        </div>
      </div>

      <!-- 选项区 -->
      <div class="yt-options">
        <div class="yt-options__grid">
          <div class="yt-option-group">
            <label class="yt-option-group__label">${t('ytOptFormat')}</label>
            <select id="opt-format" class="yt-select">
              <option value="best">${t('ytOptFormatBest')}</option>
              <option value="mp4" selected>MP4</option>
              <option value="webm">WebM</option>
              <option value="mp3">${t('ytOptFormatMp3')}</option>
            </select>
          </div>
          <div class="yt-option-group" id="quality-group">
            <label class="yt-option-group__label">${t('ytOptQuality')}</label>
            <select id="opt-quality" class="yt-select">
              <option value="best">${t('ytOptQualityBest')}</option>
              <option value="2160">4K (2160p)</option>
              <option value="1080" selected>1080p</option>
              <option value="720">720p</option>
              <option value="480">480p</option>
              <option value="360">360p</option>
            </select>
          </div>
          <div class="yt-option-group">
            <label class="yt-option-group__label">${t('ytOptExtra')}</label>
            <div class="yt-checkboxes">
              <label class="yt-checkbox"><input type="checkbox" id="opt-subs" /> ${t('ytOptSubs')}</label>
              <label class="yt-checkbox"><input type="checkbox" id="opt-thumb" /> ${t('ytOptThumb')}</label>
            </div>
          </div>
        </div>

        <div class="yt-options__advanced" id="advanced-toggle-wrap">
          <button class="yt-advanced-toggle" id="btn-advanced">${t('ytAdvanced')} ▾</button>
          <div class="yt-advanced-panel" id="advanced-panel" style="display:none;">
            <div class="yt-option-group">
              <label class="yt-option-group__label">${t('ytOptFilename')}</label>
              <input type="text" id="opt-filename" class="yt-input yt-input--sm" placeholder="%(title)s.%(ext)s" />
            </div>
            <div class="yt-option-group">
              <label class="yt-option-group__label">${t('ytOptProxy')}</label>
              <input type="text" id="opt-proxy" class="yt-input yt-input--sm" placeholder="socks5://127.0.0.1:1080" />
            </div>
          </div>
        </div>
      </div>

      <!-- 生成按钮 -->
      <div class="yt-generate">
        <button class="btn btn--primary btn--lg" id="btn-generate">
          <span class="btn--icon">⚡</span> ${t('ytBtnGenerate')}
        </button>
      </div>

      <!-- 输出区 -->
      <div class="yt-output" id="yt-output" style="display:none;">
        <label class="converter-panel__label">${t('ytOutputLabel')}</label>
        <div class="yt-command-wrap">
          <pre class="yt-command" id="yt-command"></pre>
          <button class="btn btn--secondary btn--sm yt-copy-btn" id="btn-copy">
            <span class="btn--icon">📋</span> ${t('btnCopy')}
          </button>
        </div>
      </div>

      <!-- 第三方下载站（兜底方案） -->
      <div class="yt-sites" id="yt-sites" style="display:none;">
        <h3 class="yt-sites__title">${t('ytSitesTitle')}</h3>
        <p class="yt-sites__note">${t('ytSitesNote')}</p>
        <div class="yt-sites__grid" id="yt-sites-grid"></div>
      </div>

      <!-- 安装指南 -->
      <div class="yt-install-guide">
        <h3 class="yt-install-guide__title">${t('ytInstallTitle')}</h3>
        <p class="yt-install-guide__note">${t('ytInstallNote')}</p>
        <div class="yt-install-guide__items">
          <div class="yt-install-item">
            <span class="yt-install-item__icon">🍺</span>
            <div>
              <p class="yt-install-item__label">macOS (Homebrew)</p>
              <code class="yt-install-item__code">brew install yt-dlp deno</code>
            </div>
          </div>
          <div class="yt-install-item">
            <span class="yt-install-item__icon">🐧</span>
            <div>
              <p class="yt-install-item__label">Linux (pip)</p>
              <code class="yt-install-item__code">pip install yt-dlp</code>
              <code class="yt-install-item__code">curl -fsSL https://deno.land/install.sh | sh</code>
            </div>
          </div>
          <div class="yt-install-item">
            <span class="yt-install-item__icon">🪟</span>
            <div>
              <p class="yt-install-item__label">Windows (winget)</p>
              <code class="yt-install-item__code">winget install yt-dlp DenoLand.Deno</code>
            </div>
          </div>
          <div class="yt-install-item">
            <span class="yt-install-item__icon">🐳</span>
            <div>
              <p class="yt-install-item__label">Docker</p>
              <code class="yt-install-item__code">docker run --rm jauderho/yt-dlp "URL"</code>
            </div>
          </div>
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

  const inputEl = document.getElementById('input-url');
  const formatSelect = document.getElementById('opt-format');
  const qualityGroup = document.getElementById('quality-group');

  // 粘贴自动预览
  inputEl.addEventListener('paste', () => {
    setTimeout(() => updatePreview(), 100);
  });
  inputEl.addEventListener('input', () => updatePreview());

  // 格式切换时控制画质选项
  formatSelect.addEventListener('change', () => {
    qualityGroup.style.display = formatSelect.value === 'mp3' ? 'none' : '';
  });

  // 高级选项折叠
  document.getElementById('btn-advanced').addEventListener('click', () => {
    const panel = document.getElementById('advanced-panel');
    const btn = document.getElementById('btn-advanced');
    const visible = panel.style.display !== 'none';
    panel.style.display = visible ? 'none' : '';
    btn.textContent = visible ? `${t('ytAdvanced')} ▾` : `${t('ytAdvanced')} ▴`;
  });

  // 生成命令
  document.getElementById('btn-generate').addEventListener('click', () => handleGenerate());

  // 回车生成
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleGenerate();
  });

  // 复制
  document.getElementById('btn-copy').addEventListener('click', async () => {
    const command = document.getElementById('yt-command').textContent;
    if (!command.trim()) return;
    try {
      await navigator.clipboard.writeText(command);
      showToast(t('toastCopied'));
    } catch {
      showToast(t('toastCopyFail'));
    }
  });
}

function updatePreview() {
  const input = document.getElementById('input-url').value;
  const videoId = extractVideoId(input);
  const preview = document.getElementById('yt-preview');

  if (videoId) {
    document.getElementById('yt-thumb').src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    document.getElementById('yt-vid-id').textContent = `Video ID: ${videoId}`;
    preview.style.display = '';
  } else {
    preview.style.display = 'none';
  }
}

function handleGenerate() {
  const rawInput = document.getElementById('input-url').value.trim();
  if (!rawInput) {
    showToast(t('ytToastEmpty'));
    return;
  }

  const url = extractYoutubeUrl(rawInput);
  if (!url) {
    showToast(t('ytToastInvalid'));
    return;
  }

  const options = {
    format: document.getElementById('opt-format').value,
    quality: document.getElementById('opt-quality').value,
    subtitles: document.getElementById('opt-subs').checked,
    thumbnail: document.getElementById('opt-thumb').checked,
    filenameTemplate: document.getElementById('opt-filename').value.trim(),
    proxy: document.getElementById('opt-proxy').value.trim(),
  };

  const command = generateCommand(url, options);
  document.getElementById('yt-command').textContent = command;
  document.getElementById('yt-output').style.display = '';

  // 渲染第三方下载站跳转
  const videoId = extractVideoId(rawInput);
  const sites = [
    { name: 'Cobalt', icon: '🔶', url: 'https://cobalt.tools/', desc: t('ytSiteDescCobalt') },
    { name: 'SaveFrom', icon: '💾', url: `https://en.savefrom.net/1-${encodeURIComponent(url)}`, desc: t('ytSiteDescSavefrom') },
    { name: 'Y2Mate', icon: '🎬', url: `https://www.y2mate.com/youtube/${videoId || ''}`, desc: t('ytSiteDescY2mate') },
    { name: '9xbuddy', icon: '🔗', url: `https://9xbuddy.com/process?url=${encodeURIComponent(url)}`, desc: t('ytSiteDesc9xbuddy') },
    { name: 'SSYouTube', icon: '⚡', url: url.replace('youtube.com', 'ssyoutube.com'), desc: t('ytSiteDescSsyt') },
  ];
  const grid = document.getElementById('yt-sites-grid');
  grid.innerHTML = sites.map(s => `
    <a class="yt-site-card" href="${s.url}" target="_blank" rel="noopener noreferrer">
      <span class="yt-site-card__icon">${s.icon}</span>
      <span class="yt-site-card__name">${s.name}</span>
      <span class="yt-site-card__arrow">↗</span>
      <span class="yt-site-card__desc">${s.desc}</span>
    </a>
  `).join('');
  document.getElementById('yt-sites').style.display = '';

  showToast(t('ytToastGenerated'));
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('toast--visible');
  setTimeout(() => toast.classList.remove('toast--visible'), 2000);
}
