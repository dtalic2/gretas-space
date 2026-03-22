/**
 * v4 — Battle Royale
 * You vs 3 AI snakes. Last snake standing wins.
 * The arena shrinks over time. Eat food to grow. Collide with others to eliminate them.
 */
SnakeVersions.register({
    number: 4,
    name: "Battle Royale",
    description: "You vs 3 AI snakes! Arena shrinks. Last one standing wins.",
    config: { gridSize: 16, tickRate: 120, canvasWidth: 400, canvasHeight: 400 },

    init(ctx, game) {
        const cx = Math.floor(ctx.cols / 2);
        const cy = Math.floor(ctx.rows / 2);

        game.state = "ready";
        game.score = 0;
        game.ticks = 0;
        game.shrinkTimer = 0;
        game.shrinkInterval = 60; // ticks between shrinks
        game.deadZone = []; // cells outside the shrinking arena

        // Boundary: starts at edges, shrinks inward
        game.boundary = { minX: 0, minY: 0, maxX: ctx.cols - 1, maxY: ctx.rows - 1 };

        // Player snake (green)
        game.snake = [
            { x: 3, y: cy }, { x: 2, y: cy }, { x: 1, y: cy }
        ];
        game.dir = { x: 1, y: 0 };
        game.nextDir = { x: 1, y: 0 };

        // AI snakes
        game.aiSnakes = [
            {
                body: [{ x: ctx.cols - 4, y: cy }, { x: ctx.cols - 3, y: cy }, { x: ctx.cols - 2, y: cy }],
                dir: { x: -1, y: 0 }, color: "#f97316", headColor: "#ef4444", name: "Blaze", alive: true,
            },
            {
                body: [{ x: cx, y: 3 }, { x: cx, y: 2 }, { x: cx, y: 1 }],
                dir: { x: 0, y: 1 }, color: "#a855f7", headColor: "#7c3aed", name: "Phantom", alive: true,
            },
            {
                body: [{ x: cx, y: ctx.rows - 4 }, { x: cx, y: ctx.rows - 3 }, { x: cx, y: ctx.rows - 2 }],
                dir: { x: 0, y: -1 }, color: "#38bdf8", headColor: "#0284c7", name: "Frost", alive: true,
            },
        ];

        // Multiple food items
        game.food = [];
        for (let i = 0; i < 4; i++) {
            this._placeFood(ctx, game);
        }

        game.killMsg = null;
        game.killTimer = 0;
        game.playerAlive = true;
        game.winner = null;
    },

    _placeFood(ctx, game) {
        const occ = this._occupied(game);
        for (let tries = 0; tries < 300; tries++) {
            const x = game.boundary.minX + Math.floor(Math.random() * (game.boundary.maxX - game.boundary.minX + 1));
            const y = game.boundary.minY + Math.floor(Math.random() * (game.boundary.maxY - game.boundary.minY + 1));
            const key = `${x},${y}`;
            if (!occ.has(key)) {
                game.food.push({ x, y });
                occ.add(key);
                return;
            }
        }
    },

    _occupied(game) {
        const s = new Set();
        game.snake.forEach(p => s.add(`${p.x},${p.y}`));
        game.aiSnakes.forEach(ai => {
            if (ai.alive) ai.body.forEach(p => s.add(`${p.x},${p.y}`));
        });
        game.food.forEach(f => s.add(`${f.x},${f.y}`));
        game.deadZone.forEach(d => s.add(`${d.x},${d.y}`));
        return s;
    },

    _inBounds(x, y, game) {
        return x >= game.boundary.minX && x <= game.boundary.maxX &&
               y >= game.boundary.minY && y <= game.boundary.maxY;
    },

    _aiThink(ai, game, ctx) {
        const head = ai.body[0];
        // Simple AI: chase nearest food, avoid walls and other snakes
        let bestDir = ai.dir;
        let bestScore = -Infinity;

        const dirs = [
            { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }
        ];

        // Don't reverse
        const filteredDirs = dirs.filter(d => !(d.x === -ai.dir.x && d.y === -ai.dir.y));

        // Build danger set
        const danger = new Set();
        game.snake.forEach(p => danger.add(`${p.x},${p.y}`));
        game.aiSnakes.forEach(other => {
            if (other !== ai && other.alive) other.body.forEach(p => danger.add(`${p.x},${p.y}`));
        });
        // Add own body
        ai.body.forEach((p, i) => { if (i > 0) danger.add(`${p.x},${p.y}`); });

        for (const d of filteredDirs) {
            const nx = head.x + d.x;
            const ny = head.y + d.y;

            // Out of bounds = death
            if (!this._inBounds(nx, ny, game)) continue;
            // Collision = death
            if (danger.has(`${nx},${ny}`)) continue;

            let score = 0;

            // Prefer heading toward nearest food
            let minFoodDist = Infinity;
            for (const f of game.food) {
                const dist = Math.abs(f.x - nx) + Math.abs(f.y - ny);
                if (dist < minFoodDist) minFoodDist = dist;
            }
            score -= minFoodDist;

            // Prefer center (avoid boundary)
            const cx = (game.boundary.minX + game.boundary.maxX) / 2;
            const cy = (game.boundary.minY + game.boundary.maxY) / 2;
            score -= Math.abs(nx - cx) * 0.1 + Math.abs(ny - cy) * 0.1;

            // Small random to break ties
            score += Math.random() * 0.5;

            // If shorter than player, avoid player head
            if (ai.body.length <= game.snake.length) {
                const pdist = Math.abs(game.snake[0].x - nx) + Math.abs(game.snake[0].y - ny);
                if (pdist <= 2) score -= 5;
            }

            if (score > bestScore) {
                bestScore = score;
                bestDir = d;
            }
        }

        ai.dir = bestDir;
    },

    update(ctx, game) {
        if (game.state !== "playing") return;
        game.ticks++;

        // Shrink arena
        game.shrinkTimer++;
        if (game.shrinkTimer >= game.shrinkInterval) {
            game.shrinkTimer = 0;
            this._shrinkArena(ctx, game);
        }

        // Update kill message timer
        if (game.killTimer > 0) game.killTimer--;

        // ─── Move player ───
        if (game.playerAlive) {
            game.dir = { ...game.nextDir };
            const head = { x: game.snake[0].x + game.dir.x, y: game.snake[0].y + game.dir.y };

            // Check boundary death
            if (!this._inBounds(head.x, head.y, game)) {
                game.playerAlive = false;
                if (typeof SnakeFX !== "undefined") {
                    SnakeFX.shake(12);
                    SnakeFX.emit(game.snake[0].x * ctx.gridSize + ctx.gridSize / 2,
                                 game.snake[0].y * ctx.gridSize + ctx.gridSize / 2,
                                 20, "#4ade80");
                }
            } else {
                game.snake.unshift(head);

                // Self collision
                for (let i = 1; i < game.snake.length; i++) {
                    if (head.x === game.snake[i].x && head.y === game.snake[i].y) {
                        game.playerAlive = false;
                        if (typeof SnakeFX !== "undefined") SnakeFX.shake(12);
                        break;
                    }
                }

                // AI collision
                if (game.playerAlive) {
                    for (const ai of game.aiSnakes) {
                        if (!ai.alive) continue;
                        for (let i = 0; i < ai.body.length; i++) {
                            if (head.x === ai.body[i].x && head.y === ai.body[i].y) {
                                if (i === 0) {
                                    // Head-on: longer wins
                                    if (game.snake.length > ai.body.length) {
                                        ai.alive = false;
                                        game.score += 50;
                                        game.killMsg = `Eliminated ${ai.name}!`;
                                        game.killTimer = 40;
                                        if (typeof SnakeFX !== "undefined") {
                                            SnakeFX.emit(head.x * ctx.gridSize, head.y * ctx.gridSize, 25, ai.color);
                                        }
                                    } else {
                                        game.playerAlive = false;
                                        if (typeof SnakeFX !== "undefined") SnakeFX.shake(12);
                                    }
                                } else {
                                    // Hit AI body = player dies
                                    game.playerAlive = false;
                                    if (typeof SnakeFX !== "undefined") SnakeFX.shake(12);
                                }
                                break;
                            }
                        }
                        if (!game.playerAlive) break;
                    }
                }

                // Food
                if (game.playerAlive) {
                    let ate = false;
                    game.food = game.food.filter(f => {
                        if (f.x === head.x && f.y === head.y) {
                            game.score += 10;
                            ate = true;
                            if (typeof SnakeFX !== "undefined") {
                                SnakeFX.emit(head.x * ctx.gridSize + ctx.gridSize / 2,
                                             head.y * ctx.gridSize + ctx.gridSize / 2,
                                             8, "#ef4444");
                                SnakeFX.onEat();
                            }
                            return false;
                        }
                        return true;
                    });
                    if (!ate) game.snake.pop();
                    if (ate) this._placeFood(ctx, game);
                }
            }
        }

        // ─── Move AI snakes ───
        for (const ai of game.aiSnakes) {
            if (!ai.alive) continue;
            this._aiThink(ai, game, ctx);
            const head = { x: ai.body[0].x + ai.dir.x, y: ai.body[0].y + ai.dir.y };

            // Boundary
            if (!this._inBounds(head.x, head.y, game)) {
                ai.alive = false;
                game.score += 25;
                game.killMsg = `${ai.name} hit the wall!`;
                game.killTimer = 40;
                if (typeof SnakeFX !== "undefined") SnakeFX.emit(ai.body[0].x * ctx.gridSize, ai.body[0].y * ctx.gridSize, 15, ai.color);
                continue;
            }

            ai.body.unshift(head);

            // Self collision
            let selfDead = false;
            for (let i = 1; i < ai.body.length; i++) {
                if (head.x === ai.body[i].x && head.y === ai.body[i].y) {
                    selfDead = true; break;
                }
            }

            // Collide with player
            if (!selfDead && game.playerAlive) {
                for (let i = 0; i < game.snake.length; i++) {
                    if (head.x === game.snake[i].x && head.y === game.snake[i].y) {
                        if (i === 0) {
                            // Head-on
                            if (ai.body.length > game.snake.length) {
                                game.playerAlive = false;
                                if (typeof SnakeFX !== "undefined") SnakeFX.shake(12);
                            } else {
                                selfDead = true;
                                game.score += 50;
                                game.killMsg = `Eliminated ${ai.name}!`;
                                game.killTimer = 40;
                            }
                        } else {
                            // AI hits player body
                            selfDead = true;
                            game.score += 50;
                            game.killMsg = `${ai.name} ran into you!`;
                            game.killTimer = 40;
                        }
                        break;
                    }
                }
            }

            // Collide with other AI
            if (!selfDead) {
                for (const other of game.aiSnakes) {
                    if (other === ai || !other.alive) continue;
                    for (const seg of other.body) {
                        if (head.x === seg.x && head.y === seg.y) {
                            selfDead = true;
                            game.killMsg = `${ai.name} eliminated!`;
                            game.killTimer = 40;
                            break;
                        }
                    }
                    if (selfDead) break;
                }
            }

            if (selfDead) {
                ai.alive = false;
                game.score += 25;
                if (typeof SnakeFX !== "undefined") SnakeFX.emit(head.x * ctx.gridSize, head.y * ctx.gridSize, 15, ai.color);
                continue;
            }

            // Food
            let ateFood = false;
            game.food = game.food.filter(f => {
                if (f.x === head.x && f.y === head.y) { ateFood = true; return false; }
                return true;
            });
            if (!ateFood) ai.body.pop();
            if (ateFood) this._placeFood(ctx, game);
        }

        // ─── Check win/lose ───
        const aliveAI = game.aiSnakes.filter(a => a.alive).length;
        if (!game.playerAlive) {
            game.state = "dead";
            game.winner = aliveAI > 0 ? game.aiSnakes.find(a => a.alive)?.name || "AI" : "Nobody";
        } else if (aliveAI === 0) {
            game.state = "dead";
            game.winner = "You";
            game.score += 100;
        }

        // Ensure enough food
        while (game.food.length < 3) this._placeFood(ctx, game);

        // FX update
        if (typeof SnakeFX !== "undefined") SnakeFX.update();
    },

    _shrinkArena(ctx, game) {
        const b = game.boundary;
        // Pick a random side to shrink
        const sides = [];
        if (b.maxX - b.minX > 6) { sides.push("left", "right"); }
        if (b.maxY - b.minY > 6) { sides.push("top", "bottom"); }
        if (sides.length === 0) return;

        const side = sides[Math.floor(Math.random() * sides.length)];
        switch (side) {
            case "left":
                for (let y = b.minY; y <= b.maxY; y++) game.deadZone.push({ x: b.minX, y });
                b.minX++;
                break;
            case "right":
                for (let y = b.minY; y <= b.maxY; y++) game.deadZone.push({ x: b.maxX, y });
                b.maxX--;
                break;
            case "top":
                for (let x = b.minX; x <= b.maxX; x++) game.deadZone.push({ x, y: b.minY });
                b.minY++;
                break;
            case "bottom":
                for (let x = b.minX; x <= b.maxX; x++) game.deadZone.push({ x, y: b.maxY });
                b.maxY--;
                break;
        }

        // Remove food outside boundary
        game.food = game.food.filter(f => this._inBounds(f.x, f.y, game));

        // Flash effect
        if (typeof SnakeFX !== "undefined") SnakeFX.shake(4);
    },

    draw(ctx, game, canvas) {
        const g = canvas.getContext("2d");
        const gs = ctx.gridSize;

        g.save();
        if (typeof SnakeFX !== "undefined") SnakeFX.applyShake(g);

        // Background
        g.fillStyle = "#0a0f1a";
        g.fillRect(0, 0, canvas.width, canvas.height);

        // Dead zone (shrunk area)
        g.fillStyle = "#1a0a0a";
        for (const d of game.deadZone) {
            g.fillRect(d.x * gs, d.y * gs, gs, gs);
        }

        // Arena boundary glow
        const b = game.boundary;
        g.strokeStyle = "#ef444488";
        g.lineWidth = 2;
        g.strokeRect(b.minX * gs, b.minY * gs, (b.maxX - b.minX + 1) * gs, (b.maxY - b.minY + 1) * gs);

        // Pulsing boundary warning
        const pulse = 0.3 + 0.2 * Math.sin(Date.now() / 300);
        g.strokeStyle = `rgba(239, 68, 68, ${pulse})`;
        g.lineWidth = 1;
        g.strokeRect(b.minX * gs - 1, b.minY * gs - 1, (b.maxX - b.minX + 1) * gs + 2, (b.maxY - b.minY + 1) * gs + 2);

        // Grid inside arena
        g.strokeStyle = "#111827";
        g.lineWidth = 0.5;
        for (let x = b.minX; x <= b.maxX + 1; x++) {
            g.beginPath(); g.moveTo(x * gs, b.minY * gs); g.lineTo(x * gs, (b.maxY + 1) * gs); g.stroke();
        }
        for (let y = b.minY; y <= b.maxY + 1; y++) {
            g.beginPath(); g.moveTo(b.minX * gs, y * gs); g.lineTo((b.maxX + 1) * gs, y * gs); g.stroke();
        }

        // Food
        for (const f of game.food) {
            const fx = f.x * gs + gs / 2;
            const fy = f.y * gs + gs / 2;
            const p = 0.8 + 0.2 * Math.sin(Date.now() / 200 + f.x + f.y);
            g.shadowColor = "#ef4444";
            g.shadowBlur = 8 * p;
            g.fillStyle = "#ef4444";
            g.beginPath();
            g.arc(fx, fy, gs * 0.35 * p, 0, Math.PI * 2);
            g.fill();
            g.shadowBlur = 0;
        }

        // Get equipped skin
        const skin = (typeof SnakeShop !== "undefined") ? SnakeShop.getActiveSkin() : { color: "#4ade80", headColor: "#22c55e" };
        const trail = (typeof SnakeShop !== "undefined") ? SnakeShop.getActiveTrail() : { trailColor: null };

        // AI Snakes
        for (const ai of game.aiSnakes) {
            if (!ai.alive) continue;
            for (let i = ai.body.length - 1; i >= 0; i--) {
                const seg = ai.body[i];
                const alpha = 1 - (i / ai.body.length) * 0.5;
                g.globalAlpha = alpha;
                g.fillStyle = i === 0 ? ai.headColor : ai.color;
                if (i === 0) {
                    g.shadowColor = ai.headColor;
                    g.shadowBlur = 6;
                }
                g.fillRect(seg.x * gs + 1, seg.y * gs + 1, gs - 2, gs - 2);
                if (i === 0) {
                    // Eyes
                    g.shadowBlur = 0;
                    g.fillStyle = "#fff";
                    g.fillRect(seg.x * gs + 3, seg.y * gs + 3, 4, 4);
                    g.fillRect(seg.x * gs + gs - 7, seg.y * gs + 3, 4, 4);
                    g.fillStyle = "#000";
                    g.fillRect(seg.x * gs + 4 + ai.dir.x, seg.y * gs + 4 + ai.dir.y, 2, 2);
                    g.fillRect(seg.x * gs + gs - 6 + ai.dir.x, seg.y * gs + 4 + ai.dir.y, 2, 2);
                }
            }
            g.globalAlpha = 1;
            g.shadowBlur = 0;
        }

        // Player snake
        if (game.playerAlive || game.state === "dead") {
            const snakeAlpha = game.playerAlive ? 1 : 0.4;
            for (let i = game.snake.length - 1; i >= 0; i--) {
                const seg = game.snake[i];
                const alpha = snakeAlpha * (1 - (i / game.snake.length) * 0.4);
                g.globalAlpha = alpha;

                let fillColor;
                if (skin.color === "rainbow" && typeof SnakeShop !== "undefined") {
                    fillColor = SnakeShop.getRainbowColor(i, game.snake.length);
                } else {
                    fillColor = i === 0 ? skin.headColor : skin.color;
                }

                g.fillStyle = fillColor;
                if (i === 0) {
                    g.shadowColor = skin.headColor;
                    g.shadowBlur = 8;
                }
                g.fillRect(seg.x * gs + 1, seg.y * gs + 1, gs - 2, gs - 2);
                if (i === 0) {
                    g.shadowBlur = 0;
                    g.fillStyle = "#fff";
                    g.fillRect(seg.x * gs + 2, seg.y * gs + 2, 4, 4);
                    g.fillRect(seg.x * gs + gs - 6, seg.y * gs + 2, 4, 4);
                    g.fillStyle = "#000";
                    g.fillRect(seg.x * gs + 3 + game.dir.x, seg.y * gs + 3 + game.dir.y, 2, 2);
                    g.fillRect(seg.x * gs + gs - 5 + game.dir.x, seg.y * gs + 3 + game.dir.y, 2, 2);
                }

                // Trail particles
                if (i === game.snake.length - 1 && trail.trailColor && typeof SnakeFX !== "undefined") {
                    SnakeFX.emitTrail(seg.x * gs + gs / 2, seg.y * gs + gs / 2, trail.trailColor);
                }
            }
            g.globalAlpha = 1;
            g.shadowBlur = 0;
        }

        // Particles
        if (typeof SnakeFX !== "undefined") SnakeFX.draw(g);

        // Alive count HUD
        const aliveCount = game.aiSnakes.filter(a => a.alive).length + (game.playerAlive ? 1 : 0);
        g.fillStyle = "#fff";
        g.font = "bold 12px -apple-system, sans-serif";
        g.textAlign = "left";
        g.fillText(`Alive: ${aliveCount}/4`, b.minX * gs + 6, b.minY * gs + 16);

        // Shrink warning
        const shrinkPct = Math.floor((game.shrinkTimer / game.shrinkInterval) * 100);
        if (shrinkPct > 70) {
            const warn = 0.5 + 0.5 * Math.sin(Date.now() / 150);
            g.fillStyle = `rgba(239, 68, 68, ${warn})`;
            g.font = "bold 11px -apple-system, sans-serif";
            g.textAlign = "center";
            g.fillText("ARENA SHRINKING", canvas.width / 2, b.minY * gs + 16);
        }

        // Kill message
        if (game.killTimer > 0 && game.killMsg) {
            const alpha = Math.min(1, game.killTimer / 15);
            g.globalAlpha = alpha;
            g.fillStyle = "#fbbf24";
            g.font = "bold 16px -apple-system, sans-serif";
            g.textAlign = "center";
            g.fillText(game.killMsg, canvas.width / 2, canvas.height / 2 - 40);
            g.globalAlpha = 1;
        }

        g.restore();

        // Overlays
        if (game.state === "ready") {
            this._drawOverlay(g, canvas, "Battle Royale", "You vs 3 AI snakes. Tap to play!");
        }
        if (game.state === "dead") {
            const msg = game.winner === "You"
                ? `YOU WIN! Score: ${game.score}`
                : `${game.winner} wins. Score: ${game.score}`;
            this._drawOverlay(g, canvas, "Game Over", msg + "  —  Tap to retry");
        }
    },

    _drawOverlay(g, canvas, title, subtitle) {
        g.fillStyle = "rgba(0, 0, 0, 0.75)";
        g.fillRect(0, 0, canvas.width, canvas.height);
        g.fillStyle = "#fff";
        g.font = "bold 28px -apple-system, sans-serif";
        g.textAlign = "center";
        g.fillText(title, canvas.width / 2, canvas.height / 2 - 15);
        g.font = "14px -apple-system, sans-serif";
        g.fillStyle = "#aaa";
        g.fillText(subtitle, canvas.width / 2, canvas.height / 2 + 15);
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
            if (nd.x !== -game.dir.x || nd.y !== -game.dir.y) {
                game.nextDir = nd;
            }
        }
        if (key === "Enter" && game.state === "dead") return "restart";
        if ((key === "Enter" || key === " ") && game.state === "ready") game.state = "playing";
    },
});
