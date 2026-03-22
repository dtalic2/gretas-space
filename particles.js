/**
 * Particle & Effects System
 * Provides particles, screen shake, combo tracking, and trail rendering.
 */
window.SnakeFX = (function () {
    let particles = [];
    let shakeAmount = 0;
    let shakeDecay = 0.9;
    let comboCount = 0;
    let comboTimer = 0;
    const COMBO_WINDOW = 12; // ticks to chain another eat
    let trailParticles = [];

    // ─── Particles ───
    function emit(x, y, count, color, opts) {
        opts = opts || {};
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = (opts.speed || 2) + Math.random() * (opts.speedVar || 2);
            particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: opts.life || 20 + Math.random() * 15,
                maxLife: opts.life || 20 + Math.random() * 15,
                color: color,
                size: opts.size || 2 + Math.random() * 3,
                gravity: opts.gravity || 0,
            });
        }
    }

    function emitTrail(x, y, color) {
        if (!color) return;
        trailParticles.push({
            x: x + Math.random() * 4 - 2,
            y: y + Math.random() * 4 - 2,
            life: 15 + Math.random() * 10,
            maxLife: 25,
            color,
            size: 2 + Math.random() * 2,
        });
    }

    function update() {
        // Main particles
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.vx *= 0.97;
            p.vy *= 0.97;
            p.life--;
            if (p.life <= 0) particles.splice(i, 1);
        }
        // Trail particles
        for (let i = trailParticles.length - 1; i >= 0; i--) {
            trailParticles[i].life--;
            if (trailParticles[i].life <= 0) trailParticles.splice(i, 1);
        }
        // Shake decay
        shakeAmount *= shakeDecay;
        if (shakeAmount < 0.5) shakeAmount = 0;
        // Combo timer
        if (comboTimer > 0) {
            comboTimer--;
            if (comboTimer === 0) comboCount = 0;
        }
    }

    function draw(g) {
        // Trail particles
        for (const p of trailParticles) {
            const alpha = p.life / p.maxLife;
            g.globalAlpha = alpha * 0.5;
            g.fillStyle = p.color;
            g.beginPath();
            g.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
            g.fill();
        }
        // Main particles
        for (const p of particles) {
            const alpha = p.life / p.maxLife;
            g.globalAlpha = alpha;
            g.fillStyle = p.color;
            g.beginPath();
            g.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
            g.fill();
        }
        g.globalAlpha = 1;
    }

    function applyShake(g) {
        if (shakeAmount > 0) {
            const dx = (Math.random() - 0.5) * shakeAmount;
            const dy = (Math.random() - 0.5) * shakeAmount;
            g.translate(dx, dy);
            return { dx, dy };
        }
        return null;
    }

    return {
        emit,
        emitTrail,
        update,
        draw,
        applyShake,

        shake(amount) { shakeAmount = amount; },

        // Combo system: call onEat each time food is eaten
        onEat() {
            comboCount++;
            comboTimer = COMBO_WINDOW;
            return comboCount;
        },
        getCombo() { return comboCount; },
        resetCombo() { comboCount = 0; comboTimer = 0; },

        clear() {
            particles = [];
            trailParticles = [];
            shakeAmount = 0;
            comboCount = 0;
            comboTimer = 0;
        },
    };
})();
