/* OLYMPIAD — intro 3D pilotée par la molette (Three.js / WebGL).
   Un seul plan-séquence, sans coupure :
   vue plongeante sur un stade éclairé la nuit → descente vers le rond
   central → derrière l'organisateur assis à son bureau → par-dessus son
   épaule → dans l'écran de son portable, qui affiche la vraie page
   d'accueil (la page elle-même, chargée dans un iframe en mode ?ecran=1 et
   posée sur l'écran 3D). Quand l'écran remplit la fenêtre, l'intro laisse
   place au site.
   Unités : mètres. Le terrain est orienté dans la longueur selon z ;
   l'organisateur, assis au rond central, regarde vers -z. */

const racine = document.documentElement;
const intro = document.getElementById('intro');
const espace = document.getElementById('intro-espace');
const passer = document.getElementById('intro-passer');

function sansIntro() {
  racine.classList.add('sans-intro');
}

if (!racine.classList.contains('ecran') && intro && espace) {
  try {
    await demarrer();
  } catch (e) {
    console.warn('Intro 3D indisponible :', e);
    sansIntro();
  }
}

async function demarrer() {
  const THREE = await import('three');
  const { EffectComposer } = await import('three/addons/postprocessing/EffectComposer.js');
  const { RenderPass } = await import('three/addons/postprocessing/RenderPass.js');
  const { UnrealBloomPass } = await import('three/addons/postprocessing/UnrealBloomPass.js');
  const { OutputPass } = await import('three/addons/postprocessing/OutputPass.js');
  const { CSS3DRenderer, CSS3DObject } = await import('three/addons/renderers/CSS3DRenderer.js');
  const { RoundedBoxGeometry } = await import('three/addons/geometries/RoundedBoxGeometry.js');
  const { GTAOPass } = await import('three/addons/postprocessing/GTAOPass.js');

  const mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const borne = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lisse = (t) => t * t * (3 - 2 * t);
  function alea(graine) {
    let a = graine;
    return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const R = alea(2026);
  let forcerRendu = false;

  // ---------------------------------------------------------------------
  // Moteur de rendu
  // ---------------------------------------------------------------------
  const zone = intro.querySelector('.cinema-3d');
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  zone.appendChild(renderer.domElement);
  const rendererCSS = new CSS3DRenderer();
  rendererCSS.domElement.className = 'cinema-css3d';
  zone.appendChild(rendererCSS.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a1020, 0.0032);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 6000);

  // ---------------------------------------------------------------------
  // Textures dessinées à la volée (aucun fichier à télécharger)
  // ---------------------------------------------------------------------
  const anisotropie = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  function toile(w, h, dessin, options = {}) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    dessin(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = options.lineaire ? THREE.NoColorSpace : THREE.SRGBColorSpace;
    t.anisotropy = anisotropie;
    if (options.repeter) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
    return t;
  }

  // Pelouse : bandes de tonte, usure, grain (80 m × 120 m)
  const texHerbe = toile(1024, 1536, (c, w, h) => {
    const m = w / 80;
    c.fillStyle = '#1a4f27'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 20; i++) {
      c.fillStyle = i % 2 ? '#245f33' : '#1e552d';
      c.fillRect(6 * m, (7.5 + i * 5.25) * m, 68 * m, 5.25 * m + 1);
    }
    for (let i = 0; i < 90000; i++) {
      const v = R();
      c.fillStyle = v < 0.5 ? `rgba(10,30,14,${0.05 + R() * 0.08})` : `rgba(120,170,90,${0.03 + R() * 0.05})`;
      c.fillRect(R() * w, R() * h, 1 + R() * 2, 1 + R() * 3);
    }
    const usure = (x, z, r, a) => {
      const g = c.createRadialGradient(x * m, z * m, 0, x * m, z * m, r * m);
      g.addColorStop(0, `rgba(120,110,60,${a})`); g.addColorStop(1, 'rgba(120,110,60,0)');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
    };
    usure(40, 60, 9, 0.16); usure(40, 10, 7, 0.22); usure(40, 110, 7, 0.22); usure(40, 18, 5, 0.12); usure(40, 102, 5, 0.12);
  });
  const texDetail = toile(256, 256, (c, w, h) => {
    c.fillStyle = '#808080'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 5000; i++) {
      const l = 70 + R() * 120;
      c.strokeStyle = `rgba(${l},${l},${l},0.55)`;
      c.lineWidth = 0.6 + R();
      const x = R() * w; const y = R() * h; const a = (R() - 0.5) * 0.8;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.sin(a) * 6, y - Math.cos(a) * 6); c.stroke();
    }
  }, { repeter: true, lineaire: true });

  // Tribunes : sièges et spectateurs (un motif = 6 m × 6 m)
  const texFoule = toile(512, 512, (c, w, h) => {
    c.fillStyle = '#141924'; c.fillRect(0, 0, w, h);
    const rangs = 8;
    const hr = h / rangs;
    const maillots = ['#ebb517', '#ebb517', '#f3f2ed', '#1d2a44', '#c63a3a', '#2d5fa8', '#3c4250', '#e8e2d0', '#0d121b'];
    const peaux = ['#e0b08a', '#c68e64', '#8d5a3b', '#f0c9a4', '#a8714c'];
    for (let r = 0; r < rangs; r++) {
      const y0 = r * hr;
      c.fillStyle = '#0c1018'; c.fillRect(0, y0 + hr * 0.78, w, hr * 0.22);
      for (let x = 4; x < w; x += 22 + R() * 6) {
        if (R() < 0.12) { c.fillStyle = '#1e2a40'; c.fillRect(x, y0 + hr * 0.45, 16, hr * 0.32); continue; }
        c.fillStyle = maillots[Math.floor(R() * maillots.length)];
        c.beginPath(); c.ellipse(x + 9, y0 + hr * 0.62, 10, hr * 0.26, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = peaux[Math.floor(R() * peaux.length)];
        c.beginPath(); c.arc(x + 9, y0 + hr * 0.3, 6.5, 0, Math.PI * 2); c.fill();
        if (R() < 0.15) { c.fillStyle = c.fillStyle; c.fillRect(x + (R() < 0.5 ? -2 : 16), y0 + hr * 0.05, 4, hr * 0.3); }
      }
    }
  }, { repeter: true });

  // Panneaux LED et bandeau de la coursive
  const texLED = toile(2048, 96, (c, w, h) => {
    c.fillStyle = '#05070b'; c.fillRect(0, 0, w, h);
    c.textBaseline = 'middle';
    let x = 20;
    while (x < w) {
      c.font = '400 72px "Bebas Neue", Impact, sans-serif';
      c.fillStyle = '#ebb517'; c.fillText('OLYMPIAD', x, h / 2 + 4); x += c.measureText('OLYMPIAD').width + 40;
      c.font = '600 34px "Work Sans", Arial, sans-serif';
      c.fillStyle = '#f3f2ed'; const txt = 'TOURNOIS SUIVIS EN DIRECT'; c.fillText(txt, x, h / 2); x += c.measureText(txt).width + 60;
    }
  }, { repeter: true });

  // Façade extérieure : fentes lumineuses
  const texFacade = toile(512, 256, (c, w, h) => {
    c.fillStyle = '#000'; c.fillRect(0, 0, w, h);
    for (let x = 6; x < w; x += 32) {
      const g = c.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(255,214,140,0.0)'); g.addColorStop(0.5, 'rgba(255,214,140,0.85)'); g.addColorStop(1, 'rgba(255,214,140,0.0)');
      c.fillStyle = g; c.fillRect(x, 0, 5, h);
    }
    c.fillStyle = 'rgba(235,181,23,0.9)'; c.fillRect(0, h * 0.86, w, 6);
  }, { repeter: true });

  // Filets de but
  const texFilet = toile(128, 128, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 2;
    for (let i = 0; i <= w; i += 16) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, h); c.stroke(); c.beginPath(); c.moveTo(0, i); c.lineTo(w, i); c.stroke(); }
  }, { repeter: true });

  // Fenêtres des immeubles autour du stade
  const texFenetres = toile(128, 256, (c, w, h) => {
    c.fillStyle = '#000'; c.fillRect(0, 0, w, h);
    for (let y = 6; y < h; y += 14) for (let x = 6; x < w; x += 14) {
      if (R() < 0.32) { c.fillStyle = R() < 0.8 ? `rgba(255,${190 + R() * 50},${110 + R() * 60},${0.5 + R() * 0.5})` : 'rgba(170,200,255,0.7)'; c.fillRect(x, y, 7, 8); }
    }
  }, { repeter: true });

  // ---------------------------------------------------------------------
  // Ciel, étoiles, ville
  // ---------------------------------------------------------------------
  const ciel = new THREE.Mesh(new THREE.SphereGeometry(4000, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {},
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 vP; void main(){
      float h = clamp(vP.y, -0.2, 1.0);
      vec3 haut = vec3(0.008, 0.012, 0.03);
      vec3 horizon = vec3(0.06, 0.075, 0.12);
      vec3 pollution = vec3(0.22, 0.13, 0.06);
      vec3 col = mix(horizon, haut, smoothstep(0.0, 0.55, h));
      col += pollution * exp(-abs(h) * 14.0) * 0.55;
      gl_FragColor = vec4(col, 1.0);
    }`,
  }));
  scene.add(ciel);
  {
    const n = 1800;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = R() * Math.PI * 2; const y = 0.15 + R() * 0.85; const r = Math.sqrt(1 - y * y);
      pos.set([Math.cos(a) * r * 3500, y * 3500, Math.sin(a) * r * 3500], i * 3);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xcfd8ff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.75, fog: false, depthWrite: false })));
  }
  const sol = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), new THREE.MeshStandardMaterial({ color: 0x07090d, roughness: 1 }));
  sol.rotation.x = -Math.PI / 2; sol.position.y = -0.4; sol.receiveShadow = true;
  scene.add(sol);
  {
    // Immeubles et lumières de la ville
    const geo = new THREE.BoxGeometry(1, 1, 1);
    geo.translate(0, 0.5, 0);
    const mat = new THREE.MeshStandardMaterial({ color: 0x0b0e14, roughness: 0.9, emissive: 0xffffff, emissiveMap: texFenetres, emissiveIntensity: 0.9 });
    const n = 420;
    const imm = new THREE.InstancedMesh(geo, mat, n);
    const m = new THREE.Matrix4(); const q = new THREE.Quaternion(); const s = new THREE.Vector3(); const p = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      const a = R() * Math.PI * 2; const d = 230 + Math.pow(R(), 0.7) * 1300;
      const h = 8 + Math.pow(R(), 2.2) * 90;
      p.set(Math.cos(a) * d, 0, Math.sin(a) * d);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), R() * Math.PI);
      s.set(14 + R() * 30, h, 14 + R() * 30);
      imm.setMatrixAt(i, m.compose(p, q, s));
    }
    scene.add(imm);
    const nl = 2600;
    const pos = new Float32Array(nl * 3); const col = new Float32Array(nl * 3);
    for (let i = 0; i < nl; i++) {
      const a = R() * Math.PI * 2; const d = 175 + Math.pow(R(), 0.6) * 1500;
      pos.set([Math.cos(a) * d, 1 + R() * 3, Math.sin(a) * d], i * 3);
      const chaud = R() < 0.78;
      col.set(chaud ? [1, 0.75 + R() * 0.15, 0.4] : [0.7, 0.8, 1], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 3.2, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false })));
  }

  // ---------------------------------------------------------------------
  // Stade
  // ---------------------------------------------------------------------
  // Contour d'un rectangle arrondi, point par point, avec la normale sortante
  function contour(a, b, r, pas) {
    const pts = [];
    const seg = (x0, z0, x1, z1, nx, nz) => { const L = Math.hypot(x1 - x0, z1 - z0); const n = Math.max(1, Math.round(L / pas)); for (let i = 0; i < n; i++) { const t = i / n; pts.push([x0 + (x1 - x0) * t, z0 + (z1 - z0) * t, nx, nz]); } };
    const arc = (cx, cz, a0, a1) => { const n = Math.max(3, Math.round((r * Math.abs(a1 - a0)) / pas)); for (let i = 0; i < n; i++) { const t = a0 + ((a1 - a0) * i) / n; pts.push([cx + Math.cos(t) * r, cz + Math.sin(t) * r, Math.cos(t), Math.sin(t)]); } };
    seg(-a + r, -b, a - r, -b, 0, -1); arc(a - r, -b + r, -Math.PI / 2, 0);
    seg(a, -b + r, a, b - r, 1, 0); arc(a - r, b - r, 0, Math.PI / 2);
    seg(a - r, b, -a + r, b, 0, 1); arc(-a + r, b - r, Math.PI / 2, Math.PI);
    seg(-a, b - r, -a, -b + r, -1, 0); arc(-a + r, -b + r, Math.PI, Math.PI * 1.5);
    return pts;
  }
  const BORD = contour(46, 64, 16, 1.2);
  // Surface balayée le long du contour selon un profil [[décalage, hauteur], ...]
  function bande(profil, uEchelle = 6, vEchelle = 6) {
    const N = BORD.length; const M = profil.length;
    const pos = []; const uv = []; const idx = [];
    const longueurs = [0];
    for (let j = 1; j < M; j++) longueurs.push(longueurs[j - 1] + Math.hypot(profil[j][0] - profil[j - 1][0], profil[j][1] - profil[j - 1][1]));
    let s = 0;
    for (let i = 0; i <= N; i++) {
      const [x, z, nx, nz] = BORD[i % N];
      if (i > 0) { const [px, pz] = BORD[i - 1]; s += Math.hypot(x - px, z - pz); }
      for (let j = 0; j < M; j++) {
        const [d, y] = profil[j];
        pos.push(x + nx * d, y, z + nz * d);
        uv.push(s / uEchelle, longueurs[j] / vEchelle);
      }
    }
    for (let i = 0; i < N; i++) for (let j = 0; j < M - 1; j++) {
      const a = i * M + j; const b = (i + 1) * M + j;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }
  const matFoule = new THREE.MeshStandardMaterial({ map: texFoule, roughness: 0.95, side: THREE.DoubleSide, emissive: 0x0b0f18, emissiveIntensity: 1 });
  scene.add(new THREE.Mesh(bande([[0, 0], [0, 1.3], [1.5, 1.6], [30, 17]]), matFoule));
  scene.add(new THREE.Mesh(bande([[33, 20.5], [56, 40]]), matFoule));
  const matBeton = new THREE.MeshStandardMaterial({ color: 0x1b2029, roughness: 0.9, side: THREE.DoubleSide });
  scene.add(new THREE.Mesh(bande([[30, 17], [30, 18.2], [33, 18.2], [33, 20.5]]), matBeton));
  const texRuban = texLED.clone(); texRuban.needsUpdate = true; texRuban.repeat.set(1, 1);
  scene.add(new THREE.Mesh(bande([[30.05, 18.25], [30.05, 19.5]], 44, 1.25), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: texRuban, emissiveIntensity: 1.4, side: THREE.DoubleSide })));
  scene.add(new THREE.Mesh(bande([[56, 40], [57, 47], [58, 47], [58, 0]]), matBeton));
  scene.add(new THREE.Mesh(bande([[58.05, 2], [58.05, 46]], 16, 44), new THREE.MeshStandardMaterial({ color: 0x0d1118, roughness: 0.8, emissive: 0xffffff, emissiveMap: texFacade, emissiveIntensity: 1.1, side: THREE.DoubleSide })));
  scene.add(new THREE.Mesh(bande([[58, 0.03], [95, 0.03]], 8, 8), new THREE.MeshStandardMaterial({ color: 0x141922, roughness: 0.95 })));
  // Toit et rampe de projecteurs
  const matToit = new THREE.MeshStandardMaterial({ color: 0x1a1f28, metalness: 0.6, roughness: 0.5, side: THREE.DoubleSide });
  scene.add(new THREE.Mesh(bande([[41, 46], [60, 50.5]]), matToit));
  {
    const geo = new THREE.BoxGeometry(2.6, 1.1, 0.4);
    const mat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xfff4dc, emissiveIntensity: 6, toneMapped: false });
    const pas = 5;
    const choisis = BORD.filter((_, i) => i % Math.round(pas / 1.2) === 0);
    const lampes = new THREE.InstancedMesh(geo, mat, choisis.length);
    const m = new THREE.Matrix4(); const q = new THREE.Quaternion(); const un = new THREE.Vector3(1, 1, 1); const p = new THREE.Vector3();
    choisis.forEach(([x, z, nx, nz], i) => {
      p.set(x + nx * 41.3, 45.4, z + nz * 41.3);
      q.setFromEuler(new THREE.Euler(-0.5, Math.atan2(nx, nz), 0, 'YXZ'));
      lampes.setMatrixAt(i, m.compose(p, q, un));
    });
    scene.add(lampes);
  }
  // Faisceaux lumineux dans la brume
  const uniformsCone = { force: { value: 1 } };
  {
    const matCone = new THREE.ShaderMaterial({
      uniforms: uniformsCone,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
      // Bords fondus : le faisceau est plus dense au centre qu'aux bords
      vertexShader: 'varying float vY; varying vec3 vN; varying vec3 vV; void main(){ vY = uv.y; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform float force; varying float vY; varying vec3 vN; varying vec3 vV; void main(){ vec3 n = vN / max(length(vN), 1e-4); vec3 v = vV / max(length(vV), 1e-4); float c = clamp(abs(dot(n, v)), 0.0, 1.0); float bord = c * c * sqrt(c); float y = clamp(vY, 0.0, 1.0); gl_FragColor = vec4(1.0, 0.95, 0.84, 0.045 * force * bord * y * sqrt(y)); }',
    });
    [[-1, -1], [1, -1], [-1, 1], [1, 1], [-1, 0], [1, 0]].forEach(([sx, sz]) => {
      const depart = new THREE.Vector3(sx * 70, 46, sz * 82);
      const cible = new THREE.Vector3(sx * 12, 0, sz * 22);
      const L = depart.distanceTo(cible);
      const g = new THREE.ConeGeometry(16, L, 32, 1, true);
      g.translate(0, -L / 2, 0);
      const cone = new THREE.Mesh(g, matCone);
      cone.position.copy(depart);
      cone.lookAt(cible);
      cone.rotateX(-Math.PI / 2);
      scene.add(cone);
    });
  }

  // Pelouse avec grain de détail (shader modifié)
  const matHerbe = new THREE.MeshStandardMaterial({ map: texHerbe, roughness: 0.92 });
  matHerbe.onBeforeCompile = (sh) => {
    sh.uniforms.carteDetail = { value: texDetail };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vMonde;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMonde = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vMonde;\nuniform sampler2D carteDetail;')
      .replace('#include <map_fragment>', '#include <map_fragment>\nfloat d1 = texture2D(carteDetail, vMonde.xz * 1.9).r;\nfloat d2 = texture2D(carteDetail, vMonde.xz * 0.23).r;\nfloat d3 = texture2D(carteDetail, vMonde.xz * 7.0).r;\ndiffuseColor.rgb *= (0.62 + d1 * 0.55) * (0.82 + d2 * 0.36) * (0.85 + d3 * 0.3);');
  };
  const herbe = new THREE.Mesh(new THREE.PlaneGeometry(80, 120), matHerbe);
  herbe.rotation.x = -Math.PI / 2; herbe.receiveShadow = true;
  scene.add(herbe);
  {
    // Bordure entre la pelouse et les tribunes
    const g = new THREE.Shape();
    const ext = new THREE.Path();
    BORD.forEach(([x, z], i) => (i ? g.lineTo(x, z) : g.moveTo(x, z)));
    ext.moveTo(-40, -60); ext.lineTo(40, -60); ext.lineTo(40, 60); ext.lineTo(-40, 60); ext.lineTo(-40, -60);
    g.holes.push(ext);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(g), new THREE.MeshStandardMaterial({ color: 0x1b3a2a, roughness: 0.95, side: THREE.DoubleSide }));
    m.rotation.x = Math.PI / 2; m.position.y = 0.005; m.receiveShadow = true;
    scene.add(m);
  }
  // Tracés
  {
    const mat = new THREE.MeshStandardMaterial({ color: 0xe9e9e2, roughness: 0.8 });
    const L = 0.12;
    const groupe = new THREE.Group();
    const ligne = (x0, z0, x1, z1) => {
      const len = Math.hypot(x1 - x0, z1 - z0);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(len + L, L), mat);
      m.rotation.x = -Math.PI / 2; m.rotation.z = -Math.atan2(z1 - z0, x1 - x0);
      m.position.set((x0 + x1) / 2, 0.012, (z0 + z1) / 2);
      m.receiveShadow = true; groupe.add(m);
    };
    const anneau = (x, z, r, debut = 0, angle = Math.PI * 2) => {
      const m = new THREE.Mesh(new THREE.RingGeometry(r - L / 2, r + L / 2, 128, 1, debut, angle), mat);
      m.rotation.x = -Math.PI / 2; m.position.set(x, 0.012, z); m.receiveShadow = true; groupe.add(m);
    };
    ligne(-34, -52.5, 34, -52.5); ligne(-34, 52.5, 34, 52.5); ligne(-34, -52.5, -34, 52.5); ligne(34, -52.5, 34, 52.5);
    ligne(-34, 0, 34, 0);
    anneau(0, 0, 9.15);
    const point = (x, z) => { const m = new THREE.Mesh(new THREE.CircleGeometry(0.15, 24), mat); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.013, z); groupe.add(m); };
    point(0, 0);
    [-1, 1].forEach((s) => {
      const g = s * 52.5;
      ligne(-20.16, g, -20.16, g - s * 16.5); ligne(20.16, g, 20.16, g - s * 16.5); ligne(-20.16, g - s * 16.5, 20.16, g - s * 16.5);
      ligne(-9.16, g, -9.16, g - s * 5.5); ligne(9.16, g, 9.16, g - s * 5.5); ligne(-9.16, g - s * 5.5, 9.16, g - s * 5.5);
      point(0, g - s * 11);
      const a0 = Math.asin(5.5 / 9.15);
      if (s < 0) anneau(0, g - s * 11, 9.15, Math.PI + a0, Math.PI - 2 * a0);
      else anneau(0, g - s * 11, 9.15, a0, Math.PI - 2 * a0);
    });
    scene.add(groupe);
  }
  // Buts
  {
    const matPoteau = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    const matFilet = new THREE.MeshStandardMaterial({ map: texFilet, transparent: true, alphaTest: 0.2, side: THREE.DoubleSide, roughness: 0.9 });
    texFilet.repeat.set(12, 4);
    [-1, 1].forEach((s) => {
      const z = s * 52.5;
      const g = new THREE.Group();
      const cyl = (h, x, y, rz = 0) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, h, 12), matPoteau); m.position.set(x, y, 0); m.rotation.z = rz; m.castShadow = true; g.add(m); };
      cyl(2.44, -3.66, 1.22); cyl(2.44, 3.66, 1.22); cyl(7.44, 0, 2.44, Math.PI / 2);
      const fond = new THREE.Mesh(new THREE.PlaneGeometry(7.32, 2.44), matFilet); fond.position.set(0, 1.22, s * 2); g.add(fond);
      const toit = new THREE.Mesh(new THREE.PlaneGeometry(7.32, 2), matFilet); toit.rotation.x = Math.PI / 2; toit.position.set(0, 2.44, s); g.add(toit);
      g.position.z = z;
      scene.add(g);
    });
  }
  // Panneaux LED autour du terrain
  {
    const mat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: texLED, emissiveIntensity: 1.6, roughness: 0.4 });
    const panneau = (longueur, x, z, ry) => {
      const t = texLED.clone(); t.needsUpdate = true; t.wrapS = THREE.RepeatWrapping; t.repeat.set(longueur / 20, 1);
      const m = new THREE.Mesh(new THREE.BoxGeometry(longueur, 0.9, 0.12), mat.clone());
      m.material.emissiveMap = t;
      m.position.set(x, 0.45, z); m.rotation.y = ry; m.castShadow = true;
      scene.add(m);
    };
    panneau(100, -38, 0, Math.PI / 2); panneau(100, 38, 0, -Math.PI / 2);
    panneau(60, 0, -57, 0); panneau(60, 0, 57, Math.PI);
  }
  // Flashs dans la foule
  const uniformsFlash = { temps: { value: 0 } };
  {
    const n = 700;
    const pos = new Float32Array(n * 3); const phase = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const [x, z, nx, nz] = BORD[Math.floor(R() * BORD.length)];
      const haut = R() < 0.55;
      const d = haut ? 33 + R() * 23 : 1.5 + R() * 28;
      const y = haut ? 20.5 + (d - 33) * (19.5 / 23) : 1.6 + (d - 1.5) * (15.4 / 28.5);
      pos.set([x + nx * d, y + 0.9, z + nz * d], i * 3);
      phase[i] = R() * 1000;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('phase', new THREE.BufferAttribute(phase, 1));
    scene.add(new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: uniformsFlash, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: 'attribute float phase; uniform float temps; varying float vA; void main(){ float s = sin(temps * (0.35 + fract(phase) * 0.5) + phase); vA = pow(max(s, 0.0), 220.0); vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = (2.0 + 9.0 * vA) * (300.0 / -mv.z); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; gl_FragColor = vec4(1.0, 0.98, 0.94, vA * (1.0 - d * 2.0)); }',
    })));
  }

  // ---------------------------------------------------------------------
  // Lumières
  // ---------------------------------------------------------------------
  scene.add(new THREE.HemisphereLight(0x2a3a5c, 0x0b1a10, 0.55));
  [[-1, -1], [1, -1], [-1, 1], [1, 1], [-1, 0], [1, 0]].forEach(([sx, sz]) => {
    const l = new THREE.SpotLight(0xfff1da, 2.1, 0, 0.75, 0.7, 0);
    l.position.set(sx * 66, 46, sz * 80);
    l.target.position.set(sx * 8, 0, sz * 18);
    scene.add(l, l.target);
  });
  // Projecteur principal : ombres nettes autour du bureau
  const lumiereBureau = new THREE.SpotLight(0xfff3df, 1.7, 0, 0.075, 0.55, 0);
  lumiereBureau.position.set(-34, 46, 38);
  lumiereBureau.target.position.set(0, 0.4, 0.3);
  lumiereBureau.castShadow = true;
  lumiereBureau.shadow.mapSize.set(2048, 2048);
  lumiereBureau.shadow.camera.near = 50; lumiereBureau.shadow.camera.far = 80;
  lumiereBureau.shadow.bias = -0.00015; lumiereBureau.shadow.normalBias = 0.015; lumiereBureau.shadow.radius = 3;
  scene.add(lumiereBureau, lumiereBureau.target);
  // Contre-jour depuis l'autre côté du stade
  const contre = new THREE.SpotLight(0xdfe8ff, 1.6, 0, 0.09, 0.6, 0);
  contre.position.set(40, 44, -60); contre.target.position.set(0, 0.8, 0.4);
  scene.add(contre, contre.target);

  // ---------------------------------------------------------------------
  // Le bureau, l'ordinateur et l'organisateur
  // ---------------------------------------------------------------------
  const bureau = new THREE.Group();
  scene.add(bureau);
  const mat = (couleur, rugosite = 0.6, metal = 0, extra = {}) => new THREE.MeshStandardMaterial({ color: couleur, roughness: rugosite, metalness: metal, ...extra });
  // Bois du plateau, cheveux, tissu de la chaise : textures dessinées
  const texBois = toile(1024, 512, (c, w, h) => {
    c.fillStyle = '#6b4a31'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) {
      const y = R() * h; const a = 0.04 + R() * 0.12;
      c.strokeStyle = R() < 0.5 ? `rgba(40,22,10,${a})` : `rgba(150,105,65,${a})`;
      c.lineWidth = 0.6 + R() * 2.4;
      c.beginPath(); c.moveTo(0, y);
      for (let x = 0; x <= w; x += 32) c.lineTo(x, y + Math.sin(x * 0.006 + i) * 6 + Math.sin(x * 0.03 + i * 3) * 1.5);
      c.stroke();
    }
  });
  const texCheveux = toile(256, 256, (c, w, h) => {
    c.fillStyle = '#1a110b'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      const x = R() * w; const y = R() * h; const l = 10 + R() * 26;
      c.strokeStyle = R() < 0.7 ? `rgba(70,45,28,${0.25 + R() * 0.4})` : `rgba(8,5,3,${0.3 + R() * 0.4})`;
      c.lineWidth = 0.6 + R() * 0.9;
      c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + (R() - 0.5) * 8, y + l / 2, x + (R() - 0.5) * 6, y + l); c.stroke();
    }
  }, { repeter: true });
  texCheveux.repeat.set(3, 2);
  const texTissu = toile(128, 128, (c, w, h) => {
    c.fillStyle = '#808080'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 3) for (let x = 0; x < w; x += 3) { const v = 100 + R() * 70; c.fillStyle = `rgb(${v},${v},${v})`; c.fillRect(x + ((y / 3) % 2), y, 2, 2); }
  }, { repeter: true, lineaire: true });
  texTissu.repeat.set(10, 10);
  const matBois = mat(0xffffff, 0.5, 0, { map: texBois });
  const matMetalNoir = mat(0x15171c, 0.45, 0.7);
  const matAlu = mat(0xb9c0ca, 0.32, 0.85);
  const matSweat = new THREE.MeshPhysicalMaterial({ color: 0x232b3a, roughness: 0.95, sheen: 0.6, sheenColor: new THREE.Color(0x5a6a8a), sheenRoughness: 0.8 });
  const matJean = mat(0x2a3a52, 0.9);
  const matPeau = new THREE.MeshPhysicalMaterial({ color: 0x9a6648, roughness: 0.6, sheen: 0.25, sheenColor: new THREE.Color(0xd9a07c) });
  const matCheveux = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: texCheveux, bumpMap: texCheveux, bumpScale: 1.5, roughness: 0.6, sheen: 1, sheenColor: new THREE.Color(0x5a3b22), sheenRoughness: 0.35 });
  const matChaise = mat(0x1a1d24, 0.85, 0.05, { bumpMap: texTissu, bumpScale: 0.6 });
  const ombres = (o) => { o.traverse((e) => { if (e.isMesh) { e.castShadow = true; e.receiveShadow = true; } }); return o; };
  const boite = (l, h, p, m, x, y, z, rayon = 0) => {
    const g = rayon ? new RoundedBoxGeometry(l, h, p, 3, rayon) : new THREE.BoxGeometry(l, h, p);
    const o = new THREE.Mesh(g, m); o.position.set(x, y, z); return o;
  };
  // Segment arrondi entre deux points (bras, jambes)
  function membre(a, b, r, m) {
    const va = new THREE.Vector3(...a); const vb = new THREE.Vector3(...b);
    const len = va.distanceTo(vb);
    const o = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 16), m);
    o.position.copy(va).add(vb).multiplyScalar(0.5);
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
    return o;
  }
  // Bureau
  bureau.add(ombres(boite(1.4, 0.035, 0.7, matBois, 0, 0.74, 0, 0.008)));
  [[-0.66, -0.31], [0.66, -0.31], [-0.66, 0.31], [0.66, 0.31]].forEach(([x, z]) => bureau.add(ombres(boite(0.04, 0.72, 0.04, matMetalNoir, x, 0.36, z))));
  bureau.add(ombres(boite(1.3, 0.04, 0.03, matMetalNoir, 0, 0.7, -0.3)));
  // Tasse, carnet, stylo, souris, téléphone, lampe
  {
    const tasse = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.038, 0.095, 32, 1, true), mat(0xebb517, 0.35, 0, { side: THREE.DoubleSide }));
    tasse.position.set(0.52, 0.805, 0.06);
    const fondTasse = new THREE.Mesh(new THREE.CircleGeometry(0.04, 24), mat(0x2b1a0e, 0.2)); fondTasse.rotation.x = -Math.PI / 2; fondTasse.position.set(0.52, 0.84, 0.06);
    const anse = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.007, 10, 24), mat(0xebb517, 0.35)); anse.position.set(0.565, 0.805, 0.06); anse.rotation.y = Math.PI / 2;
    bureau.add(ombres(tasse), fondTasse, ombres(anse));
    const stylo = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.14, 8), mat(0x0d121b, 0.3, 0.4)); stylo.rotation.z = Math.PI / 2; stylo.rotation.y = 0.6; stylo.position.set(-0.36, 0.775, 0.05); bureau.add(ombres(stylo));
    const souris = new THREE.Mesh(new THREE.SphereGeometry(0.03, 24, 16), mat(0x2a2d33, 0.4)); souris.scale.set(1, 0.45, 1.5); souris.position.set(0.34, 0.768, 0.06); bureau.add(ombres(souris));
    const tel = boite(0.075, 0.008, 0.155, mat(0x0d0f14, 0.3, 0.5), -0.2, 0.762, -0.18, 0.003); tel.rotation.y = -0.25; bureau.add(ombres(tel));
    const ecranTel = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.142), new THREE.MeshBasicMaterial({ color: 0xebb517, toneMapped: false }));
    ecranTel.rotation.x = -Math.PI / 2; ecranTel.rotation.z = 0.25; ecranTel.position.set(-0.2, 0.7665, -0.18); ecranTel.material.color.setRGB(0.55, 0.42, 0.08);
    bureau.add(ecranTel);
    // Lampe de bureau
    const lampe = new THREE.Group();
    lampe.add(boite(0.14, 0.02, 0.14, matMetalNoir, 0, 0.01, 0, 0.006));
    lampe.add(membre([0, 0.02, 0], [0.04, 0.36, 0.05], 0.009, matMetalNoir));
    lampe.add(membre([0.04, 0.36, 0.05], [0.16, 0.42, 0.12], 0.009, matMetalNoir));
    const abat = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.11, 32, 1, true), mat(0x15171c, 0.4, 0.6, { side: THREE.DoubleSide }));
    abat.position.set(0.17, 0.39, 0.13); abat.rotation.x = 0.4;
    const ampoule = new THREE.Mesh(new THREE.SphereGeometry(0.022, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffd9a0, toneMapped: false }));
    ampoule.position.set(0.17, 0.36, 0.14); ampoule.material.color.multiplyScalar(3);
    lampe.add(abat, ampoule);
    const lumiereLampe = new THREE.PointLight(0xffc98a, 0.05, 2.2, 2);
    lumiereLampe.position.set(0.17, 0.32, 0.15);
    lampe.add(lumiereLampe);
    lampe.position.set(-0.62, 0.757, -0.22); lampe.rotation.y = 0.6;
    bureau.add(ombres(lampe));
  }
  // Ombre de contact sous le bureau et la chaise
  {
    const t = toile(128, 128, (c, w, h) => { const g = c.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(0,0,0,0.75)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); });
    const ombre = (l, p, x, z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(l, p), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.015, z); bureau.add(m); };
    ombre(1.9, 1.1, 0, 0); ombre(0.9, 0.9, 0.02, 0.62);
  }

  // Portable : l'écran a le format de la page qu'il affiche
  const ECRAN_L = 0.312;
  let format = 1.6;
  let largeurPage = 1280;
  let hauteurPage = 800;
  let formatExact = false;
  const portable = new THREE.Group();
  portable.position.set(0.04, 0.7575, -0.08);
  bureau.add(portable);
  const charniere = new THREE.Group();
  const ecran3D = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ toneMapped: false }));
  let lumiereEcran;
  function construirePortable() {
    while (portable.children.length) portable.remove(portable.children[0]);
    while (charniere.children.length) charniere.remove(charniere.children[0]);
    const hEcran = ECRAN_L / format;
    portable.add(ombres(boite(0.335, 0.014, 0.232, matAlu, 0, 0.007, 0, 0.004)));
    portable.add(boite(0.29, 0.002, 0.11, mat(0x1a1d23, 0.7), 0, 0.0145, -0.03));
    for (let r = 0; r < 5; r++) for (let k = 0; k < 13; k++) portable.add(boite(0.017, 0.003, 0.016, mat(0x2b2f37, 0.6), -0.132 + k * 0.022, 0.016, -0.072 + r * 0.02));
    portable.add(boite(0.11, 0.0015, 0.07, mat(0xa9b0ba, 0.25, 0.8), 0, 0.0145, 0.068));
    charniere.position.set(0, 0.014, -0.116);
    charniere.rotation.x = -0.27;
    const capot = ombres(boite(0.335, hEcran + 0.026, 0.007, matAlu, 0, (hEcran + 0.026) / 2, -0.0035, 0.003));
    const cadre = boite(0.327, hEcran + 0.018, 0.0015, mat(0x07080b, 0.4), 0, (hEcran + 0.026) / 2, 0.0005);
    ecran3D.geometry.dispose();
    ecran3D.geometry = new THREE.PlaneGeometry(ECRAN_L, hEcran);
    ecran3D.position.set(0, (hEcran + 0.026) / 2 + 0.002, 0.0016);
    charniere.add(capot, cadre, ecran3D);
    lumiereEcran = new THREE.PointLight(0xc9dbff, 0.07, 1.6, 2);
    lumiereEcran.position.set(0, hEcran / 2, 0.15);
    charniere.add(lumiereEcran);
    portable.add(charniere);
    bureau.updateMatrixWorld(true);
  }

  // L'organisateur, assis, de dos à la caméra en fin de parcours
  const personnage = new THREE.Group();
  const corpsDessine = [];
  let refTete = null; // tête du vrai modèle une fois chargé
  const osAnimes = [];
  const avantBras = [];
  const tete = new THREE.Group();
  const buste = new THREE.Group();
  {
    // Chaise de bureau
    const chaise = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const bras = boite(0.3, 0.03, 0.045, matMetalNoir, Math.cos(a) * 0.15, 0.07, Math.sin(a) * 0.15);
      bras.rotation.y = -a; chaise.add(bras);
      const roue = new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 10), matChaise); roue.position.set(Math.cos(a) * 0.29, 0.03, Math.sin(a) * 0.29); chaise.add(roue);
    }
    chaise.add(new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.03, 0.3, 16), matAlu).translateY(0.23));
    chaise.add(boite(0.5, 0.08, 0.48, matChaise, 0, 0.42, 0, 0.035));
    const dossier = boite(0.47, 0.6, 0.06, matChaise, 0, 0.88, 0.23, 0.05); dossier.rotation.x = 0.1; chaise.add(dossier);
    const appuieTete = boite(0.26, 0.12, 0.05, matChaise, 0, 1.25, 0.26, 0.04); appuieTete.rotation.x = 0.1; chaise.add(appuieTete);
    chaise.add(boite(0.05, 0.3, 0.05, matMetalNoir, 0, 0.57, 0.25));
    [-1, 1].forEach((s) => { chaise.add(boite(0.05, 0.03, 0.26, matChaise, s * 0.27, 0.64, 0.0, 0.012)); chaise.add(boite(0.03, 0.18, 0.03, matMetalNoir, s * 0.27, 0.54, 0.04)); });
    ombres(chaise);
    chaise.position.set(0, 0, 0.56);
    personnage.add(chaise);

    // Jambes
    [-1, 1].forEach((s) => {
      const cuisse = membre([s * 0.1, 0.55, 0.66], [s * 0.12, 0.57, 0.22], 0.07, matJean);
      const mollet = membre([s * 0.12, 0.55, 0.22], [s * 0.13, 0.1, 0.18], 0.055, matJean);
      const chaussure = boite(0.1, 0.07, 0.25, mat(0xe8e6e0, 0.6), s * 0.13, 0.035, 0.12, 0.03);
      personnage.add(cuisse, mollet, chaussure);
      corpsDessine.push(cuisse, mollet, chaussure);
    });
    // Buste (sweat à capuche) légèrement penché vers l'écran
    buste.position.set(0, 0.55, 0.64);
    const torse = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.32, 8, 24), matSweat);
    torse.scale.set(1.12, 1, 0.72); torse.position.set(0, 0.3, 0);
    buste.add(torse);
    const epaules = membre([-0.2, 0.5, 0], [0.2, 0.5, 0], 0.085, matSweat); buste.add(epaules);
    const capuche = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.045, 12, 28), matSweat); capuche.rotation.x = Math.PI / 2 - 0.3; capuche.position.set(0, 0.58, 0.04); capuche.scale.set(1.15, 1, 0.8);
    buste.add(capuche);
    // Logo OLYMPIAD brodé dans le dos
    const logo = new THREE.Group();
    [0.28, 0.6, 1, 0.6, 0.28].forEach((o, i) => {
      const b = new THREE.Mesh(new THREE.PlaneGeometry(0.012, 0.06), new THREE.MeshStandardMaterial({ color: 0xebb517, roughness: 0.6, transparent: true, opacity: o }));
      b.position.set(-0.04 + i * 0.02, 0, 0); logo.add(b);
    });
    logo.position.set(0, 0.42, 0.125); logo.rotation.x = 0.12;
    buste.add(logo);
    buste.add(membre([0, 0.56, 0.0], [0, 0.66, -0.02], 0.05, matPeau));
    // Tête vue de dos : cheveux, oreilles, nuque
    const crane = new THREE.Mesh(new THREE.SphereGeometry(0.1, 32, 24), matPeau); crane.scale.set(0.95, 1.12, 1.05);
    const cheveux = new THREE.Mesh(new THREE.SphereGeometry(0.107, 40, 28, 0, Math.PI * 2, 0, Math.PI * 0.72), matCheveux);
    cheveux.scale.set(0.98, 1.12, 1.08); cheveux.rotation.x = 0.75; cheveux.position.set(0, 0.006, 0.012);
    tete.add(crane, cheveux);
    [-1, 1].forEach((s) => { const o = new THREE.Mesh(new THREE.SphereGeometry(0.024, 12, 10), matPeau); o.scale.set(0.5, 1.2, 0.9); o.position.set(s * 0.095, -0.005, 0.005); tete.add(o); });
    tete.position.set(0, 0.76, -0.03);
    buste.add(tete);
    buste.rotation.x = -0.13;
    // Bras jusqu'au clavier
    [-1, 1].forEach((s) => {
      const brasHaut = membre([s * 0.22, 0.48, 0.0], [s * 0.25, 0.2, -0.12], 0.055, matSweat);
      buste.add(brasHaut);
      const avant = new THREE.Group();
      avant.add(membre([s * 0.25, 0.2, -0.12], [s * 0.1, 0.33, -0.52], 0.048, matSweat));
      // Main : paume, quatre doigts posés sur le clavier, pouce
      const main = new THREE.Group();
      main.add(boite(0.072, 0.024, 0.075, matPeau, 0, 0, 0, 0.011));
      for (let k = 0; k < 4; k++) {
        const x = -0.027 + k * 0.018;
        const doigt = membre([x, -0.002, -0.035], [x * 1.1, -0.014, -0.085 + Math.abs(k - 1.5) * 0.006], 0.0085, matPeau);
        main.add(doigt);
      }
      main.add(membre([-s * 0.036, -0.004, -0.01], [-s * 0.05, -0.012, -0.05], 0.01, matPeau));
      main.add(membre([0, 0.002, 0.045], [0, 0.004, 0.075], 0.04, matSweat));
      main.position.set(s * 0.085, 0.335, -0.56);
      main.rotation.x = 0.12;
      avant.add(main);
      buste.add(avant);
      avantBras.push(avant);
    });
    personnage.add(buste);
    corpsDessine.push(buste);
    ombres(personnage);
    bureau.add(personnage);
  }

  // ---------------------------------------------------------------------
  // Écran : maquette dessinée (de loin) puis vraie page (de près)
  // ---------------------------------------------------------------------
  const toileEcran = document.createElement('canvas');
  const texEcran = new THREE.CanvasTexture(toileEcran);
  texEcran.colorSpace = THREE.SRGBColorSpace;
  texEcran.anisotropy = anisotropie;
  ecran3D.material.map = texEcran;
  function dessinerMaquette() {
    // Reprend la mise en page du héros de la page d'accueil
    const w = 1280; const h = Math.round(1280 / format);
    toileEcran.width = w; toileEcran.height = h;
    const c = toileEcran.getContext('2d');
    const clair = (racine.dataset.theme || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')) === 'light';
    const en = racine.lang === 'en';
    const fond = clair ? '#f2f5fb' : '#0b0f18';
    const texte = clair ? '#11161f' : '#f3f2ed';
    const attenue = clair ? '#5b606a' : '#8d93a0';
    const surface = clair ? '#e2e6ee' : '#181d26';
    c.fillStyle = fond; c.fillRect(0, 0, w, h);
    const g = c.createRadialGradient(w * 0.85, h * 0.1, 0, w * 0.85, h * 0.1, w * 0.55);
    g.addColorStop(0, 'rgba(235,181,23,0.16)'); g.addColorStop(1, 'rgba(235,181,23,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    const barres = (x, y, t) => [0.28, 0.6, 1, 0.6, 0.28].forEach((o, i) => { c.fillStyle = `rgba(235,181,23,${o})`; c.fillRect(x + i * t * 0.14, y, t * 0.08, t * 0.48); });
    barres(60, 22, 34);
    c.fillStyle = texte; c.font = '400 28px "Bebas Neue", Impact, sans-serif'; c.textBaseline = 'alphabetic'; c.fillText('OLYMPIAD', 108, 46);
    c.font = '500 15px "Work Sans", Arial, sans-serif'; c.fillStyle = attenue;
    (en ? ['Try it', 'Features', 'Sports', 'Plans', 'Help'] : ['Essayer', 'Fonctionnalités', 'Sports', 'Offres', 'Aide']).reduce((x, m) => { c.fillText(m, x, 40); return x + c.measureText(m).width + 26; }, 360);
    c.fillStyle = '#ebb517'; c.beginPath(); c.roundRect(w - 230, 16, 170, 40, 10); c.fill();
    c.fillStyle = '#0d121b'; c.font = '400 19px "Bebas Neue", Impact, sans-serif'; c.fillText(en ? 'TRY IT LIVE' : 'ESSAYER EN DIRECT', w - 212, 43);
    const x0 = 60;
    c.fillStyle = 'rgba(235,181,23,0.15)'; c.beginPath(); c.roundRect(x0, 118, 330, 30, 15); c.fill();
    c.fillStyle = clair ? '#9a6700' : '#ebb517'; c.font = '600 13px "Work Sans", Arial, sans-serif'; c.fillText(en ? '● Amateur sports tournaments · live' : '● Tournois sportifs amateurs · en direct', x0 + 14, 138);
    const taille = Math.min(104, h * 0.13);
    c.font = `400 ${taille}px "Bebas Neue", Impact, sans-serif`;
    const lignes = en ? ['RUN', 'YOUR TOURNAMENT.', 'EVERYONE FOLLOWS.'] : ['ORGANISE', 'TON TOURNOI.', 'TOUT LE MONDE SUIT.'];
    lignes.forEach((l, i) => { c.fillStyle = i === 2 ? '#ebb517' : texte; c.fillText(l, x0, 170 + taille * 0.92 * (i + 1)); });
    let y = 170 + taille * 0.92 * 3 + 36;
    c.fillStyle = attenue;
    [0.86, 0.9, 0.7].forEach((k) => { c.fillRect(x0, y, 560 * k, 10); y += 26; });
    c.fillStyle = '#ebb517'; c.beginPath(); c.roundRect(x0, y + 14, 300, 54, 12); c.fill();
    c.fillStyle = '#0d121b'; c.font = '400 23px "Bebas Neue", Impact, sans-serif'; c.fillText(en ? 'CREATE A TOURNAMENT NOW →' : 'CRÉER UN TOURNOI MAINTENANT →', x0 + 22, y + 49);
    // Téléphone de démonstration
    const px = w * 0.67; const py = 110; const pw = 300; const ph = Math.min(560, h - 140);
    c.fillStyle = '#05070c'; c.beginPath(); c.roundRect(px, py, pw, ph, 40); c.fill();
    c.fillStyle = '#0b0f18'; c.beginPath(); c.roundRect(px + 11, py + 11, pw - 22, ph - 22, 30); c.fill();
    c.fillStyle = '#f3f2ed'; c.font = '400 22px "Bebas Neue", Impact, sans-serif'; c.fillText(en ? 'U13 SPRING CUP' : 'TOURNOI U13 DE PRINTEMPS', px + 26, py + 82);
    c.fillStyle = '#181d26'; c.beginPath(); c.roundRect(px + 24, py + 104, pw - 48, 34, 10); c.fill();
    c.fillStyle = '#ebb517'; c.beginPath(); c.roundRect(px + 27, py + 107, (pw - 54) / 2, 28, 8); c.fill();
    [['Les Aigles · FC Rivière', '1-0', true], ['Étoile Sud · US Collines', '0-1', true], ['Les Aigles · Étoile Sud', '', false]].forEach(([n, s, live], i) => {
      const yy = py + 156 + i * 70;
      if (yy + 58 > py + ph - 20) return;
      c.fillStyle = '#181d26'; c.strokeStyle = live ? '#ebb517' : '#2d333d'; c.lineWidth = 2;
      c.beginPath(); c.roundRect(px + 24, yy, pw - 48, 58, 12); c.fill(); c.stroke();
      c.fillStyle = '#f3f2ed'; c.font = '600 13px "Work Sans", Arial, sans-serif'; c.fillText(n, px + 38, yy + 26);
      c.fillStyle = live ? '#ebb517' : '#808693'; c.font = '500 11px "Work Sans", Arial, sans-serif'; c.fillText(live ? (en ? '● Live · field 1' : '● En cours · terrain 1') : '14:45', px + 38, yy + 44);
      if (s) { c.fillStyle = '#f3f2ed'; c.font = '400 28px "Bebas Neue", Impact, sans-serif'; c.fillText(s, px + pw - 80, yy + 40); }
    });
    texEcran.needsUpdate = true;
  }

  // La vraie page, posée sur l'écran 3D (rendu CSS 3D)
  const support = document.createElement('div');
  support.className = 'cinema-page';
  const iframe = document.createElement('iframe');
  iframe.title = 'OLYMPIAD';
  iframe.tabIndex = -1;
  iframe.setAttribute('aria-hidden', 'true');
  iframe.setAttribute('scrolling', 'no');
  support.appendChild(iframe);
  const pageCSS = new CSS3DObject(support);
  scene.add(pageCSS);
  let iframeChargee = false;
  function chargerPage() {
    if (iframeChargee) return;
    iframeChargee = true;
    iframe.src = `${location.pathname}?ecran=1`;
  }
  window.olympiadIntroRafraichir = () => {
    dessinerMaquette();
    try { if (iframeChargee) iframe.contentWindow.location.reload(); } catch (e) { /* rien */ }
  };

  // ---------------------------------------------------------------------
  // Trajectoire de la caméra (un seul plan continu)
  // ---------------------------------------------------------------------
  let trajet;
  let visee;
  const CENTRE_ECRAN = new THREE.Vector3();
  const NORMALE_ECRAN = new THREE.Vector3();
  const QUAT_ECRAN = new THREE.Quaternion();
  let hEcranMonde = 0.195;
  function distanceFinale() {
    // Distance à laquelle l'écran couvre exactement la fenêtre
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    return Math.min(hEcranMonde / (2 * tanV), ECRAN_L / (2 * tanV * camera.aspect));
  }
  function construireTrajet() {
    bureau.updateMatrixWorld(true);
    ecran3D.getWorldPosition(CENTRE_ECRAN);
    ecran3D.getWorldQuaternion(QUAT_ECRAN);
    NORMALE_ECRAN.set(0, 0, 1).applyQuaternion(QUAT_ECRAN);
    hEcranMonde = ECRAN_L / format;
    const fin = CENTRE_ECRAN.clone().add(NORMALE_ECRAN.clone().multiplyScalar(distanceFinale()));
    const approche = CENTRE_ECRAN.clone().add(NORMALE_ECRAN.clone().multiplyScalar(0.62));
    trajet = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-30, 150, 215),
      new THREE.Vector3(-12, 82, 118),
      new THREE.Vector3(-3, 30, 42),
      new THREE.Vector3(0.6, 7.5, 9.5),
      new THREE.Vector3(0.45, 2.3, 2.9),
      new THREE.Vector3(0.36, 1.5, 1.45),
      new THREE.Vector3(0.3, 1.24, 0.68),
      approche,
      fin,
    ], false, 'centripetal');
    visee = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, -8),
      new THREE.Vector3(0, 0, -3),
      new THREE.Vector3(0, 0.3, 0),
      new THREE.Vector3(0, 0.8, 0),
      new THREE.Vector3(0.02, 0.95, -0.05),
      new THREE.Vector3(0.03, 0.95, -0.12),
      CENTRE_ECRAN.clone().add(new THREE.Vector3(0.02, 0.02, 0)),
      CENTRE_ECRAN.clone(),
      CENTRE_ECRAN.clone(),
    ], false, 'centripetal');
    // La page posée sur l'écran
    pageCSS.position.copy(CENTRE_ECRAN).add(NORMALE_ECRAN.clone().multiplyScalar(0.0004));
    pageCSS.quaternion.copy(QUAT_ECRAN);
    pageCSS.scale.setScalar(ECRAN_L / largeurPage);
  }

  // Répartition du défilement entre les points de passage
  const REPERES = [0, 0.13, 0.27, 0.42, 0.55, 0.66, 0.77, 0.89, 1];
  function parametre(p) {
    for (let i = 0; i < REPERES.length - 1; i++) {
      if (p <= REPERES[i + 1]) return (i + (p - REPERES[i]) / (REPERES[i + 1] - REPERES[i])) / (REPERES.length - 1);
    }
    return 1;
  }

  // ---------------------------------------------------------------------
  // Ressources CC0 (Poly Haven, voir assets/3d/LICENCE.md) : chargées après
  // le premier affichage, elles remplacent les matières dessinées
  // ---------------------------------------------------------------------
  async function chargerRessources() {
    const { RGBELoader } = await import('three/addons/loaders/RGBELoader.js');
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
    const dossier = new URL('assets/3d/', import.meta.url).href;
    const chargeur = new THREE.TextureLoader();
    const tex = (nom, srgb, repeter) => new Promise((ok) => chargeur.load(dossier + 'textures/' + nom, (t) => {
      t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(...repeter);
      t.anisotropy = anisotropie;
      ok(t);
    }, undefined, () => ok(null)));
    const appliquer = (m, cartes) => {
      Object.entries(cartes).forEach(([k, v]) => { if (v) m[k] = v; });
      m.needsUpdate = true;
      forcerRendu = true;
    };
    // Éclairage d'ambiance et reflets (portable, tasse, chaise)
    new RGBELoader().load(dossier + 'nuit_1k.hdr', (hdr) => {
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromEquirectangular(hdr).texture;
      hdr.dispose(); pmrem.dispose();
      scene.traverse((o) => { if (o.material && o.material.isMeshStandardMaterial) { o.material.envMapIntensity = o.parent === scene ? 0.02 : 0.1; } });
      forcerRendu = true;
    });
    const [boisC, boisN, boisR, laineN, laineR, jeanC, jeanN, jeanR, cuirN, cuirR] = await Promise.all([
      tex('american_walnut_veneer_diff_1k.jpg', true, [1.4, 0.7]), tex('american_walnut_veneer_nor_gl_1k.jpg', false, [1.4, 0.7]), tex('american_walnut_veneer_rough_1k.jpg', false, [1.4, 0.7]),
      tex('knitted_fleece_nor_gl_1k.jpg', false, [6, 6]), tex('knitted_fleece_rough_1k.jpg', false, [6, 6]),
      tex('denim_fabric_diff_1k.jpg', true, [3, 3]), tex('denim_fabric_nor_gl_1k.jpg', false, [3, 3]), tex('denim_fabric_rough_1k.jpg', false, [3, 3]),
      tex('fabric_leather_01_nor_gl_1k.jpg', false, [3, 3]), tex('fabric_leather_01_rough_1k.jpg', false, [3, 3]),
    ]);
    if (boisC) { matBois.color.set(0x9a6a48); appliquer(matBois, { map: boisC, normalMap: boisN, roughnessMap: boisR }); matBois.roughness = 1; }
    appliquer(matSweat, { normalMap: laineN, roughnessMap: laineR }); matSweat.normalScale.set(0.8, 0.8);
    if (jeanC) { matJean.color.set(0xffffff); appliquer(matJean, { map: jeanC, normalMap: jeanN, roughnessMap: jeanR }); matJean.roughness = 1; }
    if (cuirN) { matChaise.bumpMap = null; appliquer(matChaise, { normalMap: cuirN, roughnessMap: cuirR }); matChaise.roughness = 1; matChaise.color.set(0x15181e); }
    // Petits objets du bureau
    const gltf = new GLTFLoader();
    const placerObjet = (chemin, x, z, ry, teinte = 1) => gltf.load(dossier + chemin, (g) => {
      const modele = g.scene;
      modele.traverse((e) => { if (e.isMesh) { e.castShadow = true; e.receiveShadow = true; if (e.material) { e.material.envMapIntensity = 0.1; e.material.color.multiplyScalar(teinte); } } });
      // Centre le modèle sur son vrai milieu, posé sur le plateau
      const boite3 = new THREE.Box3().setFromObject(modele);
      const centre = boite3.getCenter(new THREE.Vector3());
      modele.position.set(-centre.x, -boite3.min.y, -centre.z);
      const o = new THREE.Group();
      o.add(modele);
      o.position.set(x, 0.7575, z);
      o.rotation.y = ry;
      bureau.add(o);
      forcerRendu = true;
    });
    gltf.load(dossier + 'modeles/office_notepads/office_notepads_1k.gltf', (g) => {
      [['office_notepads_yellow_pad', -0.4, 0.08, 0.2], ['office_notepads_sticky_stack', 0.3, -0.22, -0.3]].forEach(([nom, x, z, ry]) => {
        const element = g.scene.getObjectByName(nom);
        if (!element) return;
        element.position.set(0, 0, 0);
        element.traverse((e) => { if (e.isMesh) { e.castShadow = true; e.receiveShadow = true; e.material.envMapIntensity = 0.1; e.material.color.multiplyScalar(0.7); } });
        const b3 = new THREE.Box3().setFromObject(element);
        const c3 = b3.getCenter(new THREE.Vector3());
        element.position.set(-c3.x, -b3.min.y, -c3.z);
        const o = new THREE.Group(); o.add(element);
        o.position.set(x, 0.7575, z); o.rotation.y = ry;
        bureau.add(o);
      });
      forcerRendu = true;
    });
    placerObjet('modeles/potted_plant_04/potted_plant_04_1k.gltf', 0.6, -0.2, 0.4);
    chargerOrganisateur(dossier).catch((e) => console.warn('Personnage :', e));
  }

  // L'organisateur : avatar réaliste Microsoft Rocketbox (licence MIT),
  // posé assis au clavier en orientant ses os un par un
  async function chargerOrganisateur(dossier) {
    const { FBXLoader } = await import('three/addons/loaders/FBXLoader.js');
    const gestion = new THREE.LoadingManager();
    // Les TGA d'origine (12 Mo chacune) sont remplacées par des JPEG/PNG légers
    gestion.addHandler(/\.tga$/i, { setPath() { return this; }, setCrossOrigin() { return this; }, load: () => new THREE.Texture() });
    const modele = await new FBXLoader(gestion).loadAsync(dossier + 'personnage/organisateur.fbx');
    const chargeur = new THREE.TextureLoader();
    const tex = (nom, srgb) => new Promise((ok) => chargeur.load(dossier + 'personnage/' + nom, (t) => { t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = anisotropie; ok(t); }, undefined, () => ok(null)));
    const [corpsC, corpsN, teteC, teteN, opacite] = await Promise.all([
      tex('m017_body_color.jpg', true), tex('m017_body_normal.jpg', false), tex('m017_head_color.jpg', true), tex('m017_head_normal.jpg', false), tex('m017_opacity_color.png', true),
    ]);
    const matieres = {
      body: new THREE.MeshStandardMaterial({ map: corpsC, normalMap: corpsN, roughness: 0.85, envMapIntensity: 0.1 }),
      head: new THREE.MeshPhysicalMaterial({ map: teteC, normalMap: teteN, roughness: 0.62, sheen: 0.3, sheenColor: new THREE.Color(0xd9a07c), envMapIntensity: 0.1 }),
      opacity: new THREE.MeshStandardMaterial({ map: opacite, alphaTest: 0.55, side: THREE.DoubleSide, roughness: 0.6, envMapIntensity: 0.1 }),
    };
    const remplacer = (m) => {
      const cle = Object.keys(matieres).find((k) => (m.name || '').toLowerCase().includes(k));
      return cle ? matieres[cle] : m;
    };
    modele.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
      o.material = Array.isArray(o.material) ? o.material.map(remplacer) : remplacer(o.material);
    });
    const os = {};
    modele.traverse((o) => { if (o.isBone) os[o.name] = o; });
    const B = (n) => os['Bip01 ' + n] || os['Bip01_' + n.replace(/ /g, '_')];
    if (!B('Pelvis') || !B('Head')) throw new Error('squelette inattendu');

    // Taille réelle (1,78 m) et orientation : le personnage regarde vers -z
    modele.updateMatrixWorld(true);
    const boite3 = new THREE.Box3().setFromObject(modele);
    modele.scale.multiplyScalar(1.78 / (boite3.max.y - boite3.min.y));
    modele.updateMatrixWorld(true);
    const wp = (o) => o.getWorldPosition(new THREE.Vector3());
    // Orientation d'après les hanches (les pieds sont tournés vers l'extérieur)
    const droite = wp(B('R Thigh')).sub(wp(B('L Thigh')));
    const devant = new THREE.Vector3(0, 1, 0).cross(droite);
    modele.rotation.y += Math.PI - Math.atan2(devant.x, devant.z);
    modele.updateMatrixWorld(true);

    // Oriente un os pour que son enfant parte dans la direction voulue (repère monde)
    const orienter = (nom, enfant, direction) => {
      const b = B(nom); const c = B(enfant);
      if (!b || !c) return;
      modele.updateMatrixWorld(true);
      const actuelle = wp(c).sub(wp(b)).normalize();
      const delta = new THREE.Quaternion().setFromUnitVectors(actuelle, direction.clone().normalize());
      const monde = b.getWorldQuaternion(new THREE.Quaternion());
      const parent = b.parent.getWorldQuaternion(new THREE.Quaternion());
      b.quaternion.copy(parent.invert().multiply(delta.multiply(monde)));
      modele.updateMatrixWorld(true);
    };
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    // Assis : cuisses à l'horizontale, mollets vers le sol, buste légèrement penché
    orienter('Spine', 'Spine1', V(0, 1, -0.12));
    orienter('Spine1', 'Spine2', V(0, 1, -0.3));
    orienter('Spine2', 'Neck', V(0, 1, -0.32));
    orienter('Neck', 'Head', V(0, 1, -0.32));
    [['L', -1], ['R', 1]].forEach(([c, s]) => {
      orienter(c + ' Thigh', c + ' Calf', V(s * 0.1, -0.08, -1));
      orienter(c + ' Calf', c + ' Foot', V(s * 0.03, -1, -0.12));
      orienter(c + ' Foot', c + ' Toe0', V(0, -0.25, -1));
    });
    // Place le bassin sur l'assise de la chaise
    modele.updateMatrixWorld(true);
    const bassin = wp(B('Pelvis'));
    modele.position.add(V(0.0 - bassin.x, 0.535 - bassin.y, 0.58 - bassin.z));
    modele.updateMatrixWorld(true);
    // Bras : coudes près du corps, mains posées sur le clavier
    [['L', -1], ['R', 1]].forEach(([c, s]) => {
      // Cinématique inverse à deux segments : le poignet atteint le clavier,
      // le coude part vers le bas et légèrement vers l'extérieur
      const epaule = wp(B(c + ' UpperArm'));
      const a = epaule.distanceTo(wp(B(c + ' Forearm')));
      const b = wp(B(c + ' Forearm')).distanceTo(wp(B(c + ' Hand')));
      const cible = V(s * 0.11, 0.805, 0.035);
      const versCible = cible.clone().sub(epaule);
      const d = Math.min(versCible.length(), (a + b) * 0.995);
      const u = versCible.normalize();
      const pole = V(s * 0.45, -1, 0.15);
      const w = pole.sub(u.clone().multiplyScalar(pole.dot(u))).normalize();
      const cosA = (a * a + d * d - b * b) / (2 * a * d);
      const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
      const coude = epaule.clone().add(u.clone().multiplyScalar(a * cosA)).add(w.multiplyScalar(a * sinA));
      orienter(c + ' UpperArm', c + ' Forearm', coude.clone().sub(epaule));
      orienter(c + ' Forearm', c + ' Hand', epaule.clone().add(u.multiplyScalar(d)).sub(wp(B(c + ' Forearm'))));
      orienter(c + ' Hand', c + ' Finger2', V(0, -0.12, -1));
      ['1', '2', '3', '4'].forEach((d) => orienter(c + ' Finger' + d + '1', c + ' Finger' + d + '2', V(0, -0.75, -1)));
    });
    modele.updateMatrixWorld(true);

    // Animation discrète : doigts qui tapent, respiration, tête
    const anime = (nom, amplitude, vitesse, phase, redresse = false) => {
      const b = B(nom); if (!b) return;
      osAnimes.push({ os: b, base: b.quaternion.clone(), axe: new THREE.Vector3(0, 0, 1), amplitude, vitesse, phase, redresse });
    };
    ['L', 'R'].forEach((c, i) => ['1', '2', '3'].forEach((d, k) => anime(c + ' Finger' + d + '1', 0.18, 11 + k * 1.7, i * 2 + k * 1.3, true)));
    anime('L Hand', 0.03, 5.5, 0.4); anime('R Hand', 0.03, 6.1, 1.9);
    anime('Spine1', 0.01, 1.6, 0); anime('Head', 0.035, 0.6, 0.5);

    corpsDessine.forEach((o) => { o.visible = false; });
    refTete = B('Head');
    personnage.add(modele);
    forcerRendu = true;
  }


  // ---------------------------------------------------------------------
  // Mise à l'échelle de la fenêtre
  // ---------------------------------------------------------------------
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  // Occlusion ambiante : ombres de contact réalistes, activée de près seulement
  const ao = new GTAOPass(scene, camera, 512, 512);
  ao.updateGtaoMaterial({ radius: 0.12, distanceExponent: 1.5, thickness: 0.6, scale: 1.2, samples: 12 });
  ao.blendIntensity = 0.9;
  ao.enabled = false;
  composer.addPass(ao);
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.45, 1.8);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  function redimensionner() {
    const W = intro.clientWidth;
    const H = intro.clientHeight;
    const f = W / H;
    formatExact = f >= 1.25 && f <= 2.3;
    largeurPage = formatExact ? W : 1280;
    hauteurPage = formatExact ? H : 800;
    format = largeurPage / hauteurPage;
    camera.aspect = f;
    // Assez de champ horizontal sur téléphone
    camera.fov = f < 1 ? Math.min(72, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(24)) / f))) : 38;
    camera.updateProjectionMatrix();
    renderer.setSize(W, H);
    composer.setSize(W, H);
    bloom.resolution.set(W / 2, H / 2);
    ao.setSize(W, H);
    rendererCSS.setSize(W, H);
    support.style.width = `${largeurPage}px`;
    support.style.height = `${hauteurPage}px`;
    construirePortable();
    dessinerMaquette();
    construireTrajet();
  }
  redimensionner();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { dessinerMaquette(); });

  // ---------------------------------------------------------------------
  // Rendu d'une image selon l'avancement p (0 → 1)
  // ---------------------------------------------------------------------
  const texte = intro.querySelector('.intro-texte');
  const legende = intro.querySelector('.intro-legende');
  const tmp = new THREE.Vector3();
  let temps = 0;
  function poser(p) {
    const u = parametre(p);
    trajet.getPoint(u, camera.position);
    visee.getPoint(u, tmp);
    // Lent survol du stade tant qu'on n'a pas commencé à descendre
    if (!mouvementReduit && p < 0.2) {
      const k = (1 - p / 0.2) ** 2;
      const a = Math.sin(temps * 0.06) * 0.12 * k;
      const x = camera.position.x; const z = camera.position.z;
      camera.position.x = x * Math.cos(a) - z * Math.sin(a);
      camera.position.z = x * Math.sin(a) + z * Math.cos(a);
    }
    camera.lookAt(tmp);
    camera.updateMatrixWorld();
    ao.enabled = camera.position.length() < 9;
    // Plan proche adapté à la distance : précision de profondeur de 270 m à 30 cm
    const near = borne(camera.position.distanceTo(tmp) * 0.01, 0.004, 3);
    if (Math.abs(near - camera.near) > near * 0.05) { camera.near = near; camera.updateProjectionMatrix(); }

    const tTexte = borne(p / 0.06);
    texte.style.opacity = String(1 - tTexte);
    texte.style.transform = `translateY(${-tTexte * 50}px)`;
    const tl = p < 0.62 ? borne((p - 0.5) / 0.06) : 1 - borne((p - 0.68) / 0.06);
    legende.style.opacity = String(tl);
    legende.style.transform = `translateY(${(1 - tl) * 14}px)`;
    passer.classList.toggle('visible', p < 0.97);

    // La vraie page remplace la maquette dès que la tête ne masque plus
    // l'écran (fondu court, indépendant du défilement)
    const d = camera.position.distanceTo(CENTRE_ECRAN);
    if (d < 2) chargerPage();
    const cibleOpacite = d < 1.4 && !teteDevantEcran() ? 1 : 0;
    opacitePage = mouvementReduit ? cibleOpacite : opacitePage + (cibleOpacite - opacitePage) * 0.22;
    if (Math.abs(cibleOpacite - opacitePage) < 0.01) opacitePage = cibleOpacite;
    const o = opacitePage;
    support.style.opacity = String(o);
    // La maquette s'efface sous la vraie page : pas de double image pendant le fondu
    ecran3D.material.color.setScalar(1 - o * 0.92);
    support.style.visibility = o > 0 ? 'visible' : 'hidden';
    intro.style.opacity = formatExact ? '1' : String(1 - borne((p - 0.93) / 0.07));
    // Le halo s'adoucit en s'approchant de l'écran (pas de flou sur la page)
    bloom.strength = 0.5 * (1 - borne((p - 0.82) / 0.12));
    // Les faisceaux ne se voient que de haut
    uniformsCone.force.value = borne((camera.position.y - 12) / 30);
  }
  // La tête (sphère de 14 cm) recouvre-t-elle l'écran à l'image ?
  let opacitePage = 0;
  const pt = new THREE.Vector3();
  const coin = new THREE.Vector3();
  function teteDevantEcran() {
    (refTete || tete).getWorldPosition(pt);
    if (pt.distanceTo(camera.position) > CENTRE_ECRAN.distanceTo(camera.position)) return false;
    // Tête derrière la caméra : elle ne peut rien masquer
    if (pt.clone().applyMatrix4(camera.matrixWorldInverse).z > -0.05) return false;
    const rayon = 0.15;
    const bord = pt.clone().add(new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).multiplyScalar(rayon));
    pt.project(camera); bord.project(camera);
    const r = Math.hypot((bord.x - pt.x) * camera.aspect, bord.y - pt.y);
    let x0 = Infinity; let x1 = -Infinity; let y0 = Infinity; let y1 = -Infinity;
    const h = ECRAN_L / format;
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
      coin.set((sx * ECRAN_L) / 2, (sy * h) / 2, 0); ecran3D.localToWorld(coin); coin.project(camera);
      x0 = Math.min(x0, coin.x * camera.aspect); x1 = Math.max(x1, coin.x * camera.aspect); y0 = Math.min(y0, coin.y); y1 = Math.max(y1, coin.y);
    });
    const cx = Math.max(x0, Math.min(pt.x * camera.aspect, x1));
    const cy = Math.max(y0, Math.min(pt.y, y1));
    return Math.hypot(pt.x * camera.aspect - cx, pt.y - cy) < r;
  }
  function animerPersonnage() {
    if (mouvementReduit) return;
    // Vrai modèle : frappe au clavier, respiration, légers mouvements de tête
    osAnimes.forEach(({ os, base, axe, amplitude, vitesse, phase, redresse }) => {
      const a = redresse ? Math.max(0, Math.sin(temps * vitesse + phase)) * amplitude : Math.sin(temps * vitesse + phase) * amplitude;
      os.quaternion.copy(base).multiply(new THREE.Quaternion().setFromAxisAngle(axe, a));
    });
    avantBras.forEach((g, i) => { g.position.y = Math.max(0, Math.sin(temps * 13 + i * 2.1)) * 0.006; });
    tete.rotation.x = Math.sin(temps * 0.7) * 0.03;
    tete.rotation.y = Math.sin(temps * 0.31) * 0.05;
    buste.scale.y = 1 + Math.sin(temps * 1.6) * 0.004;
    uniformsFlash.temps.value = temps;
  }
  function rendre() {
    composer.render();
    rendererCSS.render(scene, camera);
  }

  // ---------------------------------------------------------------------
  // Défilement et boucle d'animation
  // ---------------------------------------------------------------------
  const longueur = () => Math.max(1, espace.offsetHeight);
  let cible = borne(window.scrollY / longueur());
  let actuel = cible;
  let fini = window.scrollY >= longueur();
  let dernier = 0;
  let precedent = performance.now();
  let dernierY = window.scrollY;
  function auDefilement() {
    const p = window.scrollY / longueur();
    fini = p >= 1;
    intro.classList.toggle('fini', fini);
    if (fini) { passer.classList.remove('visible'); support.style.visibility = 'hidden'; opacitePage = 0; actuel = cible = 1; return; }
    cible = borne(p);
  }
  function boucle(maintenant) {
    requestAnimationFrame(boucle);
    const dt = Math.min(0.05, (maintenant - precedent) / 1000);
    precedent = maintenant;
    // Relit la position à chaque image (saut au clavier, ancre, événement manqué)
    if (window.scrollY !== dernierY) { dernierY = window.scrollY; auDefilement(); }
    if (fini || document.hidden) return;
    const ecart = cible - actuel;
    const bouge = Math.abs(ecart) > 0.00005;
    actuel = mouvementReduit || !bouge ? cible : actuel + ecart * Math.min(1, dt * 7);
    // Hors défilement : animations d'ambiance à 30 images par seconde
    if (!bouge && !forcerRendu && (mouvementReduit || maintenant - dernier < 33)) return;
    forcerRendu = false;
    dernier = maintenant;
    temps += mouvementReduit ? 0 : dt;
    animerPersonnage();
    poser(actuel);
    rendre();
  }
  window.addEventListener('scroll', auDefilement, { passive: true });
  window.addEventListener('resize', () => { redimensionner(); poser(actuel); rendre(); });
  passer.addEventListener('click', () => { chargerPage(); window.scrollTo({ top: longueur(), behavior: 'smooth' }); });
  auDefilement();
  poser(actuel);
  rendre();
  intro.classList.add('pret');
  requestAnimationFrame(boucle);
  chargerRessources().catch((e) => console.warn('Ressources 3D :', e));
  // Précharge la page de l'écran une fois le site affiché
  setTimeout(chargerPage, 2500);
}
