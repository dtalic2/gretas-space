/**
 * Snake Game Engine
 *
 * Reads from the SnakeVersions registry, builds the UI, and runs
 * whichever version is selected. Version files handle all game logic
 * and rendering — this engine just orchestrates.
 *
 * Supports keyboard, swipe gestures, and on-screen d-pad for mobile.
 */
(function () {
    const canvas = document.getElementById("game-canvas");
    const scoreEl = document.getElementById("score");
    const highScoreEl = document.getElementById("high-score");
    const versionBar = document.getElementById("version-bar");
    const versionInfo = document.getElementById("version-info");

    let currentVersion = null;
    let game = {};
    let ctx = {};
    let loopId = null;
    let lastTick = 0;
    let highScores = {};

    // Load high scores from localStorage
    try {
        const saved = localStorage.getItem("snake-high-scores");
        if (saved) highScores = JSON.parse(saved);
    } catch (e) { /* ignore */ }

    function saveHighScores() {
        try {
            localStorage.setItem("snake-high-scores", JSON.stringify(highScores));
        } catch (e) { /* ignore */ }
    }

    // Build version buttons
    function buildVersionBar() {
        versionBar.innerHTML = "";
        SnakeVersions.getAll().forEach(v => {
            const btn = document.createElement("button");
            btn.className = "version-btn";
            btn.textContent = `v${v.number} — ${v.name}`;
            btn.dataset.version = v.number;
            btn.addEventListener("click", () => selectVersion(v.number));
            versionBar.appendChild(btn);
        });
    }

    function updateVersionInfo(v) {
        versionInfo.innerHTML = `<strong>v${v.number} — ${v.name}:</strong> ${v.description}`;
    }

    function highlightButton(number) {
        document.querySelectorAll(".version-btn").forEach(btn => {
            btn.classList.toggle("active", parseInt(btn.dataset.version) === number);
        });
    }

    // Select and start a version
    function selectVersion(number) {
        const v = SnakeVersions.getByNumber(number);
        if (!v) return;

        currentVersion = v;
        highlightButton(number);
        updateVersionInfo(v);

        // Build context
        const config = v.config || {};
        const gridSize = config.gridSize || 20;
        const cw = config.canvasWidth || 400;
        const ch = config.canvasHeight || 400;
        canvas.width = cw;
        canvas.height = ch;

        ctx = {
            gridSize,
            cols: Math.floor(cw / gridSize),
            rows: Math.floor(ch / gridSize),
            tickRate: config.tickRate || 150,
            setTickRate(rate) {
                ctx.tickRate = rate;
            },
        };

        // Init game state
        game = {};
        v.init(ctx, game);

        // Update score display
        scoreEl.textContent = game.score || 0;
        const hs = highScores[`v${number}`] || 0;
        highScoreEl.textContent = hs;

        // Start loop
        if (loopId) cancelAnimationFrame(loopId);
        lastTick = 0;
        loop(0);
    }

    function loop(timestamp) {
        loopId = requestAnimationFrame(loop);

        // Tick-based update
        if (timestamp - lastTick >= ctx.tickRate) {
            lastTick = timestamp;

            if (currentVersion.update) {
                currentVersion.update(ctx, game);
            }

            // Update score
            scoreEl.textContent = game.score || 0;

            // Track high score
            const key = `v${currentVersion.number}`;
            if ((game.score || 0) > (highScores[key] || 0)) {
                highScores[key] = game.score;
                highScoreEl.textContent = game.score;
                saveHighScores();
            }
        }

        // Draw every frame (allows smooth animations)
        if (currentVersion.draw) {
            currentVersion.draw(ctx, game, canvas);
        }
    }

    // === Shared input handler ===
    function handleInput(key) {
        if (!currentVersion) return;

        // Pause
        if (key === " " && game.state === "playing") {
            game._paused = true;
            game.state = "paused";
            return;
        }
        if (key === " " && game.state === "paused") {
            game._paused = false;
            game.state = "playing";
            return;
        }

        if (currentVersion.onKey) {
            const result = currentVersion.onKey(key, game);
            if (result === "restart") {
                selectVersion(currentVersion.number);
            }
        }
    }

    // === Keyboard input ===
    document.addEventListener("keydown", (e) => {
        handleInput(e.key);
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
            e.preventDefault();
        }
    });

    // === Swipe gesture detection on game canvas ===
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;

    canvas.addEventListener("touchstart", (e) => {
        e.preventDefault();
        const t = e.touches[0];
        touchStartX = t.clientX;
        touchStartY = t.clientY;
        touchStartTime = Date.now();
    }, { passive: false });

    canvas.addEventListener("touchmove", (e) => {
        e.preventDefault();
    }, { passive: false });

    canvas.addEventListener("touchend", (e) => {
        e.preventDefault();
        const t = e.changedTouches[0];
        const dx = t.clientX - touchStartX;
        const dy = t.clientY - touchStartY;
        const dt = Date.now() - touchStartTime;

        const dist = Math.sqrt(dx * dx + dy * dy);

        // Tap (short distance, short time) — start/restart
        if (dist < 15 && dt < 300) {
            if (game.state === "ready") {
                handleInput("Enter");
            } else if (game.state === "dead") {
                handleInput("Enter");
            } else if (game.state === "playing" || game.state === "paused") {
                handleInput(" ");
            }
            return;
        }

        // Swipe — direction
        if (dist > 20) {
            if (Math.abs(dx) > Math.abs(dy)) {
                handleInput(dx > 0 ? "ArrowRight" : "ArrowLeft");
            } else {
                handleInput(dy > 0 ? "ArrowDown" : "ArrowUp");
            }
        }
    }, { passive: false });

    // === D-Pad buttons ===
    const dirKeyMap = {
        up: "ArrowUp",
        down: "ArrowDown",
        left: "ArrowLeft",
        right: "ArrowRight",
    };

    document.querySelectorAll(".dpad-btn").forEach(btn => {
        const dir = btn.dataset.dir;

        function fireDir(e) {
            e.preventDefault();
            handleInput(dirKeyMap[dir]);
            btn.classList.add("pressed");
            setTimeout(() => btn.classList.remove("pressed"), 120);
        }

        btn.addEventListener("touchstart", fireDir, { passive: false });
        btn.addEventListener("mousedown", fireDir);
    });

    // === Touch action buttons (Start / Pause) ===
    const btnStart = document.getElementById("btn-start");
    const btnPause = document.getElementById("btn-pause");

    if (btnStart) {
        btnStart.addEventListener("touchstart", (e) => {
            e.preventDefault();
            if (game.state === "ready" || game.state === "dead") {
                handleInput("Enter");
            }
        }, { passive: false });
        btnStart.addEventListener("click", () => {
            if (game.state === "ready" || game.state === "dead") {
                handleInput("Enter");
            }
        });
    }

    if (btnPause) {
        btnPause.addEventListener("touchstart", (e) => {
            e.preventDefault();
            handleInput(" ");
        }, { passive: false });
        btnPause.addEventListener("click", () => {
            handleInput(" ");
        });
    }

    // === Prevent iOS rubber-band scrolling while playing ===
    document.body.addEventListener("touchmove", (e) => {
        if (game.state === "playing") {
            e.preventDefault();
        }
    }, { passive: false });

    // Initialize with v1
    buildVersionBar();
    const versions = SnakeVersions.getAll();
    if (versions.length > 0) {
        selectVersion(versions[0].number);
    }
})();
