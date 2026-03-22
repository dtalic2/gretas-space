/**
 * Shop System — skins, trails, power-ups
 * Persists purchases and equipped items in localStorage.
 */
window.SnakeShop = (function () {
    const STORAGE_KEY = "snake-shop-data";

    // ─── Catalog ───
    const skins = [
        { id: "default",   name: "Classic Green",  color: "#4ade80", headColor: "#22c55e", price: 0,   owned: true,  desc: "The OG" },
        { id: "neon-blue",  name: "Neon Blue",      color: "#38bdf8", headColor: "#0ea5e9", price: 50,  owned: false, desc: "Electric vibes" },
        { id: "fire",       name: "Fire Snake",     color: "#f97316", headColor: "#ef4444", price: 100, owned: false, desc: "Hot hot hot" },
        { id: "purple-haze",name: "Purple Haze",    color: "#c084fc", headColor: "#a855f7", price: 100, owned: false, desc: "Mystical energy" },
        { id: "gold",       name: "Golden Serpent",  color: "#fbbf24", headColor: "#f59e0b", price: 200, owned: false, desc: "Dripping in gold" },
        { id: "ice",        name: "Ice Cobra",      color: "#67e8f9", headColor: "#22d3ee", price: 150, owned: false, desc: "Sub-zero" },
        { id: "toxic",      name: "Toxic Venom",    color: "#a3e635", headColor: "#84cc16", price: 120, owned: false, desc: "Venomous bite" },
        { id: "rainbow",    name: "Rainbow",        color: "rainbow",  headColor: "#ff6b6b", price: 500, owned: false, desc: "All the colors" },
        { id: "ghost",      name: "Ghost Snake",    color: "rgba(255,255,255,0.6)", headColor: "rgba(255,255,255,0.9)", price: 300, owned: false, desc: "Now you see me..." },
        { id: "lava",       name: "Lava Flow",      color: "#dc2626", headColor: "#fbbf24", price: 250, owned: false, desc: "Molten destruction" },
    ];

    const trails = [
        { id: "none",       name: "No Trail",       price: 0,   owned: true,  desc: "Clean look", trailColor: null },
        { id: "sparkle",    name: "Sparkle",         price: 75,  owned: false, desc: "Glitter trail", trailColor: "#fbbf24" },
        { id: "fire-trail", name: "Fire Trail",      price: 150, owned: false, desc: "Blazing path", trailColor: "#ef4444" },
        { id: "ice-trail",  name: "Ice Trail",       price: 150, owned: false, desc: "Frozen wake", trailColor: "#67e8f9" },
        { id: "shadow",     name: "Shadow Trail",    price: 200, owned: false, desc: "Dark wisps", trailColor: "#6b7280" },
        { id: "neon-trail", name: "Neon Glow",       price: 250, owned: false, desc: "Glowing path", trailColor: "#4ade80" },
    ];

    const powerups = [
        { id: "shield",     name: "Shield (1 use)",  price: 80,  owned: 0, desc: "Survive one collision", max: 5 },
        { id: "magnet",     name: "Magnet (1 use)",   price: 60,  owned: 0, desc: "Food attracts to you", max: 5 },
        { id: "slow-mo",    name: "Slow-Mo (1 use)",  price: 50,  owned: 0, desc: "Halves speed for 10s", max: 5 },
        { id: "double-pts", name: "2x Points (1 use)",price: 100, owned: 0, desc: "Double score for 30s", max: 3 },
    ];

    let equipped = { skin: "default", trail: "none" };
    let coins = 0;

    // ─── Persistence ───
    function save() {
        const data = {
            coins,
            equipped,
            ownedSkins: skins.filter(s => s.owned).map(s => s.id),
            ownedTrails: trails.filter(t => t.owned).map(t => t.id),
            powerupCounts: {},
        };
        powerups.forEach(p => { data.powerupCounts[p.id] = p.owned; });
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) {}
    }

    function load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const data = JSON.parse(raw);
            coins = data.coins || 0;
            equipped = data.equipped || { skin: "default", trail: "none" };
            if (data.ownedSkins) {
                skins.forEach(s => { s.owned = data.ownedSkins.includes(s.id); });
            }
            if (data.ownedTrails) {
                trails.forEach(t => { t.owned = data.ownedTrails.includes(t.id); });
            }
            if (data.powerupCounts) {
                powerups.forEach(p => { p.owned = data.powerupCounts[p.id] || 0; });
            }
        } catch (e) {}
    }

    load();

    // ─── API ───
    return {
        getCoins()      { return coins; },
        addCoins(n)     { coins += n; save(); return coins; },
        spendCoins(n)   { if (coins >= n) { coins -= n; save(); return true; } return false; },

        getSkins()      { return skins; },
        getTrails()     { return trails; },
        getPowerups()   { return powerups; },
        getEquipped()   { return equipped; },

        getActiveSkin() {
            return skins.find(s => s.id === equipped.skin) || skins[0];
        },
        getActiveTrail() {
            return trails.find(t => t.id === equipped.trail) || trails[0];
        },

        buySkin(id) {
            const s = skins.find(x => x.id === id);
            if (!s || s.owned) return { ok: false, msg: "Already owned" };
            if (coins < s.price) return { ok: false, msg: "Not enough coins" };
            coins -= s.price;
            s.owned = true;
            save();
            return { ok: true };
        },
        buyTrail(id) {
            const t = trails.find(x => x.id === id);
            if (!t || t.owned) return { ok: false, msg: "Already owned" };
            if (coins < t.price) return { ok: false, msg: "Not enough coins" };
            coins -= t.price;
            t.owned = true;
            save();
            return { ok: true };
        },
        buyPowerup(id) {
            const p = powerups.find(x => x.id === id);
            if (!p) return { ok: false, msg: "Unknown" };
            if (p.owned >= p.max) return { ok: false, msg: "Max owned" };
            if (coins < p.price) return { ok: false, msg: "Not enough coins" };
            coins -= p.price;
            p.owned++;
            save();
            return { ok: true };
        },

        equipSkin(id) {
            const s = skins.find(x => x.id === id);
            if (s && s.owned) { equipped.skin = id; save(); return true; }
            return false;
        },
        equipTrail(id) {
            const t = trails.find(x => x.id === id);
            if (t && t.owned) { equipped.trail = id; save(); return true; }
            return false;
        },

        usePowerup(id) {
            const p = powerups.find(x => x.id === id);
            if (p && p.owned > 0) { p.owned--; save(); return true; }
            return false;
        },

        // Rainbow color helper
        getRainbowColor(index, total) {
            const hue = (index / Math.max(total, 1)) * 360 + (Date.now() / 10) % 360;
            return `hsl(${hue % 360}, 80%, 55%)`;
        },

        save,
    };
})();
