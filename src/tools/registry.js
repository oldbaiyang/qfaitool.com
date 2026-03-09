/**
 * 工具注册表
 * 新增工具时，只需在此文件添加一条记录即可。
 */
export const tools = [
    {
        id: 'domain-converter',
        nameKey: 'tool.domain-converter.name',
        descKey: 'tool.domain-converter.desc',
        icon: '🌐',
        tags: ['域名', '网络'],
        route: '/domain-converter',
    },
    {
        id: 'whitelist-diff',
        nameKey: 'tool.whitelist-diff.name',
        descKey: 'tool.whitelist-diff.desc',
        icon: '📋',
        tags: ['安全', '网络'],
        route: '/whitelist-diff',
    },
    {
        id: 'youtube-downloader',
        nameKey: 'tool.youtube-downloader.name',
        descKey: 'tool.youtube-downloader.desc',
        icon: '📺',
        tags: ['视频', '下载'],
        route: '/youtube-downloader',
    },
    {
        id: 'qr-scanner',
        nameKey: 'tool.qr-scanner.name',
        descKey: 'tool.qr-scanner.desc',
        icon: '📷',
        tags: ['图片', '工具'],
        route: '/qr-scanner',
    },
];

/**
 * 从所有工具中提取全部标签（去重，返回原始 key）
 */
export function getAllTags() {
    const tagSet = new Set();
    tools.forEach((t) => t.tags.forEach((tag) => tagSet.add(tag)));
    return Array.from(tagSet);
}

/**
 * 按标签过滤工具
 */
export function filterByTag(tag) {
    if (!tag) return tools;
    return tools.filter((t) => t.tags.includes(tag));
}

/**
 * 模糊搜索工具（匹配名称、描述、标签）
 */
export function searchTools(keyword, t) {
    if (!keyword) return tools;
    const q = keyword.toLowerCase();
    return tools.filter((tool) => {
        const name = t(tool.nameKey).toLowerCase();
        const desc = t(tool.descKey).toLowerCase();
        const tags = tool.tags.map((tag) => t('tag.' + tag).toLowerCase()).join(' ');
        return name.includes(q) || desc.includes(q) || tags.includes(q);
    });
}
