/**
 * 多级域名转一级域名工具页
 */

/**
 * 常见的二级顶级域名后缀
 * 对于这些后缀，一级域名由最后三段组成
 */
const SECOND_LEVEL_TLDS = new Set([
  'com.cn', 'net.cn', 'org.cn', 'gov.cn', 'edu.cn', 'ac.cn',
  'co.uk', 'org.uk', 'ac.uk', 'gov.uk', 'net.uk',
  'co.jp', 'or.jp', 'ne.jp', 'ac.jp', 'go.jp',
  'com.au', 'net.au', 'org.au', 'edu.au', 'gov.au',
  'co.kr', 'or.kr', 'ne.kr',
  'com.br', 'net.br', 'org.br', 'gov.br',
  'com.tw', 'net.tw', 'org.tw', 'edu.tw', 'gov.tw',
  'com.hk', 'net.hk', 'org.hk', 'edu.hk', 'gov.hk',
  'co.in', 'net.in', 'org.in', 'gen.in', 'firm.in', 'ind.in',
  'co.nz', 'net.nz', 'org.nz',
  'co.za', 'net.za', 'org.za', 'web.za',
  'com.sg', 'net.sg', 'org.sg', 'edu.sg', 'gov.sg',
  'com.my', 'net.my', 'org.my', 'edu.my', 'gov.my',
  'com.mx', 'net.mx', 'org.mx', 'edu.mx', 'gob.mx',
  'com.ru', 'net.ru', 'org.ru',
  'co.id', 'or.id', 'web.id',
  'com.tr', 'net.tr', 'org.tr', 'edu.tr', 'gov.tr',
]);

/**
 * 将域名转换为一级域名（根域名）
 */
function toRootDomain(input) {
  let domain = input.trim();
  if (!domain) return '';

  // 去除协议
  domain = domain.replace(/^(https?:\/\/)/i, '');
  // 去除路径、查询参数、端口
  domain = domain.split('/')[0].split('?')[0].split('#')[0];
  domain = domain.replace(/:\d+$/, '');
  // 去除末尾的点
  domain = domain.replace(/\.+$/, '');

  const parts = domain.toLowerCase().split('.');

  if (parts.length <= 2) return domain.toLowerCase();

  // 检测是否为二级顶级域名
  const lastTwo = `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
  if (SECOND_LEVEL_TLDS.has(lastTwo) && parts.length >= 3) {
    return `${parts[parts.length - 3]}.${lastTwo}`;
  }

  // 默认取最后两段
  return `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
}

/**
 * 批量转换
 */
function convertDomains(text) {
  return text
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      return toRootDomain(trimmed);
    })
    .join('\n');
}

/**
 * 渲染域名转换工具页
 */
export function renderDomainConverter(router) {
  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="tool-page">
      <div class="tool-page__header">
        <button class="tool-page__back" id="btn-back">← 返回首页</button>
        <h1 class="tool-page__title">🌐 多级域名转一级域名</h1>
        <p class="tool-page__desc">批量将子域名或多级域名提取为一级域名（根域名），每行输入一个域名</p>
      </div>

      <div class="converter-wrapper">
        <div class="converter-panel">
          <label class="converter-panel__label">输入域名</label>
          <textarea
            id="input-domains"
            class="converter-panel__textarea"
            placeholder="每行输入一个域名，例如：&#10;mail.google.com&#10;https://docs.github.com/en/pages&#10;api.v2.example.co.uk"
          ></textarea>
        </div>

        <div class="converter-actions">
          <button class="btn btn--primary" id="btn-convert">
            <span class="btn--icon">⚡</span> 转换
          </button>
          <button class="btn btn--secondary" id="btn-clear">
            <span class="btn--icon">🗑️</span> 清空
          </button>
          <button class="btn btn--secondary" id="btn-copy">
            <span class="btn--icon">📋</span> 复制
          </button>
        </div>

        <div class="converter-panel">
          <label class="converter-panel__label">转换结果</label>
          <textarea
            id="output-domains"
            class="converter-panel__textarea converter-panel__textarea--readonly"
            readonly
            placeholder="转换结果将在此展示"
          ></textarea>
          <div class="converter-panel__actions">
            <button class="btn btn--secondary" id="btn-dedup">
              <span class="btn--icon">🔄</span> 去重
            </button>
            <button class="btn btn--secondary" id="btn-wildcard">
              <span class="btn--icon">✳️</span> 加*
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="toast" id="toast"></div>
  `;

  bindConverterEvents(router);
}

function bindConverterEvents(router) {
  // 返回首页
  document.getElementById('btn-back').addEventListener('click', () => {
    router.navigate('');
  });

  // 转换
  document.getElementById('btn-convert').addEventListener('click', () => {
    const input = document.getElementById('input-domains').value;
    const result = convertDomains(input);
    document.getElementById('output-domains').value = result;
  });

  // 清空
  document.getElementById('btn-clear').addEventListener('click', () => {
    document.getElementById('input-domains').value = '';
    document.getElementById('output-domains').value = '';
  });

  // 复制结果
  document.getElementById('btn-copy').addEventListener('click', async () => {
    const output = document.getElementById('output-domains').value;
    if (!output.trim()) {
      showToast('暂无内容可复制');
      return;
    }
    try {
      await navigator.clipboard.writeText(output);
      showToast('✅ 已复制到剪贴板');
    } catch {
      showToast('复制失败，请手动复制');
    }
  });

  // 去重
  document.getElementById('btn-dedup').addEventListener('click', () => {
    const output = document.getElementById('output-domains');
    const lines = output.value.split('\n').filter((l) => l.trim());
    const unique = [...new Set(lines)];
    output.value = unique.join('\n');
    showToast(`✅ 去重完成，${lines.length} → ${unique.length} 条`);
  });

  // 加*（幂等，多次点击不会重复添加）
  document.getElementById('btn-wildcard').addEventListener('click', () => {
    const output = document.getElementById('output-domains');
    const lines = output.value.split('\n');
    output.value = lines
      .map((l) => {
        let d = l.trim();
        if (!d) return '';
        // 先去掉已有的通配符，再统一添加
        if (d.startsWith('*.')) d = d.slice(2);
        if (d.endsWith('*')) d = d.slice(0, -1);
        return `*.${d}*`;
      })
      .join('\n');
    showToast('✅ 已添加通配符');
  });
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('toast--visible');
  setTimeout(() => toast.classList.remove('toast--visible'), 2000);
}
