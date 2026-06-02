const { createApp, defineAsyncComponent, reactive } = Vue;

// Loading全域狀態
const globalState = reactive({
    isLoading: false,
    loadedPaths: {},
    spinnerKey: 0
});

async function loadPage(path) {
    const url = new URL(path, import.meta.url);
    return fetch(url).then(res => res.text());
}

// 先宣告非同步組件：在點擊 Tab 時，同時 fetch HTML 樣板與載入 JS 設定檔
const HomePage = defineAsyncComponent(async () => {
    const [html, config] = await Promise.all([
        loadPage('../pages/home.html'),
        import('./components/home.js').then(m => m.default)
    ]);
    return {
        template: html,
        mixins: [baseMixin],
        ...config
    };
});

const MangaPage = defineAsyncComponent(async () => {
    const [html, config] = await Promise.all([
        loadPage('../pages/manga.html'),
        import('./components/manga.js').then(m => m.default)
    ]);
    return {
        template: html,
        mixins: [baseMixin],
        ...config
    };
});

const AdminPage = defineAsyncComponent(async () => {
    const [html, config] = await Promise.all([
        loadPage('../pages/admin.html'),
        import('./components/admin.js').then(m => m.default)
    ]);
    return {
        template: html,
        mixins: [baseMixin],
        ...config
    };
});

// 定義路由規則與建立路由實例
const routes = [
    { path: '/', redirect: '/home' },
    { path: '/home', component: HomePage },
    { path: '/manga', component: MangaPage },
    { path: '/admin', component: AdminPage },
];

const router = VueRouter.createRouter({
    history: VueRouter.createWebHashHistory(),
    routes,
});

// loading
let loadingTimeout = null;
router.beforeEach((to, from, next) => {
    if (!globalState.loadedPaths[to.path]) {
        if (loadingTimeout) {
            clearTimeout(loadingTimeout);
            loadingTimeout = null;
        }
        globalState.spinnerKey++;
        globalState.isLoading = true;
    }
    next();
});

router.afterEach((to) => {
    if (!globalState.loadedPaths[to.path]) {
        globalState.loadedPaths[to.path] = true;
        loadingTimeout = setTimeout(() => {
            globalState.isLoading = false;
            loadingTimeout = null;
        }, 300); //延遲0.3s
    } else {
        globalState.isLoading = false;
    }
});


// 初始化 SPA 應用程式
const app = createApp({
    mixins: [baseMixin],
    computed: {
        // 讓 index.html 可以直接使用
        isLoading() {
            return globalState.isLoading;
        },
        spinnerKey() {
            return globalState.spinnerKey;
        }
    },
    watch: {
        '$route.path': {
            handler(newPath) {
                if (newPath === '/home') this.setHeadTitle('首頁');
                else if (newPath === '/manga') this.setHeadTitle('百合漫畫區');
                else if (newPath === '/admin') this.setHeadTitle('管理頁面');
            },
            immediate: true
        }
    }
});

// 掛載
app.use(router);
app.mount('#app');
