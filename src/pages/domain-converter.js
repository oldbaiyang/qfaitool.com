/**
 * 多级域名转一级域名工具页
 */
import { t } from '../i18n.js';

/**
 * 常见的二级顶级域名后缀
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
 * 判断是否为 IPv4 地址
 */
function isIPv4(str) {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(str);
}

function toRootDomain(input) {
  let domain = input.trim();
  if (!domain) return '';
  domain = domain.replace(/^(https?:\/\/)/i, '');
  domain = domain.split('/')[0].split('?')[0].split('#')[0];
  domain = domain.replace(/:\d+$/, '');
  domain = domain.replace(/\.+$/, '');
  // IP 地址不做转换，直接返回
  if (isIPv4(domain)) return domain;
  const parts = domain.toLowerCase().split('.');
  if (parts.length <= 2) return domain.toLowerCase();
  const lastTwo = `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
  if (SECOND_LEVEL_TLDS.has(lastTwo) && parts.length >= 3) {
    return `${parts[parts.length - 3]}.${lastTwo}`;
  }
  return `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
}

function convertDomains(text) {
  const results = text
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      return toRootDomain(trimmed);
    })
    .filter((l) => l);
  const ips = results.filter((l) => isIPv4(l));
  const domains = results.filter((l) => !isIPv4(l));
  return [...ips, ...domains].join('\n');
}

/**
 * 渲染域名转换工具页
 */
export function renderDomainConverter(router) {
  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="tool-page">
      <div class="tool-page__header">
        <button class="tool-page__back" id="btn-back">${t('backHome')}</button>
        <h1 class="tool-page__title">${t('dcTitle')}</h1>
        <p class="tool-page__desc">${t('dcDesc')}</p>
      </div>

      <div class="converter-wrapper">
        <div class="converter-panel">
          <label class="converter-panel__label">${t('inputLabel')}
            <button class="btn btn--small btn--outline" id="btn-test" style="margin-left:8px;font-size:12px;padding:2px 8px;">${t('btnTest')}</button>
          </label>
          <textarea
            id="input-domains"
            class="converter-panel__textarea"
            placeholder="${t('inputPlaceholder')}"
          ></textarea>
        </div>

        <div class="converter-actions">
          <button class="btn btn--primary" id="btn-convert">
            <span class="btn--icon">⚡</span> ${t('btnConvert')}
          </button>
          <button class="btn btn--secondary" id="btn-clear">
            <span class="btn--icon">🗑️</span> ${t('btnClear')}
          </button>
          <button class="btn btn--secondary" id="btn-copy">
            <span class="btn--icon">📋</span> ${t('btnCopy')}
          </button>
        </div>

        <div class="converter-panel">
          <label class="converter-panel__label">${t('outputLabel')}</label>
          <textarea
            id="output-domains"
            class="converter-panel__textarea converter-panel__textarea--readonly"
            readonly
            placeholder="${t('outputPlaceholder')}"
          ></textarea>
          <div class="converter-panel__actions">
            <button class="btn btn--secondary" id="btn-dedup">
              <span class="btn--icon">🔄</span> ${t('btnDedup')}
            </button>
            <button class="btn btn--secondary" id="btn-wildcard">
              <span class="btn--icon">✳️</span> ${t('btnWildcard')}
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
  document.getElementById('btn-back').addEventListener('click', () => {
    router.navigate('');
  });

  document.getElementById('btn-test').addEventListener('click', () => {
    document.getElementById('input-domains').value = `1.1.1.1
2.2.2.2
a.com
a.b.com
a.b.c.com
3.3.3.3
a.b.c.d.com.cn
4.4.4.4
a.b.c.d.e.org.uk
5.5.5.5`;
  });

  document.getElementById('btn-convert').addEventListener('click', () => {
    const input = document.getElementById('input-domains').value;
    const result = convertDomains(input);
    document.getElementById('output-domains').value = result;
  });

  document.getElementById('btn-clear').addEventListener('click', () => {
    document.getElementById('input-domains').value = '';
    document.getElementById('output-domains').value = '';
  });

  document.getElementById('btn-copy').addEventListener('click', async () => {
    const output = document.getElementById('output-domains').value;
    if (!output.trim()) {
      showToast(t('toastNothingToCopy'));
      return;
    }
    try {
      await navigator.clipboard.writeText(output);
      showToast(t('toastCopied'));
    } catch {
      showToast(t('toastCopyFail'));
    }
  });

  document.getElementById('btn-dedup').addEventListener('click', () => {
    const output = document.getElementById('output-domains');
    const lines = output.value.split('\n').filter((l) => l.trim());
    const unique = [...new Set(lines)];
    output.value = unique.join('\n');
    showToast(t('toastDedupDone', lines.length, unique.length));
  });

  document.getElementById('btn-wildcard').addEventListener('click', () => {
    const output = document.getElementById('output-domains');
    const lines = output.value.split('\n');
    output.value = lines
      .map((l) => {
        let d = l.trim();
        if (!d) return '';
        // IP 地址不加*
        if (isIPv4(d)) return d;
        if (d.startsWith('*.')) d = d.slice(2);
        if (d.endsWith('*')) d = d.slice(0, -1);
        return `*.${d}*`;
      })
      .join('\n');
    showToast(t('toastWildcardDone'));
  });
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('toast--visible');
  setTimeout(() => toast.classList.remove('toast--visible'), 2000);
}
