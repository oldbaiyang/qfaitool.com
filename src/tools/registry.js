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
