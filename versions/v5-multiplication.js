/**
 * v5 — Snake Clash MULTIPLICATION
 * A math-powered snake game. A multiplication problem appears at the top of the
 * arena. Three numbered food items appear on the grid — one is the correct answer,
 * two are wrong. Eat the right one to earn points and build a streak multiplier.
 * Miss and your multiplier resets. Chain correct answers to make the snake faster
 * and your score multiply!
 */
SnakeVersions.register({
    number: 5,
    name: "Multiplication",
    description: "Eat the correct answer! Build a streak for massive score multipliers.",
    config: { gridSize: 20, tickRate: 150, canvasWidth: 400, canvasHeight: 400 },

    init(ctx, game) {
        const cx = Math.floor(ctx.cols / 2);
        const cy = Math.floor(ctx.rows / 2);

        game.state      = "ready";
        game.score      = 0;
        game.coinsEarned = 0;
        game.streak     = 0;
        game.bestStreak = 0;
        game.multiplier = 1;
        game.ticks      = 0;

        game.snake   = [{ x: cx, y: cy }, { x: cx - 1, y: cy }, { x: cx - 2, y: cy }];
        game.dir     = { x: 1, y: 0 };
        game.nextDir = { x: 1, y: 0 };

        game.problem      = null;
        game.food         = [];
        game.feedbackMsg  = null;
        game.feedbackTimer = 0;

        ctx.setTickRate(150);
        this._newProblem(ctx, game);
    },

    // ── Generate a new problem and place 3 food items ──────────────────────────
    _newProblem(ctx, game) {
        // Scale factor range with streak (starts 2-3, reaches 2-12 around streak 36)
        const maxFactor = Math.min(12, 3 + Math.floor(game.streak / 4));
        const a = 2 + Math.floor(Math.random() * (maxFactor - 1));
        const b = 2 + Math.floor(Math.random() * (maxFactor - 1));
        const answer = a * b;
        game.problem = { a, b, answer };

        // Generate 2 distinct wrong answers near the correct one
        const wrongSet = new Set();
        let attempts = 0;
        while (wrongSet.size < 2 && attempts < 60) {
            attempts++;
            const offset = 1 + Math.floor(Math.random() * Math.min(12, answer));
            const candidate = Math.random() < 0.5
                ? answer + offset
                : Math.max(2, answer - offset);
            if (candidate !== answer && !wrongSet.has(candidate)) wrongSet.add(candidate);
        }
        // Hard fallback
        if (wrongSet.size < 2) wrongSet.add(wrongSet.has(answer + 1) ? answer + 2 : answer + 1);

        // Shuffle [answer, wrong1, wrong2]
        const values = [answer, ...[...wrongSet]];
        for (let i = values.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [values[i], values[j]] = [values[j], values[i]];
        }

        // Place food avoiding the snake and the top 2 rows (reserved for the problem)
        const occupied = new Set(game.snake.map(s => `${s.x},${s.y}`));
        game.food = [];
        for (const val of values) {
            for (let tries = 0; tries < 300; tries++) {
                const x = Math.floor(Math.random() * ctx.cols);
                const y = 2 + Math.floor(Math.random() * (ctx.rows - 2));
                const key = `${x},${y}`;
                if (!occupied.has(key)) {
                    game.food.push({ x, y, value: val, correct: val === answer });
                    occupied.add(key);
                    break;
                }
            }
        }
    },

    // ── Game tick ──────────────────────────────────────────────────────────────
    update(ctx, game) {
        if (game.state !== "playing") return;
        game.ticks++;

        if (game.feedbackTimer > 0) game.feedbackTimer--;

        // Move snake (wrapping edges)
        game.dir = { ...game.nextDir };
        const head = {
            x: (game.snake[0].x + game.dir.x + ctx.cols) % ctx.cols,
            y: (game.snake[0].y + game.dir.y + ctx.rows) % ctx.rows,
        };
        game.snake.unshift(head);

        // Self collision
        for (let i = 1; i < game.snake.length; i++) {
            if (head.x === game.snake[i].x && head.y === game.snake[i].y) {
                game.snake.pop();
                game.state = "dead";
                if (typeof SnakeFX !== "undefined") {
                    SnakeFX.shake(15);
                    SnakeFX.emit(
                        head.x * ctx.gridSize + ctx.gridSize / 2,
                        head.y * ctx.gridSize + ctx.gridSize / 2,
                        20, "#ef4444"
                    );
                }
                return;
            }
        }

        // Food collision
        const ateIdx = game.food.findIndex(f => f.x === head.x && f.y === head.y);
        if (ateIdx !== -1) {
            const ateFood = game.food[ateIdx];

            if (ateFood.correct) {
                // Correct answer!
                game.streak++;
                if (game.streak > game.bestStreak) game.bestStreak = game.streak;
                game.multiplier = game.streak;

                const pts = game.problem.answer * game.multiplier;
                game.score += pts;
                game.coinsEarned = Math.floor(game.score / 4);

                game.feedbackMsg  = `+${pts} pts  (x${game.multiplier})`;
                game.feedbackTimer = 50;

                // Speed up with streak (cap at 80ms tick rate)
                ctx.setTickRate(Math.max(80, 150 - game.streak * 6));

                if (typeof SnakeFX !== "undefined") {
                    SnakeFX.emit(
                        head.x * ctx.gridSize + ctx.gridSize / 2,
                        head.y * ctx.gridSize + ctx.gridSize / 2,
                        14, "#4ade80"
                    );
                    SnakeFX.onEat();
                }
            } else {
                // Wrong answer — reset streak
                game.streak     = 0;
                game.multiplier = 1;
                game.feedbackMsg  = `Wrong!  ans: ${game.problem.answer}`;
                game.feedbackTimer = 60;

                ctx.setTickRate(150); // reset speed

                if (typeof SnakeFX !== "undefined") {
                    SnakeFX.shake(8);
                    SnakeFX.emit(
                        head.x * ctx.gridSize + ctx.gridSize / 2,
                        head.y * ctx.gridSize + ctx.gridSize / 2,
                        10, "#ef4444"
                    );
                }
            }

            // Snake grows whenever any food is eaten (don't pop tail)
            this._newProblem(ctx, game);
        } else {
            game.snake.pop();
        }

        if (typeof SnakeFX !== "undefined") SnakeFX.update();
    },

    // ── Draw ───────────────────────────────────────────────────────────────────
    draw(ctx, game, canvas) {
        const g  = canvas.getContext("2d");
        const gs = ctx.gridSize;

        g.save();
        if (typeof SnakeFX !== "undefined") SnakeFX.applyShake(g);

        // Background
        g.fillStyle = "#060b18";
        g.fillRect(0, 0, canvas.width, canvas.height);

        // Subtle grid (only below header area)
        g.strokeStyle = "#0d1428";
        g.lineWidth   = 0.5;
        for (let x = 0; x <= ctx.cols; x++) {
            g.beginPath();
            g.moveTo(x * gs, gs * 2);
            g.lineTo(x * gs, canvas.height);
            g.stroke();
        }
        for (let y = 2; y <= ctx.rows; y++) {
            g.beginPath();
            g.moveTo(0, y * gs);
            g.lineTo(canvas.width, y * gs);
            g.stroke();
        }

        // ── Problem header (top 2 rows) ──────────────────────────
        if (game.problem && game.state === "playing") {
            g.fillStyle = "rgba(0, 5, 20, 0.92)";
            g.fillRect(0, 0, canvas.width, gs * 2);

            // Bottom border of header
            g.strokeStyle = "#1e3a5f";
            g.lineWidth   = 1;
            g.beginPath();
            g.moveTo(0, gs * 2);
            g.lineTo(canvas.width, gs * 2);
            g.stroke();

            // Math problem
            g.fillStyle     = "#f0f6ff";
            g.font          = `bold ${Math.round(gs * 1.1)}px -apple-system, monospace`;
            g.textAlign     = "center";
            g.textBaseline  = "middle";
            g.shadowColor   = "#3b82f6";
            g.shadowBlur    = 12;
            g.fillText(
                `${game.problem.a}  x  ${game.problem.b}  =  ?`,
                canvas.width / 2,
                gs * 1.0
            );
            g.shadowBlur = 0;

            // Streak / multiplier badge (right side of header)
            if (game.streak > 0) {
                g.textAlign    = "right";
                g.font         = `bold 11px -apple-system, sans-serif`;
                g.fillStyle    = "#fbbf24";
                g.shadowColor  = "#fbbf24";
                g.shadowBlur   = 6;
                g.fillText(`x${game.multiplier}  streak ${game.streak}`, canvas.width - 8, gs * 1.0);
                g.shadowBlur = 0;
            }
        }

        // ── Food items ───────────────────────────────────────────
        for (const f of game.food) {
            const fx    = f.x * gs + gs / 2;
            const fy    = f.y * gs + gs / 2;
            const pulse = 0.88 + 0.12 * Math.sin(Date.now() / 500 + f.x * 0.8 + f.y * 0.5);
            const r     = gs * 0.44 * pulse;

            // Outer glow
            g.shadowColor = "#475569";
            g.shadowBlur  = 10;

            // Circle fill
            g.beginPath();
            g.arc(fx, fy, r, 0, Math.PI * 2);
            g.fillStyle = "#0f172a";
            g.fill();

            // Circle border
            g.strokeStyle = "#64748b";
            g.lineWidth   = 1.5;
            g.stroke();
            g.shadowBlur = 0;

            // Number label
            const numStr   = String(f.value);
            const fontSize = numStr.length > 2
                ? Math.round(gs * 0.44)
                : Math.round(gs * 0.56);

            g.fillStyle    = "#e2e8f0";
            g.font         = `bold ${fontSize}px -apple-system, monospace`;
            g.textAlign    = "center";
            g.textBaseline = "middle";
            g.fillText(numStr, fx, fy);
        }

        // ── Snake ────────────────────────────────────────────────
        const skin  = (typeof SnakeShop !== "undefined") ? SnakeShop.getActiveSkin()  : { color: "#4ade80", headColor: "#22c55e" };
        const trail = (typeof SnakeShop !== "undefined") ? SnakeShop.getActiveTrail() : { trailColor: null };

        for (let i = game.snake.length - 1; i >= 0; i--) {
            const seg   = game.snake[i];
            const alpha = 1 - (i / game.snake.length) * 0.45;
            g.globalAlpha = alpha;

            let fillColor;
            if (skin.color === "rainbow" && typeof SnakeShop !== "undefined") {
                fillColor = SnakeShop.getRainbowColor(i, game.snake.length);
            } else {
                fillColor = i === 0 ? skin.headColor : skin.color;
            }

            g.fillStyle = fillColor;
            if (i === 0) { g.shadowColor = skin.headColor; g.shadowBlur = 8; }
            g.fillRect(seg.x * gs + 1, seg.y * gs + 1, gs - 2, gs - 2);

            if (i === 0) {
                g.shadowBlur = 0;
                // Eyes
                g.fillStyle = "#fff";
                g.fillRect(seg.x * gs + 2, seg.y * gs + 2, 4, 4);
                g.fillRect(seg.x * gs + gs - 6, seg.y * gs + 2, 4, 4);
                g.fillStyle = "#000";
                g.fillRect(seg.x * gs + 3 + game.dir.x, seg.y * gs + 3 + game.dir.y, 2, 2);
                g.fillRect(seg.x * gs + gs - 5 + game.dir.x, seg.y * gs + 3 + game.dir.y, 2, 2);
            }

            if (i === game.snake.length - 1 && trail.trailColor && typeof SnakeFX !== "undefined") {
                SnakeFX.emitTrail(seg.x * gs + gs / 2, seg.y * gs + gs / 2, trail.trailColor);
            }
        }
        g.globalAlpha = 1;
        g.shadowBlur  = 0;

        // ── Particles ────────────────────────────────────────────
        if (typeof SnakeFX !== "undefined") SnakeFX.draw(g);

        // ── Floating feedback message ─────────────────────────────
        if (game.feedbackTimer > 0 && game.feedbackMsg) {
            const progress  = game.feedbackTimer / 60;
            const alpha     = Math.min(1, progress * 2.5);
            const yOffset   = (1 - progress) * 24;
            const isCorrect = !game.feedbackMsg.startsWith("Wrong");

            g.globalAlpha  = alpha;
            g.fillStyle    = isCorrect ? "#4ade80" : "#ef4444";
            g.font         = `bold 15px -apple-system, sans-serif`;
            g.textAlign    = "center";
            g.textBaseline = "bottom";
            g.shadowColor  = isCorrect ? "#4ade80" : "#ef4444";
            g.shadowBlur   = 8;
            g.fillText(game.feedbackMsg, canvas.width / 2, canvas.height / 2 - 12 - yOffset);
            g.shadowBlur  = 0;
            g.globalAlpha = 1;
        }

        g.restore();

        // ── State overlays ───────────────────────────────────────
        if (game.state === "ready") {
            this._drawOverlay(g, canvas,
                "MULTIPLICATION",
                "Eat the correct answer to the math problem!",
                "Build a streak for a score multiplier  -  Tap to start"
            );
        } else if (game.state === "dead") {
            this._drawOverlay(g, canvas,
                "Game Over",
                `Score: ${game.score}  |  Best streak: ${game.bestStreak}`,
                "Tap to retry"
            );
        }
    },

    _drawOverlay(g, canvas, title, line1, line2) {
        g.fillStyle = "rgba(0, 0, 0, 0.78)";
        g.fillRect(0, 0, canvas.width, canvas.height);

        g.fillStyle    = "#4ade80";
        g.font         = "bold 28px -apple-system, sans-serif";
        g.textAlign    = "center";
        g.textBaseline = "middle";
        g.shadowColor  = "#4ade80";
        g.shadowBlur   = 18;
        g.fillText(title, canvas.width / 2, canvas.height / 2 - 28);
        g.shadowBlur = 0;

        g.fillStyle = "#f0f0f0";
        g.font      = "14px -apple-system, sans-serif";
        g.fillText(line1, canvas.width / 2, canvas.height / 2 + 10);

        g.fillStyle = "#888";
        g.font      = "12px -apple-system, sans-serif";
        g.fillText(line2, canvas.width / 2, canvas.height / 2 + 36);
    },

    // ── Key handler ──────────────────────────────────────────────────────────
    onKey(key, game) {
        const dirMap = {
            ArrowUp:    { x:  0, y: -1 }, w: { x:  0, y: -1 },
            ArrowDown:  { x:  0, y:  1 }, s: { x:  0, y:  1 },
            ArrowLeft:  { x: -1, y:  0 }, a: { x: -1, y:  0 },
            ArrowRight: { x:  1, y:  0 }, d: { x:  1, y:  0 },
        };
        if (dirMap[key]) {
            const nd = dirMap[key];
            if (nd.x !== -game.dir.x || nd.y !== -game.dir.y) game.nextDir = nd;
        }
        if (key === "Enter" && game.state === "dead")  return "restart";
        if ((key === "Enter" || key === " ") && game.state === "ready") game.state = "playing";
    },
});
