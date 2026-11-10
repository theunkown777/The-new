// Bühne für die räumlichen Modelle: Licht, Kamera, Drehen um 360 Grad, Zoomen, Antippen,
// weiche Übergänge beim Wählen, Ein- und Ausblenden. Unabhängig von React; die Modelle liefern
// nur ihre Teile (Meshes mit userData.kennung und userData.gruppe).
import type * as DREI from "three";
import type { OrbitControls as Steuerung } from "three/examples/jsm/controls/OrbitControls.js";

export type Drei = typeof DREI;
export interface Zustand {
  /** Kennungen der gewählten Teile */
  gewaehlt: string[];
  /** Kennungen der von der Praxis markierten Teile */
  markiert: string[];
  /** Ist ein Teil sichtbar? (Ebenen, Geschlecht, Milchgebiss …) Eine Zahl zwischen 0 und 1 lässt es durchscheinen. */
  sichtbar: (daten: Record<string, unknown>) => boolean | number;
}

const GEWAEHLT = 0xf5c542, MARKIERT = 0xf28b45;
const weich = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const federnd = (t: number) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

interface Teil { mesh: DREI.Mesh; mat: DREI.MeshStandardMaterial; grund: DREI.Color; ziel: DREI.Color; deck: number; deckZiel: number; grundDeck: number; start: number; an: boolean; markiert: boolean }

export class Buehne {
  private T: Drei;
  private renderer: DREI.WebGLRenderer;
  private szene: DREI.Scene;
  private kamera: DREI.PerspectiveCamera;
  private steuerung!: Steuerung;
  private wurzel: DREI.Group;
  private teile: Teil[] = [];
  private nachKennung = new Map<string, Teil[]>();
  private zustand: Zustand = { gewaehlt: [], markiert: [], sichtbar: () => true };
  private rahmen = 0;
  private laeuft = true;
  private uhr = 0;
  private flug: { von: DREI.Spherical; nach: DREI.Spherical; zielVon: DREI.Vector3; zielNach: DREI.Vector3; start: number; dauer: number } | null = null;
  private radius = 500;
  private mitte: DREI.Vector3;
  private beobachter: ResizeObserver;
  private sicht: IntersectionObserver;
  private unten: { x: number; y: number; t: number } | null = null;
  private aufraeumen: (() => void)[] = [];
  private ruhe = true;
  private klappe: { achse: [number, number, number]; winkel: number; ziel: number } = { achse: [0, 0, 0], winkel: 0, ziel: 0 };
  /** Nach dem ersten Eingriff dreht sich das Modell nicht mehr von selbst. */
  beruehrt = false;

