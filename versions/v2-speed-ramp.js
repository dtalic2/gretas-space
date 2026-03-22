/**
 * Version 2 - Speed Ramp
 * Based on Classic, but the snake speeds up as you eat more food.
 * Also adds bonus food that appears temporarily for extra points.
 */
SnakeVersions.register({
    number: 2,
    name: "Speed Ramp",
    description: "Snake speeds up as you grow. Bonus food appears for limited time.",

    config: {
        gridSize: 20,
        tickRate: 160,
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
        game.bonus = null;
        game.bonusTimer = 0;
        game.score = 0;
        game.eaten = 0;
        game.currentTickRate = 160;
        game.ticksSinceBonus = 0;
        game.state = "ready";
        this._placeFood(ctx, game);
    },

    _placeFood(ctx, game) {
        const occupied = new Set(game.snake.map(s => `${s.x},${s.y}`));
        let pos;
        do {
            pos = {
                x: Math.floor(Math.random() * ctx.cols),
                y: Math.floor(Math.random() * ctx.rows),
            };
        } while (occupied.has(`${pos.x},${pos.y}`));
        game.food = pos;
    },

    _placeBonus(ctx, game) {
        const occupied = new Set(game.snake.map(s => `${s.x},${s.y}`));
        occupied.add(`${game.food.x},${game.food.y}`);
        let pos;
        do {
            pos = {
                x: Math.floor(Math.random() * ctx.cols),
                y: Math.floor(Math.random() * ctx.rows),
            };
        } while (occupied.has(`${pos.x},${pos.y}`));
        game.bonus = pos;
        game.bonusTimer = 40; // ticks until it disappears
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

        game.dir = { ...game.nextDir };
        const head = game.snake[0];
        const newHead = { x: head.x + game.dir.x, y: head.y + game.dir.y };

        // Wrap
        if (newHead.x < 0) newHead.x = ctx.cols - 1;
        if (newHead.x >= ctx.cols) newHead.x = 0;
        if (newHead.y < 0) newHead.y = ctx.rows - 1;
        if (newHead.y >= ctx.rows) newHead.y = 0;

        // Self collision
        if (game.snake.some(s => s.x === newHead.x && s.y === newHead.y)) {
            game.state = "dead";
            return;
        }

        game.snake.unshift(newHead);

        let ate = false;

        // Eat regular food
        if (newHead.x === game.food.x && newHead.y === game.food.y) {
            game.score += 10;
            game.eaten++;
            ate = true;
            this._placeFood(ctx, game);

            // Speed up every 3 food eaten (min tick rate: 60ms)
            game.currentTickRate = Math.max(60, 160 - game.eaten * 5);
            ctx.setTickRate(game.currentTickRate);
        }

        // Eat bonus food
        if (game.bonus && newHead.x === game.bonus.x && newHead.y === game.bonus.y) {
            game.score += 30;
            ate = true;
            game.bonus = null;
            game.bonusTimer = 0;
        }

        if (!ate) {
            game.snake.pop();
        }

        // Bonus timer
        if (game.bonus) {
            game.bonusTimer--;
            if (game.bonusTimer <= 0) {
                game.bonus = null;
            }
        }

        // Spawn bonus occasionally
        game.ticksSinceBonus++;
        if (!game.bonus && game.ticksSinceBonus > 30 && Math.random() < 0.03) {
            this._placeBonus(ctx, game);
            game.ticksSinceBonus = 0;
        }
    },

    draw(ctx, game, canvas) {
        const g = canvas.getContext("2d");
        const gs = ctx.gridSize;

        // Background
        g.fillStyle = "#0d1117";
        g.fillRect(0, 0, canvas.width, canvas.height);

        // Grid
        g.strokeStyle = "#161b22";
        g.lineWidth = 0.5;
        for (let x = 0; x <= ctx.cols; x++) {
            g.beginPath(); g.moveTo(x * gs, 0); g.lineTo(x * gs, canvas.height); g.stroke();
        }
        for (let y = 0; y <= ctx.rows; y++) {
            g.beginPath(); g.moveTo(0, y * gs); g.lineTo(canvas.width, y * gs); g.stroke();
        }

        // Regular food
        if (game.food) {
            g.fillStyle = "#ef4444";
            g.shadowColor = "#ef4444";
            g.shadowBlur = 8;
            g.beginPath();
            g.arc(game.food.x * gs + gs / 2, game.food.y * gs + gs / 2, gs / 2 - 2, 0, Math.PI * 2);
            g.fill();
            g.shadowBlur = 0;
        }

        // Bonus food (golden, pulsing)
        if (game.bonus) {
            const pulse = 0.7 + 0.3 * Math.sin(Date.now() / 100);
            g.fillStyle = `rgba(250, 204, 21, ${pulse})`;
            g.shadowColor = "#facc15";
            g.shadowBlur = 12;
            g.beginPath();
            g.arc(game.bonus.x * gs + gs / 2, game.bonus.y * gs + gs / 2, gs / 2 - 1, 0, Math.PI * 2);
            g.fill();
            g.shadowBlur = 0;

            // Timer indicator
            const pct = game.bonusTimer / 40;
            g.strokeStyle = "#facc15";
            g.lineWidth = 2;
            g.beginPath();
            g.arc(game.bonus.x * gs + gs / 2, game.bonus.y * gs + gs / 2, gs / 2 + 2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
            g.stroke();
        }

        // Snake
        game.snake.forEach((seg, i) => {
            const brightness = Math.max(0.35, 1 - i * 0.025);
            g.fillStyle = i === 0
                ? "#38bdf8"
                : `rgba(56, 189, 248, ${brightness})`;
            if (i === 0) { g.shadowColor = "#38bdf8"; g.shadowBlur = 6; }
            g.fillRect(seg.x * gs + 1, seg.y * gs + 1, gs - 2, gs - 2);
            g.shadowBlur = 0;
        });

        // Speed indicator
        if (game.state === "playing") {
            const speed = Math.round((1 - (game.currentTickRate - 60) / 100) * 100);
            g.fillStyle = "#555";
            g.font = "11px sans-serif";
            g.textAlign = "right";
            g.fillText(`Speed: ${speed}%`, canvas.width - 8, canvas.height - 8);
            g.textAlign = "left";
        }

        // Overlays
        if (game.state === "ready") {
            this._drawOverlay(g, canvas, "Speed Ramp", "Gets faster as you eat! Press Enter to start");
        }
        if (game.state === "dead") {
            this._drawOverlay(g, canvas, "Game Over", `Score: ${game.score}  —  Press Enter to restart`);
        }
    },

    _drawOverlay(g, canvas, title, subtitle) {
        g.fillStyle = "rgba(0,0,0,0.7)";
        g.fillRect(0, 0, canvas.width, canvas.height);
        g.textAlign = "center";
        g.fillStyle = "#38bdf8";
        g.font = "bold 28px sans-serif";
        g.fillText(title, canvas.width / 2, canvas.height / 2 - 15);
        g.fillStyle = "#aaa";
        g.font = "14px sans-serif";
        g.fillText(subtitle, canvas.width / 2, canvas.height / 2 + 15);
    },
});
