(() => {
    'use strict';

    function initLoader() {
        const loader = document.getElementById('loader');
        const text = document.getElementById('loader-text');
        const sub = document.getElementById('loader-sub');
        const skip = document.getElementById('loader-skip');
        if (!loader || !text) {
            document.body.classList.remove('loading');
            return;
        }
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            loader.remove();
            document.body.classList.remove('loading');
            document.body.classList.add('entered');
            return;
        }
        const LINE1 = 'welcome to my website.';
        const LINE2 = 'i hope you like it :3';
        let i = 0;
        let done = false;
        let timer = null;

        function finish() {
            if (done) return;
            done = true;
            if (timer) clearInterval(timer);
            text.textContent = LINE1;
            if (sub) sub.textContent = LINE2;
            loader.classList.add('done');
            document.body.classList.remove('loading');
            document.body.classList.add('entered');
            setTimeout(() => loader.remove(), 500);
        }

        timer = setInterval(() => {
            i += 1;
            text.textContent = LINE1.slice(0, i);
            if (i >= LINE1.length) {
                clearInterval(timer);
                timer = null;
                setTimeout(typeSub, 500);
            }
        }, 90);

        function typeSub() {
            if (done || !sub) {
                if (!done) setTimeout(finish, 900);
                return;
            }
            let j = 0;
            timer = setInterval(() => {
                if (done) return;
                j += 1;
                sub.textContent = LINE2.slice(0, j);
                if (j >= LINE2.length) {
                    clearInterval(timer);
                    timer = null;
                    setTimeout(finish, 1100);
                }
            }, 70);
        }

        setTimeout(() => skip && skip.classList.add('show'), 600);
        loader.addEventListener('click', finish);
        document.addEventListener('keydown', finish, { once: true });
        setTimeout(finish, 9000);
    }

    function initWaifu() {
        const right = document.getElementById('waifu');
        const left = document.getElementById('waifu-left');
        if (!right && !left) return;
        const girls = [
            'assets/waifu1.png',
            'assets/waifu2.png'
        ];
        for (let k = girls.length - 1; k > 0; k--) {
            const j = Math.floor(Math.random() * (k + 1));
            [girls[k], girls[j]] = [girls[j], girls[k]];
        }
        if (right) right.src = girls[0];
        if (left) left.src = girls[1 % girls.length];
    }

    function initTitle() {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const titles = ['oxy — dev', 'oxy — C++ · C · Python', 'oxy — discord only'];
        let i = 0;
        setInterval(() => {
            i = (i + 1) % titles.length;
            document.title = titles[i];
        }, 4000);
    }

    document.addEventListener('DOMContentLoaded', () => {
        initLoader();
        initWaifu();
        initTitle();
    });
})();
