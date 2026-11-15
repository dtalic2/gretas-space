// ---------- The guardian ----------
//
// A giant asleep next to its nest. It hears rather than sees: noise from the
// player fills an alert meter, the meter fills faster the closer you are, and at
// full it stands up and comes after you. Taking an egg skips all of that and
// wakes it instantly — that is the deal the game makes, and why the run home is
// the real game.
//
// It will not set foot in your pen. It stops at the fence, stomps, and walks
// back to its nest to lie down again.

import * as THREE from 'three';

const SLEEP = 'sleep', WAKING = 'waking', CHASE = 'chase', RETURN = 'return', SETTLE = 'settle';

function labelSprite(text, color = '#ffffff'){
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.font = 'bold 90px system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = 10;
  g.strokeStyle = 'rgba(0,0,0,0.55)';
  g.strokeText(text, 64, 68);
  g.fillStyle = color;
  g.fillText(text, 64, 68);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  s.scale.setScalar(1.1);
  return s;
}

export class Guardian {
  constructor(nest, biome, speed, wake){
    this.nest = nest;
    this.speed = speed;
    this.wakeRate = wake;
    this.state = SLEEP;
    this.alert = 0;
    this.chaseTime = 0;
    this.lie = 1;                  // 1 flat out asleep, 0 up on its feet
    this.stompTimer = 0;
    this.scale = 1 + nest.tier * 0.12;

    // It sleeps just off the nest, between the nest and the middle of the world.
    const away = nest.pos.clone().multiplyScalar(0.86);
    this.home = new THREE.Vector3(away.x, 0, away.z);
    this.pos = this.home.clone();
    this.facing = Math.atan2(-nest.pos.x, -nest.pos.z);

    this.build(biome);
  }

