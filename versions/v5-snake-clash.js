/**
 * v5 — Snake Clash
 * Free-roam arena with smooth steering. Eat food, grow, clash with AI rivals.
 * 60-second timed rounds, leaderboard, boss snake, coins.
 */
SnakeVersions.register({
    number: 5,
    name: "Snake Clash",
    description: "Free-roam arena! Steer your snake to eat, grow & clash with AI rivals!",
    config: { gridSize: 1, tickRate: 16, canvasWidth: 400, canvasHeight: 600 },

    _NAMES: ["Blaze","Frost","Venom","Shadow","Titan","Fang","Storm","Phantom","Cobra","Viper","Jade","Rex"],
    _COLORS: [
        {b:"#ef4444",h:"#dc2626"},{b:"#f97316",h:"#ea580c"},{b:"#eab308",h:"#ca8a04"},
        {b:"#22c55e",h:"#16a34a"},{b:"#06b6d4",h:"#0891b2"},{b:"#8b5cf6",h:"#7c3aed"},
        {b:"#ec4899",h:"#db2777"},{b:"#f43f5e",h:"#e11d48"},{b:"#14b8a6",h:"#0d9488"},
        {b:"#f472b6",h:"#ec4899"},{b:"#a78bfa",h:"#8b5cf6"},{b:"#fb923c",h:"#f97316"},
    ],

    init(ctx, game) {
        game.state = "ready";
        game.score = 0;
        game.time = 60;
        game.tick = 0;
        game.AW = 1200;
        game.AH = 1200;
        game.camX = 0;
        game.camY = 0;
        game.CW = ctx.canvasWidth || 400;
        game.CH = ctx.canvasHeight || 600;

        const skin = (typeof SnakeShop !== "undefined") ? SnakeShop.getActiveSkin() : { color: "#4ade80", headColor: "#22c55e" };
        game.player = this._mkSnake(game.AW / 2, game.AH / 2, 0, skin.color, skin.headColor, "Player", 1);
        game.player.isPlayer = true;

        game.ais = [];
        for (let i = 0; i < 11; i++) {
            const a = Math.random() * Math.PI * 2;
            const x = 100 + Math.random() * (game.AW - 200);
            const y = 100 + Math.random() * (game.AH - 200);
            const c = this._COLORS[i % this._COLORS.length];
            const lvl = 2 + Math.floor(Math.random() * 12);
            const ai = this._mkSnake(x, y, a, c.b, c.h, this._NAMES[i], lvl);
            for (let s = 0; s < lvl * 2; s++) {
                const last = ai.segs[ai.segs.length - 1];
                ai.segs.push({ x: last.x - Math.cos(a) * 5, y: last.y - Math.sin(a) * 5 });
            }
            ai.tLen = ai.segs.length;
            game.ais.push(ai);
        }

        const boss = this._mkSnake(game.AW / 2, 200, Math.PI / 2, "#fbbf24", "#f59e0b", "BOSS", 50);
        boss.isBoss = true;
        boss.spd = 1.8;
        for (let s = 0; s < 80; s++) {
            const last = boss.segs[boss.segs.length - 1];
            boss.segs.push({ x: last.x, y: last.y - 5 });
        }
        boss.tLen = boss.segs.length;
        game.ais.push(boss);

        game.food = [];
        for (let i = 0; i < 100; i++) this._addFood(game);
        game.coins = [];
        for (let i = 0; i < 15; i++) this._addCoin(game);

        game.mouseX = game.CW / 2;
        game.mouseY = game.CH / 2;
        game.particles = [];
        game.killFeed = [];

        this._bindInput(game);
    },

    _mkSnake(x, y, ang, bc, hc, name, lvl) {
        const segs = [{ x, y }];
        for (let i = 1; i < 8; i++) segs.push({ x: x - Math.cos(ang) * 5 * i, y: y - Math.sin(ang) * 5 * i });
        return { segs, ang, spd: 2, bc, hc, name, lvl, alive: true, tLen: 8, isPlayer: false, isBoss: false, aiT: 0, aiTX: x, aiTY: y };
    },

    _addFood(game) {
        game.food.push({
            x: 20 + Math.random() * (game.AW - 40), y: 20 + Math.random() * (game.AH - 40),
            r: 4 + Math.random() * 3,
            c: ["#4ade80", "#38bdf8", "#f97316", "#ef4444", "#a855f7", "#fbbf24"][Math.floor(Math.random() * 6)],
        });
    },

    _addCoin(game) {
        game.coins.push({ x: 30 + Math.random() * (game.AW - 60), y: 30 + Math.random() * (game.AH - 60), r: 8 });
    },

    _bindInput(game) {
        const cv = document.getElementById("game-canvas");
        if (!cv || cv._v5bound) return;
        cv._v5bound = true;
        const pos = (e, touch) => {
            const r = cv.getBoundingClientRect();
            const sx = cv.width / r.width, sy = cv.height / r.height;
            const src = touch ? e.touches[0] : e;
            game.mouseX = (src.clientX - r.left) * sx;
            game.mouseY = (src.clientY - r.top) * sy;
        };
        cv.addEventListener("mousemove", e => pos(e, false));
        cv.addEventListener("touchmove", e => { e.preventDefault(); pos(e, true); }, { passive: false });
        cv.addEventListener("touchstart", e => pos(e, true), { passive: true });
    },

    update(ctx, game) {
        if (game.state !== "playing") return;
        game.tick++;
        if (game.tick % 60 === 0) { game.time--; if (game.time <= 0) { game.state = "dead"; game.time = 0; } }

        if (game.player.alive) {
            const h = game.player.segs[0];
            const ta = Math.atan2(game.mouseY + game.camY - h.y, game.mouseX + game.camX - h.x);
            let d = ta - game.player.ang;
            while (d > Math.PI) d -= Math.PI * 2;
            while (d < -Math.PI) d += Math.PI * 2;
            game.player.ang += d * 0.15;
            this._move(game.player, game);
        }

        for (const ai of game.ais) {
            if (!ai.alive) continue;
            this._aiThink(ai, game);
            this._move(ai, game);
        }

        this._collisions(game);
        this._eat(game);

        if (game.player.alive) {
            const h = game.player.segs[0];
            game.camX += (h.x - game.CW / 2 - game.camX) * 0.1;
            game.camY += (h.y - game.CH / 2 - game.camY) * 0.1;
        }
        game.camX = Math.max(0, Math.min(game.AW - game.CW, game.camX));
        game.camY = Math.max(0, Math.min(game.AH - game.CH, game.camY));

        game.particles = game.particles.filter(p => { p.x += p.vx; p.y += p.vy; p.life--; p.vx *= 0.95; p.vy *= 0.95; return p.life > 0; });
        while (game.food.length < 80) this._addFood(game);
        while (game.coins.length < 10) this._addCoin(game);
        game.killFeed = game.killFeed.filter(k => { k.t--; return k.t > 0; });

        game.player.lvl = Math.floor(game.player.segs.length / 3) + 1;
        game.score = game.player.lvl;
    },

    _move(s, game) {
        const h = s.segs[0];
        const nx = h.x + Math.cos(s.ang) * s.spd;
        const ny = h.y + Math.sin(s.ang) * s.spd;
        if (nx <= 0 || nx >= game.AW) s.ang = Math.PI - s.ang;
        if (ny <= 0 || ny >= game.AH) s.ang = -s.ang;
        s.segs.unshift({ x: Math.max(0, Math.min(game.AW, nx)), y: Math.max(0, Math.min(game.AH, ny)) });
        while (s.segs.length > s.tLen) s.segs.pop();
    },

    _aiThink(ai, game) {
        ai.aiT--;
        const h = ai.segs[0];
        if (ai.aiT <= 0) {
            ai.aiT = 30 + Math.floor(Math.random() * 60);
            if (Math.random() < 0.6 && game.food.length > 0) {
                let best = game.food[0], bd = Infinity;
                for (const f of game.food) { const d = Math.hypot(f.x - h.x, f.y - h.y); if (d < bd) { bd = d; best = f; } }
                ai.aiTX = best.x; ai.aiTY = best.y;
            } else {
                ai.aiTX = 50 + Math.random() * (game.AW - 100);
                ai.aiTY = 50 + Math.random() * (game.AH - 100);
            }
            if (game.player.alive && game.player.segs.length > ai.segs.length * 1.5) {
                const ph = game.player.segs[0], pd = Math.hypot(ph.x - h.x, ph.y - h.y);
                if (pd < 120) { ai.aiTX = h.x + (h.x - ph.x) * 2; ai.aiTY = h.y + (h.y - ph.y) * 2; ai.aiT = 15; }
            }
        }
        const ta = Math.atan2(ai.aiTY - h.y, ai.aiTX - h.x);
        let d = ta - ai.ang;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        ai.ang += d * 0.08;
    },

    _eat(game) {
        const all = [game.player, ...game.ais].filter(s => s.alive);
        for (const sn of all) {
            const h = sn.segs[0];
            game.food = game.food.filter(f => {
                if (Math.hypot(f.x - h.x, f.y - h.y) < f.r + 8) {
                    sn.tLen += 2;
                    if (sn.isPlayer) {
                        game.score++;
                        for (let i = 0; i < 4; i++) game.particles.push({ x: f.x, y: f.y, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3, life: 15, c: f.c, r: 2 });
                    }
                    return false;
                }
                return true;
            });
            game.coins = game.coins.filter(c => {
                if (Math.hypot(c.x - h.x, c.y - h.y) < c.r + 8) {
                    sn.tLen += 4;
                    if (sn.isPlayer) {
                        if (typeof SnakeShop !== "undefined") SnakeShop.addCoins(5);
                        game.score += 5;
                        for (let i = 0; i < 6; i++) game.particles.push({ x: c.x, y: c.y, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, life: 20, c: "#fbbf24", r: 3 });
                    }
                    return false;
                }
                return true;
            });
        }
    },

    _collisions(game) {
        const all = [game.player, ...game.ais].filter(s => s.alive);
        for (let i = 0; i < all.length; i++) {
            const sn = all[i];
            if (!sn.alive) continue;
            const h = sn.segs[0];
            for (let j = 0; j < all.length; j++) {
                if (i === j) continue;
                const ot = all[j];
                if (!ot.alive) continue;
                for (let k = 5; k < ot.segs.length; k++) {
                    if (Math.hypot(h.x - ot.segs[k].x, h.y - ot.segs[k].y) < 8) {
                        sn.alive = false;
                        for (let s = 0; s < sn.segs.length; s += 3) game.food.push({ x: sn.segs[s].x + (Math.random() - 0.5) * 10, y: sn.segs[s].y + (Math.random() - 0.5) * 10, r: 5, c: sn.bc });
                        for (let p = 0; p < 12; p++) game.particles.push({ x: h.x, y: h.y, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6, life: 25, c: sn.bc, r: 4 });
                        game.killFeed.push({ text: `${ot.name} eliminated ${sn.name}`, t: 120 });
                        if (sn.isPlayer) game.state = "dead";
                        ot.tLen += Math.floor(sn.segs.length / 3);
                        if (!sn.isPlayer && !sn.isBoss) {
                            const ref = sn;
                            setTimeout(() => {
                                if (game.state !== "playing") return;
                                ref.alive = true;
                                const rx = 50 + Math.random() * (game.AW - 100), ry = 50 + Math.random() * (game.AH - 100);
                                ref.segs = [{ x: rx, y: ry }];
                                for (let s = 1; s < 8; s++) ref.segs.push({ x: rx - s * 5, y: ry });
                                ref.tLen = 8; ref.ang = Math.random() * Math.PI * 2;
                            }, 3000);
                        }
                        break;
                    }
                }
                if (!sn.alive) break;
            }
        }
    },

    draw(ctx, game, canvas) {
        const g = canvas.getContext("2d");
        const W = canvas.width, H = canvas.height;
        g.save();
        g.clearRect(0, 0, W, H);

        g.fillStyle = "#c2a470";
        g.fillRect(0, 0, W, H);

        g.fillStyle = "#b89860";
        for (let i = 0; i < 80; i++) {
            const dx = ((i * 73 + 17) % game.AW) - game.camX, dy = ((i * 97 + 31) % game.AH) - game.camY;
            if (dx > -5 && dx < W + 5 && dy > -5 && dy < H + 5) { g.beginPath(); g.arc(dx, dy, 1.5, 0, Math.PI * 2); g.fill(); }
        }
        g.fillStyle = "#bfa060";
        for (let i = 0; i < 40; i++) {
            const dx = ((i * 131 + 53) % game.AW) - game.camX, dy = ((i * 89 + 71) % game.AH) - game.camY;
            if (dx > -5 && dx < W + 5 && dy > -5 && dy < H + 5) { g.beginPath(); g.arc(dx, dy, 2, 0, Math.PI * 2); g.fill(); }
        }

        g.strokeStyle = "#8b7355";
        g.lineWidth = 4;
        g.strokeRect(-game.camX, -game.camY, game.AW, game.AH);

        for (const f of game.food) {
            const sx = f.x - game.camX, sy = f.y - game.camY;
            if (sx < -10 || sx > W + 10 || sy < -10 || sy > H + 10) continue;
            g.globalAlpha = 0.9;
            g.fillStyle = f.c;
            g.beginPath(); g.arc(sx, sy, f.r, 0, Math.PI * 2); g.fill();
            g.globalAlpha = 1;
        }

        for (const c of game.coins) {
            const sx = c.x - game.camX, sy = c.y - game.camY;
            if (sx < -15 || sx > W + 15 || sy < -15 || sy > H + 15) continue;
            const p = 0.9 + 0.1 * Math.sin(Date.now() / 200 + c.x);
            g.fillStyle = "#fbbf24"; g.shadowColor = "#f59e0b"; g.shadowBlur = 6;
            g.beginPath(); g.arc(sx, sy, c.r * p, 0, Math.PI * 2); g.fill();
            g.shadowBlur = 0;
            g.fillStyle = "#fde68a"; g.beginPath(); g.arc(sx - 2, sy - 2, c.r * 0.4, 0, Math.PI * 2); g.fill();
        }

        for (const p of game.particles) {
            const sx = p.x - game.camX, sy = p.y - game.camY;
            g.globalAlpha = p.life / 25; g.fillStyle = p.c;
            g.beginPath(); g.arc(sx, sy, p.r, 0, Math.PI * 2); g.fill();
        }
        g.globalAlpha = 1;

        for (const ai of game.ais) { if (ai.alive) this._drawSnake(g, ai, game); }
        if (game.player.alive) this._drawSnake(g, game.player, game);

        g.restore();
        this._drawHUD(g, game, W, H);

        if (game.state === "ready") this._overlay(g, W, H, "SNAKE CLASH", "Steer to eat & grow • Tap to Start!");
        if (game.state === "dead") {
            const msg = game.time <= 0 ? "TIME'S UP!" : "YOU DIED!";
            this._overlay(g, W, H, msg, `Level ${game.player.lvl}  •  Score: ${game.score}  •  Tap to retry`);
        }
    },

    _drawSnake(g, sn, game) {
        const segs = sn.segs;
        if (segs.length < 2) return;
        const W = game.CW, H = game.CH;

        for (let i = segs.length - 1; i >= 0; i--) {
            const sx = segs[i].x - game.camX, sy = segs[i].y - game.camY;
            if (sx < -20 || sx > W + 20 || sy < -20 || sy > H + 20) continue;
            const t = i / segs.length;
            const rad = i === 0 ? Math.min(8 + sn.lvl * 0.2, 14) : Math.min(6 + (1 - t) * 2 + sn.lvl * 0.15, 12);

            if (i === 0) {
                g.fillStyle = sn.hc; g.shadowColor = sn.hc; g.shadowBlur = 8;
                g.beginPath(); g.arc(sx, sy, rad, 0, Math.PI * 2); g.fill(); g.shadowBlur = 0;
                const ex = Math.cos(sn.ang) * 3, ey = Math.sin(sn.ang) * 3;
                const px = -Math.sin(sn.ang) * 4, py = Math.cos(sn.ang) * 4;
                g.fillStyle = "#fff";
                g.beginPath(); g.arc(sx + ex + px, sy + ey + py, 3, 0, Math.PI * 2); g.fill();
                g.beginPath(); g.arc(sx + ex - px, sy + ey - py, 3, 0, Math.PI * 2); g.fill();
                g.fillStyle = "#000";
                g.beginPath(); g.arc(sx + ex * 1.5 + px, sy + ey * 1.5 + py, 1.5, 0, Math.PI * 2); g.fill();
                g.beginPath(); g.arc(sx + ex * 1.5 - px, sy + ey * 1.5 - py, 1.5, 0, Math.PI * 2); g.fill();
            } else {
                g.globalAlpha = 1 - t * 0.3;
                let color = sn.bc;
                if (sn.isBoss) color = `hsl(${(i * 5 + Date.now() / 30) % 360},70%,55%)`;
                if (sn.isPlayer && sn.bc === "rainbow" && typeof SnakeShop !== "undefined") color = SnakeShop.getRainbowColor(i, segs.length);
                g.fillStyle = color;
                g.beginPath(); g.arc(sx, sy, rad, 0, Math.PI * 2); g.fill();
                g.fillStyle = "rgba(255,255,255,0.15)";
                g.beginPath(); g.arc(sx - 1, sy - 1, rad * 0.45, 0, Math.PI * 2); g.fill();
                g.globalAlpha = 1;
            }
        }

        const hx = segs[0].x - game.camX, hy = segs[0].y - game.camY;
        if (hx > -50 && hx < W + 50 && hy > -50 && hy < H + 50) {
            g.shadowColor = "rgba(0,0,0,0.6)"; g.shadowBlur = 3;
            g.fillStyle = "#fff"; g.font = "bold 9px -apple-system,sans-serif"; g.textAlign = "center";
            g.fillText("Lv" + sn.lvl, hx, hy - 16);
            g.fillText(sn.name, hx, hy - 7);
            g.shadowBlur = 0;
        }
    },

    _drawHUD(g, game, W, H) {
        const m = Math.floor(game.time / 60), s = game.time % 60;
        const ts = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
        g.fillStyle = "rgba(0,0,0,0.6)";
        this._roundRect(g, 10, 10, 70, 30, 8); g.fill();
        g.fillStyle = "#fff"; g.font = "bold 16px -apple-system,sans-serif"; g.textAlign = "center";
        g.fillText(ts, 45, 31);

        const boss = game.ais.find(a => a.isBoss && a.alive);
        if (boss) {
            g.fillStyle = "rgba(0,0,0,0.6)"; this._roundRect(g, W - 130, 10, 120, 28, 8); g.fill();
            g.fillStyle = "#ef4444"; g.font = "bold 11px -apple-system,sans-serif"; g.textAlign = "left";
            g.fillText("👹 BOSS", W - 122, 28);
            g.fillStyle = "#38bdf8"; g.fillText("Lv " + boss.lvl, W - 55, 28);
        }

        const all = [game.player, ...game.ais].filter(s => s.alive);
        all.sort((a, b) => b.segs.length - a.segs.length);
        const top = all.slice(0, 4);
        const lbH = top.length * 22 + 8;
        g.fillStyle = "rgba(0,0,0,0.5)"; this._roundRect(g, W - 130, 45, 120, lbH, 8); g.fill();
        const pRank = all.findIndex(s => s.isPlayer) + 1;

        for (let i = 0; i < top.length; i++) {
            const sn = top[i], y = 62 + i * 22, rk = i + 1;
            if (rk === 1) { g.fillStyle = "#fbbf24"; g.font = "10px sans-serif"; g.textAlign = "left"; g.fillText("👑", W - 125, y); }
            const pfx = rk <= 3 ? ["1st", "2nd", "3rd"][rk - 1] : rk + "th";
            g.fillStyle = sn.isPlayer ? "#38bdf8" : "#ccc";
            g.font = (sn.isPlayer ? "bold " : "") + "10px -apple-system,sans-serif";
            g.textAlign = "left"; g.fillText(pfx + "  " + sn.name, W - 108, y);
            g.textAlign = "right"; g.fillText("" + sn.segs.length, W - 18, y);
        }

        if (pRank > 4 && game.player.alive) {
            const y = 62 + top.length * 22;
            g.fillStyle = "rgba(0,0,0,0.5)"; this._roundRect(g, W - 130, y - 14, 120, 22, 8); g.fill();
            g.fillStyle = "#38bdf8"; g.font = "bold 10px -apple-system,sans-serif";
            g.textAlign = "left"; g.fillText(pRank + "th  Player", W - 108, y);
            g.textAlign = "right"; g.fillText("" + game.player.segs.length, W - 18, y);
        }

        for (let i = 0; i < game.killFeed.length && i < 3; i++) {
            const kf = game.killFeed[i];
            g.globalAlpha = Math.min(1, kf.t / 30);
            g.fillStyle = "#fbbf24"; g.font = "bold 10px -apple-system,sans-serif"; g.textAlign = "center";
            g.fillText(kf.text, W / 2, H - 30 - i * 16);
        }
        g.globalAlpha = 1;
    },

    _roundRect(g, x, y, w, h, r) {
        g.beginPath();
        if (g.roundRect) { g.roundRect(x, y, w, h, r); }
        else { g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r); g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h); g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r); g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath(); }
    },

    _overlay(g, W, H, title, sub) {
        g.fillStyle = "rgba(0,0,0,0.7)"; g.fillRect(0, 0, W, H);
        g.fillStyle = "#fff"; g.font = "bold 32px -apple-system,sans-serif"; g.textAlign = "center";
        g.fillText(title, W / 2, H / 2 - 20);
        g.fillStyle = "#ccc"; g.font = "14px -apple-system,sans-serif";
        g.fillText(sub, W / 2, H / 2 + 15);
    },

    onKey(key, game) {
        if ((key === "Enter" || key === " ") && game.state === "dead") return "restart";
        if ((key === "Enter" || key === " ") && game.state === "ready") game.state = "playing";
        const dm = { ArrowUp: -Math.PI / 2, w: -Math.PI / 2, ArrowDown: Math.PI / 2, s: Math.PI / 2, ArrowLeft: Math.PI, a: Math.PI, ArrowRight: 0, d: 0 };
        if (dm[key] !== undefined && game.player && game.player.alive) game.player.ang = dm[key];
    },
});
