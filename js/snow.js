/* Snowfall — six-armed crystals, three depth layers. */
(() => {
    'use strict';

    const canvas = document.getElementById('snow');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        canvas.remove();
        return;
    }

    const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const SPEED = REDUCE ? 0.55 : 1;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0;
    let H = 0;

    function rng(seed) {
        let a = seed >>> 0;
        return () => {
            a = (a + 0x6D2B79F5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function makeCrystal(seed, detail) {
        const S = 128;
        const c = document.createElement('canvas');
        c.width = c.height = S;
        const g = c.getContext('2d');
        const rnd = rng(seed);
        const R = S * 0.40;

        g.translate(S / 2, S / 2);
        g.lineCap = 'round';
        g.lineJoin = 'round';
        g.strokeStyle = 'rgba(238,247,255,0.92)';
        g.fillStyle = 'rgba(238,247,255,0.92)';
        g.shadowColor = 'rgba(170,215,255,0.75)';
        g.shadowBlur = S * 0.045;

        const arms = 6;
        for (let a = 0; a < arms; a++) {
            g.save();
            g.rotate((a / arms) * Math.PI * 2 + rnd() * 0.02);
            g.lineWidth = S * (detail ? 0.020 : 0.026);
            g.beginPath();
            g.moveTo(0, 0);
            g.lineTo(0, -R);
            g.stroke();

            const pairs = detail ? 3 : 2;
            for (let b = 0; b < pairs; b++) {
                const y = -R * (0.30 + 0.20 * b + rnd() * 0.05);
                const len = R * (0.30 - 0.055 * b) * (0.75 + rnd() * 0.5);
                g.lineWidth = S * (detail ? 0.016 : 0.021);
                for (const dir of [-1, 1]) {
                    g.beginPath();
                    g.moveTo(0, y);
                    g.lineTo(dir * len, y - len * 0.62);
                    g.stroke();
                    if (detail && b < 2) {
                        g.lineWidth = S * 0.011;
                        g.beginPath();
                        g.moveTo(dir * len * 0.58, y - len * 0.36);
                        g.lineTo(dir * len * 0.95, y - len * 0.86);
                        g.stroke();
                    }
                }
            }
            g.restore();
        }

        g.beginPath();
        for (let k = 0; k < 6; k++) {
            const ang = (k / 6) * Math.PI * 2;
            const rr = R * 0.11;
            const px = Math.cos(ang) * rr;
            const py = Math.sin(ang) * rr;
            if (k === 0) g.moveTo(px, py);
            else g.lineTo(px, py);
        }
        g.closePath();
        g.fill();

        return c;
    }

    const sprites = [];
    for (let i = 0; i < 9; i++) sprites.push(makeCrystal(1000 + i * 7919, i % 3 === 0));
    const nearSprites = [];
    for (let i = 0; i < 4; i++) nearSprites.push(makeCrystal(5000 + i * 104729, true));

    const flakes = [];
    let count = 0;

    function newFlake(f, initial) {
        const r = Math.random();
        const layer = r < 0.55 ? 0 : r < 0.88 ? 1 : 2;
        const size = layer === 0 ? 5 + Math.random() * 5 : layer === 1 ? 10 + Math.random() * 7 : 17 + Math.random() * 9;
        f.layer = layer;
        f.size = size;
        f.x = Math.random() * (W + 80) - 40;
        f.y = initial ? Math.random() * H : -30 - Math.random() * H * 0.2;
        f.vy = (24 + layer * 34) * (0.8 + Math.random() * 0.6) * SPEED;
        f.vx = (Math.random() - 0.5) * 12;
        f.sway = 6 + layer * 8;
        f.swaySpeed = 0.35 + Math.random() * 0.5;
        f.phase = Math.random() * Math.PI * 2;
        f.rot = Math.random() * Math.PI * 2;
        f.spin = (Math.random() - 0.5) * (0.35 + layer * 0.18);
        f.alpha = layer === 0 ? 0.24 + Math.random() * 0.16 : layer === 1 ? 0.40 + Math.random() * 0.20 : 0.45 + Math.random() * 0.20;
        f.sprite = layer === 2
            ? nearSprites[(Math.random() * nearSprites.length) | 0]
            : sprites[(Math.random() * sprites.length) | 0];
    }

    function resize() {
        W = window.innerWidth;
        H = window.innerHeight;
        canvas.width = Math.floor(W * DPR);
        canvas.height = Math.floor(H * DPR);
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

        const target = Math.round((W * H) / 11000);
        count = Math.max(60, Math.min(200, target));
        while (flakes.length < count) {
            const f = {};
            newFlake(f, true);
            flakes.push(f);
        }
        if (flakes.length > count) flakes.length = count;
    }

    function drawFlake(f) {
        const s = f.size;
        ctx.translate(f.x, f.y);
        ctx.rotate(f.rot);
        if (f.layer === 2) {
            ctx.globalAlpha = f.alpha * 0.20;
            ctx.drawImage(f.sprite, -s * 0.80, -s * 0.80, s * 1.6, s * 1.6);
            ctx.globalAlpha = f.alpha;
        }
        ctx.drawImage(f.sprite, -s / 2, -s / 2, s, s);
    }

    let raf = 0;
    let last = performance.now();

    function step(now) {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        const gust = (Math.sin(now * 0.00021) * 6 + Math.sin(now * 0.00007) * 10) * SPEED;

        ctx.clearRect(0, 0, W, H);
        for (const f of flakes) {
            f.phase += dt * f.swaySpeed;
            f.x += (f.vx + gust * (f.layer * 0.35 + 0.25) + Math.sin(f.phase) * f.sway) * dt;
            f.y += f.vy * dt;
            f.rot += f.spin * dt;

            if (f.y - 40 > H) {
                newFlake(f, false);
                continue;
            }
            if (f.x > W + 60) f.x = -60;
            if (f.x < -60) f.x = W + 60;

            ctx.save();
            drawFlake(f);
            ctx.restore();
        }
        raf = requestAnimationFrame(step);
    }

    function still() {
        ctx.clearRect(0, 0, W, H);
        for (const f of flakes) {
            ctx.save();
            ctx.globalAlpha = f.alpha;
            drawFlake(f);
            ctx.restore();
        }
    }

    function start() {
        if (raf) return;
        last = performance.now();
        raf = requestAnimationFrame(step);
    }

    function stop() {
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
    }

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) stop();
        else start();
    });

    window.addEventListener('resize', () => {
        resize();
        if (REDUCE) still();
    });

    resize();
    still();
    start();
})();