  build(biome){
    const g = this.group = new THREE.Group();
    const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
    const box = (w, h, d, c) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c));

    this.body = box(1.9, 2.0, 1.2, biome.guardShirt);
    this.body.position.y = 2.1;
    g.add(this.body);

    this.head = new THREE.Group();
    const skull = this.skull = box(1.4, 1.25, 1.3, biome.guard);
    this.head.add(skull);

    // closed eyes: two dark lines. open eyes: whites with pupils.
    this.shut = new THREE.Group();
    this.open = new THREE.Group();
    for (const s of [-1, 1]){
      const lid = box(0.36, 0.08, 0.06, 0x2b1d16);
      lid.position.set(s * 0.33, 0.08, 0.67);
      this.shut.add(lid);

      const white = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), mat(0xffffff));
      white.position.set(s * 0.33, 0.12, 0.6);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), mat(0x1a1210));
      pupil.position.set(s * 0.33, 0.12, 0.76);
      this.open.add(white, pupil);

      const brow = box(0.42, 0.11, 0.1, 0x2b1d16);
      brow.position.set(s * 0.33, 0.36, 0.66);
      brow.rotation.z = s * 0.25;
      this.open.add(brow);
    }
    this.open.visible = false;
    this.head.add(this.shut, this.open);

    const mouth = box(0.6, 0.12, 0.1, 0x3a241c);
    mouth.position.set(0, -0.34, 0.66);
    this.head.add(mouth);
    this.mouth = mouth;

    if (biome.id === 'frost' || biome.id === 'starfall'){
      for (const s of [-1, 1]){
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.6, 7), mat(0xf0e6d8));
        horn.position.set(s * 0.5, 0.82, 0);
        horn.rotation.z = s * 0.3;
        this.head.add(horn);
      }
    }

    this.head.position.y = 3.6;
    g.add(this.head);

    this.larm = box(0.5, 1.5, 0.5, biome.guard);
    this.larm.position.set(-1.2, 2.3, 0);
    this.rarm = box(0.5, 1.5, 0.5, biome.guard);
    this.rarm.position.set(1.2, 2.3, 0);
    this.lleg = box(0.6, 1.2, 0.6, biome.guardShirt);
    this.lleg.position.set(-0.45, 0.6, 0);
    this.rleg = box(0.6, 1.2, 0.6, biome.guardShirt);
    this.rleg.position.set(0.45, 0.6, 0);
    g.add(this.larm, this.rarm, this.lleg, this.rleg);

    g.traverse((m) => { if (m.isMesh) m.castShadow = true; });

    // the two things floating over its head
    this.zzz = labelSprite('z', '#cfe9ff');
    this.zzz.position.set(0.7, 4.8, 0);
    g.add(this.zzz);

    this.bang = labelSprite('!', '#ff4d4d');
    this.bang.position.set(0, 5.0, 0);
    this.bang.visible = false;
    g.add(this.bang);

    // the alert ring, which is how you know you are pushing your luck
    this.ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.5, 0.1, 6, 18),
      new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.9 }),
    );
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 4.7;
    this.ring.visible = false;
    g.add(this.ring);

    // Just the solid parts. The camera asks what is in its way, and the answer
    // must not include the floating z's.
    this.bulk = [this.body, this.skull, this.larm, this.rarm, this.lleg, this.rleg];

    g.scale.setScalar(this.scale);
    g.position.copy(this.pos);
    this.applyPose();
  }

  get asleep(){ return this.state === SLEEP; }
  get chasing(){ return this.state === CHASE; }

  /** Lying down is the whole body tipped back and dropped to the ground. */
  applyPose(){
    const l = this.lie;
    this.group.rotation.x = -1.35 * l;
    this.group.position.y = this.pos.y + l * 0.9;
    this.group.rotation.y = this.facing;
  }

  /** An egg left its nest — nothing subtle about this one. */
  startle(){
    if (this.state === SLEEP || this.state === SETTLE){
      this.alert = 1;
      this.state = WAKING;
      this.wakeT = 0;
      return true;
    }
    if (this.state === RETURN){ this.state = CHASE; this.chaseTime = 0; return true; }
    return false;
  }

  update(dt, ctx){
    const { playerPos, noise, inPen, onCatch, onStomp, onWake } = ctx;
    const d = Math.hypot(playerPos.x - this.pos.x, playerPos.z - this.pos.z);

    switch (this.state){
      case SLEEP: {
        // Closer is louder: the same footstep at 6 metres is worth far more than
        // at 20. Below the threshold it decays, so creeping is actually possible.
        const heard = noise * (60 / (60 + d * d));
        this.alert = Math.max(0, Math.min(1, this.alert + (heard * this.wakeRate * 2.2 - 0.22) * dt));
        if (this.alert >= 1){
          this.state = WAKING;
          this.wakeT = 0;
          onWake?.(this);
        }
        break;
      }

      case WAKING: {
        this.wakeT += dt;
        this.lie = Math.max(0, 1 - this.wakeT / 0.55);
        this.facing = Math.atan2(playerPos.x - this.pos.x, playerPos.z - this.pos.z);
        if (this.wakeT > 0.55){
          this.state = CHASE;
          this.chaseTime = 0;
        }
        break;
      }

      case CHASE: {
        this.chaseTime += dt;
        const want = Math.atan2(playerPos.x - this.pos.x, playerPos.z - this.pos.z);
        this.facing += Math.atan2(Math.sin(want - this.facing), Math.cos(want - this.facing)) * Math.min(1, dt * 6);

        const step = this.speed * dt;
        this.pos.x += Math.sin(this.facing) * step;
        this.pos.z += Math.cos(this.facing) * step;

        this.stompTimer -= dt;
        if (this.stompTimer <= 0){
          this.stompTimer = 0.42;
          onStomp?.(this, d);
        }

        // It lumbers for a moment first, so even a point-blank theft gives you
        // a running start.
        if (this.chaseTime > 0.8 && d < 2.1 * this.scale) onCatch?.(this);
        // It gives up at your gate, or when it has simply had enough.
        if (inPen || this.chaseTime > 12) this.state = RETURN;
        break;
      }

      case RETURN: {
        const dx = this.home.x - this.pos.x, dz = this.home.z - this.pos.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.6){
          this.state = SETTLE;
          this.settleT = 0;
        } else {
          const want = Math.atan2(dx, dz);
          this.facing += Math.atan2(Math.sin(want - this.facing), Math.cos(want - this.facing)) * Math.min(1, dt * 5);
          const step = this.speed * 0.7 * dt;
          this.pos.x += Math.sin(this.facing) * step;
          this.pos.z += Math.cos(this.facing) * step;
        }
        this.alert = Math.max(0, this.alert - dt * 0.5);
        break;
      }

      case SETTLE: {
        this.settleT += dt;
        this.lie = Math.min(1, this.settleT / 0.8);
        this.alert = Math.max(0, this.alert - dt);
        if (this.settleT > 0.8){
          this.state = SLEEP;
          this.alert = 0;
          this.facing = Math.atan2(-this.nest.pos.x, -this.nest.pos.z);
        }
        break;
      }
    }

    this.animate(dt, ctx.time, d);
    this.group.position.set(this.pos.x, 0, this.pos.z);
    this.applyPose();
  }

  animate(dt, t, d){
    const awake = this.state === CHASE || this.state === WAKING;
    this.open.visible = awake || this.alert > 0.55;
    this.shut.visible = !this.open.visible;

    // breathing while asleep, pounding arms and legs while chasing
    if (this.state === SLEEP || this.state === SETTLE){
      const b = 1 + Math.sin(t * 1.4) * 0.03;
      this.body.scale.set(b, 1, b);
      this.larm.rotation.x = 0.1;
      this.rarm.rotation.x = 0.1;
      this.lleg.rotation.x = 0;
      this.rleg.rotation.x = 0;
      this.head.rotation.z = Math.sin(t * 0.7) * 0.05;
    } else {
      const s = Math.sin(t * 11);
      this.larm.rotation.x = s * 1.1;
      this.rarm.rotation.x = -s * 1.1;
      this.lleg.rotation.x = -s * 0.9;
      this.rleg.rotation.x = s * 0.9;
      this.body.scale.set(1, 1, 1);
      this.head.rotation.z = 0;
      this.mouth.scale.y = 2.4;
    }
    if (!awake) this.mouth.scale.y = 1;

    // z's drift up while it sleeps
    this.zzz.visible = this.state === SLEEP && this.alert < 0.8;
    if (this.zzz.visible){
      const k = (t % 2.2) / 2.2;
      this.zzz.position.set(0.7 + k * 0.5, 4.6 + k * 1.1, 0);
      this.zzz.material.opacity = 1 - k;
      this.zzz.scale.setScalar(0.8 + k * 0.7);
    }

    this.bang.visible = awake;
    if (this.bang.visible){
      this.bang.scale.setScalar(1.2 + Math.sin(t * 14) * 0.18);
    }

    // the alert ring: only while it matters, and only when you are near enough
    // to do anything about it.
    const show = this.state === SLEEP && this.alert > 0.04 && d < 26;
    this.ring.visible = show;
    if (show){
      this.ring.scale.setScalar(0.6 + this.alert * 1.1);
      this.ring.material.color.setHSL((1 - this.alert) * 0.16, 0.95, 0.55);
      this.ring.material.opacity = 0.35 + this.alert * 0.6;
      this.ring.rotation.z += dt * (0.6 + this.alert * 4);
    }
  }
}
