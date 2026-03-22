/**
 * Snake Game Engine
 *
 * Touch: plain onclick handlers on buttons (works on every iOS version).
 * Swipe: touchstart/touchend on canvas only.
 * Coin display updates each frame.
 */
(function () {
    const canvas = document.getElementById("game-canvas");
    const scoreEl = document.getElementById("score");
    const highScoreEl = document.getElementById("high-score");
    const coinsEl = document.getElementById("coins-display");
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

    function updateCoinDisplay() {
        if (coinsEl && typeof SnakeShop !== "undefined") {
            coinsEl.textContent = SnakeShop.getCoins();
        }
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
        updateCoinDisplay();

        // Close shop when starting a game
        var shopPanel = document.getElementById("shop-panel");
        if (shopPanel) shopPanel.classList.add("hidden");

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
            updateCoinDisplay();
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

    function startOrRestart() {
        if (!currentVersion) return;
        if (game.state === "ready") {
            game.state = "playing";
        } else if (game.state === "dead") {
            selectVersion(currentVersion.number);
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
        if (game.state === "ready") game.state = "playing";
    };
    window._snkSelectVersion = selectVersion;

    // ─── Shop toggle ───
    window._snkToggleShop = function () {
        var panel = document.getElementById("shop-panel");
        if (!panel) return;
        panel.classList.toggle("hidden");
        if (!panel.classList.contains("hidden")) {
            window._snkRenderShop();
        }
    };

    window._snkRenderShop = function () {
        if (typeof SnakeShop === "undefined") return;
        var panel = document.getElementById("shop-content");
        if (!panel) return;

        var html = "";

        // Skins
        html += '<div class="shop-section"><h3>Skins</h3><div class="shop-grid">';
        SnakeShop.getSkins().forEach(function (s) {
            var equipped = SnakeShop.getEquipped().skin === s.id;
            var cls = equipped ? "shop-item equipped" : s.owned ? "shop-item owned" : "shop-item";
            var preview = s.color === "rainbow" ? "background:linear-gradient(90deg,red,orange,yellow,green,cyan,blue,violet)" : "background:" + s.color;
            var action = "";
            if (equipped) action = '<span class="shop-badge">Equipped</span>';
            else if (s.owned) action = '<button onclick="SnakeShop.equipSkin(\'' + s.id + '\');window._snkRenderShop()">Equip</button>';
            else action = '<button onclick="var r=SnakeShop.buySkin(\'' + s.id + '\');if(!r.ok)alert(r.msg);window._snkRenderShop()">Buy ' + s.price + '</button>';
            html += '<div class="' + cls + '"><div class="shop-preview" style="' + preview + '"></div><div class="shop-name">' + s.name + '</div><div class="shop-desc">' + s.desc + '</div>' + action + '</div>';
        });
        html += '</div></div>';

        // Trails
        html += '<div class="shop-section"><h3>Trails</h3><div class="shop-grid">';
        SnakeShop.getTrails().forEach(function (t) {
            var equipped = SnakeShop.getEquipped().trail === t.id;
            var cls = equipped ? "shop-item equipped" : t.owned ? "shop-item owned" : "shop-item";
            var preview = t.trailColor ? "background:" + t.trailColor : "background:#333";
            var action = "";
            if (equipped) action = '<span class="shop-badge">Equipped</span>';
            else if (t.owned) action = '<button onclick="SnakeShop.equipTrail(\'' + t.id + '\');window._snkRenderShop()">Equip</button>';
            else action = '<button onclick="var r=SnakeShop.buyTrail(\'' + t.id + '\');if(!r.ok)alert(r.msg);window._snkRenderShop()">Buy ' + t.price + '</button>';
            html += '<div class="' + cls + '"><div class="shop-preview" style="' + preview + '"></div><div class="shop-name">' + t.name + '</div><div class="shop-desc">' + t.desc + '</div>' + action + '</div>';
        });
        html += '</div></div>';

        // Power-ups
        html += '<div class="shop-section"><h3>Power-Ups (coming soon)</h3><div class="shop-grid">';
        SnakeShop.getPowerups().forEach(function (p) {
            html += '<div class="shop-item"><div class="shop-name">' + p.name + ' (' + p.owned + '/' + p.max + ')</div><div class="shop-desc">' + p.desc + '</div>';
            html += '<button onclick="var r=SnakeShop.buyPowerup(\'' + p.id + '\');if(!r.ok)alert(r.msg);window._snkRenderShop()">' + p.price + ' coins</button></div>';
        });
        html += '</div></div>';

        panel.innerHTML = html;
        updateCoinDisplay();
    };

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
    }, { passive: true });

    canvas.addEventListener("touchend", function (e) {
        var t = e.changedTouches[0];
        var dx = t.clientX - touchX;
        var dy = t.clientY - touchY;
        var dist = Math.abs(dx) + Math.abs(dy);

        if (dist < 20) {
            if (game.state === "ready" || game.state === "dead") {
                startOrRestart();
            } else {
                pause();
            }
        } else {
            if (Math.abs(dx) > Math.abs(dy)) {
                handleInput(dx > 0 ? "ArrowRight" : "ArrowLeft");
            } else {
                handleInput(dy > 0 ? "ArrowDown" : "ArrowUp");
            }
            if (game.state === "ready") game.state = "playing";
        }
    }, { passive: true });

    canvas.addEventListener("touchmove", function (e) {
        e.preventDefault();
    }, { passive: false });

    // ─── Init ───
    buildVersionBar();
    updateCoinDisplay();
    var versions = SnakeVersions.getAll();
    if (versions.length > 0) selectVersion(versions[0].number);
})();
