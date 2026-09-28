/* Flowing monochrome silk — WebGL domain-warped noise, background only. */
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
        '  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);',
        '  for(int i = 0; i < 3; i++){',
        '    v += a * vnoise(p);',
        '    p = m * p;',
        '    a *= 0.5;',
        '  }',
        '  return v;',
        '}',
        'void main(){',
        '  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;',
        '  float t = uTime * 0.05;',
        '  vec2 p = uv * 0.8;',
        '  vec2 q = vec2(',
        '    fbm(p + vec2(t * 0.5, t * -0.12)),',
        '    fbm(p + vec2(5.2 - t * 0.2, 1.3 + t * 0.25))',
        '  );',
        '  float v = fbm(p + 1.8 * q);',
        '  v = smoothstep(0.15, 0.82, v);',
        '  vec3 base = vec3(0.022, 0.022, 0.027);',
        '  vec3 silkc = vec3(0.26, 0.26, 0.275);',
        '  vec3 col = mix(base, silkc, pow(v, 1.05));',
        '  float sheen = fbm(p * 1.1 - 0.7 * q + 4.6);',
        '  sheen = smoothstep(0.48, 0.88, sheen);',
        '  col += vec3(0.30, 0.30, 0.315) * sheen;',
        '  float d = length(uv * vec2(0.7, 1.0));',
        '  col *= 1.0 - 0.38 * smoothstep(0.35, 1.3, d);',
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

    function resize() {
        const scale = window.innerWidth < 640 ? 0.4 : 0.55;
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
        gl.uniform1f(uTime, t);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    if (reduceMotion) {
        draw(4.0);
        return;
    }

    let raf = 0;
    const t0 = performance.now();

    function frame(now) {
        raf = 0;
        if (!document.hidden) draw((now - t0) / 1000);
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
