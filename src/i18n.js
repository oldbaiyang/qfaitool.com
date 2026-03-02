/**
 * 国际化模块
 * 支持：zh-CN（简体中文）、zh-TW（繁体中文）、en（英语）
 */

const STORAGE_KEY = 'qfaitool-lang';

const messages = {
    'zh-CN': {
        // Header
        home: '首页',
        // Home
        heroTitle: '在线工具集',
        heroSubtitle: '简洁好用的常用工具，提升你的工作效率',
        tagAll: '全部',
        // Tool registry
        'tool.domain-converter.name': '多级域名转一级域名',
        'tool.domain-converter.desc': '批量将多级域名（如 a.b.example.com）提取为一级域名（如 example.com），支持特殊后缀处理',
        'tag.域名': '域名',
        'tag.网络': '网络',
        // Domain converter page
        backHome: '← 返回首页',
        dcTitle: '🌐 多级域名转一级域名',
        dcDesc: '批量将子域名或多级域名提取为一级域名（根域名），每行输入一个域名',
        inputLabel: '输入域名',
        outputLabel: '转换结果',
        inputPlaceholder: '每行输入一个域名，例如：\nmail.google.com\nhttps://docs.github.com/en/pages\napi.v2.example.co.uk',
        outputPlaceholder: '转换结果将在此展示',
        btnConvert: '转换',
        btnClear: '清空',
        btnCopy: '复制',
        btnDedup: '去重',
        btnWildcard: '加*',
        // Toasts
        toastNothingToCopy: '暂无内容可复制',
        toastCopied: '✅ 已复制到剪贴板',
        toastCopyFail: '复制失败，请手动复制',
        toastDedupDone: (before, after) => `✅ 去重完成，${before} → ${after} 条`,
        toastWildcardDone: '✅ 已添加通配符',
        // Whitelist diff
        'tool.whitelist-diff.name': '白名单列表对比',
        'tool.whitelist-diff.desc': '对比新旧白名单（IP/域名），找出新增和删除的条目',
        'tag.安全': '安全',
        wdTitle: '📋 白名单列表对比',
        wdDesc: '对比新旧白名单列表，找出新增和删除的 IP 地址或域名',
        wdOldLabel: '原白名单',
        wdNewLabel: '新白名单',
        wdOldPlaceholder: '每行一个 IP 或域名，例如：\n192.168.1.1\nexample.com\n10.0.0.0/8',
        wdNewPlaceholder: '每行一个 IP 或域名，例如：\n192.168.1.1\nnewdomain.com\n10.0.0.0/8',
        wdBtnCompare: '对比',
        wdRemovedTitle: '已删除（原白名单中有，新白名单中没有）',
        wdAddedTitle: '新增（原白名单中没有，新白名单中有）',
        wdToastDone: (removed, added) => `✅ 对比完成：删除 ${removed} 条，新增 ${added} 条`,
    },

    'zh-TW': {
        home: '首頁',
        heroTitle: '線上工具集',
        heroSubtitle: '簡潔好用的常用工具，提升你的工作效率',
        tagAll: '全部',
        'tool.domain-converter.name': '多級域名轉一級域名',
        'tool.domain-converter.desc': '批次將多級域名（如 a.b.example.com）提取為一級域名（如 example.com），支援特殊後綴處理',
        'tag.域名': '域名',
        'tag.网络': '網路',
        backHome: '← 返回首頁',
        dcTitle: '🌐 多級域名轉一級域名',
        dcDesc: '批次將子域名或多級域名提取為一級域名（根域名），每行輸入一個域名',
        inputLabel: '輸入域名',
        outputLabel: '轉換結果',
        inputPlaceholder: '每行輸入一個域名，例如：\nmail.google.com\nhttps://docs.github.com/en/pages\napi.v2.example.co.uk',
        outputPlaceholder: '轉換結果將在此展示',
        btnConvert: '轉換',
        btnClear: '清空',
        btnCopy: '複製',
        btnDedup: '去重',
        btnWildcard: '加*',
        toastNothingToCopy: '暫無內容可複製',
        toastCopied: '✅ 已複製到剪貼簿',
        toastCopyFail: '複製失敗，請手動複製',
        toastDedupDone: (before, after) => `✅ 去重完成，${before} → ${after} 條`,
        toastWildcardDone: '✅ 已添加萬用字元',
        'tool.whitelist-diff.name': '白名單列表對比',
        'tool.whitelist-diff.desc': '對比新舊白名單（IP/域名），找出新增和刪除的條目',
        'tag.安全': '安全',
        wdTitle: '📋 白名單列表對比',
        wdDesc: '對比新舊白名單列表，找出新增和刪除的 IP 位址或域名',
        wdOldLabel: '原白名單',
        wdNewLabel: '新白名單',
        wdOldPlaceholder: '每行一個 IP 或域名，例如：\n192.168.1.1\nexample.com\n10.0.0.0/8',
        wdNewPlaceholder: '每行一個 IP 或域名，例如：\n192.168.1.1\nnewdomain.com\n10.0.0.0/8',
        wdBtnCompare: '對比',
        wdRemovedTitle: '已刪除（原白名單中有，新白名單中沒有）',
        wdAddedTitle: '新增（原白名單中沒有，新白名單中有）',
        wdToastDone: (removed, added) => `✅ 對比完成：刪除 ${removed} 條，新增 ${added} 條`,
    },

    en: {
        home: 'Home',
        heroTitle: 'Online Toolbox',
        heroSubtitle: 'Simple and handy tools to boost your productivity',
        tagAll: 'All',
        'tool.domain-converter.name': 'Domain to Root Domain',
        'tool.domain-converter.desc': 'Batch extract root domains from subdomains (e.g. a.b.example.com → example.com), with special suffix support',
        'tag.域名': 'Domain',
        'tag.网络': 'Network',
        backHome: '← Back to Home',
        dcTitle: '🌐 Domain to Root Domain',
        dcDesc: 'Batch extract root domains from subdomains, one domain per line',
        inputLabel: 'Input Domains',
        outputLabel: 'Results',
        inputPlaceholder: 'Enter one domain per line, e.g.:\nmail.google.com\nhttps://docs.github.com/en/pages\napi.v2.example.co.uk',
        outputPlaceholder: 'Converted results will appear here',
        btnConvert: 'Convert',
        btnClear: 'Clear',
        btnCopy: 'Copy',
        btnDedup: 'Dedup',
        btnWildcard: 'Add *',
        toastNothingToCopy: 'Nothing to copy',
        toastCopied: '✅ Copied to clipboard',
        toastCopyFail: 'Copy failed, please copy manually',
        toastDedupDone: (before, after) => `✅ Deduped: ${before} → ${after} items`,
        toastWildcardDone: '✅ Wildcards added',
        'tool.whitelist-diff.name': 'Whitelist Diff',
        'tool.whitelist-diff.desc': 'Compare old and new whitelists (IP/domain) to find added and removed entries',
        'tag.安全': 'Security',
        wdTitle: '📋 Whitelist Diff',
        wdDesc: 'Compare old and new whitelist to find added and removed IPs or domains',
        wdOldLabel: 'Old Whitelist',
        wdNewLabel: 'New Whitelist',
        wdOldPlaceholder: 'One IP or domain per line, e.g.:\n192.168.1.1\nexample.com\n10.0.0.0/8',
        wdNewPlaceholder: 'One IP or domain per line, e.g.:\n192.168.1.1\nnewdomain.com\n10.0.0.0/8',
        wdBtnCompare: 'Compare',
        wdRemovedTitle: 'Removed (in old, not in new)',
        wdAddedTitle: 'Added (not in old, in new)',
        wdToastDone: (removed, added) => `✅ Done: ${removed} removed, ${added} added`,
    },
};

/** 支持的语言列表 */
export const LANGUAGES = [
    { code: 'zh-CN', label: '简体中文' },
    { code: 'zh-TW', label: '繁體中文' },
    { code: 'en', label: 'English' },
];

/** 根据浏览器语言检测默认语言 */
function detectLang() {
    const nav = navigator.language || navigator.languages?.[0] || 'zh-CN';
    if (nav.startsWith('zh')) {
        return nav.includes('TW') || nav.includes('HK') || nav.includes('Hant') ? 'zh-TW' : 'zh-CN';
    }
    return 'en';
}

/** 获取当前语言 */
export function getLang() {
    return localStorage.getItem(STORAGE_KEY) || detectLang();
}

/** 设置语言 */
export function setLang(lang) {
    localStorage.setItem(STORAGE_KEY, lang);
}

/** 获取翻译文本 */
export function t(key, ...args) {
    const lang = getLang();
    const dict = messages[lang] || messages['zh-CN'];
    const val = dict[key] ?? messages['zh-CN'][key] ?? key;
    return typeof val === 'function' ? val(...args) : val;
}
