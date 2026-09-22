/* ============================================================
   网络侠客的网盘 - 前端逻辑
   数据来源：data/software.json（终端程序写入，实时同步）
   ============================================================ */

/* ---------- 1. 动态粒子背景 ---------- */
(function initCanvas() {
    const cv = document.getElementById('bg-canvas');
    const ctx = cv.getContext('2d');
    let W = 0, H = 0, dpr = window.devicePixelRatio || 1;
    let points = [];
    const mouse = { x: -9999, y: -9999 };

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const COUNT = () => Math.min(110, Math.round((W * H) / 16000));

    function resize() {
        W = cv.clientWidth = window.innerWidth;
        H = cv.clientHeight = window.innerHeight;
        cv.width = W * dpr; cv.height = H * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        build();
    }

    function build() {
        const n = COUNT();
        points = [];
        for (let i = 0; i < n; i++) {
            points.push({
                x: Math.random() * W,
                y: Math.random() * H,
                vx: (Math.random() - .5) * .35,
                vy: (Math.random() - .5) * .35,
                r: Math.random() * 1.7 + .7
            });
        }
    }

    function draw() {
        ctx.clearRect(0, 0, W, H);
        for (const p of points) {
            p.x += p.vx; p.y += p.vy;
            if (p.x < 0 || p.x > W) p.vx *= -1;
            if (p.y < 0 || p.y > H) p.vy *= -1;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0,220,255,.65)';
            ctx.fill();
        }
        for (let i = 0; i < points.length; i++) {
            for (let j = i + 1; j < points.length; j++) {
                const a = points[i], b = points[j];
                const d = Math.hypot(a.x - b.x, a.y - b.y);
                if (d < 130) {
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
                    ctx.strokeStyle = 'rgba(0,200,255,' + (0.16 * (1 - d / 130)).toFixed(3) + ')';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            }
            const m = Math.hypot(points[i].x - mouse.x, points[i].y - mouse.y);
            if (m < 160) {
                ctx.beginPath();
                ctx.moveTo(points[i].x, points[i].y); ctx.lineTo(mouse.x, mouse.y);
                ctx.strokeStyle = 'rgba(168,85,247,' + (0.3 * (1 - m / 160)).toFixed(3) + ')';
                ctx.lineWidth = 1.2;
                ctx.stroke();
            }
        }
        requestAnimationFrame(draw);
    }

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
    window.addEventListener('mouseleave', () => { mouse.x = mouse.y = -9999; });
    resize();
    if (reduce) { draw(); cancelAnimationFrame && null; } else draw();
})();

/* ---------- 2. 时钟 ---------- */
(function clock() {
    const el = document.getElementById('clock');
    const pad = n => String(n).padStart(2, '0');
    function tick() {
        const d = new Date();
        el.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }
    tick(); setInterval(tick, 1000);
})();

/* ---------- 3. 数据加载与渲染 ---------- */
const DEFAULT_NOTICE = '欢迎来到网络侠客的网盘空间，可以找到对应的软件旁边的下载链接，微信公众号“网络侠客”！';
const FALLBACK = [
    { name: '万能文件转换器', url: 'file:///D:/网盘资源/万能文件转换器.exe', desc: '音频 / 视频 / 图片 格式批量转换' },
    { name: '离线拨号', url: 'file:///D:/网盘资源/离线拨号.exe', desc: '不依赖互联网的电话拨号工具' }
];

let RAW = [];

