const $ = (id) => document.getElementById(id);

  const ssidEl = $('ssid');
  const pwEl = $('password');
  const encEl = $('encryption');
  const eccEl = $('ecc');
  const hiddenEl = $('hidden');
  const pwField = $('password-field');
  const pwToggle = $('pw-toggle');
  const payloadEl = $('payload');
  const qrCard = $('qr-card');
  const qrMeta = $('qr-meta');
  const pSizeEl = $('p_size');
  const pBaseEl = $('p_base');
  const pModuleEl = $('p_module');
  const labelEl = $('p_label');
  const fontEl = $('p_font');
  const textSizeEl = $('p_text_size');

  // ── Font lookup ──────────────────────────────────────────────
  // Each entry maps to: OpenSCAD font string, web CSS family, font weight.
  // Inter, Roboto, Ubuntu are loaded via Google Fonts. Arial is a system font.
  // Liberation fonts ship with OpenSCAD by default.
  // For OpenSCAD output, the chosen font must be installed on the user's system —
  // Liberation Sans/Serif/Mono are the only ones guaranteed to be present.
  const FONTS = {
    'inter':            { scad: 'Inter:style=Bold',            css: '"Inter", "Helvetica Neue", sans-serif',     weight: 700 },
    'arial':            { scad: 'Arial:style=Bold',            css: 'Arial, "Helvetica Neue", sans-serif',       weight: 700 },
    'roboto':           { scad: 'Roboto:style=Bold',           css: '"Roboto", "Helvetica Neue", sans-serif',    weight: 700 },
    'ubuntu':           { scad: 'Ubuntu:style=Bold',           css: '"Ubuntu", "Helvetica Neue", sans-serif',    weight: 700 },
    'liberation-sans':  { scad: 'Liberation Sans:style=Bold',  css: '"Helvetica Neue", Arial, sans-serif',       weight: 700 },
    'liberation-serif': { scad: 'Liberation Serif:style=Bold', css: 'Georgia, "Times New Roman", serif',         weight: 700 },
    'liberation-mono':  { scad: 'Liberation Mono:style=Bold',  css: '"JetBrains Mono", "Courier New", monospace', weight: 700 },
  };
  const getFont = () => FONTS[fontEl.value] || FONTS['inter'];

  const pngBtn = $('png-btn');
  const svgBtn = $('svg-btn');
  const scadBtn = $('scad-btn');
  const copyBtn = $('copy-btn');
  const toast = $('toast');

  // ── Constants ────────────────────────────────────────────────
  const BADGE_FRACTION = 0.24;     // icon area ~24% of QR width
  const BADGE_BORDER_FRAC = 0.10;  // icon border thickness as fraction of badge size
  const BADGE_PAD_MODULES = 1;     // clear ring of modules around icon

  // ── Font Awesome wifi icon ───────────────────────────────────
  // Source: Font Awesome 6 Free Solid (fa-wifi). License: CC BY 4.0.
  // Path data is in a 640×512 viewBox (SVG y-down).
  const FA_WIFI_PATH = "M54.2 202.9C123.2 136.7 216.8 96 320 96s196.8 40.7 265.8 106.9c12.8 12.2 33 11.8 45.2-1s11.8-33-1-45.2C549.7 79.5 440.4 32 320 32S90.3 79.5 9.9 156.7c-12.8 12.2-13.2 32.4-1 45.2s32.4 13.2 45.2 1zM320 256c56.8 0 108.6 21.1 148.2 56c13.3 11.7 33.5 10.4 45.2-2.8s10.4-33.5-2.8-45.2C459.8 219.2 393 192 320 192s-139.8 27.2-190.5 72c-13.3 11.7-14.5 31.9-2.8 45.2s31.9 14.5 45.2 2.8c39.5-34.9 91.3-56 148.2-56zm64 144c0-35.3-28.7-64-64-64s-64 28.7-64 64s28.7 64 64 64s64-28.7 64-64z";
  const FA_WIFI_VB = { w: 640, h: 512 };

  // Minimal SVG path parser → array of subpath polygons (points in SVG coords).
  // Handles M, m, L, l, H, h, V, v, C, c, S, s, Z/z. Béziers are tessellated.
  function parseSvgPath(d, samples) {
    const re = /([a-zA-Z])|(-?(?:\d*\.)?\d+(?:[eE][+-]?\d+)?)/g;
    const tokens = [];
    let m;
    while ((m = re.exec(d)) !== null) tokens.push(m[1] || m[2]);

    const subpaths = [];
    let pts = [], cx = 0, cy = 0, sx = 0, sy = 0, pcx = null, pcy = null, cmd = '', i = 0;
    const num = () => parseFloat(tokens[i++]);
    const bez = (p0, p1, p2, p3) => {
      for (let t = 1; t <= samples; t++) {
        const tt = t / samples, u = 1 - tt;
        pts.push([
          u*u*u*p0[0] + 3*u*u*tt*p1[0] + 3*u*tt*tt*p2[0] + tt*tt*tt*p3[0],
          u*u*u*p0[1] + 3*u*u*tt*p1[1] + 3*u*tt*tt*p2[1] + tt*tt*tt*p3[1]
        ]);
      }
    };

    while (i < tokens.length) {
      if (/^[a-zA-Z]$/.test(tokens[i])) { cmd = tokens[i]; i++; }
      switch (cmd) {
        case 'M':
          if (pts.length) subpaths.push(pts);
          pts = []; cx = num(); cy = num(); sx = cx; sy = cy;
          pts.push([cx, cy]); pcx = pcy = null; cmd = 'L'; break;
        case 'm':
          if (pts.length) subpaths.push(pts);
          pts = []; cx += num(); cy += num(); sx = cx; sy = cy;
          pts.push([cx, cy]); pcx = pcy = null; cmd = 'l'; break;
        case 'L': cx = num(); cy = num(); pts.push([cx, cy]); pcx = pcy = null; break;
        case 'l': cx += num(); cy += num(); pts.push([cx, cy]); pcx = pcy = null; break;
        case 'H': cx = num(); pts.push([cx, cy]); pcx = pcy = null; break;
        case 'h': cx += num(); pts.push([cx, cy]); pcx = pcy = null; break;
        case 'V': cy = num(); pts.push([cx, cy]); pcx = pcy = null; break;
        case 'v': cy += num(); pts.push([cx, cy]); pcx = pcy = null; break;
        case 'C': {
          const x1 = num(), y1 = num(), x2 = num(), y2 = num(), x = num(), y = num();
          bez([cx, cy], [x1, y1], [x2, y2], [x, y]);
          pcx = x2; pcy = y2; cx = x; cy = y; break;
        }
        case 'c': {
          const x1 = cx + num(), y1 = cy + num();
          const x2 = cx + num(), y2 = cy + num();
          const x  = cx + num(), y  = cy + num();
          bez([cx, cy], [x1, y1], [x2, y2], [x, y]);
          pcx = x2; pcy = y2; cx = x; cy = y; break;
        }
        case 'S': {
          const x1 = (pcx !== null) ? 2*cx - pcx : cx;
          const y1 = (pcy !== null) ? 2*cy - pcy : cy;
          const x2 = num(), y2 = num(), x = num(), y = num();
          bez([cx, cy], [x1, y1], [x2, y2], [x, y]);
          pcx = x2; pcy = y2; cx = x; cy = y; break;
        }
        case 's': {
          const x1 = (pcx !== null) ? 2*cx - pcx : cx;
          const y1 = (pcy !== null) ? 2*cy - pcy : cy;
          const x2 = cx + num(), y2 = cy + num();
          const x  = cx + num(), y  = cy + num();
          bez([cx, cy], [x1, y1], [x2, y2], [x, y]);
          pcx = x2; pcy = y2; cx = x; cy = y; break;
        }
        case 'Z': case 'z':
          if (pts.length) subpaths.push(pts);
          pts = []; cx = sx; cy = sy; pcx = pcy = null; cmd = ''; break;
        default: i++; break;
      }
    }
    if (pts.length) subpaths.push(pts);
    return subpaths;
  }

  // Pre-tessellate the FA wifi path once (used for OpenSCAD polygon export).
  // 12 samples per Bézier is plenty smooth at typical print sizes.
  const FA_WIFI_SUBPATHS = parseSvgPath(FA_WIFI_PATH, 12);

  // ── UI handlers ──────────────────────────────────────────────
  pwToggle.addEventListener('click', () => {
    if (pwEl.type === 'password') { pwEl.type = 'text'; pwToggle.textContent = 'HIDE'; }
    else { pwEl.type = 'password'; pwToggle.textContent = 'SHOW'; }
  });

  encEl.addEventListener('change', () => {
    pwField.style.display = encEl.value === 'nopass' ? 'none' : '';
    update();
  });

  // ── WiFi payload construction ────────────────────────────────
  function escapeWifi(str) {
    return String(str).replace(/([\\;,":])/g, '\\$1');
  }

  function buildPayload() {
    const ssid = ssidEl.value.trim();
    if (!ssid) return null;
    const enc = encEl.value;
    const pw = pwEl.value;
    const hidden = hiddenEl.checked;
    let s = `WIFI:T:${enc};S:${escapeWifi(ssid)};`;
    if (enc !== 'nopass') s += `P:${escapeWifi(pw)};`;
    if (hidden) s += `H:true;`;
    s += ';';
    return s;
  }

  // ── Geometry helpers ─────────────────────────────────────────
  function badgeZone(moduleCount) {
    let badgeMod = Math.max(3, Math.floor(moduleCount * BADGE_FRACTION));
    // Match parity with moduleCount so the badge is symmetrically centered
    if (badgeMod % 2 !== moduleCount % 2) badgeMod += 1;
    return {
      size: badgeMod,                  // diameter (in modules) of the border circle
      radius: badgeMod / 2,            // radius (in modules) of the border circle
      center: moduleCount / 2,
    };
  }

  function inBadge(zone, r, c) {
    // Circular zone: clear modules whose centers fall inside
    // (border radius + padding) of the QR center.
    const dx = (c + 0.5) - zone.center;
    const dy = (r + 0.5) - zone.center;
    const limit = zone.radius + BADGE_PAD_MODULES;
    return dx * dx + dy * dy < limit * limit;
  }

  // ── Canvas: WiFi icon with bordered frame ────────────────────
  function drawWifiIconCanvas(ctx, cx, cy, size) {
    const half = size / 2;
    const borderT = size * BADGE_BORDER_FRAC;

    // Outer black circle (border)
    ctx.fillStyle = '#0e0e0c';
    ctx.beginPath();
    ctx.arc(cx, cy, half, 0, Math.PI * 2);
    ctx.fill();

    // Inner white circle (interior)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, half - borderT, 0, Math.PI * 2);
    ctx.fill();

    // Font Awesome wifi icon, centered inside the frame with padding
    const padding = size * 0.06;
    const inner = size - 2 * borderT - 2 * padding;
    const scale = Math.min(inner / FA_WIFI_VB.w, inner / FA_WIFI_VB.h);
    const iconW = FA_WIFI_VB.w * scale;
    const iconH = FA_WIFI_VB.h * scale;

    ctx.save();
    ctx.translate(cx - iconW / 2, cy - iconH / 2);
    ctx.scale(scale, scale);
    ctx.fillStyle = '#0e0e0c';
    ctx.fill(new Path2D(FA_WIFI_PATH));
    ctx.restore();
  }

  // ── Render preview to canvas ─────────────────────────────────
  // drawIcon=false: only QR modules + cleared centre; the icon is added later
  // as an SVG overlay so it stays crisp at any display size.
  function renderCanvas(qr, drawIcon) {
    const moduleCount = qr.getModuleCount();
    const cellSize = 8;
    const px = moduleCount * cellSize;
    const zone = badgeZone(moduleCount);

    const canvas = document.createElement('canvas');
    canvas.width = px;
    canvas.height = px;
    canvas.id = 'qr-canvas';
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, px, px);

    ctx.fillStyle = '#0e0e0c';
    for (let r = 0; r < moduleCount; r++) {
      for (let c = 0; c < moduleCount; c++) {
        if (qr.isDark(r, c) && !inBadge(zone, r, c)) {
          ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
        }
      }
    }

    if (drawIcon) {
      const badgePx = zone.size * cellSize;
      const cx = px / 2, cy = px / 2;
      drawWifiIconCanvas(ctx, cx, cy, badgePx);
    }

    return canvas;
  }

  // ── SVG wifi-icon overlay (crisp preview) ────────────────────
  // Renders the bordered FA wifi icon as native SVG so it stays sharp at
  // any display size — no canvas rasterisation, no pixelation when scaled.
  function makeWifiIconSVG(displaySize) {
    const half = displaySize / 2;
    const borderT = displaySize * BADGE_BORDER_FRAC;
    const pad = displaySize * 0.06;
    const innerSpace = displaySize - 2 * borderT - 2 * pad;
    const scale = Math.min(innerSpace / FA_WIFI_VB.w, innerSpace / FA_WIFI_VB.h);
    const iconW = FA_WIFI_VB.w * scale;
    const iconH = FA_WIFI_VB.h * scale;
    const tx = half - iconW / 2;
    const ty = half - iconH / 2;

    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', `0 0 ${displaySize} ${displaySize}`);
    svg.setAttribute('width', displaySize);
    svg.setAttribute('height', displaySize);
    svg.classList.add('wifi-icon-overlay');

    const outer = document.createElementNS(ns, 'circle');
    outer.setAttribute('cx', half);
    outer.setAttribute('cy', half);
    outer.setAttribute('r', half);
    outer.setAttribute('fill', '#0e0e0c');
    svg.appendChild(outer);

    const innerCircle = document.createElementNS(ns, 'circle');
    innerCircle.setAttribute('cx', half);
    innerCircle.setAttribute('cy', half);
    innerCircle.setAttribute('r', half - borderT);
    innerCircle.setAttribute('fill', '#ffffff');
    svg.appendChild(innerCircle);

    const g = document.createElementNS(ns, 'g');
    g.setAttribute('transform', `translate(${tx} ${ty}) scale(${scale})`);
    g.setAttribute('fill', '#0e0e0c');
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', FA_WIFI_PATH);
    g.appendChild(path);
    svg.appendChild(g);

    return svg;
  }

  // ── SVG generation ───────────────────────────────────────────
  function escapeXML(s) {
    return String(s).replace(/[<>&"']/g, ch => ({
      '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;'
    }[ch]));
  }

  function generateSVG(qr, ssid, labelText, font, textSizeMm) {
    const moduleCount = qr.getModuleCount();
    const cellSize = 10;
    const qrSize = moduleCount * cellSize;
    const qrSizeMm = parseFloat(pSizeEl.value) || 60;
    const hasLabel = labelText.length > 0;
    // Match the OpenSCAD output: text height in SVG units is the same fraction
    // of qrSize that text size (mm) is of qr_size (mm).
    const textHeight = hasLabel ? (textSizeMm / qrSizeMm) * qrSize : 0;
    const textGap = hasLabel ? cellSize * 1.5 : 0;
    const totalH = qrSize + textGap + textHeight;
    const zone = badgeZone(moduleCount);

    let modulesSVG = '';
    for (let r = 0; r < moduleCount; r++) {
      for (let c = 0; c < moduleCount; c++) {
        if (qr.isDark(r, c) && !inBadge(zone, r, c)) {
          modulesSVG += `<rect x="${c * cellSize}" y="${r * cellSize}" width="${cellSize}" height="${cellSize}"/>`;
        }
      }
    }

    const badgePx = zone.size * cellSize;
    const iconCx = qrSize / 2;
    const iconCy = qrSize / 2;
    const half = badgePx / 2;
    const borderT = badgePx * BADGE_BORDER_FRAC;

    // Circular border + FA wifi icon transform
    const innerR = half - borderT;
    const iconPad = badgePx * 0.06;
    const iconInner = badgePx - 2 * borderT - 2 * iconPad;
    const faScale = Math.min(iconInner / FA_WIFI_VB.w, iconInner / FA_WIFI_VB.h);
    const faIconW = FA_WIFI_VB.w * faScale;
    const faIconH = FA_WIFI_VB.h * faScale;
    const faTx = iconCx - faIconW / 2;
    const faTy = iconCy - faIconH / 2;

    const textY = qrSize + textGap + textHeight * 0.78;
    const textSize = textHeight;

    const labelGroup = hasLabel ? `
  <g id="label" shape-rendering="geometricPrecision">
    <text x="${qrSize / 2}" y="${textY}"
          font-family="${font.css}"
          font-size="${textSize}"
          font-weight="${font.weight}"
          letter-spacing="${textSize * 0.12}"
          text-anchor="middle"
          fill="#000000">${escapeXML(labelText)}</text>
  </g>` : '';

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${qrSize} ${totalH}" width="${qrSize}" height="${totalH}" shape-rendering="crispEdges">
  <title>WiFi QR — ${escapeXML(ssid)}</title>
  <desc>Wifi icon: Font Awesome 6 Free Solid (CC BY 4.0)</desc>
  <rect width="${qrSize}" height="${totalH}" fill="#ffffff"/>
  <g fill="#000000" id="qr-modules">${modulesSVG}</g>
  <g id="wifi-icon" shape-rendering="geometricPrecision">
    <circle cx="${iconCx}" cy="${iconCy}" r="${half}" fill="#000000"/>
    <circle cx="${iconCx}" cy="${iconCy}" r="${innerR}" fill="#ffffff"/>
    <g transform="translate(${faTx.toFixed(2)} ${faTy.toFixed(2)}) scale(${faScale.toFixed(5)})" fill="#000000">
      <path d="${FA_WIFI_PATH}"/>
    </g>
  </g>${labelGroup}
</svg>`;
  }

  // ── OpenSCAD generation ──────────────────────────────────────
  function generateSCAD(qr, ssid, labelText, font, textSizeMm) {
    const moduleCount = qr.getModuleCount();
    const zone = badgeZone(moduleCount);

    const qrSize = parseFloat(pSizeEl.value) || 60;
    const baseT = parseFloat(pBaseEl.value) || 2;
    const moduleH = parseFloat(pModuleEl.value) || 1;

    // Escape for OpenSCAD string literals
    const scadEscape = s => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const scadLabel = scadEscape(labelText);
    const scadFont  = scadEscape(font.scad);

    const rows = [];
    for (let r = 0; r < moduleCount; r++) {
      const row = [];
      for (let c = 0; c < moduleCount; c++) {
        const dark = qr.isDark(r, c) && !inBadge(zone, r, c);
        row.push(dark ? 1 : 0);
      }
      rows.push('  [' + row.join(',') + ']');
    }
    const modulesArr = rows.join(',\n');

    const safeSsid = ssid.replace(/[^\x20-\x7E]/g, '?');

    // Serialize Font Awesome wifi subpaths as OpenSCAD polygon() statements.
    // SVG y-down → OpenSCAD y-up: flip y by subtracting from viewBox height.
    const faPolygons = FA_WIFI_SUBPATHS.map(subpath => {
      const pts = subpath
        .map(([x, y]) => `[${x.toFixed(2)},${(FA_WIFI_VB.h - y).toFixed(2)}]`)
        .join(',');
      return `  polygon([${pts}]);`;
    }).join('\n');

    return `// ─────────────────────────────────────────────
// WiFi QR Code · 3D printable
// Network : ${safeSsid}
// Modules : ${moduleCount} × ${moduleCount}
// ─────────────────────────────────────────────

/* [Dimensions] */
qr_size       = ${qrSize};   // QR width and height (mm)
base_t        = ${baseT};    // Base plate thickness (mm)
module_h      = ${moduleH};  // QR module raised height (mm)
icon_h        = ${moduleH};  // WiFi icon raised height (mm)
text_h        = ${moduleH};  // WIFI text raised height (mm)

/* [Layout] */
margin        = 4;     // Outer margin around content (mm)
text_gap      = 3;     // Gap between QR and text (mm)

/* [Label] */
label_text    = "${scadLabel}";  // Bottom label — set to "" to omit
text_size     = ${textSizeMm};   // Label text size (mm)
text_font     = "${scadFont}";  // OpenSCAD font name (must be installed)

/* [Quality] */
$fn = 64;
EPS = 0.01;  // tiny overlap (mm) so all features merge cleanly with the base
             // plate — prevents coincident faces that slicers flag as
             // non-manifold open edges.

// ── QR module data ──────────────────────────────────────
module_count = ${moduleCount};
cell         = qr_size / module_count;

modules = [
${modulesArr}
];

// Badge zone (icon area) bounds
badge_size       = ${zone.size};
badge_size_mm    = badge_size * cell;
badge_border_t   = badge_size_mm * ${BADGE_BORDER_FRAC};

// ── 2D primitives ───────────────────────────────────────

// Font Awesome wifi icon (CC BY 4.0) — viewBox 640×512, y-flipped to y-up.
// Composed of 3 filled subpaths: outer arc, middle arc, dot.
module fa_wifi() {
${faPolygons}
}

// WiFi icon footprint (circular border + FA wifi), origin at lower-left of badge
module wifi_icon_2d(size) {
  // Circular border frame, centered in the size×size bounding box
  translate([size / 2, size / 2])
    difference() {
      circle(d = size);
      circle(d = size - 2 * badge_border_t);
    }
  // FA wifi icon, centered inside the frame with 6% padding
  fa_w     = ${FA_WIFI_VB.w};
  fa_h     = ${FA_WIFI_VB.h};
  pad      = size * 0.06;
  inner    = size - 2 * badge_border_t - 2 * pad;
  fa_scale = min(inner / fa_w, inner / fa_h);
  translate([
    (size - fa_w * fa_scale) / 2,
    (size - fa_h * fa_scale) / 2
  ])
    scale([fa_scale, fa_scale])
      fa_wifi();
}

// ── 3D modules ──────────────────────────────────────────

module qr_modules() {
  for (r = [0 : module_count - 1]) {
    for (c = [0 : module_count - 1]) {
      if (modules[r][c] == 1) {
        translate([c * cell - EPS, (module_count - 1 - r) * cell - EPS, base_t - EPS])
          cube([cell + 2 * EPS, cell + 2 * EPS, module_h + EPS]);
      }
    }
  }
}

module wifi_icon_3d() {
  translate([
    qr_size / 2 - badge_size_mm / 2,
    qr_size / 2 - badge_size_mm / 2,
    base_t - EPS
  ])
    linear_extrude(height = icon_h + EPS, convexity = 8)
      wifi_icon_2d(badge_size_mm);
}

module wifi_text_3d() {
  if (len(label_text) > 0) {
    translate([qr_size / 2, -text_gap, base_t - EPS])
      linear_extrude(height = text_h + EPS, convexity = 4)
        text(label_text,
             size     = text_size,
             halign   = "center",
             valign   = "top",
             font     = text_font,
             spacing  = 1.18);
  }
}

module base_plate() {
  text_area = (len(label_text) > 0) ? (text_gap + text_size) : 0;
  translate([
    -margin,
    -margin - text_area,
    0
  ])
    cube([
      qr_size + 2 * margin,
      qr_size + 2 * margin + text_area,
      base_t
    ]);
}

// ── Render ──────────────────────────────────────────────
// Default: single manifold STL. All parts are unioned, with raised
// features overlapping the base plate by EPS so the slicer sees one
// solid (no coincident-face errors in PrusaSlicer / Cura / Bambu).
union() {
  base_plate();
  qr_modules();
  wifi_icon_3d();
  wifi_text_3d();
}

// ── Multi-color print (alternative) ─────────────────────
// For two-filament prints (AMS, pause-and-swap, multi-tool):
//   1. Comment out the union() block above.
//   2. Uncomment the two color() blocks below.
//   3. Export each color as a separate STL by toggling visibility.
//
// color("white") base_plate();
// color("black") {
//   qr_modules();
//   wifi_icon_3d();
//   wifi_text_3d();
// }
`;
  }

  // ── Render orchestration ─────────────────────────────────────
  let lastQR = null;
  let lastCanvas = null;

  function render() {
    const payload = buildPayload();
    payloadEl.textContent = payload || '—';

    if (!payload) {
      qrCard.classList.add('empty');
      qrCard.innerHTML = 'AWAITING<br>NETWORK<br>NAME';
      qrMeta.style.display = 'none';
      [pngBtn, svgBtn, scadBtn, copyBtn].forEach(b => b.disabled = true);
      lastQR = null; lastCanvas = null;
      return;
    }

    const ecc = eccEl.value;
    const qr = qrcode(0, ecc);
    qr.addData(payload);
    qr.make();

    const canvas = renderCanvas(qr, false);  // QR modules only — icon is overlaid as SVG
    canvas.style.width = '280px';
    canvas.style.height = '280px';

    // Wrap canvas + crisp SVG icon overlay
    const moduleCount = qr.getModuleCount();
    const zone = badgeZone(moduleCount);
    const overlaySize = (zone.size / moduleCount) * 280;

    const wrapper = document.createElement('div');
    wrapper.className = 'qr-render';
    wrapper.appendChild(canvas);
    wrapper.appendChild(makeWifiIconSVG(overlaySize));

    qrCard.classList.remove('empty');
    qrCard.innerHTML = '';
    qrCard.appendChild(wrapper);

    const labelText = labelEl.value.trim();
    if (labelText) {
      const font = getFont();
      const textSizeMm = parseFloat(textSizeEl.value) || 8;
      const qrSizeMm = parseFloat(pSizeEl.value) || 60;
      // Preview QR is rendered at 280px wide; scale text to mm-equivalent
      const previewTextPx = (textSizeMm / qrSizeMm) * 280;

      const textLabel = document.createElement('div');
      textLabel.className = 'qr-text-label';
      textLabel.textContent = labelText;
      textLabel.style.fontFamily = font.css;
      textLabel.style.fontWeight = font.weight;
      textLabel.style.fontSize = previewTextPx + 'px';
      qrCard.appendChild(textLabel);
    }

    qrMeta.style.display = '';
    $('meta-ssid').textContent = ssidEl.value.trim();
    $('meta-enc').textContent = encEl.value === 'nopass' ? 'OPEN' : encEl.value;
    $('meta-size').textContent = qr.getModuleCount() + ' × ' + qr.getModuleCount() + ' modules';

    [pngBtn, svgBtn, scadBtn, copyBtn].forEach(b => b.disabled = false);

    lastQR = qr;
    lastCanvas = canvas;
  }

  let renderTimer;
  function update() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(render, 100);
  }

  [ssidEl, pwEl, encEl, eccEl, hiddenEl, pSizeEl, pBaseEl, pModuleEl, labelEl, fontEl, textSizeEl].forEach(el => {
    el.addEventListener('input', update);
    el.addEventListener('change', update);
  });

  // ── Toast ────────────────────────────────────────────────────
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 1500);
  }

  // ── Download helpers ─────────────────────────────────────────
  function safeFilename(s) {
    return (s || 'wifi').trim().replace(/[^a-z0-9-_]/gi, '_').slice(0, 40) || 'wifi';
  }

  function downloadBlob(content, mime, filename) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // PNG: render at high res with label baked in
  pngBtn.addEventListener('click', () => {
    if (!lastQR) return;
    const labelText = labelEl.value.trim();
    const hasLabel = labelText.length > 0;
    const font = getFont();
    const textSizeMm = parseFloat(textSizeEl.value) || 8;
    const qrSizeMm = parseFloat(pSizeEl.value) || 60;
    const moduleCount = lastQR.getModuleCount();
    const cellSize = 32;
    const qrPx = moduleCount * cellSize;
    const textGap = hasLabel ? cellSize * 1.5 : 0;
    const textPx = hasLabel ? (textSizeMm / qrSizeMm) * qrPx : 0;
    const totalH = qrPx + textGap + textPx;

    const out = document.createElement('canvas');
    out.width = qrPx;
    out.height = totalH;
    const ctx = out.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, qrPx, totalH);

    const zone = badgeZone(moduleCount);
    ctx.fillStyle = '#000000';
    for (let r = 0; r < moduleCount; r++) {
      for (let c = 0; c < moduleCount; c++) {
        if (lastQR.isDark(r, c) && !inBadge(zone, r, c)) {
          ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
        }
      }
    }

    const badgePx = zone.size * cellSize;
    const cx = qrPx / 2;
    const cy = qrPx / 2;
    drawWifiIconCanvas(ctx, cx, cy, badgePx);

    // Label text
    if (hasLabel) {
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.font = `${font.weight} ${textPx}px ${font.css}`;
      const spacing = textPx * 0.12;
      const totalWidth = labelText.split('').reduce((acc, ch) => acc + ctx.measureText(ch).width + spacing, -spacing);
      let x = qrPx / 2 - totalWidth / 2;
      const y = qrPx + textGap;
      labelText.split('').forEach(ch => {
        const w = ctx.measureText(ch).width;
        ctx.fillText(ch, x + w / 2, y);
        x += w + spacing;
      });
    }

    out.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `wifi-${safeFilename(ssidEl.value)}.png`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast('PNG saved');
    }, 'image/png');
  });

  // SVG
  svgBtn.addEventListener('click', () => {
    if (!lastQR) return;
    const textSizeMm = parseFloat(textSizeEl.value) || 8;
    const svg = generateSVG(lastQR, ssidEl.value, labelEl.value.trim(), getFont(), textSizeMm);
    downloadBlob(svg, 'image/svg+xml', `wifi-${safeFilename(ssidEl.value)}.svg`);
    showToast('SVG saved');
  });

  // OpenSCAD
  scadBtn.addEventListener('click', () => {
    if (!lastQR) return;
    const textSizeMm = parseFloat(textSizeEl.value) || 8;
    const scad = generateSCAD(lastQR, ssidEl.value, labelEl.value.trim(), getFont(), textSizeMm);
    downloadBlob(scad, 'text/plain', `wifi-${safeFilename(ssidEl.value)}.scad`);
    showToast('SCAD saved');
  });

  // Copy payload
  copyBtn.addEventListener('click', async () => {
    const p = buildPayload();
    if (!p) return;
    try {
      await navigator.clipboard.writeText(p);
      showToast('Payload copied');
    } catch {
      showToast('Copy failed');
    }
  });

  update();