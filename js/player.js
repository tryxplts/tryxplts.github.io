(() => {
    'use strict';

    const player = document.getElementById('player');
    if (!player) return;

    const audio = document.getElementById('audio');
    const playBtn = document.getElementById('play');
    const seek = document.getElementById('seek');
    const seekFill = document.getElementById('seek-fill');
    const cur = document.getElementById('cur');
    const dur = document.getElementById('dur');
    const volEl = document.getElementById('vol');
    const volFill = document.getElementById('vol-fill');
    const muteBtn = document.getElementById('mute');
    const titleEl = player.querySelector('.player-title');
    const subEl = player.querySelector('.player-sub');

    if (!audio || !playBtn || !seek || !volEl) return;

    const TITLE = audio.dataset.title || 'untitled';
    const ARTIST = audio.dataset.artist || '';
    if (titleEl) titleEl.textContent = TITLE;
    if (subEl) subEl.textContent = ARTIST;

    const metaEl = player.querySelector('.player-meta');
    if (metaEl) metaEl.title = 'Drag to move · double-click to reset';

    const store = {
        get(k) {
            try { return localStorage.getItem(k); } catch (e) { return null; }
        },
        set(k, v) {
            try { localStorage.setItem(k, v); } catch (e) { /* private mode */ }
        },
        remove(k) {
            try { localStorage.removeItem(k); } catch (e) { /* private mode */ }
        }
    };

    function fmt(t) {
        if (!isFinite(t) || t < 0) return '0:00';
        const m = Math.floor(t / 60);
        const s = Math.floor(t % 60);
        return m + ':' + String(s).padStart(2, '0');
    }

    function setPlaying(on) {
        player.classList.toggle('is-playing', on);
        playBtn.setAttribute('aria-label', on ? 'Pause' : 'Play');
        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = on ? 'playing' : 'paused';
        }
    }

    function paint() {
        const d = audio.duration;
        const pct = (isFinite(d) && d > 0 ? Math.max(0, Math.min(1, audio.currentTime / d)) : 0) * 100;
        seekFill.style.width = pct + '%';
        seek.querySelector('.player-seek-knob').style.left = pct + '%';
        seek.setAttribute('aria-valuenow', String(Math.round(pct)));
        cur.textContent = fmt(audio.currentTime);
        dur.textContent = fmt(d);
    }

    function paintVolume() {
        const v = audio.muted ? 0 : audio.volume;
        const pct = Math.max(0, Math.min(1, v)) * 100;
        volFill.style.width = pct + '%';
        volEl.querySelector('.player-volume-knob').style.left = pct + '%';
        volEl.setAttribute('aria-valuenow', String(Math.round(pct)));
        player.classList.toggle('is-muted', v === 0);
    }

    const POS_KEY = 'oxy-player-pos';

    function clampToViewport(x, y) {
        const m = 8;
        const w = player.offsetWidth;
        const h = player.offsetHeight;
        const maxX = Math.max(m, window.innerWidth - w - m);
        const maxY = Math.max(m, window.innerHeight - h - m);
        return {
            x: Math.min(Math.max(m, x), maxX),
            y: Math.min(Math.max(m, y), maxY)
        };
    }

    function setPos(x, y) {
        const p = clampToViewport(x, y);
        player.style.transform = 'none';
        player.style.left = p.x + 'px';
        player.style.top = p.y + 'px';
        return p;
    }

    function topOffset() {
        return window.matchMedia('(max-width: 640px)').matches ? 8 : 14;
    }

    function centerTop() {
        setPos((window.innerWidth - player.offsetWidth) / 2, topOffset());
    }

    function savePos() {
        const r = player.getBoundingClientRect();
        store.set(POS_KEY, JSON.stringify({ x: Math.round(r.left), y: Math.round(r.top) }));
    }

    let drag = null;

    player.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        if (e.target.closest('button, [role="slider"]')) return;

        const r = player.getBoundingClientRect();
        player.classList.add('is-dragging');
        player.style.transform = 'none';
        player.style.left = r.left + 'px';
        player.style.top = r.top + 'px';

        drag = { id: e.pointerId, dx: e.clientX - r.left, dy: e.clientY - r.top };
        try { player.setPointerCapture(e.pointerId); } catch (err) { /* synthetic events */ }
        e.preventDefault();
    });

    player.addEventListener('pointermove', (e) => {
        if (!drag || e.pointerId !== drag.id) return;
        setPos(e.clientX - drag.dx, e.clientY - drag.dy);
    });

    function endDrag(e) {
        if (!drag) return;
        drag = null;
        player.classList.remove('is-dragging');
        try { player.releasePointerCapture(e.pointerId); } catch (err) { /* pointer already released */ }
        savePos();
    }

    player.addEventListener('pointerup', endDrag);
    player.addEventListener('pointercancel', endDrag);

    player.addEventListener('dblclick', (e) => {
        if (e.target.closest('button, [role="slider"]')) return;
        centerTop();
        store.remove(POS_KEY);
    });

    window.addEventListener('resize', () => {
        if (!player.style.left) return;
        const r = player.getBoundingClientRect();
        setPos(r.left, r.top);
    });

    try {
        const savedPos = JSON.parse(store.get(POS_KEY) || 'null');
        if (savedPos && isFinite(savedPos.x) && isFinite(savedPos.y)) {
            setPos(savedPos.x, savedPos.y);
        }
    } catch (err) { /* corrupt stored position */ }

    function paintPosition() {
        if (!('mediaSession' in navigator) || !navigator.mediaSession.setPositionState) return;
        if (!isFinite(audio.duration) || audio.duration <= 0) return;
        try {
            navigator.mediaSession.setPositionState({
                duration: audio.duration,
                playbackRate: audio.playbackRate,
                position: Math.min(audio.currentTime, audio.duration)
            });
        } catch (e) { /* state rejected */ }
    }

    let userPaused = false;

    playBtn.addEventListener('click', () => {
        if (autoMuted) {
            autoMuted = false;
            audio.muted = false;
            if (audio.volume === 0) audio.volume = 0.65;
            paintVolume();
        }
        if (audio.paused) {
            userPaused = false;
            audio.play().catch(() => {});
        } else {
            userPaused = true;
            audio.pause();
        }
    });

    audio.addEventListener('play', () => setPlaying(true));
    audio.addEventListener('pause', () => setPlaying(false));
    audio.addEventListener('timeupdate', () => { paint(); paintPosition(); });
    audio.addEventListener('durationchange', paint);
    audio.addEventListener('loadedmetadata', paint);
    audio.addEventListener('seeked', paint);

    audio.addEventListener('error', () => {
        player.classList.add('is-missing');
        if (subEl) subEl.textContent = 'audio file missing';
        setPlaying(false);
    });

    audio.addEventListener('playing', () => {
        player.classList.remove('is-missing');
        if (subEl && ARTIST) subEl.textContent = ARTIST;
        paint();
    });

    const savedVol = parseFloat(store.get('oxy-volume'));
    audio.volume = isFinite(savedVol) ? Math.min(1, Math.max(0, savedVol)) : 0.65;
    audio.muted = store.get('oxy-muted') === '1';
    paintVolume();

    let autoMuted = false;

    function startAutoplay() {
        if (audio.muted || audio.volume === 0) return;
        audio.play().catch(() => {
            autoMuted = true;
            audio.muted = true;
            paintVolume();
            audio.play().catch(() => {});
        });
    }

    function ratioFromEvent(el, e) {
        const r = el.getBoundingClientRect();
        return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    }

    function bindScrub(el, onValue) {
        let dragging = false;
        el.addEventListener('pointerdown', (e) => {
            dragging = true;
            el.classList.add('is-dragging');
            try { if (el.setPointerCapture) el.setPointerCapture(e.pointerId); } catch (err) { /* synthetic events */ }
            onValue(ratioFromEvent(el, e));
            e.preventDefault();
        });
        el.addEventListener('pointermove', (e) => {
            if (dragging) onValue(ratioFromEvent(el, e));
        });
        const stop = (e) => {
            if (!dragging) return;
            dragging = false;
            el.classList.remove('is-dragging');
            if (el.releasePointerCapture) {
                try { el.releasePointerCapture(e.pointerId); } catch (err) { /* pointer already released */ }
            }
        };
        el.addEventListener('pointerup', stop);
        el.addEventListener('pointercancel', stop);
    }

    bindScrub(seek, (r) => {
        if (!isFinite(audio.duration) || audio.duration <= 0) return;
        audio.currentTime = r * audio.duration;
        paint();
    });

    seek.addEventListener('keydown', (e) => {
        if (!isFinite(audio.duration) || audio.duration <= 0) return;
        const step = e.shiftKey ? 30 : 5;
        if (e.key === 'ArrowRight') {
            audio.currentTime = Math.min(audio.duration, audio.currentTime + step);
            e.preventDefault();
        } else if (e.key === 'ArrowLeft') {
            audio.currentTime = Math.max(0, audio.currentTime - step);
            e.preventDefault();
        } else if (e.key === 'Home') {
            audio.currentTime = 0;
            e.preventDefault();
        } else if (e.key === 'End') {
            audio.currentTime = audio.duration;
            e.preventDefault();
        }
    });

    bindScrub(volEl, (r) => {
        audio.volume = r;
        audio.muted = r === 0;
        store.set('oxy-volume', String(r));
        store.set('oxy-muted', audio.muted ? '1' : '0');
        paintVolume();
    });

    volEl.addEventListener('keydown', (e) => {
        let delta = 0;
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') delta = 0.05;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') delta = -0.05;
        else return;
        e.preventDefault();
        audio.volume = Math.min(1, Math.max(0, audio.volume + delta));
        audio.muted = false;
        store.set('oxy-volume', String(audio.volume));
        store.set('oxy-muted', '0');
    });

    muteBtn.addEventListener('click', () => {
        audio.muted = !audio.muted;
        if (!audio.muted && audio.volume === 0) audio.volume = 0.65;
        store.set('oxy-muted', audio.muted ? '1' : '0');
        paintVolume();
    });

    audio.addEventListener('volumechange', paintVolume);

    // Music starts on the first interaction outside the player.
    function firstGesture(e) {
        document.removeEventListener('pointerdown', firstGesture);
        document.removeEventListener('keydown', firstGesture);
        if (autoMuted) {
            autoMuted = false;
            audio.muted = false;
            if (audio.volume === 0) audio.volume = 0.65;
            paintVolume();
        }
        if (e && e.target && player.contains(e.target)) return;
        if (!userPaused && audio.paused) audio.play().catch(() => {});
    }
    document.addEventListener('pointerdown', firstGesture, { passive: true });
    document.addEventListener('keydown', firstGesture);

    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: TITLE,
            artist: ARTIST,
            album: TITLE,
            artwork: [{ src: 'assets/cover.jpg', sizes: '300x300', type: 'image/jpeg' }]
        });
        const actions = {
            play: () => audio.play().catch(() => {}),
            pause: () => audio.pause(),
            seekbackward: (d) => {
                audio.currentTime = Math.max(0, audio.currentTime - (d.seekOffset || 10));
            },
            seekforward: (d) => {
                audio.currentTime = Math.min(audio.duration || Infinity, audio.currentTime + (d.seekOffset || 10));
            },
            seekto: (d) => {
                if (typeof d.seekTime === 'number') audio.currentTime = d.seekTime;
            }
        };
        Object.keys(actions).forEach((name) => {
            try { navigator.mediaSession.setActionHandler(name, actions[name]); } catch (e) { /* action not supported */ }
        });
    }

    paint();
    paintVolume();
    startAutoplay();
})();
