/**
 * Version 3 - Walls & Portals
 * Walls block your path. Portal pairs teleport you across the map.
 * Walls appear as you score, portals spawn randomly.
 */
SnakeVersions.register({
    number: 3,
    name: "Walls & Portals",
    description: "Obstacles appear as you grow. Portal pairs teleport you across the board.",

    config: {
        gridSize: 20,
        tickRate: 140,
    },

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
        game.portals = []; // pairs: [{a:{x,y}, b:{x,y}}, ...]
        game.state = "ready";
        game.flashMsg = null;
        game.flashTimer = 0;
        this._placeFood(ctx, game);
    },

    _occupied(game) {
        const set = new Set(game.snake.map(s => `${s.x},${s.y}`));
        if (game.food) set.add(`${game.food.x},${game.food.y}`);
        game.walls.forEach(w => set.add(`${w.x},${w.y}`));
        game.portals.forEach(p => {
            set.add(`${p.a.x},${p.a.y}`);
            set.add(`${p.b.x},${p.b.y}`);
        });
        return set;
    },

    _randomFree(ctx, game) {
        const occ = this._occupied(game);
        let pos, tries = 0;
        do {
            pos = {
                x: Math.floor(Math.random() * ctx.cols),
                y: Math.floor(Math.random() * ctx.rows),
            };
            tries++;
        } while (occ.has(`${pos.x},${pos.y}`) && tries < 500);
        return pos;
    },

    _placeFood(ctx, game) {
        game.food = this._randomFree(ctx, game);
    },

    _addWall(ctx, game) {
        const pos = this._randomFree(ctx, game);
        game.walls.push(pos);
    },

    _addPortalPair(ctx, game) {
        const a = this._randomFree(ctx, game);
        game.walls.push(a); // temporarily mark occupied
        const b = this._randomFree(ctx, game);
        game.walls.pop(); // remove temp
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
            if (nd.x !== -game.dir.x || nd.y !== -game.dir.y) {
                game.nextDir = nd;
            }
        }
        if (key === "Enter" && game.state === "dead") return "restart";
        if ((key === "Enter" || key === " ") && game.state === "ready") game.state = "playing";
    },

    update(ctx, game) {
        if (game.state !== "playing") return;

        if (game.flashTimer > 0) game.flashTimer--;
        if (game.flashTimer === 0) game.flashMsg = null;

        game.dir = { ...game.nextDir };
        const head = game.snake[0];
        let newHead = { x: head.x + game.dir.x, y: head.y + game.dir.y };

        // Wrap
        if (newHead.x < 0) newHead.x = ctx.cols - 1;
        if (newHead.x >= ctx.cols) newHead.x = 0;
        if (newHead.y < 0) newHead.y = ctx.rows - 1;
        if (newHead.y >= ctx.rows) newHead.y = 0;

        // Wall collision
        if (game.walls.some(w => w.x === newHead.x && w.y === newHead.y)) {
            game.state = "dead";
            return;
        }

        // Self collision
        if (game.snake.some(s => s.x === newHead.x && s.y === newHead.y)) {
            game.state = "dead";
            return;
        }

        // Portal check
        for (const portal of game.portals) {
            if (newHead.x === portal.a.x && newHead.y === portal.a.y) {
                newHead = { x: portal.b.x, y: portal.b.y };
                game.flashMsg = "Teleported!";
                game.flashTimer = 15;
                break;
            }
            if (newHead.x === portal.b.x && newHead.y === portal.b.y) {
                newHead = { x: portal.a.x, y: portal.a.y };
                game.flashMsg = "Teleported!";
                game.flashTimer = 15;
                break;
            }
        }

        game.snake.unshift(newHead);

        // Eat food
        if (newHead.x === game.food.x && newHead.y === game.food.y) {
            game.score += 10;
            game.eaten++;
            this._placeFood(ctx, game);

            // Add wall every 3 food
            if (game.eaten % 3 === 0) {
                this._addWall(ctx, game);
                game.flashMsg = "New wall!";
                game.flashTimer = 20;
            }

            // Add portal pair every 5 food
            if (game.eaten % 5 === 0) {
                this._addPortalPair(ctx, game);
                game.flashMsg = "New portal pair!";
                game.flashTimer = 25;
            }
        } else {
            game.snake.pop();
        }
    },

    draw(ctx, game, canvas) {
        const g = canvas.getContext("2d");
        const gs = ctx.gridSize;

        // Background
        g.fillStyle = "#0f0f17";
        g.fillRect(0, 0, canvas.width, canvas.height);

        // Grid
        g.strokeStyle = "#18182a";
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
            // Cross pattern
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
                g.shadowBlur = 10;
                g.beginPath();
                g.arc(pt.x * gs + gs / 2, pt.y * gs + gs / 2, gs / 2 - 2, 0, Math.PI * 2);
                g.fill();
                g.shadowBlur = 0;
                g.globalAlpha = 1;

                // Inner ring
                g.strokeStyle = col;
                g.lineWidth = 1.5;
                g.beginPath();
                g.arc(pt.x * gs + gs / 2, pt.y * gs + gs / 2, gs / 4, 0, Math.PI * 2);
                g.stroke();
            });
        });

        // Food
        if (game.food) {
            g.fillStyle = "#ef4444";
            g.shadowColor = "#ef4444";
            g.shadowBlur = 8;
            g.beginPath();
            g.arc(game.food.x * gs + gs / 2, game.food.y * gs + gs / 2, gs / 2 - 2, 0, Math.PI * 2);
            g.fill();
            g.shadowBlur = 0;
        }

        // Snake
        game.snake.forEach((seg, i) => {
            const brightness = Math.max(0.35, 1 - i * 0.025);
            g.fillStyle = i === 0
                ? "#c084fc"
                : `rgba(192, 132, 252, ${brightness})`;
            if (i === 0) { g.shadowColor = "#c084fc"; g.shadowBlur = 6; }
            g.fillRect(seg.x * gs + 1, seg.y * gs + 1, gs - 2, gs - 2);
            g.shadowBlur = 0;
        });

        // Flash message
        if (game.flashMsg) {
            g.fillStyle = `rgba(255,255,255,${game.flashTimer / 25})`;
            g.font = "bold 16px sans-serif";
            g.textAlign = "center";
            g.fillText(game.flashMsg, canvas.width / 2, 25);
            g.textAlign = "left";
        }

        // Overlays
        if (game.state === "ready") {
            this._drawOverlay(g, canvas, "Walls & Portals", "Walls block, portals teleport. Press Enter to start");
        }
        if (game.state === "dead") {
            this._drawOverlay(g, canvas, "Game Over", `Score: ${game.score}  —  Press Enter to restart`);
        }
    },

    _drawOverlay(g, canvas, title, subtitle) {
        g.fillStyle = "rgba(0,0,0,0.7)";
        g.fillRect(0, 0, canvas.width, canvas.height);
        g.textAlign = "center";
        g.fillStyle = "#c084fc";
        g.font = "bold 28px sans-serif";
        g.fillText(title, canvas.width / 2, canvas.height / 2 - 15);
        g.fillStyle = "#aaa";
        g.font = "14px sans-serif";
        g.fillText(subtitle, canvas.width / 2, canvas.height / 2 + 15);
    },
});
