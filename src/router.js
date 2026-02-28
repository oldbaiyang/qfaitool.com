/**
 * 简易 Hash 路由器
 */

export class Router {
    constructor() {
        this.routes = {};
        this.currentRoute = null;
        window.addEventListener('hashchange', () => this._handleRoute());
    }

    /** 注册路由 */
    register(path, handler) {
        this.routes[path] = handler;
        return this;
    }

    /** 启动路由 */
    start() {
        this._handleRoute();
    }

    /** 导航到指定路由 */
    navigate(path) {
        window.location.hash = `#/${path}`;
    }

    /** 获取当前 hash 路径 */
    _getPath() {
        const hash = window.location.hash.slice(1) || '/';
        return hash.startsWith('/') ? hash : `/${hash}`;
    }

    /** 处理路由变化 */
    _handleRoute() {
        const path = this._getPath();
        this.currentRoute = path;

        const handler = this.routes[path] || this.routes['/'];
        if (handler) {
            handler(path);
        }
    }
}
