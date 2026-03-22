/**
 * Version 1 - Classic Snake
 * The original. Move, eat food, grow. Hit yourself and it's game over.
 */
SnakeVersions.register({
    number: 1,
    name: "Classic",
    description: "The original snake game — eat food, grow, don't hit yourself.",

    config: {
        gridSize: 20,
        tickRate: 150,
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
        game.state = "ready"; // ready | playing | dead
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

    onKey(key, game) {
        const dirMap = {
            ArrowUp: { x: 0, y: -1 }, w: { x: 0, y: -1 },
            ArrowDown: { x: 0, y: 1 }, s: { x: 0, y: 1 },
            ArrowLeft: { x: -1, y: 0 }, a: { x: -1, y: 0 },
            ArrowRight: { x: 1, y: 0 }, d: { x: 1, y: 0 },
        };
        if (dirMap[key]) {
            const nd = dirMap[key];
            // Prevent 180-degree turn
            if (nd.x !== -game.dir.x || nd.y !== -game.dir.y) {
                game.nextDir = nd;
            }
        }
        if (key === "Enter" && game.state === "dead") {
            return "restart";
        }
        if ((key === "Enter" || key === " ") && game.state === "ready") {
            game.state = "playing";
        }
    },

    update(ctx, game) {
        if (game.state !== "playing") return;

        game.dir = { ...game.nextDir };
        const head = game.snake[0];
        const newHead = {
            x: head.x + game.dir.x,
            y: head.y + game.dir.y,
        };

        // Wall collision — wrap around
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

        // Eat food
        if (newHead.x === game.food.x && newHead.y === game.food.y) {
            game.score += 10;
            this._placeFood(ctx, game);
        } else {
            game.snake.pop();
        }
    },

    draw(ctx, game, canvas) {
        const g = canvas.getContext("2d");
        const gs = ctx.gridSize;

        // Background
        g.fillStyle = "#111";
        g.fillRect(0, 0, canvas.width, canvas.height);

        // Grid lines (subtle)
        g.strokeStyle = "#1a1a1a";
        g.lineWidth = 0.5;
        for (let x = 0; x <= ctx.cols; x++) {
            g.beginPath(); g.moveTo(x * gs, 0); g.lineTo(x * gs, canvas.height); g.stroke();
        }
        for (let y = 0; y <= ctx.rows; y++) {
            g.beginPath(); g.moveTo(0, y * gs); g.lineTo(canvas.width, y * gs); g.stroke();
        }

        // Food
        if (game.food) {
            g.fillStyle = "#ef4444";
            g.shadowColor = "#ef4444";
            g.shadowBlur = 8;
            g.beginPath();
            g.arc(
                game.food.x * gs + gs / 2,
                game.food.y * gs + gs / 2,
                gs / 2 - 2, 0, Math.PI * 2
            );
            g.fill();
            g.shadowBlur = 0;
        }

        // Snake
        game.snake.forEach((seg, i) => {
            const brightness = Math.max(0.4, 1 - i * 0.03);
            g.fillStyle = i === 0
                ? "#4ade80"
                : `rgba(74, 222, 128, ${brightness})`;
            if (i === 0) {
                g.shadowColor = "#4ade80";
                g.shadowBlur = 6;
            }
            g.fillRect(seg.x * gs + 1, seg.y * gs + 1, gs - 2, gs - 2);
            g.shadowBlur = 0;
        });

        // Overlays
        if (game.state === "ready") {
            this._drawOverlay(g, canvas, "Classic Snake", "Tap or press Enter to play");
        }
        if (game.state === "dead") {
            this._drawOverlay(g, canvas, "Game Over", `Score: ${game.score}  —  Tap or press Enter`);
        }
    },

    _drawOverlay(g, canvas, title, subtitle) {
        g.fillStyle = "rgba(0,0,0,0.7)";
        g.fillRect(0, 0, canvas.width, canvas.height);
        g.textAlign = "center";
        g.fillStyle = "#4ade80";
        g.font = "bold 28px sans-serif";
        g.fillText(title, canvas.width / 2, canvas.height / 2 - 15);
        g.fillStyle = "#aaa";
        g.font = "14px sans-serif";
        g.fillText(subtitle, canvas.width / 2, canvas.height / 2 + 15);
    },
});