  constructor(drei: Drei, Orbit: typeof Steuerung, private behaelter: HTMLElement, private wahl: (kennung: string) => void, o: { umgebung?: DREI.Texture | null; ruhig?: boolean } = {}) {
    const T = (this.T = drei);
    this.ruhe = !!o.ruhig;
    this.renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    const c = this.renderer.domElement;
    c.style.cssText = "display:block;width:100%;height:100%;touch-action:none;outline:none";
    c.setAttribute("data-testid", "modell-3d");
    behaelter.appendChild(c);

    this.szene = new T.Scene();
    this.kamera = new T.PerspectiveCamera(32, 1, 1, 20000);
    this.szene.add(this.kamera);
    this.mitte = new T.Vector3();
    this.wurzel = new T.Group();
    this.szene.add(this.wurzel);

    // Licht wandert mit der Kamera: Das Modell ist von jeder Seite gut ausgeleuchtet.
    this.szene.add(new T.HemisphereLight(0xfff3e4, 0x5d5148, 0.5));
    const haupt = new T.DirectionalLight(0xfff8f0, 2.5); haupt.position.set(-0.7, 0.9, 0.9);
    const auf = new T.DirectionalLight(0xffe2cc, 0.55); auf.position.set(1, 0.0, 0.5);
    const kante = new T.DirectionalLight(0xd6e6ff, 1.5); kante.position.set(0.5, 0.7, -1);
    this.kamera.add(haupt, auf, kante);
    for (const l of [haupt, auf, kante]) { this.kamera.add(l.target); l.target.position.set(0, 0, -1); }
    if (o.umgebung) { this.szene.environment = o.umgebung; this.szene.environmentIntensity = 0.55; }

    this.steuerung = new Orbit(this.kamera, c);
    this.steuerung.enableDamping = true;
    this.steuerung.dampingFactor = 0.08;
    this.steuerung.rotateSpeed = 0.9;
    this.steuerung.zoomSpeed = 0.9;
    this.steuerung.minPolarAngle = 0.12 * Math.PI;
    this.steuerung.maxPolarAngle = 0.88 * Math.PI;
    this.steuerung.autoRotate = !this.ruhe;
    this.steuerung.autoRotateSpeed = 1.1;
    const start = () => { this.beruehrt = true; this.steuerung.autoRotate = false; this.flug = null; };
    this.steuerung.addEventListener("start", start);

    // Antippen: nur wenn der Finger kaum bewegt wurde (sonst war es Drehen)
    const runter = (e: PointerEvent) => { this.unten = { x: e.clientX, y: e.clientY, t: performance.now() }; };
    const hoch = (e: PointerEvent) => {
      const u = this.unten; this.unten = null;
      if (!u || Math.hypot(e.clientX - u.x, e.clientY - u.y) > 7 || performance.now() - u.t > 600) return;
      const k = this.treffer(e.clientX, e.clientY);
      if (k) this.wahl(k);
    };
    const zeiger = (e: PointerEvent) => { if (e.pointerType === "mouse" && !this.unten) c.style.cursor = this.treffer(e.clientX, e.clientY) ? "pointer" : "grab"; };
    c.addEventListener("pointerdown", runter); c.addEventListener("pointerup", hoch); c.addEventListener("pointermove", zeiger);
    this.aufraeumen.push(() => { c.removeEventListener("pointerdown", runter); c.removeEventListener("pointerup", hoch); c.removeEventListener("pointermove", zeiger); this.steuerung.removeEventListener("start", start); });

    this.beobachter = new ResizeObserver(() => this.groesse());
    this.beobachter.observe(behaelter);
    this.sicht = new IntersectionObserver((e) => { this.laeuft = e[0]?.isIntersecting ?? true; if (this.laeuft && !this.rahmen) this.schleife(); });
    this.sicht.observe(behaelter);
    this.groesse();
    // Für Prüfungen im Browser: Bildschirmpunkt eines Teils und aktueller Drehwinkel
    (behaelter as unknown as Record<string, unknown>).__modell = {
      punkt: (kennung: string) => this.bildpunkt(kennung),
      winkel: () => this.steuerung.getAzimuthalAngle(),
      teile: () => this.teile.length,
      sichtbar: (kennung: string) => (this.nachKennung.get(kennung) ?? []).some((t) => t.mesh.visible && t.deck > 0.5),
    };
    this.schleife();
  }

  private groesse() {
    const b = Math.max(1, this.behaelter.clientWidth), h = Math.max(1, this.behaelter.clientHeight);
    this.renderer.setSize(b, h, false);
    this.kamera.aspect = b / h;
    this.kamera.updateProjectionMatrix();
  }

  private treffer(x: number, y: number): string | null {
    const T = this.T, r = this.renderer.domElement.getBoundingClientRect();
    const strahl = new T.Raycaster();
    strahl.setFromCamera(new T.Vector2(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1), this.kamera);
    const ziele = this.teile.filter((t) => t.mesh.visible && t.deck > 0.4 && t.mesh.userData.kennung).map((t) => t.mesh);
    const h = strahl.intersectObjects(ziele, false)[0];
    return h ? String(h.object.userData.kennung) : null;
  }

