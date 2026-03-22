/**
 * Snake Game Engine
 *
 * Supports keyboard + native touch (swipe on canvas, d-pad buttons).
 * Touch is handled via a simple tap helper that fires on touchend
 * with no preventDefault on buttons — letting iOS handle them natively.
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

    try {
        const saved = localStorage.getItem("snake-high-scores");
        if (saved) highScores = JSON.parse(saved);
    } catch (e) { /* ignore */ }

    function saveHighScores() {
        try {
            localStorage.setItem("snake-high-scores", JSON.stringify(highScores));
        } catch (e) { /* ignore */ }
    }

    // ─── Version bar ───
    function buildVersionBar() {
        versionBar.innerHTML = "";
        SnakeVersions.getAll().forEach(v => {
            const btn = document.createElement("button");
            btn.className = "version-btn";
            btn.textContent = `v${v.number} — ${v.name}`;
            btn.dataset.version = v.number;
            // Use ontouchend for instant response on iOS, onclick as fallback
            tap(btn, () => selectVersion(v.number));
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

    // ─── Version select / init ───
    function selectVersion(number) {
        const v = SnakeVersions.getByNumber(number);
        if (!v) return;

        currentVersion = v;
        highlightButton(number);
        updateVersionInfo(v);

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
            setTickRate(rate) { ctx.tickRate = rate; },
        };

        game = {};
        v.init(ctx, game);

        scoreEl.textContent = game.score || 0;
        highScoreEl.textContent = highScores[`v${number}`] || 0;

        if (loopId) cancelAnimationFrame(loopId);
        lastTick = 0;
        loop(0);
    }

    function loop(timestamp) {
        loopId = requestAnimationFrame(loop);

        if (timestamp - lastTick >= ctx.tickRate) {
            lastTick = timestamp;
            if (currentVersion.update) currentVersion.update(ctx, game);
            scoreEl.textContent = game.score || 0;

            const key = `v${currentVersion.number}`;
            if ((game.score || 0) > (highScores[key] || 0)) {
                highScores[key] = game.score;
                highScoreEl.textContent = game.score;
                saveHighScores();
            }
        }

        if (currentVersion.draw) currentVersion.draw(ctx, game, canvas);
    }

    // ─── Input dispatch ───
    function handleInput(key) {
        if (!currentVersion) return;

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
            if (result === "restart") selectVersion(currentVersion.number);
        }
    }

    // ─── Tap helper: fires callback on touchend (instant) or click (desktop) ───
    // Does NOT call preventDefault so iOS native button styling works.
    function tap(el, fn) {
        let touched = false;
        el.addEventListener("touchend", (e) => {
            touched = true;
            fn(e);
            // Prevent the ghost click that follows touchend
            setTimeout(() => { touched = false; }, 400);
        });
        el.addEventListener("click", (e) => {
            if (!touched) fn(e);
        });
    }

    // ─── Keyboard ───
    document.addEventListener("keydown", (e) => {
        handleInput(e.key);
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
            e.preventDefault();
        }
    });

    // ─── Canvas swipe + tap ───
    // Only preventDefault on the canvas element itself (not the whole page)
    let swipeStart = null;

    canvas.addEventListener("touchstart", (e) => {
        // Prevent scroll only when touching the game canvas
        e.preventDefault();
        const t = e.changedTouches[0];
        swipeStart = { x: t.clientX, y: t.clientY, time: Date.now() };
    }, { passive: false });

    canvas.addEventListener("touchmove", (e) => {
        e.preventDefault();
    }, { passive: false });

    canvas.addEventListener("touchend", (e) => {
        e.preventDefault();
        if (!swipeStart) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - swipeStart.x;
        const dy = t.clientY - swipeStart.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const dt = Date.now() - swipeStart.time;
        swipeStart = null;

        // Tap
        if (dist < 20 && dt < 350) {
            if (game.state === "ready" || game.state === "dead") {
                handleInput("Enter");
            } else {
                handleInput(" ");
            }
            return;
        }

        // Swipe
        if (dist >= 20) {
            if (Math.abs(dx) > Math.abs(dy)) {
                handleInput(dx > 0 ? "ArrowRight" : "ArrowLeft");
            } else {
                handleInput(dy > 0 ? "ArrowDown" : "ArrowUp");
            }
        }
    }, { passive: false });

    // ─── D-Pad buttons ───
    const dirKeyMap = { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" };

    document.querySelectorAll(".dpad-btn").forEach(btn => {
        const dir = btn.dataset.dir;
        tap(btn, () => handleInput(dirKeyMap[dir]));
    });

    // ─── Action buttons ───
    const btnStart = document.getElementById("btn-start");
    const btnPause = document.getElementById("btn-pause");

    if (btnStart) {
        tap(btnStart, () => {
            if (game.state === "ready" || game.state === "dead") handleInput("Enter");
            else if (game.state === "playing" || game.state === "paused") handleInput("Enter");
        });
    }

    if (btnPause) {
        tap(btnPause, () => handleInput(" "));
    }

    // ─── Init ───
    buildVersionBar();
    const versions = SnakeVersions.getAll();
    if (versions.length > 0) selectVersion(versions[0].number);
})();
