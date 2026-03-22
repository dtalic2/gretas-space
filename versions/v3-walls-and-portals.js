/**
 * Version 3 - Walls & Portals
 * Walls block your path. Portal pairs teleport you across the map.
 * Skins, particles, combos, coins.
 */
SnakeVersions.register({
    number: 3,
    name: "Walls & Portals",
    description: "Obstacles appear as you grow. Portal pairs teleport you across the board.",

    config: { gridSize: 20, tickRate: 140 },

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
        game.score = 0;
        game.eaten = 0;
        game.walls = [];
        game.portals = [];
        game.state = "ready";
        game.flashMsg = null;
        game.flashTimer = 0;
        game.coinsEarned = 0;
        game.floatingTexts = [];
        this._placeFood(ctx, game);
        if (typeof SnakeFX !== "undefined") SnakeFX.clear();
    },

    _occupied(game) {
        const set = new Set(game.snake.map(s => `${s.x},${s.y}`));
        if (game.food) set.add(`${game.food.x},${game.food.y}`);
        game.walls.forEach(w => set.add(`${w.x},${w.y}`));
        game.portals.forEach(p => { set.add(`${p.a.x},${p.a.y}`); set.add(`${p.b.x},${p.b.y}`); });
        return set;
    },

    _randomFree(ctx, game) {
        const occ = this._occupied(game);
        let pos, tries = 0;
        do {
            pos = { x: Math.floor(Math.random() * ctx.cols), y: Math.floor(Math.random() * ctx.rows) };
            tries++;
        } while (occ.has(`${pos.x},${pos.y}`) && tries < 500);
        return pos;
    },

    _placeFood(ctx, game) { game.food = this._randomFree(ctx, game); },
    _addWall(ctx, game) { game.walls.push(this._randomFree(ctx, game)); },
    _addPortalPair(ctx, game) {
        const a = this._randomFree(ctx, game);
        game.walls.push(a);
        const b = this._randomFree(ctx, game);
        game.walls.pop();
        game.portals.push({ a, b });
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

        if (game.flashTimer > 0) game.flashTimer--;
        if (game.flashTimer === 0) game.flashMsg = null;

        game.dir = { ...game.nextDir };
        const head = game.snake[0];
        let newHead = { x: head.x + game.dir.x, y: head.y + game.dir.y };

        if (newHead.x < 0) newHead.x = ctx.cols - 1;
        if (newHead.x >= ctx.cols) newHead.x = 0;
        if (newHead.y < 0) newHead.y = ctx.rows - 1;
        if (newHead.y >= ctx.rows) newHead.y = 0;

        // Wall collision
        if (game.walls.some(w => w.x === newHead.x && w.y === newHead.y)) {
            game.state = "dead";
            const coins = Math.floor(game.score / 3);
            if (coins > 0 && typeof SnakeShop !== "undefined") { SnakeShop.addCoins(coins); game.coinsEarned = coins; }
            if (typeof SnakeFX !== "undefined") {
                SnakeFX.shake(12);
                SnakeFX.emit(newHead.x * gs + gs / 2, newHead.y * gs + gs / 2, 20, "#6b7280", { speed: 3 });
            }
            return;
        }

        // Self collision
        if (game.snake.some(s => s.x === newHead.x && s.y === newHead.y)) {
            game.state = "dead";
            const coins = Math.floor(game.score / 3);
            if (coins > 0 && typeof SnakeShop !== "undefined") { SnakeShop.addCoins(coins); game.coinsEarned = coins; }
            if (typeof SnakeFX !== "undefined") {
                SnakeFX.shake(10);
                SnakeFX.emit(head.x * gs + gs / 2, head.y * gs + gs / 2, 25, "#ef4444");
            }
            return;
        }

        // Portal check
        for (const portal of game.portals) {
            if (newHead.x === portal.a.x && newHead.y === portal.a.y) {
                newHead = { x: portal.b.x, y: portal.b.y };
                game.flashMsg = "Teleported!"; game.flashTimer = 15;
                if (typeof SnakeFX !== "undefined") {
                    SnakeFX.emit(portal.a.x * gs + gs / 2, portal.a.y * gs + gs / 2, 10, "#a855f7");
                    SnakeFX.emit(portal.b.x * gs + gs / 2, portal.b.y * gs + gs / 2, 10, "#a855f7");
                }
                break;
            }
            if (newHead.x === portal.b.x && newHead.y === portal.b.y) {
                newHead = { x: portal.a.x, y: portal.a.y };
                game.flashMsg = "Teleported!"; game.flashTimer = 15;
                if (typeof SnakeFX !== "undefined") {
                    SnakeFX.emit(portal.b.x * gs + gs / 2, portal.b.y * gs + gs / 2, 10, "#06b6d4");
                    SnakeFX.emit(portal.a.x * gs + gs / 2, portal.a.y * gs + gs / 2, 10, "#06b6d4");
                }
                break;
            }
        }

        game.snake.unshift(newHead);

        if (newHead.x === game.food.x && newHead.y === game.food.y) {
            game.score += 10;
            game.eaten++;
            this._placeFood(ctx, game);
            if (typeof SnakeFX !== "undefined") {
                const combo = SnakeFX.onEat();
                const bonus = combo > 1 ? combo * 2 : 0;
                game.score += bonus;
                SnakeFX.emit(newHead.x * gs + gs / 2, newHead.y * gs + gs / 2, 10, "#ef4444");
                if (combo > 1) {
                    game.floatingTexts.push({ text: `${combo}x COMBO! +${bonus}`, x: newHead.x * gs + gs / 2, y: newHead.y * gs, life: 30, color: "#fbbf24" });
                }
            }
            if (game.eaten % 3 === 0) {
                this._addWall(ctx, game);
                game.flashMsg = "New wall!"; game.flashTimer = 20;
                if (typeof SnakeFX !== "undefined") SnakeFX.shake(3);
            }
            if (game.eaten % 5 === 0) {
                this._addPortalPair(ctx, game);
                game.flashMsg = "New portal pair!"; game.flashTimer = 25;
            }
        } else {
            if (typeof SnakeFX !== "undefined" && typeof SnakeShop !== "undefined") {
                const tail = game.snake[game.snake.length - 1];
                SnakeFX.emitTrail(tail.x * gs + gs / 2, tail.y * gs + gs / 2, SnakeShop.getActiveTrail().trailColor);
            }
            game.snake.pop();
        }

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

        g.fillStyle = "#0a0a14";
        g.fillRect(0, 0, canvas.width, canvas.height);

        g.strokeStyle = "#14142a";
        g.lineWidth = 0.5;
        for (let x = 0; x <= ctx.cols; x++) {
            g.beginPath(); g.moveTo(x * gs, 0); g.lineTo(x * gs, canvas.height); g.stroke();
        }
        for (let y = 0; y <= ctx.rows; y++) {
            g.beginPath(); g.moveTo(0, y * gs); g.lineTo(canvas.width, y * gs); g.stroke();
        }

        // Walls
        game.walls.forEach(w => {
            g.fillStyle = "#6b7280";
            g.shadowColor = "#6b7280";
            g.shadowBlur = 3;
            g.fillRect(w.x * gs + 1, w.y * gs + 1, gs - 2, gs - 2);
            g.shadowBlur = 0;
            g.strokeStyle = "#4b5563";
            g.lineWidth = 1.5;
            g.beginPath();
            g.moveTo(w.x * gs + 3, w.y * gs + 3);
            g.lineTo(w.x * gs + gs - 3, w.y * gs + gs - 3);
            g.moveTo(w.x * gs + gs - 3, w.y * gs + 3);
            g.lineTo(w.x * gs + 3, w.y * gs + gs - 3);
            g.stroke();
        });

        // Portals
        const portalColors = ["#a855f7", "#06b6d4", "#f97316", "#ec4899"];
        game.portals.forEach((p, i) => {
            const col = portalColors[i % portalColors.length];
            const pulse = 0.6 + 0.4 * Math.sin(Date.now() / 200 + i);
            [p.a, p.b].forEach(pt => {
                g.fillStyle = col;
                g.globalAlpha = pulse;
                g.shadowColor = col;
                g.shadowBlur = 12;
                g.beginPath();
                g.arc(pt.x * gs + gs / 2, pt.y * gs + gs / 2, gs / 2 - 2, 0, Math.PI * 2);
                g.fill();
                g.shadowBlur = 0;
                g.globalAlpha = 1;
                g.strokeStyle = col;
                g.lineWidth = 1.5;
                g.beginPath();
                g.arc(pt.x * gs + gs / 2, pt.y * gs + gs / 2, gs / 4, 0, Math.PI * 2);
                g.stroke();
            });
        });

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

        // Snake
        const skin = (typeof SnakeShop !== "undefined") ? SnakeShop.getActiveSkin() : { color: "#c084fc", headColor: "#a855f7" };
        this._drawSnake(g, game, gs, skin);

        // Particles
        if (typeof SnakeFX !== "undefined") SnakeFX.draw(g);

        // Floating texts
        for (const ft of game.floatingTexts) {
            g.globalAlpha = ft.life / 30;
            g.fillStyle = ft.color;
            g.font = "bold 14px -apple-system, sans-serif";
            g.textAlign = "center";
            g.fillText(ft.text, ft.x, ft.y);
        }
        g.globalAlpha = 1;

        // Flash message
        if (game.flashMsg) {
            g.fillStyle = `rgba(255,255,255,${game.flashTimer / 25})`;
            g.font = "bold 16px -apple-system, sans-serif";
            g.textAlign = "center";
            g.fillText(game.flashMsg, canvas.width / 2, 25);
        }

        // Combo
        if (typeof SnakeFX !== "undefined" && SnakeFX.getCombo() > 1 && game.state === "playing") {
            g.fillStyle = "#fbbf24";
            g.font = "bold 13px -apple-system, sans-serif";
            g.textAlign = "left";
            g.fillText(`Combo: ${SnakeFX.getCombo()}x`, 8, canvas.height - 8);
        }

        g.restore();

        if (game.state === "ready") {
            this._drawOverlay(g, canvas, "Walls & Portals", "Walls block, portals teleport. Tap to play", "#c084fc");
        }
        if (game.state === "dead") {
            const coinText = game.coinsEarned > 0 ? `  (+${game.coinsEarned} coins)` : "";
            this._drawOverlay(g, canvas, "Game Over", `Score: ${game.score}${coinText}  —  Tap to retry`, "#ef4444");
        }
    },

    _drawSnake(g, game, gs, skin) {
        for (let i = game.snake.length - 1; i >= 0; i--) {
            const seg = game.snake[i];
            const alpha = Math.max(0.4, 1 - i * 0.025);
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
        g.strokeStyle = accentColor || "#c084fc";
        g.lineWidth = 2;
        g.strokeRect(canvas.width / 2 - 140, canvas.height / 2 - 50, 280, 90);
        g.textAlign = "center";
        g.fillStyle = accentColor || "#c084fc";
        g.font = "bold 26px -apple-system, sans-serif";
        g.fillText(title, canvas.width / 2, canvas.height / 2 - 12);
        g.fillStyle = "#bbb";
        g.font = "13px -apple-system, sans-serif";
        g.fillText(subtitle, canvas.width / 2, canvas.height / 2 + 18);
    },
});
