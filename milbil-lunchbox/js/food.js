// ---------- Drawing the food ----------
//
// Same flat style as Milbil Cooking: one or two tones a shape, a white shine,
// a soft shadow and no outlines, all inside a 64×64 box. Everything is drawn
// small enough to read at the size of a lunchbox compartment.

const SHADOW = '<ellipse cx="32" cy="57.5" rx="19" ry="3.4" fill="#0000001c"/>';
const shine = (x, y, rx = 4, ry = 2.2, rot = -25) =>
  `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#fff" opacity=".55" transform="rotate(${rot} ${x} ${y})"/>`;

// ------------------------------------------------------- packet shapes ---

const bag = (body, dark, inner) => `${SHADOW}
  <path d="M15 17 H49 L52 53 Q52 56 49 56 H15 Q12 56 12 53 Z" fill="${body}"/>
  <path d="M15 10 l3 -3 l3 3 l3 -3 l3 3 l3 -3 l3 3 l3 -3 l3 3 l3 -3 l3 3 l3 -3 l3 3 v8 h-34z" fill="${dark}"/>
  <circle cx="32" cy="37" r="12" fill="#fff"/>
  <g transform="translate(32 37)">${inner}</g>
  ${shine(20, 26, 2.4, 7, 0)}`;

const pot = (body, lid, inner) => `${SHADOW}
  <path d="M17 21 H47 L44 53 Q43.6 56 41 56 H23 Q20.4 56 20 53 Z" fill="${body}"/>
  <rect x="14" y="14" width="36" height="8" rx="3" fill="${lid}"/>
  <g transform="translate(32 37)">${inner}</g>
  ${shine(23, 29, 2, 6, 0)}`;

const carton = (face, side, label, inner = '') => `${SHADOW}
  <path d="M17 23 L27 12 L37 23 Z" fill="${face}"/>
  <path d="M27 12 L37 7 L47 18 L37 23 Z" fill="${side}"/>
  <rect x="17" y="23" width="20" height="33" fill="${face}"/>
  <path d="M37 23 L47 18 V51 L37 56 Z" fill="${side}"/>
  <rect x="19" y="31" width="16" height="15" rx="3" fill="${label}"/>
  <g transform="translate(27 38.5)">${inner}</g>
  ${shine(21, 27, 1.6, 3, 0)}`;

const bottle = (body, cap, inner) => `${SHADOW}
  <rect x="27" y="4" width="10" height="7" rx="2" fill="${cap}"/>
  <path d="M28 10 h8 v6 q10 4 10 13 v22 q0 5 -5 5 h-18 q-5 0 -5 -5 v-22 q0 -9 10 -13 Z" fill="${body}"/>
  <rect x="21" y="33" width="22" height="14" rx="4" fill="#fff" opacity=".92"/>
  <g transform="translate(32 40)">${inner}</g>
  ${shine(23, 28, 2, 4, 0)}`;

const leafTop = (x, y) => `<path d="M${x} ${y} q-7 -5 -9 1 q6 4 9 -1Z" fill="#4e9a33"/>
  <path d="M${x} ${y} q7 -5 9 1 q-6 4 -9 -1Z" fill="#6cc24a"/>`;

// ------------------------------------------------------------- the food ---