function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function safeUrl(u) {
    u = String(u || '').trim();
    if (!u) return '#';
    if (/^\s*javascript:/i.test(u)) return '#';               // 禁止脚本协议
    if (/^(https?:|ftp:|mailto:)/i.test(u)) return u;          // 公网 / 邮箱链接
    if (/^file:/i.test(u)) return u;                           // 本机文件（仅访问者自己可见）
    if (/^(\.{0,2}\/|files\/)/i.test(u)) return u;             // 站内相对路径（随站点一起分发）
    if (/^[\w\u4e00-\u9fa5.-]+\//.test(u)) return u;           // 其它相对路径
    return u;
}

function render(list) {
    const box = document.getElementById('list');
    const empty = document.getElementById('empty');
    document.getElementById('soft-count').textContent = '软件总数：' + RAW.length;

    if (!list.length) {
        box.innerHTML = '';
        empty.hidden = false;
        return;
    }
    empty.hidden = true;
    box.innerHTML = list.map((it, i) => {
        const href = esc(safeUrl(it.url));
        return `
        <div class="item" style="animation-delay:${Math.min(i, 12) * 45}ms">
            <div class="idx">${String(i + 1).padStart(2, '0')}</div>
            <div class="meta">
                <div class="name">${esc(it.name)}${it.size ? `<span class="size">${esc(it.size)}</span>` : ''}</div>
                <div class="desc">${esc(it.desc || '公众号“网络侠客” · 点击右侧按钮下载')}</div>
            </div>
            <button class="copy" type="button" data-url="${esc(it.url)}" title="复制下载链接">⧉</button>
            <a class="url" href="${href}" target="_blank" rel="noopener"${isDirect(href) ? ' download' : ''}>
                下载 <span class="arrow">↓</span>
            </a>
        </div>`;
    }).join('');
}

/* 站内文件 / 同域直链才加 download，避免跨域页面被强制下载 */
function isDirect(href) {
    return /^files\//i.test(href) || href.charAt(0) === '/' || href.indexOf(location.origin) === 0;
}

/* 复制下载链接（事件委托） */
document.getElementById('list').addEventListener('click', e => {
    const btn = e.target.closest('.copy');
    if (!btn) return;
    const full = new URL(btn.dataset.url, location.href).href;
    const done = () => {
        btn.classList.add('done');
        btn.textContent = '✓';
        setTimeout(() => { btn.classList.remove('done'); btn.textContent = '⧉'; }, 1400);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(full).then(done, () => fallbackCopy(full, done));
    } else fallbackCopy(full, done);
});

function fallbackCopy(text, cb) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); cb(); } catch (e) { }
    document.body.removeChild(ta);
}

document.getElementById('clear-search').addEventListener('click', () => {
    const s = document.getElementById('search');
    s.value = '';
    render(RAW);
    s.focus();
});

function applyData(data) {
    data = data || {};
    RAW = Array.isArray(data.items) ? data.items : [];
    document.getElementById('notice-text').textContent = data.notice || DEFAULT_NOTICE;
    document.getElementById('update-time').textContent = '更新：' + (data.updated || '--');
    render(RAW);
    const kw = document.getElementById('search').value.trim().toLowerCase();
    if (kw) filter(kw);
}

function filter(kw) {
    kw = kw.toLowerCase();
    render(RAW.filter(it => (it.name + ' ' + (it.desc || '')).toLowerCase().includes(kw)));
}

document.getElementById('search').addEventListener('input', e => filter(e.target.value.trim()));

/* 依次尝试：json -> js(兼容 file:// 直接双击打开) -> 内置默认 */
function loadFromScript() {
    return new Promise(resolve => {
        const s = document.createElement('script');
        s.src = 'data/software.js?t=' + Date.now();
        s.onload = () => resolve(window.NETDRIVE_DATA || null);
        s.onerror = () => resolve(null);
        document.head.appendChild(s);
    });
}

async function load() {
    let data = null;
    try {
        const r = await fetch('data/software.json?t=' + Date.now(), { cache: 'no-store' });
        if (r.ok) data = await r.json();
    } catch (e) { /* file:// 或不支持 fetch，走下一步 */ }

    if (!data) data = await loadFromScript();
    if (!data) data = { notice: DEFAULT_NOTICE, items: FALLBACK, updated: '内置数据' };
    applyData(data);
}

load();
/* 每 5 秒轮询一次，终端程序新增/删除软件后页面自动同步 */
setInterval(load, 5000);
