/**
 * Hero artwork: Snake in a Monster Truck with SNK CLSH license plate
 * Drawn entirely on canvas with a clash/aggressive style.
 */
(function () {
    const canvas = document.getElementById("hero-canvas");
    const g = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;

    // Animation frame
    let frame = 0;

    function draw() {
        frame++;
        g.clearRect(0, 0, W, H);

        // Background — dark with subtle dust/sparks
        const grad = g.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, "#0a0a0a");
        grad.addColorStop(1, "#111118");
        g.fillStyle = grad;
        g.fillRect(0, 0, W, H);

        // Ground line
        const groundY = 175;
        g.strokeStyle = "#2a2a2a";
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(0, groundY);
        g.lineTo(W, groundY);
        g.stroke();

        // Dust particles
        g.fillStyle = "rgba(150,130,100,0.15)";
        for (let i = 0; i < 12; i++) {
            const px = (i * 37 + frame * 0.7) % (W + 40) - 20;
            const py = groundY - 5 + Math.sin(frame * 0.03 + i) * 8;
            const r = 2 + Math.sin(i * 1.3) * 1.5;
            g.beginPath();
            g.arc(px, py, r, 0, Math.PI * 2);
            g.fill();
        }

        // Bounce offset for truck
        const bounce = Math.sin(frame * 0.12) * 2.5;
        const tilt = Math.sin(frame * 0.08) * 0.015;

        g.save();
        g.translate(W / 2, 0);
        g.rotate(tilt);
        g.translate(-W / 2, 0);

        const tx = 100; // truck left x
        const ty = 68 + bounce; // truck top y

        // === MONSTER TRUCK ===

        // Suspension / axle bars
        g.strokeStyle = "#555";
        g.lineWidth = 4;
        // Front axle
        g.beginPath();
        g.moveTo(tx + 55, ty + 85);
        g.lineTo(tx + 55, groundY - 22);
        g.stroke();
        // Rear axle
        g.beginPath();
        g.moveTo(tx + 165, ty + 85);
        g.lineTo(tx + 165, groundY - 22);
        g.stroke();

        // Truck body (main chassis)
        g.fillStyle = "#1a1a2e";
        g.strokeStyle = "#4ade80";
        g.lineWidth = 2;
        // Main body
        g.beginPath();
        g.moveTo(tx + 20, ty + 85);
        g.lineTo(tx + 20, ty + 40);
        g.lineTo(tx + 60, ty + 10);
        g.lineTo(tx + 130, ty + 10);
        g.lineTo(tx + 130, ty + 25);
        g.lineTo(tx + 200, ty + 25);
        g.lineTo(tx + 200, ty + 85);
        g.closePath();
        g.fill();
        g.stroke();

        // Cab window
        g.fillStyle = "#0d2818";
        g.strokeStyle = "#4ade80";
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(tx + 65, ty + 18);
        g.lineTo(tx + 125, ty + 18);
        g.lineTo(tx + 125, ty + 50);
        g.lineTo(tx + 45, ty + 50);
        g.closePath();
        g.fill();
        g.stroke();

        // Truck bed
        g.fillStyle = "#151525";
        g.fillRect(tx + 133, ty + 32, 62, 53);
        g.strokeStyle = "#4ade80";
        g.lineWidth = 1;
        g.strokeRect(tx + 133, ty + 32, 62, 53);

        // Headlights
        g.fillStyle = "#facc15";
        g.shadowColor = "#facc15";
        g.shadowBlur = 10;
        g.fillRect(tx + 18, ty + 55, 6, 10);
        g.shadowBlur = 0;

        // Tail lights
        g.fillStyle = "#ef4444";
        g.shadowColor = "#ef4444";
        g.shadowBlur = 8;
        g.fillRect(tx + 197, ty + 40, 5, 8);
        g.shadowBlur = 0;

        // Exhaust pipes
        g.fillStyle = "#444";
        g.fillRect(tx + 195, ty + 10, 8, 18);
        g.fillRect(tx + 185, ty + 8, 8, 18);
        // Smoke puffs
        g.fillStyle = "rgba(100,100,100,0.3)";
        for (let i = 0; i < 4; i++) {
            const sx = tx + 198 + i * 8 + Math.sin(frame * 0.1 + i) * 3;
            const sy = ty + 5 - i * 7 + Math.cos(frame * 0.08 + i) * 2;
            const sr = 4 + i * 2;
            g.beginPath();
            g.arc(sx, sy, sr, 0, Math.PI * 2);
            g.fill();
        }

        // === SNAKE DRIVER ===
        // Snake body coiling through the cab window and over the truck

        // Snake body segments (thick, green, coiling)
        g.lineCap = "round";
        g.lineJoin = "round";

        // Body trail going over the truck bed
        g.strokeStyle = "#22c55e";
        g.lineWidth = 12;
        g.shadowColor = "#4ade80";
        g.shadowBlur = 6;
        g.beginPath();
        g.moveTo(tx + 190, ty + 40);
        g.quadraticCurveTo(tx + 175, ty + 20, tx + 155, ty + 35);
        g.quadraticCurveTo(tx + 140, ty + 55, tx + 130, ty + 40);
        g.stroke();
        g.shadowBlur = 0;

        // Body into cab
        g.strokeStyle = "#22c55e";
        g.lineWidth = 11;
        g.beginPath();
        g.moveTo(tx + 130, ty + 40);
        g.quadraticCurveTo(tx + 115, ty + 25, tx + 100, ty + 35);
        g.quadraticCurveTo(tx + 85, ty + 48, tx + 75, ty + 35);
        g.stroke();

        // Snake head (in driver seat, looking forward)
        const headX = tx + 60;
        const headY = ty + 30;

        // Head shape
        g.fillStyle = "#4ade80";
        g.shadowColor = "#4ade80";
        g.shadowBlur = 8;
        g.beginPath();
        g.ellipse(headX, headY, 14, 10, -0.3, 0, Math.PI * 2);
        g.fill();
        g.shadowBlur = 0;

        // Snout
        g.fillStyle = "#4ade80";
        g.beginPath();
        g.ellipse(headX - 12, headY + 2, 8, 6, -0.2, 0, Math.PI * 2);
        g.fill();

        // Eyes — angry/determined
        // Eye whites
        g.fillStyle = "#fff";
        g.beginPath();
        g.ellipse(headX - 6, headY - 5, 5, 4, 0, 0, Math.PI * 2);
        g.fill();
        // Pupil
        g.fillStyle = "#111";
        g.beginPath();
        g.ellipse(headX - 8, headY - 5, 2.5, 3, 0, 0, Math.PI * 2);
        g.fill();
        // Angry eyebrow
        g.strokeStyle = "#166534";
        g.lineWidth = 2.5;
        g.beginPath();
        g.moveTo(headX - 12, headY - 10);
        g.lineTo(headX - 2, headY - 8);
        g.stroke();

        // Tongue flick
        const tongueFlick = Math.sin(frame * 0.15) * 3;
        g.strokeStyle = "#ef4444";
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(headX - 19, headY + 3);
        g.lineTo(headX - 27 + tongueFlick, headY + 1);
        g.moveTo(headX - 24 + tongueFlick * 0.5, headY + 2);
        g.lineTo(headX - 28 + tongueFlick, headY + 5);
        g.stroke();

        // Snake scales pattern on body
        g.fillStyle = "rgba(22, 101, 52, 0.5)";
        for (let i = 0; i < 6; i++) {
            const sx = tx + 135 + i * 10;
            const sy = ty + 35 + Math.sin(i * 1.2) * 5;
            g.beginPath();
            g.arc(sx, sy, 2.5, 0, Math.PI * 2);
            g.fill();
        }

        // Tail tip (wavy, at end of truck bed)
        g.strokeStyle = "#22c55e";
        g.lineWidth = 6;
        g.beginPath();
        g.moveTo(tx + 190, ty + 40);
        g.quadraticCurveTo(tx + 200, ty + 30 + Math.sin(frame * 0.1) * 5, tx + 210, ty + 25 + Math.sin(frame * 0.12) * 4);
        g.stroke();
        // Tail tip point
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(tx + 210, ty + 25 + Math.sin(frame * 0.12) * 4);
        g.lineTo(tx + 218, ty + 20 + Math.sin(frame * 0.12) * 4);
        g.stroke();

        // === WHEELS (huge monster truck wheels) ===
        const wheelR = 24;

        // Front wheel
        drawWheel(tx + 55, groundY - 20, wheelR);
        // Rear wheel
        drawWheel(tx + 165, groundY - 20, wheelR);

        // === LICENSE PLATE ===
        const plateX = tx + 75;
        const plateY = ty + 70;
        const plateW = 70;
        const plateH = 20;

        // Plate background
        g.fillStyle = "#f5f5f0";
        g.strokeStyle = "#333";
        g.lineWidth = 2;
        g.beginPath();
        g.roundRect(plateX, plateY, plateW, plateH, 3);
        g.fill();
        g.stroke();

        // Plate border inner
        g.strokeStyle = "#999";
        g.lineWidth = 0.8;
        g.beginPath();
        g.roundRect(plateX + 2, plateY + 2, plateW - 4, plateH - 4, 2);
        g.stroke();

        // Plate text — SNK CLSH
        g.fillStyle = "#111";
        g.font = "bold 11px 'Courier New', monospace";
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText("SNK CLSH", plateX + plateW / 2, plateY + plateH / 2);

        // Plate screws
        g.fillStyle = "#888";
        [plateX + 5, plateX + plateW - 5].forEach(sx => {
            g.beginPath();
            g.arc(sx, plateY + plateH / 2, 2, 0, Math.PI * 2);
            g.fill();
        });

        g.restore();

        // Dirt/mud splashes from wheels
        g.fillStyle = "rgba(120,100,60,0.12)";
        for (let i = 0; i < 8; i++) {
            const dx = tx + 40 + i * 20 + Math.sin(frame * 0.05 + i * 2) * 5;
            const dy = groundY + 3 + Math.abs(Math.sin(frame * 0.07 + i)) * 10;
            g.beginPath();
            g.arc(dx + bounce, dy, 3 + Math.sin(i) * 2, 0, Math.PI * 2);
            g.fill();
        }

        requestAnimationFrame(draw);
    }

    function drawWheel(cx, cy, r) {
        // Tire
        g.fillStyle = "#222";
        g.strokeStyle = "#111";
        g.lineWidth = 3;
        g.beginPath();
        g.arc(cx, cy, r, 0, Math.PI * 2);
        g.fill();
        g.stroke();

        // Tread pattern
        g.strokeStyle = "#333";
        g.lineWidth = 2;
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
            const offset = (frame * 0.05) % (Math.PI / 3);
            const angle = a + offset;
            g.beginPath();
            g.moveTo(cx + Math.cos(angle) * (r - 5), cy + Math.sin(angle) * (r - 5));
            g.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
            g.stroke();
        }

        // Hub
        g.fillStyle = "#444";
        g.beginPath();
        g.arc(cx, cy, r * 0.4, 0, Math.PI * 2);
        g.fill();

        // Hub center
        g.fillStyle = "#666";
        g.beginPath();
        g.arc(cx, cy, r * 0.15, 0, Math.PI * 2);
        g.fill();

        // Lug nuts
        g.fillStyle = "#888";
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 2.5) {
            g.beginPath();
            g.arc(
                cx + Math.cos(a) * r * 0.28,
                cy + Math.sin(a) * r * 0.28,
                2, 0, Math.PI * 2
            );
            g.fill();
        }
    }

    draw();
})();