const ICONS = {
  // --- mains ---
  cheesesandwich: () => `${SHADOW}
    <path d="M10 44 L32 12 L54 44 Z" fill="#e8c88a"/>
    <path d="M14 42 L32 16 L50 42 Z" fill="#fff0cf"/>
    <path d="M17 38 L32 22 L47 38 Z" fill="#f7c843"/>
    <path d="M21 34 L32 28 L43 34 Z" fill="#f6a93b"/>
    <rect x="10" y="44" width="44" height="5" rx="2.5" fill="#d9b370"/>
    ${shine(24, 26, 3.4, 1.8)}`,

  jamsandwich: () => `${SHADOW}
    <rect x="11" y="18" width="42" height="30" rx="7" fill="#e8c88a"/>
    <rect x="14" y="21" width="36" height="24" rx="5" fill="#fff0cf"/>
    <path d="M14 30 q9 -4 18 0 t18 0 v6 q-9 4 -18 0 t-18 0Z" fill="#d93a55"/>
    <path d="M14 21 h36 v3 h-36z" fill="#e0b071" opacity=".5"/>
    ${shine(22, 25, 4, 2)}`,

  wrap: () => `${SHADOW}
    <path d="M22 54 L30 10 q10 -3 14 4 L36 56 Z" fill="#f2dcae"/>
    <path d="M30 10 q10 -3 14 4 l-3 3 q-6 -5 -13 -2Z" fill="#e3c68d"/>
    <path d="M24 44 L41 44 L39 54 L25.5 54Z" fill="#fff" opacity=".9"/>
    <path d="M27 20 q6 -3 11 1 l-1 5 q-5 -4 -11 -1Z" fill="#8cc63f"/>
    <path d="M26 28 q6 -3 11 1 l-1 4 q-5 -4 -11 -1Z" fill="#ef6f5a"/>
    <path d="M25 35 q6 -3 11 1 l-1 4 q-5 -4 -11 -1Z" fill="#f7e2a8"/>
    ${shine(29, 18, 2.4, 5, 10)}`,

  pastasalad: () => `${SHADOW}
    <path d="M13 32 h38 l-3 20 q-.4 4 -5 4 H21 q-4.6 0 -5 -4 Z" fill="#f4f1ea"/>
    <ellipse cx="32" cy="32" rx="19" ry="7" fill="#fff"/>
    <ellipse cx="32" cy="31" rx="16" ry="5.6" fill="#f7d774"/>
    <g fill="#f2c94c"><circle cx="25" cy="30" r="3.2"/><circle cx="33" cy="33" r="3.2"/><circle cx="40" cy="29.5" r="3.2"/><circle cx="29" cy="27" r="2.8"/></g>
    <circle cx="36" cy="28" r="2.6" fill="#e5484d"/><circle cx="22" cy="33" r="2.2" fill="#e5484d"/>
    <path d="M28 34 q4 -3 8 0" stroke="#6cc24a" stroke-width="2" fill="none" stroke-linecap="round"/>
    ${shine(22, 29, 3, 1.4)}`,

  sushi: () => `${SHADOW}
    <g><rect x="8" y="30" width="20" height="22" rx="6" fill="#2f3b2a"/>
      <rect x="11" y="33" width="14" height="16" rx="4" fill="#fdfbf3"/>
      <circle cx="18" cy="41" r="4.4" fill="#ff7a59"/><circle cx="18" cy="41" r="1.8" fill="#ffb59c"/></g>
    <g><rect x="25" y="24" width="21" height="28" rx="6" fill="#2f3b2a"/>
      <rect x="28" y="27" width="15" height="22" rx="4" fill="#fdfbf3"/>
      <circle cx="35.5" cy="38" r="5" fill="#f5a623"/><path d="M33 34 q3 7 5 2" stroke="#6cc24a" stroke-width="2" fill="none"/></g>
    <g><rect x="43" y="32" width="18" height="20" rx="6" fill="#2f3b2a"/>
      <rect x="46" y="35" width="12" height="14" rx="4" fill="#fdfbf3"/>
      <circle cx="52" cy="42" r="3.8" fill="#ff7a59"/></g>
    ${shine(14, 36, 2, 4, 0)}`,

  soup: () => `${SHADOW}
    <path d="M14 26 h36 l-3 24 q-.5 5 -6 5 H23 q-5.5 0 -6 -5 Z" fill="#dfe6ef"/>
    <path d="M14 26 h36 l-1 7 H15 Z" fill="#c8d3e0"/>
    <ellipse cx="32" cy="27" rx="18" ry="5.5" fill="#e5484d"/>
    <ellipse cx="32" cy="26.5" rx="14" ry="4" fill="#f4675f"/>
    <path d="M24 16 q4 -4 0 -8 M32 14 q4 -5 0 -9 M40 16 q4 -4 0 -8" stroke="#fff" stroke-width="2.4" fill="none" opacity=".75" stroke-linecap="round"/>
    ${shine(23, 26, 3, 1.4)}`,

  pizza: () => `${SHADOW}
    <path d="M32 8 L56 50 Q32 58 8 50 Z" fill="#e8b84f"/>
    <path d="M32 14 L51 48 Q32 54 13 48 Z" fill="#f7c843"/>
    <path d="M32 18 L48 46 Q32 51 16 46 Z" fill="#f0a93b" opacity=".6"/>
    <g fill="#d93a3a"><circle cx="32" cy="30" r="4"/><circle cx="23" cy="42" r="3.6"/><circle cx="41" cy="42" r="3.6"/><circle cx="32" cy="45" r="3"/></g>
    <g fill="#fff8e1" opacity=".8"><circle cx="27" cy="36" r="2"/><circle cx="37" cy="35" r="1.8"/></g>
    ${shine(29, 20, 2.6, 1.4)}`,

  // --- fruit ---
  apple: () => `${SHADOW}
    <path d="M32 18 C20 14 10 22 11 34 C12 47 22 56 32 52 C42 56 52 47 53 34 C54 22 44 14 32 18Z" fill="#e5484d"/>
    <path d="M28 21 C20 20 15 27 16 35 C17 44 23 50 28 49 C22 44 19 32 28 21Z" fill="#ff7b74" opacity=".55"/>
    <rect x="30.5" y="11" width="3" height="9" rx="1.5" fill="#8a5a2b"/>
    ${leafTop(34, 14)}
    ${shine(24, 27, 3.6, 2.2)}`,

  banana: () => `${SHADOW}
    <path d="M14 20 q2 24 20 29 q16 4 18 -5 q-3 4 -13 1 Q20 40 20 18Z" fill="#e8b800"/>
    <path d="M14 20 q2 22 19 27 q14 3 17 -3 q-5 2 -14 -1 Q19 38 19 19Z" fill="#f7d13c"/>
    <path d="M24 42 q8 5 18 4" stroke="#ffe77a" stroke-width="2.4" fill="none" opacity=".8" stroke-linecap="round"/>
    <path d="M13 17 l5 -4 l4 5" fill="#6b4f22"/>
    <circle cx="51" cy="44" r="2.4" fill="#6b4f22"/>
    ${shine(23, 31, 2, 6, 40)}`,

  grapes: () => `${SHADOW}
    <path d="M33 16 q-1 -6 4 -9" stroke="#6b4f22" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    ${leafTop(38, 10)}
    <g fill="#8e4fd0">
      <circle cx="25" cy="25" r="6.4"/><circle cx="39" cy="25" r="6.4"/><circle cx="32" cy="23" r="6.4"/>
      <circle cx="21" cy="35" r="6.4"/><circle cx="32" cy="34" r="6.4"/><circle cx="43" cy="35" r="6.4"/>
      <circle cx="26" cy="44" r="6.4"/><circle cx="38" cy="44" r="6.4"/><circle cx="32" cy="51" r="5.6"/></g>
    <g fill="#b47ae8" opacity=".75"><circle cx="23" cy="23" r="2"/><circle cx="30" cy="32" r="2"/><circle cx="36" cy="42" r="1.8"/></g>`,

  tangerine: () => `${SHADOW}
    <circle cx="32" cy="35" r="20" fill="#f0821e"/>
    <circle cx="32" cy="35" r="20" fill="none" stroke="#d96a0c" stroke-width="2" opacity=".35"/>
    <path d="M24 20 q8 -4 16 0" stroke="#ffb866" stroke-width="3" fill="none" opacity=".6" stroke-linecap="round"/>
    <rect x="30.5" y="12" width="3" height="6" rx="1.5" fill="#6b4f22"/>
    ${leafTop(35, 15)}
    ${shine(24, 28, 4, 2.4)}`,

  strawberries: () => `${SHADOW}
    <g transform="translate(-9 4) rotate(-12 32 36)">
      <path d="M32 20 q12 0 12 12 q0 14 -12 20 q-12 -6 -12 -20 q0 -12 12 -12Z" fill="#e5244a"/>
      <path d="M22 19 h20 l-4 5 h-12Z" fill="#4e9a33"/><rect x="30.5" y="13" width="3" height="7" rx="1.5" fill="#4e9a33"/>
      <g fill="#ffe08a"><circle cx="29" cy="30" r="1.3"/><circle cx="36" cy="33" r="1.3"/><circle cx="31" cy="38" r="1.3"/><circle cx="37" cy="42" r="1.3"/><circle cx="27" cy="44" r="1.3"/></g></g>
    <g transform="translate(9 0) rotate(14 32 36)">
      <path d="M32 20 q12 0 12 12 q0 14 -12 20 q-12 -6 -12 -20 q0 -12 12 -12Z" fill="#ff3d5e"/>
      <path d="M22 19 h20 l-4 5 h-12Z" fill="#6cc24a"/><rect x="30.5" y="13" width="3" height="7" rx="1.5" fill="#4e9a33"/>
      <g fill="#ffe08a"><circle cx="29" cy="30" r="1.3"/><circle cx="36" cy="33" r="1.3"/><circle cx="31" cy="38" r="1.3"/><circle cx="37" cy="42" r="1.3"/><circle cx="27" cy="44" r="1.3"/></g>
      ${shine(27, 28, 2.4, 1.4)}</g>`,

  blueberries: () => `${SHADOW}
    <path d="M14 34 h36 l-3 18 q-.4 4 -5 4 H22 q-4.6 0 -5 -4Z" fill="#f4f1ea"/>
    <ellipse cx="32" cy="34" rx="18" ry="6" fill="#fff"/>
    <g fill="#3b57a8"><circle cx="24" cy="31" r="5.2"/><circle cx="34" cy="33" r="5.2"/><circle cx="42" cy="30" r="5"/><circle cx="29" cy="25" r="5"/><circle cx="38" cy="24" r="4.6"/></g>
    <g fill="#243b7a"><path d="M24 27 l1.6 1.6 1.6 -1.6" stroke="#243b7a" stroke-width="1.2" fill="none"/></g>
    <g fill="#8aa0e0" opacity=".8"><circle cx="22" cy="29" r="1.5"/><circle cx="32" cy="31" r="1.4"/><circle cx="27" cy="23" r="1.3"/></g>`,

  // --- veg ---
  carrotsticks: () => `${SHADOW}
    <g fill="#f0821e">
      <rect x="16" y="20" width="8" height="34" rx="4" transform="rotate(-7 20 37)"/>
      <rect x="28" y="16" width="8" height="38" rx="4"/>
      <rect x="40" y="20" width="8" height="34" rx="4" transform="rotate(7 44 37)"/></g>
    <g fill="#ffb366" opacity=".7">
      <rect x="18" y="24" width="2.6" height="26" rx="1.3" transform="rotate(-7 20 37)"/>
      <rect x="30" y="20" width="2.6" height="30" rx="1.3"/>
      <rect x="42" y="24" width="2.6" height="26" rx="1.3" transform="rotate(7 44 37)"/></g>`,

  cucumber: () => `${SHADOW}
    <g><circle cx="22" cy="40" r="12" fill="#2f7d32"/><circle cx="22" cy="40" r="9.4" fill="#cfe8a8"/>
      <g fill="#a8d178"><ellipse cx="19" cy="38" rx="1.6" ry="2.2"/><ellipse cx="25" cy="38" rx="1.6" ry="2.2"/><ellipse cx="22" cy="43" rx="1.6" ry="2.2"/></g></g>
    <g><circle cx="38" cy="33" r="13" fill="#3a8f3a"/><circle cx="38" cy="33" r="10.2" fill="#dff0b8"/>
      <g fill="#aad57c"><ellipse cx="34.5" cy="31" rx="1.8" ry="2.4"/><ellipse cx="41" cy="31" rx="1.8" ry="2.4"/><ellipse cx="38" cy="36.5" rx="1.8" ry="2.4"/></g>
      ${shine(33, 27, 2.6, 1.4)}</g>`,

  tomatoes: () => `${SHADOW}
    <g><circle cx="22" cy="40" r="11" fill="#d93a3a"/><path d="M19 30 l3 2 l3 -2" stroke="#3f9a2a" stroke-width="2.4" fill="none" stroke-linecap="round"/></g>
    <g><circle cx="41" cy="42" r="10" fill="#c73232"/><path d="M38 33 l3 2 l3 -2" stroke="#3f9a2a" stroke-width="2.2" fill="none" stroke-linecap="round"/></g>
    <g><circle cx="33" cy="28" r="11.5" fill="#e5484d"/>
      <path d="M29 17 l4 3 l4 -3" stroke="#4caf50" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      ${shine(28, 23, 3, 1.8)}</g>`,

  snappeas: () => `${SHADOW}
    <g transform="rotate(-18 32 36)">
      <path d="M12 38 q20 -12 40 0 q-20 10 -40 0Z" fill="#4e9a33"/>
      <path d="M14 37 q18 -9 36 0 q-18 7 -36 0Z" fill="#7cc24a"/>
      <g fill="#b7e08a"><circle cx="22" cy="37" r="3"/><circle cx="31" cy="37.6" r="3"/><circle cx="40" cy="37" r="3"/></g></g>
    <g transform="rotate(14 32 48) translate(0 8)">
      <path d="M16 38 q16 -9 32 0 q-16 8 -32 0Z" fill="#3f8a2a"/>
      <path d="M18 37.4 q14 -7 28 0 q-14 6 -28 0Z" fill="#6cb53f"/></g>`,

  sweetcorn: () => `${SHADOW}
    <path d="M17 28 h30 l-3 24 q-.4 4 -5 4 H25 q-4.6 0 -5 -4Z" fill="#f4f1ea"/>
    <ellipse cx="32" cy="28" rx="15" ry="5.5" fill="#fff"/>
    <g fill="#f5c518"><circle cx="25" cy="27" r="3"/><circle cx="32" cy="29" r="3"/><circle cx="39" cy="27" r="3"/><circle cx="28.5" cy="23.5" r="2.8"/><circle cx="36" cy="23.5" r="2.8"/><circle cx="32" cy="20.5" r="2.6"/></g>
    <g fill="#ffe17a"><circle cx="24" cy="26" r="1.1"/><circle cx="31" cy="28" r="1.1"/><circle cx="35" cy="22.5" r="1"/></g>
    <path d="M22 38 h20" stroke="#e8e2d4" stroke-width="2" stroke-linecap="round"/>`,

  // --- snacks ---
  crackers: () => `${SHADOW}
    <g transform="rotate(-10 26 40)"><rect x="12" y="28" width="26" height="26" rx="4" fill="#dfae63"/>
      <g fill="#b8894a"><circle cx="19" cy="35" r="1.4"/><circle cx="31" cy="35" r="1.4"/><circle cx="25" cy="41" r="1.4"/><circle cx="19" cy="47" r="1.4"/><circle cx="31" cy="47" r="1.4"/></g></g>
    <g transform="rotate(12 40 34)"><rect x="27" y="20" width="26" height="26" rx="4" fill="#f0c67e"/>
      <g fill="#c9974f"><circle cx="34" cy="27" r="1.4"/><circle cx="46" cy="27" r="1.4"/><circle cx="40" cy="33" r="1.4"/><circle cx="34" cy="39" r="1.4"/><circle cx="46" cy="39" r="1.4"/></g>
      ${shine(34, 25, 3, 1.6)}</g>`,

  cheesecubes: () => `${SHADOW}
    <g><path d="M12 36 L22 30 L32 36 L22 42Z" fill="#ffd95e"/><path d="M12 36 L22 42 V53 L12 47Z" fill="#edbd3a"/><path d="M32 36 L22 42 V53 L32 47Z" fill="#f7cc4c"/></g>
    <g><path d="M30 32 L40 26 L50 32 L40 38Z" fill="#ffe27a"/><path d="M30 32 L40 38 V49 L30 43Z" fill="#f0c348"/><path d="M50 32 L40 38 V49 L50 43Z" fill="#ffd95e"/>
      <circle cx="35" cy="42" r="1.8" fill="#e0ad2e"/><circle cx="45" cy="40" r="1.6" fill="#f0c348"/></g>
    <g><path d="M22 22 L32 16 L42 22 L32 28Z" fill="#fff0ad"/><path d="M22 22 L32 28 V38 L22 32Z" fill="#ffd95e"/><path d="M42 22 L32 28 V38 L42 32Z" fill="#ffe999"/>
      ${shine(29, 21, 2.6, 1.4)}</g>`,

  boiledegg: () => `${SHADOW}
    <ellipse cx="20" cy="38" rx="13" ry="16" fill="#fdfaf2"/>
    <ellipse cx="18" cy="33" rx="4" ry="6" fill="#fff" opacity=".8"/>
    <g><ellipse cx="42" cy="40" rx="13" ry="14" fill="#fdfaf2"/>
      <ellipse cx="42" cy="40" rx="10.5" ry="11" fill="#fffdf6"/>
      <circle cx="42" cy="40" r="5.6" fill="#f5b942"/><circle cx="40" cy="38" r="1.8" fill="#ffd87a"/></g>
    <path d="M30 25 l3 3 l3 -3 l3 3" stroke="#eee6d4" stroke-width="2" fill="none" stroke-linecap="round"/>`,

  popcorn: () => `${SHADOW}
    <path d="M18 28 h28 l-2 25 q-.4 3 -4 3 H24 q-3.6 0 -4 -3Z" fill="#e5484d"/>
    <g fill="#fff" opacity=".9"><rect x="22" y="30" width="5" height="26"/><rect x="31" y="30" width="5" height="26"/><rect x="40" y="30" width="4" height="26"/></g>
    <g fill="#fff6d9">
      <circle cx="22" cy="24" r="6"/><circle cx="32" cy="19" r="7"/><circle cx="43" cy="24" r="6.4"/>
      <circle cx="27" cy="28" r="5.4"/><circle cx="38" cy="28" r="5.4"/></g>
    <g fill="#ffeab0"><circle cx="20" cy="23" r="2"/><circle cx="31" cy="17" r="2.4"/><circle cx="44" cy="24" r="2"/></g>`,

  pretzels: () => `${SHADOW}
    <g stroke="#b5731f" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 46 q-8 -6 -4 -14 q4 -8 14 -2 q10 -6 14 2 q4 8 -4 14"/>
      <path d="M22 46 q10 6 20 0"/></g>
    <g stroke="#d99a3c" stroke-width="3.4" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 46 q-8 -6 -4 -14 q4 -8 14 -2 q10 -6 14 2 q4 8 -4 14"/>
      <path d="M22 46 q10 6 20 0"/></g>
    <g fill="#fff"><circle cx="21" cy="34" r="1.3"/><circle cx="32" cy="29" r="1.3"/><circle cx="44" cy="35" r="1.3"/><circle cx="32" cy="50" r="1.3"/></g>`,

  trailmix: () => bag('#8a5a2b', '#6b4420',
    `<circle cx="-5" cy="-3" r="3.4" fill="#d9a05b"/><circle cx="3" cy="-4" r="3" fill="#b5651d"/>
     <circle cx="-2" cy="4" r="3.2" fill="#6b3fa0"/><circle cx="5" cy="3" r="2.8" fill="#e5484d"/>
     <circle cx="-7" cy="3" r="2.4" fill="#f5b942"/>`),

  // --- drinks ---
  water: () => `${SHADOW}
    <rect x="26" y="5" width="12" height="7" rx="2.6" fill="#38b6ff"/>
    <path d="M27 11 h10 v5 q9 4 9 13 v23 q0 4 -4 4 h-20 q-4 0 -4 -4 v-23 q0 -9 9 -13 Z" fill="#dff1ff" opacity=".9"/>
    <path d="M22 33 q10 -3 20 0 v19 q0 4 -4 4 h-12 q-4 0 -4 -4Z" fill="#8fd4ff" opacity=".85"/>
    <rect x="22" y="29" width="20" height="8" rx="3" fill="#fff" opacity=".8"/>
    <path d="M28 31.5 q4 -2 8 0" stroke="#38b6ff" stroke-width="2" fill="none" stroke-linecap="round"/>
    ${shine(25, 25, 1.8, 5, 0)}`,

  juice: () => carton('#ffb300', '#e09000', '#fff6d9',
    `<path d="M-4 2 q4 -8 8 0 q-4 4 -8 0Z" fill="#f0821e"/><circle cx="0" cy="-3" r="2.2" fill="#f5b942"/>`) +
    `<path d="M38 12 q7 -6 9 -10" stroke="#e5484d" stroke-width="3.4" fill="none" stroke-linecap="round"/>`,

  milk: () => carton('#f6fbff', '#d8e8f7', '#5fa8f5',
    `<ellipse rx="5" ry="3.4" fill="#fff"/><path d="M-4 1 q4 3 8 0" stroke="#5fa8f5" stroke-width="1.6" fill="none"/>`),

  smoothie: () => `${SHADOW}
    <path d="M20 20 h24 l-3 32 q-.4 4 -5 4 H28 q-4.6 0 -5 -4Z" fill="#ffffff" opacity=".55"/>
    <path d="M21.4 32 h21.2 l-2 20 q-.4 4 -5 4 H28.4 q-4.6 0 -5 -4Z" fill="#b05cf0"/>
    <ellipse cx="32" cy="32" rx="10.6" ry="3" fill="#c98cf5"/>
    <rect x="18" y="16" width="28" height="5" rx="2.5" fill="#e5e9f0"/>
    <path d="M34 18 q6 -10 10 -13" stroke="#ff6fa5" stroke-width="4" fill="none" stroke-linecap="round"/>
    <circle cx="27" cy="36" r="1.8" fill="#dcb0ff"/><circle cx="36" cy="41" r="1.4" fill="#dcb0ff"/>
    ${shine(25, 40, 1.8, 6, 0)}`,

  hotchoc: () => `${SHADOW}
    <path d="M17 26 h28 v20 q0 8 -8 8 H25 q-8 0 -8 -8Z" fill="#fff"/>
    <path d="M45 30 q9 0 9 7 q0 7 -9 7" stroke="#fff" stroke-width="4" fill="none"/>
    <ellipse cx="31" cy="27" rx="13" ry="4.4" fill="#6b3e26"/>
    <ellipse cx="31" cy="26.6" rx="10" ry="3.2" fill="#8a5634"/>
    <circle cx="27" cy="26" r="2.6" fill="#ffd8e7"/><circle cx="34" cy="27" r="2.2" fill="#fff"/>
    <path d="M24 17 q4 -4 0 -8 M33 15 q4 -5 0 -9" stroke="#fff" stroke-width="2.4" fill="none" opacity=".7" stroke-linecap="round"/>
    <path d="M20 34 h22" stroke="#f0ece4" stroke-width="2.4"/>`,

  // --- treats ---
  cookie: () => `${SHADOW}
    <circle cx="32" cy="34" r="19" fill="#d9a05b"/>
    <circle cx="32" cy="34" r="19" fill="none" stroke="#c08a45" stroke-width="2" opacity=".5"/>
    <g fill="#5a321c"><circle cx="25" cy="28" r="3.2"/><circle cx="39" cy="30" r="3"/><circle cx="30" cy="40" r="3.2"/><circle cx="41" cy="41" r="2.6"/><circle cx="21" cy="38" r="2.4"/></g>
    ${shine(24, 25, 3.4, 1.8)}`,

  yogurt: () => pot('#fff', '#ff6fa5',
    `<path d="M-7 -3 q7 -4 14 0 q-7 4 -14 0Z" fill="#ff9ec4"/><circle cx="-2" cy="3" r="2.4" fill="#e5484d"/><circle cx="4" cy="2" r="2" fill="#b05cf0"/>`),

  chocbar: () => `${SHADOW}
    <g transform="rotate(-10 32 36)">
      <rect x="14" y="20" width="36" height="32" rx="4" fill="#6b3e26"/>
      <g fill="#8a5634"><rect x="16.5" y="22.5" width="14.5" height="12.5" rx="2"/><rect x="33" y="22.5" width="14.5" height="12.5" rx="2"/>
        <rect x="16.5" y="37" width="14.5" height="12.5" rx="2"/><rect x="33" y="37" width="14.5" height="12.5" rx="2"/></g>
      <path d="M14 20 h16 v32 h-16z" fill="#e5484d"/>
      <path d="M17 29 h10 v8 h-10z" fill="#fff" opacity=".9"/>
      ${shine(20, 25, 2, 3.4, 0)}</g>`,

  cupcake: () => `${SHADOW}
    <path d="M18 34 h28 l-3 19 q-.4 3 -4 3 H25 q-3.6 0 -4 -3Z" fill="#f2a33c"/>
    <g fill="#d9862a" opacity=".55"><rect x="23" y="35" width="3" height="20"/><rect x="31" y="35" width="3" height="20"/><rect x="39" y="35" width="3" height="20"/></g>
    <path d="M17 34 q0 -14 15 -14 q15 0 15 14Z" fill="#ff9ec4"/>
    <path d="M20 29 q4 -6 12 -6 q8 0 12 6 q-8 -3 -12 -3 q-4 0 -12 3Z" fill="#ffc2da"/>
    <circle cx="32" cy="15" r="4" fill="#e5484d"/>
    <g fill="#fff"><circle cx="24" cy="30" r="1.3"/><circle cx="33" cy="27" r="1.3"/><circle cx="40" cy="31" r="1.3"/></g>`,

  brownie: () => `${SHADOW}
    <path d="M12 30 L32 22 L52 30 L32 38Z" fill="#7a4a2c"/>
    <path d="M12 30 L32 38 V54 L12 46Z" fill="#4f2d18"/>
    <path d="M52 30 L32 38 V54 L52 46Z" fill="#63391f"/>
    <path d="M14 30.8 L32 23.6 L50 30.8 L32 37.4Z" fill="#8a5634"/>
    <g fill="#3a1f0f"><circle cx="26" cy="29" r="2"/><circle cx="37" cy="31" r="1.8"/><circle cx="32" cy="26" r="1.6"/></g>
    ${shine(22, 29, 3, 1.4)}`,
};

/** One food on its own, as an <svg>. */
export const foodSVG = (id, cls = 'food') =>
  `<svg class="${cls}" viewBox="0 0 64 64" aria-hidden="true">${ICONS[id]?.() ?? ''}</svg>`;

/** Just the shapes, for dropping inside a bigger SVG. */
export const foodInner = (id) => ICONS[id]?.() ?? '';
