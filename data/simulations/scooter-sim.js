// ============================================================
// Box-on-Surface Motion Simulator
// A simple crate is pushed across different surfaces
// ============================================================
window.initScooterSim = function () {
    if (window.__simRAFId) {
        cancelAnimationFrame(window.__simRAFId);
        window.__simRAFId = null;
    }

    let simSurface = 'gravel';
    let simPos = 0;
    let simVel = 5.0;
    let simAcc = -10.0;
    let isMoving = false;
    let lastTime = 0;

    const surfaceConfigs = {
        gravel: {
            name: 'Rough Gravel',
            acc: -10.0,
            color: '#c0392b',
            trackColor: '#c4b8b0',
            surfacePattern: 'gravel',
            desc: 'High surface roughness creates intense friction. The box decelerates rapidly (a = -10.0 m/s<sup>2</sup>) and stops after sliding only <strong>1.25 metres</strong>.',
            boxText: 'Key Result: Motion stops quickly because of a strong external retarding force (friction).',
            boxBorder: '#c0392b',
            forceText: 'High Drag'
        },
        wood: {
            name: 'Polished Wood Floor',
            acc: -0.5,
            color: '#8a6d3b',
            trackColor: '#d4c89a',
            surfacePattern: 'wood',
            desc: 'Smooth wood offers low friction. The box decelerates gently (a = -0.5 m/s<sup>2</sup>) and slides for <strong>25 metres</strong> before stopping.',
            boxText: 'Key Result: Reducing friction allows the object to maintain its motion over a much longer distance.',
            boxBorder: '#8a6d3b',
            forceText: 'Mild Drag'
        },
        ice: {
            name: 'Frictionless Ice',
            acc: 0.0,
            color: '#2a7d9a',
            trackColor: '#c8dce8',
            surfacePattern: 'ice',
            desc: 'Near-zero surface friction. Deceleration is zero (a = 0 m/s<sup>2</sup>). The box glides effortlessly without losing speed.',
            boxText: 'Key Result: Without friction, motion continues indefinitely at a constant speed.',
            boxBorder: '#2a7d9a',
            forceText: 'Zero Drag'
        },
        space: {
            name: 'Deep Space (Vacuum)',
            acc: 0.0,
            color: '#4a7c59',
            trackColor: '#2a2f40',
            surfacePattern: 'space',
            desc: 'Zero friction, zero air drag, zero gravity. The box drifts through deep space forever at a constant 5.0 m/s.',
            boxText: "Newton\'s First Law: An object in motion remains in motion with constant velocity unless acted on by a net external force.",
            boxBorder: '#4a7c59',
            forceText: 'F_net = 0'
        }
    };

    window.selectSimSurface = function (surface) {
        simSurface = surface;
        document.querySelectorAll('.surface-btn').forEach(b => b.classList.remove('selected'));
        const btn = document.getElementById('btn-' + surface);
        if (btn) btn.classList.add('selected');

        const cfg = surfaceConfigs[surface];
        const titleEl = document.getElementById('exp-title');
        if (titleEl) { titleEl.innerText = 'Surface: ' + cfg.name; titleEl.style.color = cfg.color; }
        const descEl = document.getElementById('exp-desc');
        if (descEl) descEl.innerHTML = cfg.desc;
        const boxEl = document.getElementById('exp-box');
        if (boxEl) { boxEl.innerHTML = '<strong>Physics Insight:</strong> ' + cfg.boxText; boxEl.style.borderColor = cfg.boxBorder; }

        window.resetSim();
    };

    window.pushScooter = function () {
        simPos = 0;
        simVel = 5.0;
        simAcc = surfaceConfigs[simSurface].acc;
        isMoving = true;
        lastTime = 0;
    };

    window.resetSim = function () {
        simPos = 0;
        simVel = 5.0;
        simAcc = surfaceConfigs[simSurface].acc;
        isMoving = false;
        lastTime = 0;
        updateTelemetry();
        drawSim();
    };

    window.toggleSolverStep = function (stepId) {
        const el = document.getElementById('solver-' + stepId);
        if (el) el.style.display = (el.style.display === 'block') ? 'none' : 'block';
    };

    function updateTelemetry() {
        const cfg = surfaceConfigs[simSurface];
        const xEl = document.getElementById('tel-x');
        if (xEl) xEl.innerText = simPos.toFixed(2) + ' m';
        const vEl = document.getElementById('tel-v');
        if (vEl) vEl.innerText = Math.max(0, simVel).toFixed(2) + ' m/s';
        const accEl = document.getElementById('tel-a');
        if (accEl) { accEl.innerText = simAcc.toFixed(2) + ' m/s\u00B2'; accEl.style.color = cfg.color; }
        const forceEl = document.getElementById('tel-f');
        if (forceEl) { forceEl.innerText = cfg.forceText; forceEl.style.color = cfg.color; }
    }

    // Draw a simple crate / box
    function drawBox(ctx, x, y, w, h, cfg) {
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        ctx.fillRect(x + 3, y + 3, w, h);

        // Main body
        ctx.fillStyle = '#8b7355';
        ctx.strokeStyle = '#6b5335';
        ctx.lineWidth = 2;
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);

        // Cross tape lines on the crate
        ctx.strokeStyle = '#a08060';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, y); ctx.lineTo(x + w, y + h);
        ctx.moveTo(x + w, y); ctx.lineTo(x, y + h);
        ctx.stroke();

        // Horizontal band
        ctx.fillStyle = '#7a6345';
        ctx.fillRect(x, y + h * 0.38, w, h * 0.24);
        ctx.strokeStyle = '#6b5335';
        ctx.strokeRect(x, y + h * 0.38, w, h * 0.24);
    }

    function drawSurfaceTexture(ctx, pattern, trackY, w, h) {
        if (pattern === 'gravel') {
            // Scattered dots for gravel
            ctx.fillStyle = '#a09088';
            for (let i = 0; i < 60; i++) {
                const gx = (i * 47 + 13) % w;
                const gy = trackY + 8 + (i * 19 + 5) % (h - trackY - 12);
                ctx.beginPath();
                ctx.arc(gx, gy, 1.5 + (i % 3), 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (pattern === 'wood') {
            // Horizontal grain lines
            ctx.strokeStyle = 'rgba(120, 100, 60, 0.3)';
            ctx.lineWidth = 1;
            for (let y = trackY + 6; y < h; y += 8) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.bezierCurveTo(w * 0.3, y + 2, w * 0.6, y - 1, w, y + 1);
                ctx.stroke();
            }
        } else if (pattern === 'ice') {
            // Faint scratch lines
            ctx.strokeStyle = 'rgba(255,255,255,0.5)';
            ctx.lineWidth = 0.5;
            for (let i = 0; i < 15; i++) {
                const sx = (i * 67 + 20) % w;
                ctx.beginPath();
                ctx.moveTo(sx, trackY + 4);
                ctx.lineTo(sx + 30 + (i % 4) * 10, trackY + (h - trackY) * 0.7);
                ctx.stroke();
            }
        }
    }

    function drawSim() {
        const canvas = document.getElementById('simulationCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const parentW = canvas.parentElement ? canvas.parentElement.clientWidth : 800;
        if (parentW > 0) canvas.width = parentW;

        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        const cfg = surfaceConfigs[simSurface];
        const scale = 40;
        const originX = 60;
        const trackY = Math.round(h * 0.62);

        // --- Background ---
        if (simSurface === 'space') {
            ctx.fillStyle = '#1a1f2e';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            for (let i = 0; i < 50; i++) {
                ctx.beginPath();
                ctx.arc((i * 41 + 17) % w, (i * 23 + 7) % (trackY - 5), (i % 4 === 0) ? 1.5 : 0.8, 0, Math.PI * 2);
                ctx.fill();
            }
            // No ground in space — just faint reference line
            ctx.strokeStyle = 'rgba(255,255,255,0.12)';
            ctx.setLineDash([4, 6]);
            ctx.beginPath(); ctx.moveTo(0, trackY); ctx.lineTo(w, trackY); ctx.stroke();
            ctx.setLineDash([]);
        } else {
            ctx.fillStyle = '#f0f2f0';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = cfg.trackColor;
            ctx.fillRect(0, trackY, w, h - trackY);

            // Surface texture
            drawSurfaceTexture(ctx, cfg.surfacePattern, trackY, w, h);

            // Tick marks
            ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            ctx.fillStyle = '#666';
            ctx.font = '10px monospace';
            ctx.lineWidth = 1;
            for (let m = 0; m <= 25; m++) {
                const tx = originX + m * scale;
                if (tx > w - 5) break;
                ctx.beginPath(); ctx.moveTo(tx, trackY - 3); ctx.lineTo(tx, trackY + 5); ctx.stroke();
                if (m % 2 === 0) ctx.fillText(m + 'm', tx - 6, trackY + 18);
            }
        }

        // --- Box position ---
        const boxW = 44;
        const boxH = 36;
        const rawX = originX + simPos * scale;
        let displayX = rawX;
        if (simSurface === 'space' && displayX > w - 60) {
            displayX = originX + (simPos * scale) % (w - 120);
        }
        displayX = Math.max(originX, Math.min(displayX, w - 60));
        const boxX = displayX - boxW / 2;
        const boxY = trackY - boxH - 1;

        drawBox(ctx, boxX, boxY, boxW, boxH, cfg);

        // --- Velocity arrow (teal, rightward) ---
        if (simVel > 0.1) {
            const vLen = Math.min(75, simVel * 14);
            const ax = boxX + boxW + 6;
            const ay = boxY + boxH / 2;
            ctx.strokeStyle = '#2a7d9a'; ctx.fillStyle = '#2a7d9a'; ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + vLen, ay); ctx.stroke();
            // Arrowhead
            ctx.beginPath();
            ctx.moveTo(ax + vLen - 6, ay - 5);
            ctx.lineTo(ax + vLen + 2, ay);
            ctx.lineTo(ax + vLen - 6, ay + 5);
            ctx.fill();
            ctx.font = '11px sans-serif';
            ctx.fillText('v = ' + simVel.toFixed(1) + ' m/s', ax + 2, ay - 8);
        }

        // --- Friction arrow (red, leftward) ---
        if (simAcc < 0 && simVel > 0.1) {
            const fLen = Math.min(50, Math.abs(simAcc) * 4);
            const fx = boxX - 6;
            const fy = boxY + boxH / 2 + 4;
            ctx.strokeStyle = '#c0392b'; ctx.fillStyle = '#c0392b'; ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx - fLen, fy); ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(fx - fLen + 6, fy - 5);
            ctx.lineTo(fx - fLen - 2, fy);
            ctx.lineTo(fx - fLen + 6, fy + 5);
            ctx.fill();
            ctx.font = '10px sans-serif';
            ctx.fillText('F_f', fx - fLen - 18, fy + 14);
        }

        // "Stopped" label when velocity is zero and was pushed
        if (simVel <= 0.05 && simPos > 0.1) {
            ctx.fillStyle = '#555';
            ctx.font = '12px sans-serif';
            ctx.fillText('Stopped at ' + simPos.toFixed(2) + ' m', displayX - 30, boxY - 10);
        }
    }

    function simLoop(now) {
        if (!lastTime) lastTime = now;
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;

        if (isMoving) {
            simVel += simAcc * dt;
            if (simVel <= 0) { simVel = 0; isMoving = false; }
            simPos += simVel * dt;
            updateTelemetry();
        }

        drawSim();
        window.__simRAFId = requestAnimationFrame(simLoop);
    }

    window.resetSim();
    window.__simRAFId = requestAnimationFrame(simLoop);
    console.log('[BoxSim] initialized');
};