  private bildpunkt(kennung: string): { x: number; y: number; vorn: boolean } | null {
    const t = (this.nachKennung.get(kennung) ?? []).find((x) => x.mesh.visible);
    if (!t) return null;
    const T = this.T, r = this.renderer.domElement.getBoundingClientRect();
    t.mesh.geometry.computeBoundingSphere();
    const m = t.mesh.geometry.boundingSphere!.center.clone().applyMatrix4(t.mesh.matrixWorld);
    // Punkt auf der dem Betrachter zugewandten Oberfläche suchen
    const strahl = new T.Raycaster(this.kamera.position.clone(), m.clone().sub(this.kamera.position).normalize());
    const ziele = this.teile.filter((x) => x.mesh.visible && x.deck > 0.4 && x.mesh.userData.kennung).map((x) => x.mesh);
    const erster = strahl.intersectObjects(ziele, false)[0];
    const p = m.clone().project(this.kamera);
    return { x: r.left + ((p.x + 1) / 2) * r.width, y: r.top + ((1 - p.y) / 2) * r.height, vorn: !!erster && erster.object.userData.kennung === kennung };
  }

  /** Teile hinzufügen; sie wachsen der Reihe nach ins Bild. */
  hinzu(meshes: DREI.Mesh[]) {
    const T = this.T, jetzt = performance.now();
    meshes.forEach((mesh, i) => {
      const mat = mesh.material as DREI.MeshStandardMaterial;
      const grundDeck = mat.opacity;
      mat.transparent = true;
      const t: Teil = { mesh, mat, grund: mat.color.clone(), ziel: mat.color.clone(), deck: 0, deckZiel: grundDeck, grundDeck, start: this.ruhe ? -1 : jetzt + i * 14, an: false, markiert: false };
      mat.opacity = 0;
      if (!this.ruhe) mesh.scale.setScalar(0.001);
      this.wurzel.add(mesh);
      this.teile.push(t);
      const k = mesh.userData.kennung as string | undefined;
      if (k) this.nachKennung.set(k, [...(this.nachKennung.get(k) ?? []), t]);
    });
    void T;
    this.anwenden();
  }

  /** Kamera auf das ganze Modell einstellen: Mittelpunkt und Radius der Kugel, die das Modell umschließt. */
  rahmenSetzen(mitte: [number, number, number], radius: number, winkel = 0.35) {
    const T = this.T;
    this.mitte.set(...mitte); this.radius = radius;
    this.steuerung.target.copy(this.mitte);
    const d = this.abstand(this.radius);
    this.kamera.position.setFromSpherical(new T.Spherical(d, Math.PI / 2 - 0.12, winkel)).add(this.mitte);
    this.kamera.near = d / 100; this.kamera.far = d * 10; this.kamera.updateProjectionMatrix();
    this.steuerung.minDistance = this.radius * 0.35; this.steuerung.maxDistance = d * 1.6;
    this.steuerung.update();
  }
  private abstand(r: number) { const halb = (this.kamera.fov * Math.PI) / 360; return (r / Math.sin(halb)) * (this.kamera.aspect < 1 ? Math.min(1.75, 1 / this.kamera.aspect) * 0.86 : 1.02); }

