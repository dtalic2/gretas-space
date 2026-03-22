/**
 * Snake Game Engine
 *
 * Reads from the SnakeVersions registry, builds the UI, and runs
 * whichever version is selected. Version files handle all game logic
 * and rendering — this engine just orchestrates.
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
    let highScores = {}; // per-version high scores

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

    // Input handling
    document.addEventListener("keydown", (e) => {
        if (!currentVersion) return;

        // Pause
        if (e.key === " " && game.state === "playing") {
            if (game._paused) {
                game._paused = false;
                game.state = "playing";
            } else {
                game._paused = true;
                game.state = "paused";
            }
            e.preventDefault();
            return;
        }
        if (e.key === " " && game.state === "paused") {
            game._paused = false;
            game.state = "playing";
            e.preventDefault();
            return;
        }

        if (currentVersion.onKey) {
            const result = currentVersion.onKey(e.key, game);
            if (result === "restart") {
                selectVersion(currentVersion.number);
            }
        }

        // Prevent arrow key scrolling
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
            e.preventDefault();
        }
    });

    // Initialize with latest version (or v1)
    buildVersionBar();
    const versions = SnakeVersions.getAll();
    if (versions.length > 0) {
        selectVersion(versions[0].number);
    }
})();
