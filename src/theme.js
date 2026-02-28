/**
 * 主题管理模块
 * 浅色主题为默认，支持切换到深色主题，偏好持久化到 localStorage
 */

const STORAGE_KEY = 'qfaitool-theme';

/** 获取当前主题 */
export function getTheme() {
    return localStorage.getItem(STORAGE_KEY) || 'light';
}

/** 获取主题切换按钮图标 */
export function getThemeIcon() {
    return getTheme() === 'dark' ? '☀️' : '🌙';
}

/** 应用主题到 DOM */
export function applyTheme() {
    const theme = getTheme();
    if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
}

/** 切换主题 */
function toggleTheme() {
    const next = getTheme() === 'dark' ? 'light' : 'dark';
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme();

    // 更新按钮图标
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.textContent = getThemeIcon();
}

/** 初始化主题系统（应用主题 + 绑定切换事件） */
export function initTheme() {
    applyTheme();
    document.addEventListener('click', (e) => {
        if (e.target.closest('#theme-toggle')) {
            toggleTheme();
        }
    });
}