  /** Weicher Schatten unter dem Modell (gibt Halt im Raum). */
  schatten(x: number, y: number, z: number, radius: number) {
    const T = this.T, c = document.createElement("canvas"); c.width = c.height = 128;
    const g = c.getContext("2d")!, v = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    v.addColorStop(0, "rgba(60,40,30,.34)"); v.addColorStop(0.6, "rgba(60,40,30,.12)"); v.addColorStop(1, "rgba(60,40,30,0)");
    g.fillStyle = v; g.fillRect(0, 0, 128, 128);
    const m = new T.Mesh(new T.PlaneGeometry(radius * 2, radius * 2), new T.MeshBasicMaterial({ map: new T.CanvasTexture(c), transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.renderOrder = -1;
    this.szene.add(m);
  }

  setzen(z: Partial<Zustand>) { this.zustand = { ...this.zustand, ...z }; this.anwenden(); }

  private anwenden() {
    const T = this.T, g = new Set(this.zustand.gewaehlt), m = new Set(this.zustand.markiert);
    for (const t of this.teile) {
      const k = t.mesh.userData.kennung as string | undefined;
      t.an = !!k && g.has(k); t.markiert = !!k && m.has(k);
      t.ziel = t.markiert ? new T.Color(MARKIERT) : t.an ? new T.Color(GEWAEHLT) : t.grund;
      const wert = this.zustand.sichtbar(t.mesh.userData);
      const sichtbar = wert === true ? 1 : wert === false ? 0 : Math.max(0, Math.min(1, wert));
      // Gewähltes und Markiertes wird voll deckend, auch wenn es sonst durchscheint
      t.deckZiel = !sichtbar ? 0 : t.an || t.markiert ? Math.max(t.grundDeck, 0.97) : t.grundDeck * sichtbar;
      if (sichtbar) t.mesh.visible = true;
    }
  }

  /** Kamera weich zu einem Teil schwenken: auf die Seite, auf der es liegt, und heranfahren. */
  fliegeZu(kennung: string) {
    const T = this.T, liste = (this.nachKennung.get(kennung) ?? []).filter((t) => t.mesh.visible || t.deckZiel > 0);
    if (!liste.length) return;
    const kasten = new T.Box3();
    for (const t of liste) { t.mesh.geometry.computeBoundingBox(); kasten.union(t.mesh.geometry.boundingBox!.clone().applyMatrix4(t.mesh.matrixWorld)); }
    const kugel = kasten.getBoundingSphere(new T.Sphere());
    const jetzt = new T.Spherical().setFromVector3(this.kamera.position.clone().sub(this.steuerung.target));
    const seite = liste[0].mesh.userData.seiteZ as number | undefined;
    const vonVorn = Math.cos(jetzt.theta) >= 0;
    let theta = jetzt.theta;
    const fest = liste[0].mesh.userData.blickTheta as number | undefined;
    if (fest !== undefined) { this.flieg(new T.Spherical(Math.min(this.steuerung.maxDistance, Math.max(this.steuerung.minDistance, this.abstand(Math.max(kugel.radius * 3.2, this.radius * 0.42)))), (liste[0].mesh.userData.blickPhi as number | undefined) ?? jetzt.phi, fest), kugel.center); return; }
    // Liegt das Teil auf der abgewandten Seite, um das Modell herumfahren
    if (seite !== undefined && seite !== 0 && seite > 0 !== vonVorn) theta = jetzt.theta + Math.PI;
    else if (seite !== undefined) theta = (vonVorn ? 0 : Math.PI) + Math.max(-0.5, Math.min(0.5, Math.atan2(Math.sin(jetzt.theta), Math.abs(Math.cos(jetzt.theta))) * 0.5)) * (vonVorn ? 1 : -1);
    const d = Math.min(this.steuerung.maxDistance, Math.max(this.steuerung.minDistance, this.abstand(Math.max(kugel.radius * 2.6, this.radius * 0.3))));
    this.flieg(new T.Spherical(d, Math.min(1.75, Math.max(1.2, jetzt.phi)), theta), kugel.center);
  }
  /** Teile mit userData.klappe um eine waagerechte Achse schwenken (Unterkiefer öffnen und schließen). */
  klappen(winkel: number, achse?: [number, number, number]) { if (achse) this.klappe.achse = achse; this.klappe.ziel = winkel; }

  /** Feste Blickrichtung: 0 = von vorn, π = von hinten. */
  blick(theta: number) { const T = this.T; this.flieg(new T.Spherical(this.abstand(this.radius), Math.PI / 2 - 0.1, theta), this.mitte.clone()); }
  zuruecksetzen() { this.blick(0); }
  zoom(faktor: number) {
    const T = this.T, s = new T.Spherical().setFromVector3(this.kamera.position.clone().sub(this.steuerung.target));
    s.radius = Math.min(this.steuerung.maxDistance, Math.max(this.steuerung.minDistance, s.radius * faktor));
    this.flieg(s, this.steuerung.target.clone(), 320);
  }
  private flieg(nach: DREI.Spherical, ziel: DREI.Vector3, dauer = 850) {
    const T = this.T, von = new T.Spherical().setFromVector3(this.kamera.position.clone().sub(this.steuerung.target));
    // kürzesten Weg um das Modell nehmen
    while (nach.theta - von.theta > Math.PI) nach.theta -= 2 * Math.PI;
    while (nach.theta - von.theta < -Math.PI) nach.theta += 2 * Math.PI;
    this.beruehrt = true; this.steuerung.autoRotate = false;
    // Nachlauf einer vorherigen Drehung beenden, sonst verschiebt er das Ziel der Fahrt
    this.steuerung.enableDamping = false; this.steuerung.update(); this.steuerung.enableDamping = true;
    this.flug = { von, nach, zielVon: this.steuerung.target.clone(), zielNach: ziel, start: performance.now(), dauer: this.ruhe ? 1 : dauer };
  }

  private schleife = () => {
    this.rahmen = 0;
    if (!this.laeuft) return;
    this.rahmen = requestAnimationFrame(this.schleife);
    const T = this.T, jetzt = performance.now(), dt = Math.min(0.05, (jetzt - (this.uhr || jetzt)) / 1000);
    this.uhr = jetzt;
    if (this.flug) {
      const f = this.flug, t = Math.min(1, (jetzt - f.start) / f.dauer), e = weich(t);
      this.steuerung.target.lerpVectors(f.zielVon, f.zielNach, e);
      const s = new T.Spherical(f.von.radius + (f.nach.radius - f.von.radius) * e, f.von.phi + (f.nach.phi - f.von.phi) * e, f.von.theta + (f.nach.theta - f.von.theta) * e);
      this.kamera.position.setFromSpherical(s).add(this.steuerung.target);
      if (t >= 1) this.flug = null;
    }
    if (Math.abs(this.klappe.winkel - this.klappe.ziel) > 1e-4) {
      this.klappe.winkel += (this.klappe.ziel - this.klappe.winkel) * (this.ruhe ? 1 : 1 - Math.exp(-dt * 6));
      const [, py, pz] = this.klappe.achse, w = this.klappe.winkel, c = Math.cos(w), sn = Math.sin(w);
      for (const t of this.teile) if (t.mesh.userData.klappe) { t.mesh.rotation.x = w; t.mesh.position.set(0, py - (py * c - pz * sn), pz - (py * sn + pz * c)); }
    }
    const puls = 0.5 + 0.5 * Math.sin(jetzt / 320);
    const k = 1 - Math.exp(-dt * 9);
    for (const t of this.teile) {
      if (t.start >= 0) {
        const a = (jetzt - t.start) / 520;
        if (a >= 1) { t.mesh.scale.setScalar(1); t.start = -1; } else if (a > 0) t.mesh.scale.setScalar(Math.max(0.001, federnd(a)));
      }
      if (!t.mesh.userData.haut) t.mat.color.lerp(t.ziel, k);
      t.deck += (t.deckZiel - t.deck) * k;
      if (Math.abs(t.deck - t.deckZiel) < 0.004) t.deck = t.deckZiel;
      t.mat.opacity = t.start > jetzt ? 0 : t.deck;
      // Deckende Teile schreiben Tiefe (saubere Überdeckung), durchscheinende nicht
      const deckend = t.deck > 0.96;
      if (t.mat.depthWrite !== deckend && !t.mesh.userData.haut) { t.mat.depthWrite = deckend; t.mat.needsUpdate = true; }
      if (t.deck <= 0.004 && t.deckZiel === 0) t.mesh.visible = false;
      if (t.mat.emissive) {
        t.mat.emissive.setHex(t.an ? GEWAEHLT : t.markiert ? MARKIERT : 0x000000);
        t.mat.emissiveIntensity = t.an ? 0.12 + 0.2 * puls : t.markiert ? 0.1 : 0;
      }
    }
    this.steuerung.update();
    this.renderer.render(this.szene, this.kamera);
  };

  entfernen() {
    this.laeuft = false;
    if (this.rahmen) cancelAnimationFrame(this.rahmen);
    this.beobachter.disconnect(); this.sicht.disconnect();
    for (const f of this.aufraeumen) f();
    this.steuerung.dispose();
    for (const t of this.teile) { t.mesh.geometry.dispose(); t.mat.dispose(); }
    this.renderer.dispose();
    this.renderer.domElement.remove();
    delete (this.behaelter as unknown as Record<string, unknown>).__modell;
  }
}

/** Gibt es WebGL auf diesem Gerät? Sonst bleibt es bei der flachen Darstellung. */
export function webglDa(): boolean {
  try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; }
}
