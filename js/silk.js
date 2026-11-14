/* Winter smoke - domain-warped noise. */
(() => {
    'use strict';

    const canvas = document.getElementById('silk');
    if (!canvas) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const gl = canvas.getContext('webgl', { antialias: false, depth: false, stencil: false, alpha: false });
    if (!gl) {
        canvas.remove();
        return;
    }

    const VS = 'attribute vec2 aPos;void main(){gl_Position=vec4(aPos,0.0,1.0);}';

    const FS = [
        'precision highp float;',
        'uniform vec2 uRes;',
        'uniform float uTime;',
        'uniform vec2 uPointer;',
        'float hash(vec2 p){',
        '  vec3 p3 = fract(vec3(p.xyx) * 0.1031);',
        '  p3 += dot(p3, p3.yzx + 33.33);',
        '  return fract((p3.x + p3.y) * p3.z);',
        '}',
        'float vnoise(vec2 p){',
        '  vec2 i = floor(p);',
        '  vec2 f = fract(p);',
        '  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);',
        '  float a = hash(i);',
        '  float b = hash(i + vec2(1.0, 0.0));',
        '  float c = hash(i + vec2(0.0, 1.0));',
        '  float d = hash(i + vec2(1.0, 1.0));',
        '  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);',
        '}',
        'float fbm(vec2 p){',
        '  float v = 0.0;',
        '  float a = 0.5;',
        '  mat2 m = mat2(1.62, 1.18, -1.18, 1.62);',
        '  for(int i = 0; i < 4; i++){',
        '    v += a * vnoise(p);',
        '    p = m * p;',
        '    a *= 0.5;',
        '  }',
        '  return v;',
        '}',
        'void main(){',
        '  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;',
        '  uv += uPointer * vec2(0.045, 0.030);',
        '  float t = uTime * 0.055;',
        '  vec2 p = uv * 0.95;',
        '  vec2 q = vec2(',
        '    fbm(p + vec2(t * 1.4, -t * 0.35)),',
        '    fbm(p + vec2(4.7 - t * 0.5, 1.9 + t * 0.45))',
        '  );',
        '  vec2 r = vec2(',
        '    fbm(p + 2.3 * q + vec2(1.7, 9.2) + vec2(t * 0.55, -t * 0.40)),',
        '    fbm(p + 2.3 * q + vec2(8.3, 2.8) + vec2(-t * 0.35, t * 0.60))',
        '  );',
        '  float v = fbm(p + 2.6 * r);',
        '  float smoke = smoothstep(0.10, 0.82, v);',
        '  vec3 col = mix(vec3(0.018, 0.028, 0.060), vec3(0.045, 0.090, 0.210), smoke);',
        '  col = mix(col, vec3(0.100, 0.180, 0.380), smoothstep(0.42, 0.92, v) * 0.60);',
        '  col = mix(col, vec3(0.30, 0.46, 0.66), smoothstep(0.70, 1.02, v) * 0.26);',
        '  float hgt = uv.y + 0.5;',
        '  float band = fbm(vec2(uv.x * 0.75 + t * 0.9, uv.y * 2.4 - t * 0.5) + 3.1);',
        '  float aurora = smoothstep(0.52, 0.88, band) * smoothstep(0.30, 0.55, hgt) * (1.0 - smoothstep(0.66, 0.95, hgt));',
        '  col += vec3(0.060, 0.110, 0.300) * aurora * 0.55;',
        '  col += vec3(0.020, 0.040, 0.120) * aurora * 0.40;',
        '  float fine = fbm(p * 5.0 - 2.0 * r + vec2(-t * 0.7, t * 0.5));',
        '  col += vec3(0.030, 0.055, 0.130) * smoothstep(0.55, 0.90, fine) * 0.35;',
        '  float sheen = fbm(p * 1.35 - 1.3 * r + 6.7 + vec2(t * 0.4));',
        '  sheen = smoothstep(0.55, 0.95, sheen);',
        '  col += vec3(0.62, 0.45, 0.20) * sheen * 0.18;',
        '  float d = length(uv * vec2(0.68, 1.0));',
        '  col *= 1.0 - 0.42 * smoothstep(0.45, 1.35, d);',
        '  col += (hash(gl_FragCoord.xy + fract(uTime)) - 0.5) * 0.012;',
        '  gl_FragColor = vec4(col, 1.0);',
        '}'
    ].join('\n');

    function makeShader(type, src) {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) return null;
        return s;
    }

    const vs = makeShader(gl.VERTEX_SHADER, VS);
    const fs = makeShader(gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) {
        canvas.remove();
        return;
    }

    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        canvas.remove();
        return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, 'uRes');
    const uTime = gl.getUniformLocation(prog, 'uTime');
    const uPointer = gl.getUniformLocation(prog, 'uPointer');

    const pointer = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };

    if (!reduceMotion && window.matchMedia('(pointer: fine)').matches) {
        window.addEventListener('pointermove', (e) => {
            target.x = (e.clientX / window.innerWidth) * 2 - 1;
            target.y = (e.clientY / window.innerHeight) * 2 - 1;
        }, { passive: true });
    }

    function resize() {
        let scale = window.innerWidth < 720 ? 0.55 : 0.75;
        const area = window.innerWidth * window.innerHeight;
        const maxPixels = 1500000;
        if (area * scale * scale > maxPixels) scale = Math.sqrt(maxPixels / area);
        const w = Math.max(2, Math.floor(window.innerWidth * scale));
        const h = Math.max(2, Math.floor(window.innerHeight * scale));
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
            gl.viewport(0, 0, w, h);
        }
        gl.uniform2f(uRes, w, h);
    }

    function draw(t) {
        resize();
        pointer.x += (target.x - pointer.x) * 0.04;
        pointer.y += (target.y - pointer.y) * 0.04;
        gl.uniform1f(uTime, t);
        gl.uniform2f(uPointer, pointer.x, pointer.y);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    if (reduceMotion) {
        draw(4.0);
    }

    let raf = 0;
    const t0 = performance.now();
    const timeScale = reduceMotion ? 0.45 : 1;

    function frame(now) {
        raf = 0;
        if (!document.hidden) draw(((now - t0) / 1000) * timeScale);
        raf = requestAnimationFrame(frame);
    }

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && !raf) raf = requestAnimationFrame(frame);
    });

    canvas.addEventListener('webglcontextlost', (e) => {
        e.preventDefault();
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        canvas.remove();
    });

    raf = requestAnimationFrame(frame);
})();
