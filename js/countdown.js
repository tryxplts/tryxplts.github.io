(() => {
    'use strict';

    const daysEl = document.getElementById('countdown-days');
    const clockEl = document.getElementById('countdown-clock');
    if (!daysEl || !clockEl) return;

    let skew = 0;
    let target = 0;

    function nextChristmas(now) {
        const d = new Date(now);
        let t = new Date(d.getFullYear(), 11, 25, 0, 0, 0, 0);
        if (t.getTime() <= now) t = new Date(d.getFullYear() + 1, 11, 25);
        return t.getTime();
    }

    function pad(n) {
        return String(n).padStart(2, '0');
    }

    function paint() {
        const now = Date.now() + skew;
        if (now >= target) target = nextChristmas(now);

        const left = Math.max(0, target - now);
        const days = Math.floor(left / 86400000);
        const hours = Math.floor((left % 86400000) / 3600000);
        const minutes = Math.floor((left % 3600000) / 60000);
        const seconds = Math.floor((left % 60000) / 1000);

        daysEl.textContent = String(days);
        clockEl.textContent = pad(hours) + ':' + pad(minutes) + ':' + pad(seconds);
    }

    skew = 0;
    target = nextChristmas(Date.now());
    paint();

    fetch('https://timeapi.io/api/Time/current/zone?timeZone=UTC', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error('time api'))))
        .then((d) => {
            const server = Date.parse(d.dateTime + 'Z');
            if (isFinite(server)) {
                skew = server - Date.now();
                target = nextChristmas(Date.now() + skew);
                paint();
            }
        })
        .catch(() => {});

    setInterval(paint, 1000);

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) paint();
    });
})();
