/**
 * Snake Game Version Registry
 *
 * All versions register themselves here. The engine reads from this registry
 * to build the version selector and run the selected version.
 *
 * To add a new version:
 *   1. Create a new file: versions/vN-name.js
 *   2. Call SnakeVersions.register({ ... }) in that file
 *   3. Add a <script> tag in index.html (in release order)
 *
 * Each version must provide:
 *   - number:      (int)    Version number, determines order
 *   - name:        (string) Short display name
 *   - description: (string) One-line description of what changed
 *   - init:        (fn)     Called once when version is selected: init(ctx, game)
 *   - update:      (fn)     Called each tick: update(ctx, game) -> should return game state
 *   - draw:        (fn)     Called each frame: draw(ctx, game, canvas)
 *   - onKey:       (fn)     Optional key handler: onKey(key, game)
 *   - config:      (object) Optional overrides: { gridSize, tickRate, canvasWidth, canvasHeight }
 */
window.SnakeVersions = (function () {
    const versions = [];

    return {
        register(version) {
            versions.push(version);
            // Keep sorted by version number (release order)
            versions.sort((a, b) => a.number - b.number);
        },

        getAll() {
            return versions;
        },

        getByNumber(n) {
            return versions.find(v => v.number === n);
        },

        latest() {
            return versions[versions.length - 1];
        }
    };
})();
