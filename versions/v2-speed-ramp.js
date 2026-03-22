/**
 * Version 2 - Speed Ramp
 * Snake speeds up as you eat. Bonus food for extra points.
 * Skins, particles, combos, coins.
 */
SnakeVersions.register({
    number: 2,
    name: "Speed Ramp",
    description: "Snake speeds up as you grow. Bonus food appears for limited time.",

    config: { gridSize: 20, tickRate: 160 },

    init(ctx, game) {
        const mid = Math.floor(ctx.cols / 2);
        game.snake = [
            { x: mid, y: Math.floor(ctx.rows / 2) },
            { x: mid - 1, y: Math.floor(ctx.rows / 2) },
            { x: mid - 2, y: Math.floor(ctx.rows / 2) },
        ];
        game.dir = { x: 1, y: 0 };
        game.nextDir = { x: 1, y: 0 };
        game.food = null;
        game.bonus = null;
        game.bonusTimer = 0;
        game.score = 0;
        game.eaten = 0;
        game.currentTickRate = 160;
        game.ticksSinceBonus = 0;
        game.state = "ready";
        game.coinsEarned = 0;
        game.floatingTexts = [];
        this._placeFood(ctx, game);
        if (typeof SnakeFX !== "undefined") SnakeFX.clear();
    },

    _placeFood(ctx, game) {
        const occupied = new Set(game.snake.map(s => `${s.x},${s.y}`));
        let pos;
        do {
            pos = { x: Math.floor(Math.random() * ctx.cols), y: Math.floor(Math.random() * ctx.rows) };
        } while (occupied.has(`${pos.x},${pos.y}`));
        game.food = pos;
    },

    _placeBonus(ctx, game) {
        const occupied = new Set(game.snake.map(s => `${s.x},${s.y}`));
        occupied.add(`${game.food.x},${game.food.y}`);
        let pos;
        do {
            pos = { x: Math.floor(Math.random() * ctx.cols), y: Math.floor(Math.random() * ctx.rows) };
        } while (occupied.has(`${pos.x},${pos.y}`));
        game.bonus = pos;
        game.bonusTimer = 40;
    },

    onKey(key, game) {
        const dirMap = {
            ArrowUp: { x: 0, y: -1 }, w: { x: 0, y: -1 },
            ArrowDown: { x: 0, y: 1 }, s: { x: 0, y: 1 },
            ArrowLeft: { x: -1, y: 0 }, a: { x: -1, y: 0 },
            ArrowRight: { x: 1, y: 0 }, d: { x: 1, y: 0 },
        };
        if (dirMap[key]) {
            const nd = dirMap[key];
            if (nd.x !== -game.dir.x || nd.y !== -game.dir.y) game.nextDir = nd;
        }
        if (key === "Enter" && game.state === "dead") return "restart";
        if ((key === "Enter" || key === " ") && game.state === "ready") game.state = "playing";
    },

    update(ctx, game) {
        if (game.state !== "playing") return;
        const gs = ctx.gridSize;

        game.dir = { ...game.nextDir };
        const head = game.snake[0];
        const newHead = { x: head.x + game.dir.x, y: head.y + game.dir.y };

        if (newHead.x < 0) newHead.x = ctx.cols - 1;
        if (newHead.x >= ctx.cols) newHead.x = 0;
        if (newHead.y < 0) newHead.y = ctx.rows - 1;
        if (newHead.y >= ctx.rows) newHead.y = 0;

        if (game.snake.some(s => s.x === newHead.x && s.y === newHead.y)) {
            game.state = "dead";
            const coins = Math.floor(game.score / 4);
            if (coins > 0 && typeof SnakeShop !== "undefined") {
                SnakeShop.addCoins(coins);
                game.coinsEarned = coins;
            }
            if (typeof SnakeFX !== "undefined") {
                SnakeFX.shake(10);
                SnakeFX.emit(head.x * gs + gs / 2, head.y * gs + gs / 2, 25, "#ef4444", { speed: 3 });
            }
            return;
        }

        game.snake.unshift(newHead);
        let ate = false;

        if (newHead.x === game.food.x && newHead.y === game.food.y) {
            game.score += 10;
            game.eaten++;
            ate = true;
            this._placeFood(ctx, game);
            game.currentTickRate = Math.max(60, 160 - game.eaten * 5);
            ctx.setTickRate(game.currentTickRate);
            if (typeof SnakeFX !== "undefined") {
                const combo = SnakeFX.onEat();
                const bonus = combo > 1 ? combo * 3 : 0;
                game.score += bonus;
                SnakeFX.emit(newHead.x * gs + gs / 2, newHead.y * gs + gs / 2, 10, "#ef4444");
                if (combo > 1) {
                    game.floatingTexts.push({
                        text: `${combo}x COMBO! +${bonus}`, x: newHead.x * gs + gs / 2,
                        y: newHead.y * gs, life: 30, color: "#fbbf24"
                    });
                }
            }
        }

        if (game.bonus && newHead.x === game.bonus.x && newHead.y === game.bonus.y) {
            game.score += 30;
            ate = true;
            if (typeof SnakeFX !== "undefined") {
                SnakeFX.emit(newHead.x * gs + gs / 2, newHead.y * gs + gs / 2, 15, "#fbbf24", { speed: 4 });
            }
            game.floatingTexts.push({ text: "+30 BONUS!", x: newHead.x * gs + gs / 2, y: newHead.y * gs, life: 35, color: "#fbbf24" });
            game.bonus = null;
            game.bonusTimer = 0;
        }

        if (!ate) {
            if (typeof SnakeFX !== "undefined" && typeof SnakeShop !== "undefined") {
                const tail = game.snake[game.snake.length - 1];
                SnakeFX.emitTrail(tail.x * gs + gs / 2, tail.y * gs + gs / 2, SnakeShop.getActiveTrail().trailColor);
            }
            game.snake.pop();
        }

        if (game.bonus) { game.bonusTimer--; if (game.bonusTimer <= 0) game.bonus = null; }
        game.ticksSinceBonus++;
        if (!game.bonus && game.ticksSinceBonus > 30 && Math.random() < 0.03) {
            this._placeBonus(ctx, game);
            game.ticksSinceBonus = 0;
        }

        // Floating texts
        for (let i = game.floatingTexts.length - 1; i >= 0; i--) {
            game.floatingTexts[i].y -= 1.2;
            game.floatingTexts[i].life--;
            if (game.floatingTexts[i].life <= 0) game.floatingTexts.splice(i, 1);
        }

        if (typeof SnakeFX !== "undefined") SnakeFX.update();
    },

    draw(ctx, game, canvas) {
        const g = canvas.getContext("2d");
        const gs = ctx.gridSize;

        g.save();
        if (typeof SnakeFX !== "undefined") SnakeFX.applyShake(g);

        g.fillStyle = "#080c14";
        g.fillRect(0, 0, canvas.width, canvas.height);

        g.strokeStyle = "#111822";
        g.lineWidth = 0.5;
        for (let x = 0; x <= ctx.cols; x++) {
            g.beginPath(); g.moveTo(x * gs, 0); g.lineTo(x * gs, canvas.height); g.stroke();
        }
        for (let y = 0; y <= ctx.rows; y++) {
            g.beginPath(); g.moveTo(0, y * gs); g.lineTo(canvas.width, y * gs); g.stroke();
        }

        // Food
        if (game.food) {
            const pulse = 0.8 + 0.2 * Math.sin(Date.now() / 200);
            g.fillStyle = "#ef4444";
            g.shadowColor = "#ef4444";
            g.shadowBlur = 10 * pulse;
            g.beginPath();
            g.arc(game.food.x * gs + gs / 2, game.food.y * gs + gs / 2, (gs / 2 - 2) * pulse, 0, Math.PI * 2);
            g.fill();
            g.shadowBlur = 0;
        }

        // Bonus
        if (game.bonus) {
            const pulse = 0.7 + 0.3 * Math.sin(Date.now() / 100);
            g.fillStyle = `rgba(250, 204, 21, ${pulse})`;
            g.shadowColor = "#facc15";
            g.shadowBlur = 14;
            g.beginPath();
            g.arc(game.bonus.x * gs + gs / 2, game.bonus.y * gs + gs / 2, gs / 2 - 1, 0, Math.PI * 2);
            g.fill();
            g.shadowBlur = 0;
            // Timer ring
            const pct = game.bonusTimer / 40;
            g.strokeStyle = "#facc15";
            g.lineWidth = 2;
            g.beginPath();
            g.arc(game.bonus.x * gs + gs / 2, game.bonus.y * gs + gs / 2, gs / 2 + 2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
            g.stroke();
        }

        // Snake
        const skin = (typeof SnakeShop !== "undefined") ? SnakeShop.getActiveSkin() : { color: "#38bdf8", headColor: "#0ea5e9" };
        this._drawSnake(g, game, gs, skin);

        // Particles
        if (typeof SnakeFX !== "undefined") SnakeFX.draw(g);

        // Floating texts
        for (const ft of game.floatingTexts) {
            g.globalAlpha = ft.life / 35;
            g.fillStyle = ft.color;
            g.font = "bold 14px -apple-system, sans-serif";
            g.textAlign = "center";
            g.fillText(ft.text, ft.x, ft.y);
        }
        g.globalAlpha = 1;

        // Speed + Combo HUD
        if (game.state === "playing") {
            const speed = Math.round((1 - (game.currentTickRate - 60) / 100) * 100);
            g.fillStyle = "#555";
            g.font = "11px -apple-system, sans-serif";
            g.textAlign = "right";
            g.fillText(`Speed: ${speed}%`, canvas.width - 8, canvas.height - 8);
            if (typeof SnakeFX !== "undefined" && SnakeFX.getCombo() > 1) {
                g.fillStyle = "#fbbf24";
                g.font = "bold 13px -apple-system, sans-serif";
                g.textAlign = "left";
                g.fillText(`Combo: ${SnakeFX.getCombo()}x`, 8, canvas.height - 8);
            }
        }

        g.restore();

        if (game.state === "ready") {
            this._drawOverlay(g, canvas, "Speed Ramp", "Gets faster as you eat! Tap to play", "#38bdf8");
        }
        if (game.state === "dead") {
            const coinText = game.coinsEarned > 0 ? `  (+${game.coinsEarned} coins)` : "";
            this._drawOverlay(g, canvas, "Game Over", `Score: ${game.score}${coinText}  —  Tap to retry`, "#ef4444");
        }
    },

    _drawSnake(g, game, gs, skin) {
        for (let i = game.snake.length - 1; i >= 0; i--) {
            const seg = game.snake[i];
            const alpha = Math.max(0.4, 1 - i * 0.02);
            g.globalAlpha = alpha;
            let fillColor;
            if (skin.color === "rainbow" && typeof SnakeShop !== "undefined") {
                fillColor = SnakeShop.getRainbowColor(i, game.snake.length);
            } else {
                fillColor = i === 0 ? skin.headColor : skin.color;
            }
            g.fillStyle = fillColor;
            if (i === 0) { g.shadowColor = skin.headColor; g.shadowBlur = 8; }
            const r = 3;
            const x = seg.x * gs + 1, y = seg.y * gs + 1, w = gs - 2, h = gs - 2;
            g.beginPath();
            g.moveTo(x + r, y);
            g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
            g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
            g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y);
            g.fill();
            if (i === 0) {
                g.shadowBlur = 0;
                const ex1 = seg.x * gs + 4 + game.dir.x * 2;
                const ey = seg.y * gs + 4 + game.dir.y * 2;
                const ex2 = seg.x * gs + gs - 8 + game.dir.x * 2;
                g.fillStyle = "#fff";
                g.beginPath(); g.arc(ex1 + 2, ey + 2, 3, 0, Math.PI * 2); g.fill();
                g.beginPath(); g.arc(ex2 + 2, ey + 2, 3, 0, Math.PI * 2); g.fill();
                g.fillStyle = "#111";
                g.beginPath(); g.arc(ex1 + 2 + game.dir.x, ey + 2 + game.dir.y, 1.5, 0, Math.PI * 2); g.fill();
                g.beginPath(); g.arc(ex2 + 2 + game.dir.x, ey + 2 + game.dir.y, 1.5, 0, Math.PI * 2); g.fill();
            }
        }
        g.globalAlpha = 1;
        g.shadowBlur = 0;
    },

    _drawOverlay(g, canvas, title, subtitle, accentColor) {
        g.fillStyle = "rgba(0,0,0,0.78)";
        g.fillRect(0, 0, canvas.width, canvas.height);
        g.strokeStyle = accentColor || "#38bdf8";
        g.lineWidth = 2;
        g.strokeRect(canvas.width / 2 - 140, canvas.height / 2 - 50, 280, 90);
        g.textAlign = "center";
        g.fillStyle = accentColor || "#38bdf8";
        g.font = "bold 26px -apple-system, sans-serif";
        g.fillText(title, canvas.width / 2, canvas.height / 2 - 12);
        g.fillStyle = "#bbb";
        g.font = "13px -apple-system, sans-serif";
        g.fillText(subtitle, canvas.width / 2, canvas.height / 2 + 18);
    },
});
