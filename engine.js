/**
 * Snake Game Engine
 *
 * Touch: plain onclick handlers on buttons (works on every iOS version).
 * Swipe: touchstart/touchend on canvas only.
 * All buttons use inline onclick= calling window globals — the most
 * reliable pattern on mobile Safari.
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
    } catch (e) {}

    function saveHighScores() {
        try { localStorage.setItem("snake-high-scores", JSON.stringify(highScores)); } catch (e) {}
    }

    // ─── Version bar ───
    function buildVersionBar() {
        versionBar.innerHTML = "";
        SnakeVersions.getAll().forEach(v => {
            const btn = document.createElement("button");
            btn.className = "version-btn";
            btn.textContent = `v${v.number} — ${v.name}`;
            btn.dataset.version = v.number;
            btn.onclick = function () { selectVersion(v.number); };
            versionBar.appendChild(btn);
        });
    }

    function highlightButton(number) {
        document.querySelectorAll(".version-btn").forEach(btn => {
            btn.classList.toggle("active", parseInt(btn.dataset.version) === number);
        });
    }

    // ─── Select version ───
    function selectVersion(number) {
        const v = SnakeVersions.getByNumber(number);
        if (!v) return;

        currentVersion = v;
        highlightButton(number);
        versionInfo.innerHTML = `<strong>v${v.number} — ${v.name}:</strong> ${v.description}`;

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

    // ─── Core input ───
    function handleInput(key) {
        if (!currentVersion) return;
        if (key === " " && game.state === "playing") {
            game._paused = true; game.state = "paused"; return;
        }
        if (key === " " && game.state === "paused") {
            game._paused = false; game.state = "playing"; return;
        }
        if (currentVersion.onKey) {
            const result = currentVersion.onKey(key, game);
            if (result === "restart") selectVersion(currentVersion.number);
        }
    }

    // ─── Start/restart: works for ANY state ───
    function startOrRestart() {
        if (!currentVersion) return;
        if (game.state === "ready") {
            // Directly set playing — bypass onKey entirely
            game.state = "playing";
        } else if (game.state === "dead") {
            selectVersion(currentVersion.number);
            // After reinit, auto-start
            game.state = "playing";
        } else if (game.state === "paused") {
            game._paused = false;
            game.state = "playing";
        }
    }

    function pause() {
        if (!currentVersion) return;
        if (game.state === "playing") {
            game._paused = true; game.state = "paused";
        } else if (game.state === "paused") {
            game._paused = false; game.state = "playing";
        }
    }

    // ─── Expose globals for inline onclick ───
    window._snkPlay = startOrRestart;
    window._snkPause = pause;
    window._snkDir = function (dir) {
        var map = { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" };
        handleInput(map[dir]);
        // Also auto-start if still on ready screen
        if (game.state === "ready") game.state = "playing";
    };
    window._snkSelectVersion = selectVersion;

    // ─── Keyboard ───
    document.addEventListener("keydown", function (e) {
        handleInput(e.key);
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
            e.preventDefault();
        }
    });

    // ─── Canvas touch: swipe to steer, tap to start/pause ───
    var touchX = 0, touchY = 0;

    canvas.addEventListener("touchstart", function (e) {
        var t = e.touches[0];
        touchX = t.clientX;
        touchY = t.clientY;
        // Don't preventDefault here — let iOS handle it naturally
    }, { passive: true });

    canvas.addEventListener("touchend", function (e) {
        var t = e.changedTouches[0];
        var dx = t.clientX - touchX;
        var dy = t.clientY - touchY;
        var dist = Math.abs(dx) + Math.abs(dy); // manhattan distance

        if (dist < 20) {
            // Tap
            if (game.state === "ready" || game.state === "dead") {
                startOrRestart();
            } else {
                pause();
            }
        } else {
            // Swipe
            if (Math.abs(dx) > Math.abs(dy)) {
                handleInput(dx > 0 ? "ArrowRight" : "ArrowLeft");
            } else {
                handleInput(dy > 0 ? "ArrowDown" : "ArrowUp");
            }
            if (game.state === "ready") game.state = "playing";
        }
    }, { passive: true });

    // Prevent canvas from scrolling the page on swipe
    canvas.addEventListener("touchmove", function (e) {
        e.preventDefault();
    }, { passive: false });

    // ─── Init ───
    buildVersionBar();
    var versions = SnakeVersions.getAll();
    if (versions.length > 0) selectVersion(versions[0].number);
})();
