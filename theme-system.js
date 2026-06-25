(function () {
    'use strict';

    const STORAGE_KEY = 'yumoffice-theme';
    const THEMES = ['default', 'dark', 'light'];
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const body = document.body;
    let currentTheme = readTheme();
    let shaderController = null;
    let spotlight = null;

    function readTheme() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return THEMES.includes(saved) ? saved : 'default';
        } catch (_) {
            return 'default';
        }
    }

    function saveTheme(theme) {
        try {
            localStorage.setItem(STORAGE_KEY, theme);
        } catch (_) {
            // Storage can be disabled in private browsing; the theme still works.
        }
    }

    function applyTheme(theme, persist) {
        currentTheme = THEMES.includes(theme) ? theme : 'default';

        if (currentTheme === 'default') {
            body.removeAttribute('data-theme');
        } else {
            body.dataset.theme = currentTheme;
        }

        document.documentElement.style.colorScheme = currentTheme === 'dark' ? 'dark' : 'light';
        document.querySelectorAll('.theme-option').forEach((button) => {
            button.setAttribute('aria-pressed', String(button.dataset.themeValue === currentTheme));
        });

        if (persist) saveTheme(currentTheme);
        if (shaderController) shaderController.setTheme(currentTheme);
        resetBentoTransforms();
        resetBorderGlow();

        window.dispatchEvent(new CustomEvent('yumoffice:themechange', {
            detail: { theme: currentTheme }
        }));
    }

    function createThemeSwitcher() {
        const actionArea = document.querySelector('.action-buttons');
        if (!actionArea || actionArea.querySelector('.theme-switcher')) return;

        const switcher = document.createElement('div');
        switcher.className = 'theme-switcher';
        switcher.setAttribute('role', 'group');
        switcher.setAttribute('aria-label', 'Chọn giao diện');

        const options = [
            { value: 'default', icon: '◐', label: 'Mặc định' },
            { value: 'dark', icon: '●', label: 'Tối' },
            { value: 'light', icon: '○', label: 'Sáng' }
        ];

        options.forEach((option) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'theme-option';
            button.dataset.themeValue = option.value;
            button.setAttribute('aria-pressed', 'false');
            button.setAttribute('title', `Giao diện ${option.label.toLowerCase()}`);
            button.innerHTML = `<span class="theme-option__icon" aria-hidden="true">${option.icon}</span><span class="theme-option__label">${option.label}</span>`;
            button.addEventListener('click', () => applyTheme(option.value, true));
            switcher.appendChild(button);
        });

        actionArea.appendChild(switcher);
    }

    function createBackgroundLayers() {
        if (!document.querySelector('.iridescence-container')) {
            const iridescence = document.createElement('div');
            iridescence.className = 'iridescence-container';
            iridescence.setAttribute('aria-hidden', 'true');
            body.prepend(iridescence);
        }

        if (!document.querySelector('.modern-theme-scrim')) {
            const scrim = document.createElement('div');
            scrim.className = 'modern-theme-scrim';
            scrim.setAttribute('aria-hidden', 'true');
            body.prepend(scrim);
        }
    }

    function createGooeyFilter() {
        if (document.getElementById('yum-gooey-filter')) return;
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '0');
        svg.setAttribute('height', '0');
        svg.setAttribute('aria-hidden', 'true');
        svg.style.position = 'fixed';
        svg.innerHTML = `
            <defs>
                <filter id="yum-gooey-filter" x="-45%" y="-180%" width="190%" height="460%" color-interpolation-filters="sRGB">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur" />
                    <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8" result="goo" />
                    <feComposite in="SourceGraphic" in2="goo" operator="atop" />
                </filter>
            </defs>`;
        body.appendChild(svg);
    }

    function initGooeyNav() {
        const nav = document.querySelector('.main-nav');
        const navContainer = nav?.querySelector('.nav-container');
        if (!nav || !navContainer) return;

        createGooeyFilter();

        const particleCount = 15;
        const particleDistances = [90, 10];
        const particleR = 100;
        const animationTime = 600;
        const timeVariance = 300;
        let activeAnchor = navContainer.querySelector('a.active') || navContainer.querySelector('a:not(.disabled-link)');

        const filterEffect = document.createElement('span');
        filterEffect.className = 'gooey-effect gooey-effect--filter';
        filterEffect.setAttribute('aria-hidden', 'true');

        const textEffect = document.createElement('span');
        textEffect.className = 'gooey-effect gooey-effect--text';
        textEffect.setAttribute('aria-hidden', 'true');

        navContainer.append(filterEffect, textEffect);
        nav.classList.add('gooey-nav-enhanced');
        navContainer.classList.add('gooey-nav-container');

        const noise = (amount = 1) => amount / 2 - Math.random() * amount;

        const getXY = (distance, pointIndex, totalPoints) => {
            const angle = ((360 + noise(8)) / totalPoints) * pointIndex * (Math.PI / 180);
            return [distance * Math.cos(angle), distance * Math.sin(angle)];
        };

        const createParticle = (index, time, distances, radius) => {
            const rotation = noise(radius / 10);
            return {
                start: getXY(distances[0], particleCount - index, particleCount),
                end: getXY(distances[1] + noise(7), particleCount - index, particleCount),
                time,
                scale: 1 + noise(0.2),
                color: 1 + Math.floor(Math.random() * 4),
                rotate: rotation > 0 ? (rotation + radius / 20) * 10 : (rotation - radius / 20) * 10
            };
        };

        const clearParticles = () => {
            filterEffect.querySelectorAll('.gooey-nav-particle').forEach((particle) => particle.remove());
        };

        const makeParticles = () => {
            if (reducedMotion.matches) return;
            clearParticles();
            const bubbleTime = animationTime * 2 + timeVariance;
            filterEffect.style.setProperty('--time', `${bubbleTime}ms`);

            for (let index = 0; index < particleCount; index += 1) {
                const time = animationTime * 2 + noise(timeVariance * 2);
                const config = createParticle(index, time, particleDistances, particleR);
                const particle = document.createElement('span');
                const point = document.createElement('span');
                particle.className = 'gooey-nav-particle';
                point.className = 'gooey-nav-point';
                particle.style.setProperty('--start-x', `${config.start[0]}px`);
                particle.style.setProperty('--start-y', `${config.start[1]}px`);
                particle.style.setProperty('--end-x', `${config.end[0]}px`);
                particle.style.setProperty('--end-y', `${config.end[1]}px`);
                particle.style.setProperty('--time', `${config.time}ms`);
                particle.style.setProperty('--scale', `${config.scale}`);
                particle.style.setProperty('--rotate', `${config.rotate}deg`);
                particle.style.setProperty('--particle-color', `var(--gooey-color-${config.color})`);
                particle.appendChild(point);
                filterEffect.appendChild(particle);
                window.setTimeout(() => particle.remove(), Math.max(0, time));
            }
        };

        const updateEffectPosition = (anchor) => {
            if (!anchor) return;
            const containerRect = navContainer.getBoundingClientRect();
            const anchorRect = anchor.getBoundingClientRect();
            const styles = {
                left: `${anchorRect.left - containerRect.left + navContainer.scrollLeft}px`,
                top: `${anchorRect.top - containerRect.top + navContainer.scrollTop}px`,
                width: `${anchorRect.width}px`,
                height: `${anchorRect.height}px`
            };
            Object.assign(filterEffect.style, styles);
            Object.assign(textEffect.style, styles);
            textEffect.textContent = anchor.textContent.trim();
        };

        const activate = (anchor, animate = true) => {
            if (!anchor || anchor.classList.contains('disabled-link')) return;
            const changed = anchor !== activeAnchor;
            navContainer.querySelectorAll('a.active').forEach((item) => item.classList.remove('active'));
            anchor.classList.add('active');
            activeAnchor = anchor;
            updateEffectPosition(anchor);

            filterEffect.classList.remove('active');
            textEffect.classList.remove('active');
            void filterEffect.offsetWidth;
            filterEffect.classList.add('active');
            textEffect.classList.add('active');
            if (animate && changed) makeParticles();
        };

        nav.querySelectorAll('a').forEach((anchor) => {
            anchor.addEventListener('click', (event) => {
                if (anchor.classList.contains('disabled-link')) {
                    event.preventDefault();
                    return;
                }
                if (currentTheme === 'default') return;

                const targetUrl = new URL(anchor.href, window.location.href);
                const shouldDelayNavigation =
                    targetUrl.origin === window.location.origin &&
                    anchor.target !== '_blank' &&
                    !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey &&
                    targetUrl.href !== window.location.href;

                activate(anchor, true);
                if (shouldDelayNavigation) {
                    event.preventDefault();
                    window.setTimeout(() => {
                        window.location.href = targetUrl.href;
                    }, 180);
                }
            });

            anchor.addEventListener('keydown', (event) => {
                if (event.key === ' ') {
                    event.preventDefault();
                    anchor.click();
                }
            });
        });

        activate(activeAnchor, false);
        navContainer.addEventListener('scroll', () => updateEffectPosition(activeAnchor), { passive: true });
        window.addEventListener('yumoffice:themechange', () => {
            window.requestAnimationFrame(() => updateEffectPosition(activeAnchor));
        });

        if ('ResizeObserver' in window) {
            const resizeObserver = new ResizeObserver(() => updateEffectPosition(activeAnchor));
            resizeObserver.observe(navContainer);
        } else {
            window.addEventListener('resize', () => updateEffectPosition(activeAnchor), { passive: true });
        }
    }

    function bentoCards() {
        return Array.from(document.querySelectorAll([
            '.content-wrapper .feature-card',
            '.content-wrapper .upload-box',
            '.content-wrapper .guide-section',
            '.content-wrapper .info-box',
            '.content-wrapper .history-controls',
            '.content-wrapper .table-scroll'
        ].join(',')));
    }

    function borderGlowCards() {
        return Array.from(document.querySelectorAll([
            '.content-wrapper .hero-banner',
            '.content-wrapper .guide-header',
            '.content-wrapper .feature-card',
            '.content-wrapper .upload-box',
            '.content-wrapper .guide-section',
            '.content-wrapper .info-box',
            '.content-wrapper .doc-card',
            '.content-wrapper .cta-panel',
            '.content-wrapper .alert-panel',
            '.content-wrapper .history-controls',
            '.content-wrapper .table-scroll',
            '.content-wrapper .table-container',
            '.content-wrapper .review-hero',
            '.content-wrapper .review-note',
            '.content-wrapper .review-step-card',
            '.content-wrapper .review-action-panel',
            '.modal-box',
            '.preview-modal-box'
        ].join(',')));
    }

    function resetBentoTransforms() {
        bentoCards().forEach((card) => {
            card.style.removeProperty('--tilt-x');
            card.style.removeProperty('--tilt-y');
            card.style.removeProperty('--magnet-x');
            card.style.removeProperty('--magnet-y');
            card.style.setProperty('--glow-intensity', '0');
        });
    }

    function resetBorderGlow() {
        borderGlowCards().forEach((card) => {
            card.classList.remove('is-border-glow-active');
            card.style.setProperty('--edge-proximity', '0');
        });
    }

    function getBorderGlowEdgeProximity(rect, x, y) {
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const dx = x - cx;
        const dy = y - cy;
        let kx = Infinity;
        let ky = Infinity;

        if (dx !== 0) kx = cx / Math.abs(dx);
        if (dy !== 0) ky = cy / Math.abs(dy);

        return Math.min(Math.max(1 / Math.min(kx, ky), 0), 1);
    }

    function getBorderGlowCursorAngle(rect, x, y) {
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const dx = x - cx;
        const dy = y - cy;
        if (dx === 0 && dy === 0) return 0;

        const degrees = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
        return degrees < 0 ? degrees + 360 : degrees;
    }

    function initBorderGlowCards() {
        const cards = borderGlowCards();
        if (!cards.length) return;

        cards.forEach((card) => {
            if (card.dataset.borderGlowReady === 'true') return;

            card.dataset.borderGlowReady = 'true';
            card.classList.add('border-glow-card');

            if (!card.querySelector(':scope > .border-glow-surface')) {
                const surface = document.createElement('span');
                surface.className = 'border-glow-surface';
                surface.setAttribute('aria-hidden', 'true');
                card.prepend(surface);
            }

            if (!card.querySelector(':scope > .border-glow-edge')) {
                const edge = document.createElement('span');
                edge.className = 'border-glow-edge';
                edge.setAttribute('aria-hidden', 'true');
                card.prepend(edge);
            }

            card.addEventListener('pointermove', (event) => {
                if (currentTheme !== 'dark' || reducedMotion.matches || window.innerWidth <= 768) return;
                const rect = card.getBoundingClientRect();
                const x = event.clientX - rect.left;
                const y = event.clientY - rect.top;
                const edge = getBorderGlowEdgeProximity(rect, x, y);
                const angle = getBorderGlowCursorAngle(rect, x, y);

                card.classList.add('is-border-glow-active');
                card.style.setProperty('--edge-proximity', `${(edge * 100).toFixed(3)}`);
                card.style.setProperty('--cursor-angle', `${angle.toFixed(3)}deg`);
            }, { passive: true });

            card.addEventListener('pointerleave', () => {
                card.classList.remove('is-border-glow-active');
                card.style.setProperty('--edge-proximity', '0');
            }, { passive: true });
        });
    }

    function createCardStars(card, x, y) {
        if (currentTheme === 'default' || reducedMotion.matches || window.innerWidth <= 768) return;
        for (let index = 0; index < 7; index += 1) {
            const star = document.createElement('span');
            const angle = Math.random() * Math.PI * 2;
            const distance = 18 + Math.random() * 42;
            star.className = 'bento-star';
            star.style.left = `${x}px`;
            star.style.top = `${y}px`;
            star.style.setProperty('--star-x', `${Math.cos(angle) * distance}px`);
            star.style.setProperty('--star-y', `${Math.sin(angle) * distance}px`);
            card.appendChild(star);
            window.setTimeout(() => star.remove(), 800);
        }
    }

    function initMagicBento() {
        const cards = bentoCards();
        if (!cards.length) return;

        cards.forEach((card) => {
            card.classList.add('magic-bento-card');

            card.addEventListener('pointermove', (event) => {
                if (currentTheme === 'default' || reducedMotion.matches || window.innerWidth <= 768) return;
                const rect = card.getBoundingClientRect();
                const x = event.clientX - rect.left;
                const y = event.clientY - rect.top;
                const normalizedX = x / rect.width - 0.5;
                const normalizedY = y / rect.height - 0.5;
                card.style.setProperty('--glow-x', `${x}px`);
                card.style.setProperty('--glow-y', `${y}px`);
                card.style.setProperty('--glow-intensity', '1');
                card.style.setProperty('--tilt-x', `${normalizedY * -3.2}deg`);
                card.style.setProperty('--tilt-y', `${normalizedX * 3.2}deg`);
                card.style.setProperty('--magnet-x', `${normalizedX * 3}px`);
                card.style.setProperty('--magnet-y', `${normalizedY * 3}px`);
            });

            card.addEventListener('pointerleave', () => {
                card.style.setProperty('--glow-intensity', '0');
                card.style.setProperty('--tilt-x', '0deg');
                card.style.setProperty('--tilt-y', '0deg');
                card.style.setProperty('--magnet-x', '0px');
                card.style.setProperty('--magnet-y', '0px');
            });

            card.addEventListener('click', (event) => {
                const rect = card.getBoundingClientRect();
                createCardStars(card, event.clientX - rect.left, event.clientY - rect.top);
            });
        });

        spotlight = document.createElement('div');
        spotlight.className = 'global-spotlight';
        spotlight.setAttribute('aria-hidden', 'true');
        body.appendChild(spotlight);

        document.addEventListener('pointermove', (event) => {
            if (!spotlight || currentTheme === 'default' || reducedMotion.matches || window.innerWidth <= 768) {
                if (spotlight) spotlight.style.opacity = '0';
                return;
            }

            const content = document.querySelector('.content-wrapper');
            const rect = content ? content.getBoundingClientRect() : null;
            const inside = rect && event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
            spotlight.style.left = `${event.clientX}px`;
            spotlight.style.top = `${event.clientY}px`;
            spotlight.style.opacity = inside ? '1' : '0';
        }, { passive: true });
    }

    function initIridescence() {
        const container = document.querySelector('.iridescence-container');
        if (!container) return null;

        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl', {
            alpha: false,
            antialias: false,
            powerPreference: 'low-power'
        });
        if (!gl) return null;
        container.appendChild(canvas);

        const vertexSource = `
            attribute vec2 position;
            varying vec2 vUv;
            void main() {
                vUv = position * 0.5 + 0.5;
                gl_Position = vec4(position, 0.0, 1.0);
            }
        `;

        const fragmentSource = `
            precision highp float;
            uniform float uTime;
            uniform vec3 uColor;
            uniform vec3 uResolution;
            uniform vec2 uMouse;
            uniform float uAmplitude;
            uniform float uSpeed;
            varying vec2 vUv;

            void main() {
                float mr = min(uResolution.x, uResolution.y);
                vec2 uv = (vUv.xy * 2.0 - 1.0) * uResolution.xy / mr;
                uv += (uMouse - vec2(0.5)) * uAmplitude;
                float d = -uTime * 0.5 * uSpeed;
                float a = 0.0;
                for (float i = 0.0; i < 8.0; ++i) {
                    a += cos(i - d - a * uv.x);
                    d += sin(uv.y * i + a);
                }
                d += uTime * 0.5 * uSpeed;
                vec3 col = vec3(cos(uv * vec2(d, a)) * 0.6 + 0.4, cos(a + d) * 0.5 + 0.5);
                col = cos(col * cos(vec3(d, a, 2.5)) * 0.5 + 0.5) * uColor;
                gl_FragColor = vec4(col, 1.0);
            }
        `;

        function compile(type, source) {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                gl.deleteShader(shader);
                return null;
            }
            return shader;
        }

        const vertexShader = compile(gl.VERTEX_SHADER, vertexSource);
        const fragmentShader = compile(gl.FRAGMENT_SHADER, fragmentSource);
        if (!vertexShader || !fragmentShader) return null;

        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;

        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        gl.useProgram(program);

        const position = gl.getAttribLocation(program, 'position');
        gl.enableVertexAttribArray(position);
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

        const uniforms = {
            time: gl.getUniformLocation(program, 'uTime'),
            color: gl.getUniformLocation(program, 'uColor'),
            resolution: gl.getUniformLocation(program, 'uResolution'),
            mouse: gl.getUniformLocation(program, 'uMouse'),
            amplitude: gl.getUniformLocation(program, 'uAmplitude'),
            speed: gl.getUniformLocation(program, 'uSpeed')
        };

        let mouseX = 0.5;
        let mouseY = 0.5;
        let frame = 0;
        let shaderTheme = currentTheme;

        function resize() {
            const scale = Math.min(window.devicePixelRatio || 1, 1.35);
            const width = Math.max(1, Math.floor(window.innerWidth * scale));
            const height = Math.max(1, Math.floor(window.innerHeight * scale));
            if (canvas.width !== width || canvas.height !== height) {
                canvas.width = width;
                canvas.height = height;
                gl.viewport(0, 0, width, height);
            }
        }

        function draw(time) {
            resize();
            const color = shaderTheme === 'dark'
                ? [0.22, 0.08, 0.08]
                : [1.0, 0.86, 0.76];
            gl.useProgram(program);
            gl.uniform1f(uniforms.time, time * 0.001);
            gl.uniform3fv(uniforms.color, color);
            gl.uniform3f(uniforms.resolution, canvas.width, canvas.height, canvas.width / canvas.height);
            gl.uniform2f(uniforms.mouse, mouseX, mouseY);
            gl.uniform1f(uniforms.amplitude, shaderTheme === 'dark' ? 0.045 : 0.1);
            gl.uniform1f(uniforms.speed, shaderTheme === 'dark' ? 0.42 : 1.0);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
        }

        function render(time) {
            if (shaderTheme !== 'default' && !document.hidden && !reducedMotion.matches) {
                draw(time);
            }
            frame = window.requestAnimationFrame(render);
        }

        window.addEventListener('resize', resize, { passive: true });
        window.addEventListener('pointermove', (event) => {
            if (shaderTheme === 'default') return;
            mouseX += (event.clientX / window.innerWidth - mouseX) * 0.18;
            mouseY += (1 - event.clientY / window.innerHeight - mouseY) * 0.18;
        }, { passive: true });

        resize();
        frame = window.requestAnimationFrame(render);

        return {
            setTheme(theme) {
                shaderTheme = theme;
                if (theme === 'default') {
                    gl.clearColor(0, 0, 0, 1);
                    gl.clear(gl.COLOR_BUFFER_BIT);
                } else if (reducedMotion.matches) {
                    draw(0);
                }
            },
            destroy() {
                window.cancelAnimationFrame(frame);
            }
        };
    }

    function addAccessibilityHelpers() {
        const content = document.querySelector('.content-wrapper');
        if (content && !content.id) content.id = 'main-content';

        if (content && !document.querySelector('.skip-link')) {
            const skip = document.createElement('a');
            skip.className = 'skip-link';
            skip.href = `#${content.id}`;
            skip.textContent = 'Bỏ qua điều hướng';
            body.prepend(skip);
        }
    }

    createThemeSwitcher();
    createBackgroundLayers();
    addAccessibilityHelpers();
    initGooeyNav();
    initMagicBento();
    initBorderGlowCards();
    shaderController = initIridescence();
    applyTheme(currentTheme, false);
})();
