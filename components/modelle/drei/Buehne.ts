// Bühne für die räumlichen Modelle: Licht, Kamera, Drehen um 360 Grad, Zoomen, Antippen,
// weiche Übergänge beim Wählen, Ein- und Ausblenden (mit leichtem Zerfließen), Kamerafahrten,
// Atmen und Herzschlag. Unabhängig von React; die Modelle liefern nur ihre Teile
// (Meshes mit userData.kennung und userData.gruppe).
import type * as DREI from "three";
import { leichtesGeraet } from "./echt";
import type { OrbitControls as Steuerung } from "three/examples/jsm/controls/OrbitControls.js";

export type Drei = typeof DREI;
export interface Zustand {
  /** Kennungen der gewählten Teile */
  gewaehlt: string[];
  /** Kennungen der von der Praxis markierten Teile */
  markiert: string[];
  /** Kennungen der Teile, die der Patient selbst angegeben hat (eigene Farbe, z. B. Zähne im Kurz-Fragebogen) */
  patient?: string[];
  /** Ist ein Teil sichtbar? (Ebenen, Geschlecht, Milchgebiss …) Eine Zahl zwischen 0 und 1 lässt es durchscheinen. */
  sichtbar: (daten: Record<string, unknown>) => boolean | number;
}
/** Uniforms, die echte Materialien (echt.ts) mitbringen: Zerfließen und Kiefer. */
export interface EchtUniforms { auf: { value: number }; kiefer: { value: number }; achse: { value: DREI.Vector3 }; deck: { value: number }; haut: { value: number } }

const GEWAEHLT = 0xf5c542, MARKIERT = 0xf28b45;
/** Angaben des Patienten: Violett, deutlich anders als die orange Markierung der Praxis */
export const PATIENT_FARBE = 0x7b5cd6;
/** Ein Antippen am Modell: Kennung des Teils, Punkt auf der Oberfläche und Richtung der Oberfläche (Welt, mm) */
export interface Treffer { kennung: string; punkt: [number, number, number]; normale: [number, number, number] }
/** cubic-bezier(0.77, 0, 0.175, 1): kräftiges Anfahren und Abbremsen */
export function kurve(x1: number, y1: number, x2: number, y2: number) {
  const bx = (t: number) => 3 * (1 - t) * (1 - t) * t * x1 + 3 * (1 - t) * t * t * x2 + t * t * t;
  const by = (t: number) => 3 * (1 - t) * (1 - t) * t * y1 + 3 * (1 - t) * t * t * y2 + t * t * t;
  return (x: number) => {
    if (x <= 0) return 0; if (x >= 1) return 1;
    let lo = 0, hi = 1, t = x;
    for (let i = 0; i < 24; i++) { t = (lo + hi) / 2; if (bx(t) < x) lo = t; else hi = t; }
    return by(t);
  };
}
const weich = kurve(0.77, 0, 0.175, 1);
const sanft = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

interface Teil {
  mesh: DREI.Mesh; mat: DREI.MeshStandardMaterial; u?: EchtUniforms; grund: DREI.Color; ziel: DREI.Color;
  deck: number; deckZiel: number; grundDeck: number; start: number; an: boolean; markiert: boolean; patient: boolean; mitte: DREI.Vector3; durch?: boolean;
}
interface Fahrt { pos: DREI.Vector3[]; ziel: DREI.Vector3[]; start: number; dauer: number; zeit?: number; beiT?: (e: number) => void; ende?: () => void; abbruch?: () => void }

export class Buehne {
  private T: Drei;
  private renderer: DREI.WebGLRenderer;
  private szene: DREI.Scene;
  private entfernt = false;
  private ziehen = false;
  private kamera: DREI.PerspectiveCamera;
  private steuerung!: Steuerung;
  private wurzel: DREI.Group;
  private teile: Teil[] = [];
  private nachKennung = new Map<string, Teil[]>();
  private zustand: Zustand = { gewaehlt: [], markiert: [], patient: [], sichtbar: () => true };
  private rahmen = 0;
  private laeuft = true;
  private uhr = 0;
  private flug: { von: DREI.Spherical; nach: DREI.Spherical; zielVon: DREI.Vector3; zielNach: DREI.Vector3; start: number; dauer: number; ende?: () => void } | null = null;
  private ankerListe: { el: HTMLElement; pos: DREI.Vector3; normal: DREI.Vector3 }[] = [];
  private versteckt = false;
  private fahrtHalt: number | null = null;
  /** Zeichnen nur bei Bedarf: Bilder ohne Bewegung in Folge; läuft gerade die Schleife? */
  private ruheBilder = 0;
  private inSchleife = false;
  private pulsBis = 0;
  private geboren = performance.now();
  private bildzeiten: number[] = [];
  /** So viele Bildzeiten nach dem Umschalten nicht mitzählen (das erste Bild mit neuem Licht kann länger dauern) */
  private bildzeitPause = 0;
  private scharf = false;
  private bewegungBis = 0;
  private fahrtJetzt: Fahrt | null = null;
  private radius = 500;
  private mitte: DREI.Vector3;
  private beobachter: ResizeObserver;
  private sicht: IntersectionObserver;
  private unten: { x: number; y: number; t: number } | null = null;
  private aufraeumen: (() => void)[] = [];
  private ruhe = true;
  private klappe: { achse: [number, number, number]; winkel: number; ziel: number } = { achse: [0, 0, 0], winkel: 0, ziel: 0 };
  /** 1 = Gesicht zu sehen, 0 = Blick ins Innere (Teile mit userData.ueber „gesicht“ bzw. „innen“) */
  private gesichtWert = 1;
  private bewegung: { art: "atmen" | "schlagen"; mitte: DREI.Vector3 } | null = null;
  private m = { a: null as unknown as DREI.Matrix4, b: null as unknown as DREI.Matrix4, c: null as unknown as DREI.Matrix4 };
  /** Nach dem ersten Eingriff dreht sich das Modell nicht mehr von selbst. */
  beruehrt = false;
  /** Antippbar ist, was mindestens so deckend ist (halb durchsichtige Haut über den Gelenken: niedriger Wert) */
  private mindestDeck = 0.4;
  /** Modus „zeigen“: Antippen meldet den Punkt auf der Oberfläche statt ein Teil zu wählen */
  private zeigen: ((t: Treffer) => void) | null = null;
  private lichter: { hemi: DREI.HemisphereLight; haupt: DREI.DirectionalLight; auf: DREI.DirectionalLight; kante: DREI.DirectionalLight } | null = null;
  private umgebungAn = false;
  private umgebungZiel: DREI.WebGLRenderTarget | null = null;
  private fleckGruppe: DREI.Group;

  constructor(drei: Drei, Orbit: typeof Steuerung, private behaelter: HTMLElement, private wahl: (kennung: string) => void, o: { umgebung?: DREI.Texture | null; ruhig?: boolean; selbstDrehen?: boolean; zeigen?: (t: Treffer) => void; mindestDeck?: number } = {}) {
    const T = (this.T = drei);
    this.ruhe = !!o.ruhig;
    this.zeigen = o.zeigen ?? null;
    if (o.mindestDeck !== undefined) this.mindestDeck = o.mindestDeck;
    this.m = { a: new T.Matrix4(), b: new T.Matrix4(), c: new T.Matrix4() };
    // Kantenglättung (MSAA) kostet auf Handys Grafikleistung. Bei hoher Pixeldichte (ab 2) ist sie kaum zu sehen und bleibt aus;
    // darunter sind Treppenstufen an den Rändern deutlich, also auch auf leichten Geräten an.
    this.renderer = new T.WebGLRenderer({ antialias: !leichtesGeraet() || (window.devicePixelRatio || 1) < 2, alpha: true, powerPreference: "high-performance" });
    // Handys: höchstens 1,5-fache Auflösung (flüssig), sonst höchstens doppelt
    const handy = window.matchMedia?.("(pointer: coarse)").matches && Math.min(window.innerWidth, window.innerHeight) < 900;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, handy ? 1.5 : 2));
    // Grafik ohne Grafikkarte (Software): kleinere Auflösung, sonst stockt alles
    // (Für Bildschirmfotos in Testumgebungen ohne Grafikkarte lässt sich das mit localStorage „modell-scharf“ abschalten.
    // Nur außerhalb des Betriebs: Im ausgelieferten Code liest das Modell nichts aus dem Speicher des Browsers,
    // so wie es die Datenschutzerklärung für die öffentliche Website sagt.)
    this.scharf = process.env.NODE_ENV !== "production" && (() => { try { return localStorage.getItem("modell-scharf") === "1"; } catch { return false; } })();
    if (!this.scharf) try { const gl = this.renderer.getContext(), info = gl.getExtension("WEBGL_debug_renderer_info"); if (info && /swiftshader|llvmpipe|software/i.test(String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)))) this.renderer.setPixelRatio(0.6); } catch { /* unbekannt */ }
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
    // Ohne vorberechnete Spiegelumgebung (zu teuer für schwache Grafik): etwas mehr Grundlicht
    const hemi = new T.HemisphereLight(0xfff3e4, 0x5d5148, 0.95);
    this.szene.add(hemi);
    const haupt = new T.DirectionalLight(0xfff8f0, 2.5); haupt.position.set(-0.7, 0.9, 0.9);
    const auf = new T.DirectionalLight(0xffe2cc, 0.55); auf.position.set(1, 0.0, 0.5);
    const kante = new T.DirectionalLight(0xd6e6ff, 1.5); kante.position.set(0.5, 0.7, -1);
    this.kamera.add(haupt, auf, kante);
    for (const l of [haupt, auf, kante]) { this.kamera.add(l.target); l.target.position.set(0, 0, -1); }
    this.lichter = { hemi, haupt, auf, kante };
    if (o.umgebung) this.umgebungSetzen(o.umgebung);
    this.fleckGruppe = new T.Group();
    this.szene.add(this.fleckGruppe);

    this.steuerung = new Orbit(this.kamera, c);
    this.steuerung.enableDamping = true;
    this.steuerung.dampingFactor = 0.08;
    this.steuerung.rotateSpeed = 0.9;
    this.steuerung.zoomSpeed = 0.9;
    this.steuerung.minPolarAngle = 0.08 * Math.PI;
    this.steuerung.maxPolarAngle = 0.92 * Math.PI;
    this.steuerung.autoRotate = !this.ruhe && o.selbstDrehen !== false;
    this.steuerung.autoRotateSpeed = 1.1;
    // Anfassen unterbricht jede Fahrt sofort
    const start = () => { this.wecken(); this.beruehrt = true; this.steuerung.autoRotate = false; this.flug = null; if (this.fahrtJetzt) { const f = this.fahrtJetzt; this.fahrtJetzt = null; f.abbruch?.(); } };
    this.steuerung.addEventListener("start", start);
    this.steuerung.addEventListener("start", () => { this.ziehen = true; });
    this.steuerung.addEventListener("end", () => { this.ziehen = false; });

    // Antippen: nur wenn der Finger kaum bewegt wurde (sonst war es Drehen)
    const runter = (e: PointerEvent) => { this.unten = { x: e.clientX, y: e.clientY, t: performance.now() }; };
    const hoch = (e: PointerEvent) => {
      const u = this.unten; this.unten = null;
      if (!u || Math.hypot(e.clientX - u.x, e.clientY - u.y) > 7 || performance.now() - u.t > 600) return;
      const h = this.treffer(e.clientX, e.clientY);
      if (!h) return;
      if (this.zeigen) this.zeigen(h); else this.wahl(h.kennung);
    };
    const zeiger = (e: PointerEvent) => { if (e.pointerType === "mouse" && !this.unten) c.style.cursor = this.treffer(e.clientX, e.clientY) ? "pointer" : "grab"; };
    c.addEventListener("pointerdown", runter); c.addEventListener("pointerup", hoch); c.addEventListener("pointermove", zeiger);
    this.aufraeumen.push(() => { c.removeEventListener("pointerdown", runter); c.removeEventListener("pointerup", hoch); c.removeEventListener("pointermove", zeiger); this.steuerung.removeEventListener("start", start); });

    this.beobachter = new ResizeObserver(() => this.groesse());
    this.beobachter.observe(behaelter);
    // Nur zeichnen, solange die Bühne zu sehen und der Tab offen ist
    let imBild = true;
    const weiter = () => { this.laeuft = imBild && !this.versteckt; this.wecken(); };
    this.sicht = new IntersectionObserver((e) => { imBild = e[0]?.isIntersecting ?? true; weiter(); });
    this.sicht.observe(behaelter);
    const tab = () => { this.versteckt = document.visibilityState === "hidden"; weiter(); };
    document.addEventListener("visibilitychange", tab);
    this.aufraeumen.push(() => document.removeEventListener("visibilitychange", tab));
    this.groesse();
    // Für Prüfungen im Browser: Bildschirmpunkt eines Teils, Drehwinkel, sichtbare Teile
    (behaelter as unknown as Record<string, unknown>).__modell = {
      punkt: (kennung: string) => this.bildpunkt(kennung),
      winkel: () => this.steuerung.getAzimuthalAngle(),
      teile: () => this.teile.length,
      sichtbar: (kennung: string) => (this.nachKennung.get(kennung) ?? []).some((t) => t.mesh.visible && t.deck > 0.5),
      gruppen: () => Array.from(new Set(this.teile.filter((t) => t.mesh.visible && t.deck > 0.5).map((t) => String(t.mesh.userData.gruppe)))).sort(),
      gesicht: () => this.gesichtWert,
      faehrt: () => !!this.fahrtJetzt || !!this.flug,
      kiefer: () => this.klappe.winkel,
      abstand: () => this.kamera.position.distanceTo(this.steuerung.target),
      zeichnet: () => !!this.rahmen,
      // Für Bildschirmfotos der Fahrt: an einer Stelle anhalten (0…1) und wieder freigeben
      fahrtBei: (t: number | null) => { this.fahrtHalt = t; this.wecken(); },
      liste: () => this.teile.map((t) => ({ k: t.mesh.userData.kennung, g: t.mesh.userData.gruppe, sichtbar: t.mesh.visible, deck: Math.round(t.deck * 100) / 100, ziel: t.deckZiel, start: Math.round(t.start) })),
      // Bildschirmpunkt eines Punktes im Raum (mm) und ob er zu sehen ist (nichts davor)
      punktBei: (p: [number, number, number]) => this.punktBei(p),
      // Punkt auf der Oberfläche (Strahl von außen entlang der Normale)
      aufFlaeche: (p: [number, number, number], n: [number, number, number]) => this.aufFlaeche(p, n),
      // Mittlere Zeit je Bild (ms) der letzten Bilder und ob das Umgebungslicht an ist
      bildzeit: () => (this.bildzeiten.length ? Math.round((this.bildzeiten.reduce((a, b) => a + b, 0) / this.bildzeiten.length) * 10) / 10 : null),
      umgebung: () => this.umgebungAn,
      flecken: () => this.fleckGruppe.children.length,
    };
    // Bewegung der Steuerung (Ziehen, Zoomen, Nachlauf) weckt das Zeichnen
    const aendern = () => this.wecken();
    this.steuerung.addEventListener("change", aendern);
    this.aufraeumen.push(() => this.steuerung.removeEventListener("change", aendern));
    this.wecken();
  }

  /** Zeichnen wieder aufnehmen (nach einer Änderung); ohne Bewegung hält die Schleife von selbst an. */
  wecken() {
    this.ruheBilder = 0;
    if (this.inSchleife || this.rahmen || !this.laeuft) return;
    this.uhr = 0;
    this.rahmen = requestAnimationFrame(this.schleife);
  }

  private groesse() {
    const b = Math.max(1, this.behaelter.clientWidth), h = Math.max(1, this.behaelter.clientHeight);
    this.renderer.setSize(b, h, false);
    this.kamera.aspect = b / h;
    this.kamera.updateProjectionMatrix();
    this.wecken();
  }

  /** Antippbare Teile: sichtbar, deckend genug und mit Kennung */
  private ziele() { return this.teile.filter((t) => t.mesh.visible && t.deck > this.mindestDeck && t.mesh.userData.kennung).map((t) => t.mesh); }
  /** Flächen für Markierungen: nach der Ziel-Deckkraft, damit es auch klappt, während die Teile noch einblenden. */
  private flaechen() { return this.teile.filter((t) => t.deckZiel > this.mindestDeck && t.mesh.userData.kennung).map((t) => t.mesh); }
  private trefferAus(h: DREI.Intersection | undefined): Treffer | null {
    if (!h) return null;
    const T = this.T, n = (h.normal ?? h.face?.normal ?? new T.Vector3(0, 0, 1)).clone().applyMatrix3(new T.Matrix3().getNormalMatrix(h.object.matrixWorld)).normalize();
    return { kennung: String(h.object.userData.kennung), punkt: [h.point.x, h.point.y, h.point.z], normale: [n.x, n.y, n.z] };
  }
  private treffer(x: number, y: number): Treffer | null {
    const T = this.T, r = this.renderer.domElement.getBoundingClientRect();
    const strahl = new T.Raycaster();
    strahl.setFromCamera(new T.Vector2(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1), this.kamera);
    return this.trefferAus(strahl.intersectObjects(this.ziele(), false)[0]);
  }
  /** Punkt auf der Oberfläche: Strahl von außen (300 mm entlang der Normale) zurück auf den Punkt. */
  aufFlaeche(p: [number, number, number], n: [number, number, number]): Treffer | null {
    const T = this.T, richtung = new T.Vector3(...n).normalize().negate();
    const start = new T.Vector3(...p).addScaledVector(richtung, -300);
    this.wurzel.updateMatrixWorld(true);
    return this.trefferAus(new T.Raycaster(start, richtung).intersectObjects(this.flaechen(), false)[0]);
  }
  /** Bildschirmpunkt eines Raumpunkts; vorn = von der Kamera aus nicht verdeckt. */
  private punktBei(p: [number, number, number]): { x: number; y: number; vorn: boolean } {
    const T = this.T, r = this.renderer.domElement.getBoundingClientRect(), v = new T.Vector3(...p);
    const zur = v.clone().sub(this.kamera.position), weit = zur.length();
    const erster = new T.Raycaster(this.kamera.position.clone(), zur.normalize()).intersectObjects(this.ziele(), false)[0];
    const q = v.clone().project(this.kamera);
    return { x: r.left + ((q.x + 1) / 2) * r.width, y: r.top + ((1 - q.y) / 2) * r.height, vorn: !erster || erster.distance > weit - 8 };
  }
  /** Weiche Flecken an Punkten der Oberfläche (Angaben des Patienten). Die Haut verdeckt die innere Hälfte: Es bleibt ein Fleck auf der Haut. */
  flecken(liste: { pos: [number, number, number]; farbe?: number; radius?: number }[]) {
    const T = this.T;
    for (const c of [...this.fleckGruppe.children]) { this.fleckGruppe.remove(c); const m = c as DREI.Mesh; m.geometry.dispose(); (m.material as DREI.Material).dispose(); }
    for (const f of liste) {
      const mat = new T.MeshBasicMaterial({ color: f.farbe ?? PATIENT_FARBE, transparent: true, opacity: 0.55, depthWrite: false });
      const m = new T.Mesh(new T.SphereGeometry(f.radius ?? 22, 24, 16), mat);
      m.position.set(...f.pos); m.renderOrder = 2;
      this.fleckGruppe.add(m);
      const kern = new T.Mesh(new T.SphereGeometry((f.radius ?? 22) * 0.32, 16, 10), new T.MeshBasicMaterial({ color: f.farbe ?? PATIENT_FARBE }));
      kern.position.set(...f.pos);
      this.fleckGruppe.add(kern);
    }
    this.pulsBis = performance.now() + 1200;
    this.wecken();
  }
  /**
   * Umgebungslicht (vorberechnete Spiegelung eines hellen Raums) nachträglich einschalten: Shader vorher im
   * Hintergrund übersetzen, dann umschalten. Das Licht der Kamera wird etwas leiser. Wird es zu langsam, geht es wieder aus.
   * Die Zielszene trägt nur die Umgebung, keine Lichter: compile zählt die Lichter aus beiden Szenen zusammen.
   * Kopien der Lichter ergäben eine andere Lichterzahl als beim echten Bild, und die vorübersetzten Shader blieben ungenutzt.
   */
  async umgebungSetzen(tex: DREI.Texture) {
    const T = this.T, ziel = new T.Scene();
    ziel.environment = tex;
    try { await this.renderer.compileAsync(this.szene, this.kamera, ziel); } catch { /* dann beim ersten Bild */ }
    if (this.entfernt) return;
    this.szene.environment = tex; this.szene.environmentIntensity = 0.5;
    if (this.lichter) { this.lichter.hemi.intensity = 0.6; this.lichter.haupt.intensity = 2.2; this.lichter.kante.intensity = 1.25; }
    this.umgebungAn = true; this.bildzeiten = []; this.bildzeitPause = 2;
    this.wecken();
  }
  /** Umgebung mit dem eigenen Renderer berechnen (Raum von three.js, 64er-Würfel) und einschalten. */
  async umgebungBerechnen() {
    if (this.umgebungAn || this.umgebungZiel || this.entfernt) return;
    const { RoomEnvironment } = await import("three/examples/jsm/environments/RoomEnvironment.js");
    if (this.entfernt) return;
    const T = this.T, pm = new T.PMREMGenerator(this.renderer), raum = new RoomEnvironment();
    this.umgebungZiel = pm.fromScene(raum, 0.04, 0.1, 100, { size: 64 });
    raum.dispose(); pm.dispose();
    await this.umgebungSetzen(this.umgebungZiel.texture);
  }
  private umgebungAus() {
    this.szene.environment = null; this.umgebungAn = false;
    if (this.lichter) { this.lichter.hemi.intensity = 0.95; this.lichter.haupt.intensity = 2.5; this.lichter.kante.intensity = 1.5; }
  }

  private bildpunkt(kennung: string): { x: number; y: number; vorn: boolean } | null {
    const t = (this.nachKennung.get(kennung) ?? []).find((x) => x.mesh.visible);
    if (!t) return null;
    const T = this.T, r = this.renderer.domElement.getBoundingClientRect();
    if (!t.mesh.geometry.boundingSphere) t.mesh.geometry.computeBoundingSphere();
    const m = t.mesh.geometry.boundingSphere!.center.clone().applyMatrix4(t.mesh.matrixWorld);
    const strahl = new T.Raycaster(this.kamera.position.clone(), m.clone().sub(this.kamera.position).normalize());
    const erster = strahl.intersectObjects(this.ziele(), false)[0];
    const p = m.clone().project(this.kamera);
    return { x: r.left + ((p.x + 1) / 2) * r.width, y: r.top + ((1 - p.y) / 2) * r.height, vorn: !!erster && erster.object.userData.kennung === kennung };
  }

  /** Teile hinzufügen; sie erscheinen der Reihe nach (zerfließen ins Bild). */
  /** Teile vorab an die Grafik übergeben, ohne sie zu zeigen: Shader in einer unsichtbaren Szene übersetzen
   *  (mit dem Licht der echten Szene, asynchron, wo das Gerät es kann). Beide Fassungen: deckend und
   *  durchscheinend (beim Ein- und Ausblenden sind Teile durchscheinend). Wartet, solange gedreht oder geflogen wird.
   *  Danach stockt der spätere Wechsel der Ebene nicht mehr. */
  async vorwaermen(meshes: DREI.Mesh[]) {
    if (!meshes.length) return;
    while (!this.entfernt && (this.ziehen || this.flug || this.fahrtJetzt)) await new Promise((r) => setTimeout(r, 400));
    if (this.entfernt) return;
    const T = this.T, probe = new T.Scene(), gruppe = new T.Group();
    for (const m of meshes) { m.visible = true; gruppe.add(m); }
    probe.add(gruppe);
    const mats = meshes.map((m) => m.material as DREI.Material);
    const alt = mats.map((m) => [m.transparent, m.depthWrite] as const);
    try {
      // deckend für alle; durchscheinend nur für die Haut (sie wird beim Kombinieren der Ebenen durchsichtig)
      const hautMeshes = meshes.filter((m) => (m.material as DREI.Material).userData?.haut && !(m.material as DREI.Material).userData?.raster);
      // (Teile, die von sich aus durchscheinen wie die Lunge, sind schon transparent und werden so übersetzt)
      for (const durch of hautMeshes.length ? [false, true] : [false]) {
        for (const m of mats) { m.transparent = durch && !!m.userData?.haut && !m.userData?.raster; m.depthWrite = !m.transparent; m.needsUpdate = true; }
        await this.renderer.compileAsync(probe, this.kamera, this.szene);
        if (this.entfernt) return;
      }
      // Daten hochladen: in ein einziges Pixel des sichtbaren Bildes zeichnen (Shader sind schon fertig),
      // in kleinen Portionen je ruhigem Moment, damit kein einzelner Schritt lang wird.
      const ruhe = () => new Promise<void>((r) => {
        const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
        if (w.requestIdleCallback) w.requestIdleCallback(() => r(), { timeout: 1500 }); else setTimeout(r, 50);
      });
      const PORTION = 6;
      for (let i = 0; i < meshes.length; i += PORTION) {
        await ruhe();
        while (!this.entfernt && (this.ziehen || this.flug || this.fahrtJetzt)) await new Promise((r) => setTimeout(r, 400));
        if (this.entfernt) return;
        const teil = meshes.slice(i, i + PORTION), teilMats = teil.map((m) => m.material as DREI.Material);
        const portion = new T.Group();
        for (const m of teil) portion.add(m);
        const versteckt: DREI.Object3D[] = [];
        this.szene.traverse((o) => { if ((o as DREI.Mesh).isMesh && o.visible) { versteckt.push(o); o.visible = false; } });
        this.szene.add(portion);
        const schere = this.renderer.getScissorTest();
        try {
          this.renderer.setScissorTest(true);
          this.renderer.setScissor(0, 0, 1, 1);
          // beide Durchgänge einmal anstoßen: deckend und durchscheinend (sortiert, anderer Zeichenweg)
          for (const durch of teilMats.some((m) => m.userData?.haut && !m.userData?.raster) ? [false, true] : [false]) {
            for (const m of teilMats) { m.transparent = durch && !!m.userData?.haut && !m.userData?.raster; m.depthWrite = !m.transparent; }
            this.renderer.render(this.szene, this.kamera);
          }
        } finally {
          this.renderer.setScissorTest(schere);
          const g = this.renderer.getSize(new T.Vector2());
          this.renderer.setScissor(0, 0, g.x, g.y);
          this.szene.remove(portion);
          for (const m of teil) portion.remove(m);
          for (const o of versteckt) o.visible = true;
        }
      }
      this.wecken();
    } finally {
      mats.forEach((m, i) => { m.transparent = alt[i][0]; m.depthWrite = alt[i][1]; });
      for (const m of meshes) gruppe.remove(m);
    }
  }

  hinzu(meshes: DREI.Mesh[]) {
    const T = this.T, jetzt = performance.now();
    meshes.forEach((mesh, i) => {
      const mat = mesh.material as DREI.MeshStandardMaterial;
      const u = mat.userData?.u as EchtUniforms | undefined;
      const grundDeck = mat.opacity;
      if (!u) mat.transparent = true;
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
      const mitte = mesh.geometry.boundingBox!.getCenter(new T.Vector3());
      const t: Teil = { mesh, mat, u, grund: mat.color.clone(), ziel: mat.color.clone(), deck: 0, deckZiel: grundDeck, grundDeck, start: this.ruhe ? -1 : jetzt + Math.min(i, 60) * 12, an: false, markiert: false, patient: false, mitte };
      if (u) u.auf.value = 0; else mat.opacity = 0;
      mesh.matrixAutoUpdate = false;
      mesh.visible = false;
      this.wurzel.add(mesh);
      this.teile.push(t);
      const k = mesh.userData.kennung as string | undefined;
      if (k) this.nachKennung.set(k, [...(this.nachKennung.get(k) ?? []), t]);
    });
    this.anwenden();
    this.wecken();
  }

  /** Shader vorab übersetzen (parallel, wo der Browser es kann), damit das erste Bild nicht hängt. */
  async vorbereiten() {
    const sichtbar = this.teile.map((t) => t.mesh.visible);
    for (const t of this.teile) t.mesh.visible = true;
    try { await this.renderer.compileAsync(this.szene, this.kamera); } catch { /* dann beim ersten Bild */ }
    this.teile.forEach((t, i) => { t.mesh.visible = sichtbar[i]; });
  }
  /** Punkte im Raum, an denen HTML-Elemente (Erklärpunkte) mitgeführt werden; abgewandte werden ausgeblendet. */
  anker(liste: { el: HTMLElement; pos: [number, number, number]; normal?: [number, number, number] }[]) {
    const T = this.T;
    this.ankerListe = liste.map((a) => ({ el: a.el, pos: new T.Vector3(...a.pos), normal: new T.Vector3(...(a.normal ?? [0, 0, 1])).normalize() }));
    this.wecken();
  }
  /** Kamera zu einem Punkt fahren (Erklärpunkt); ende wird nach der Fahrt aufgerufen. */
  fliegeZuPunkt(mitte: [number, number, number], radius: number, o: { theta?: number; phi?: number; dauer?: number; ende?: () => void } = {}) {
    const T = this.T, jetzt = new T.Spherical().setFromVector3(this.kamera.position.clone().sub(this.steuerung.target));
    const d = this.abstand(radius);
    this.steuerung.minDistance = Math.min(this.steuerung.minDistance, d * 0.5);
    this.flieg(new T.Spherical(d, o.phi ?? Math.min(1.7, Math.max(1.3, jetzt.phi)), o.theta ?? 0), new T.Vector3(...mitte), o.dauer ?? 1500);
    if (this.flug) this.flug.ende = o.ende;
    if (this.ruhe) { this.flug = null; const s = new T.Spherical(d, o.phi ?? 1.45, o.theta ?? 0); this.steuerung.target.set(...mitte); this.kamera.position.setFromSpherical(s).add(this.steuerung.target); o.ende?.(); }
  }

  /** Kamera auf das ganze Modell einstellen: Mittelpunkt und Radius der Kugel, die das Modell umschließt. */
  rahmenSetzen(mitte: [number, number, number], radius: number, winkel = 0.35, hoehe = 0.12) {
    const T = this.T;
    this.mitte.set(...mitte); this.radius = radius;
    this.steuerung.target.copy(this.mitte);
    const d = this.abstand(this.radius);
    this.kamera.position.setFromSpherical(new T.Spherical(d, Math.PI / 2 - hoehe, winkel)).add(this.mitte);
    this.grenzen(d);
    this.steuerung.update();
    this.wecken();
  }
  private grenzen(d: number) {
    this.kamera.near = Math.max(0.5, Math.min(d / 100, this.radius / 40)); this.kamera.far = d * 12; this.kamera.updateProjectionMatrix();
    this.steuerung.minDistance = this.radius * 0.3; this.steuerung.maxDistance = d * 1.8;
  }
  /** Weich zu einem neuen Rahmen fahren (z. B. vom Organ zum ganzen Körper). */
  rahmenFliegen(mitte: [number, number, number], radius: number) {
    const T = this.T;
    this.mitte.set(...mitte); this.radius = radius;
    const d = this.abstand(radius);
    this.grenzen(d);
    const s = new T.Spherical().setFromVector3(this.kamera.position.clone().sub(this.steuerung.target));
    this.flieg(new T.Spherical(d, Math.min(1.75, Math.max(1.25, s.phi)), s.theta), this.mitte.clone(), 1100);
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

  setzen(z: Partial<Zustand>) {
    if (z.gewaehlt && z.gewaehlt.join() !== this.zustand.gewaehlt.join()) this.pulsBis = performance.now() + 2600;
    this.zustand = { ...this.zustand, ...z }; this.anwenden(); this.wecken();
  }

  private anwenden() {
    const T = this.T, g = new Set(this.zustand.gewaehlt), m = new Set(this.zustand.markiert), pa = new Set(this.zustand.patient ?? []);
    for (const t of this.teile) {
      const k = t.mesh.userData.kennung as string | undefined;
      t.an = !!k && g.has(k); t.markiert = !!k && m.has(k); t.patient = !!k && pa.has(k);
      t.ziel = t.markiert ? new T.Color(MARKIERT) : t.an ? new T.Color(GEWAEHLT) : t.patient ? new T.Color(PATIENT_FARBE) : t.grund;
      const wert = this.zustand.sichtbar(t.mesh.userData);
      const sichtbar = wert === true ? 1 : wert === false ? 0 : Math.max(0, Math.min(1, wert));
      // Gewähltes und Markiertes wird voll deckend, auch wenn es sonst durchscheint
      t.deckZiel = !sichtbar ? 0 : t.an || t.markiert || t.patient ? Math.max(t.grundDeck, 0.97) : t.grundDeck * sichtbar;
      // Halb sichtbar (z. B. Haut über den Organen): durchscheinend statt zerfließend
      t.durch = sichtbar > 0 && sichtbar < 0.95 && !t.an && !t.markiert && !t.patient;
    }
  }

  /** Kamera weich zu einem Teil schwenken: auf die Seite, auf der es liegt, und heranfahren. */
  fliegeZu(kennung: string) {
    const T = this.T, liste = (this.nachKennung.get(kennung) ?? []).filter((t) => t.mesh.visible || t.deckZiel > 0);
    if (!liste.length) return false;
    const kasten = new T.Box3();
    for (const t of liste) { if (!t.mesh.geometry.boundingBox) t.mesh.geometry.computeBoundingBox(); kasten.union(t.mesh.geometry.boundingBox!.clone().applyMatrix4(t.mesh.matrixWorld)); }
    const kugel = kasten.getBoundingSphere(new T.Sphere());
    const jetzt = new T.Spherical().setFromVector3(this.kamera.position.clone().sub(this.steuerung.target));
    const daten = liste[0].mesh.userData;
    const fest = daten.blickTheta as number | undefined;
    const d = (f: number, min: number) => Math.min(this.steuerung.maxDistance, Math.max(this.steuerung.minDistance, this.abstand(Math.max(kugel.radius * f, this.radius * min))));
    if (fest !== undefined) { this.flieg(new T.Spherical(d(3.2, 0.42), (daten.blickPhi as number | undefined) ?? jetzt.phi, fest), kugel.center, 1400); return true; }
    // Liegt das Teil auf der abgewandten Seite (Rücken), um das Modell herumfahren; sonst von vorn bzw. von der Seite, auf der es liegt
    const relZ = kugel.center.z - this.mitte.z, relX = kugel.center.x - this.mitte.x;
    const hinten = daten.seiteZ !== undefined ? (daten.seiteZ as number) < 0 : relZ < -this.radius * 0.04 && daten.gruppe === "muskeln";
    let theta = hinten ? Math.PI : 0;
    if (!hinten && Math.abs(relX) > this.radius * 0.12) theta = Math.sign(relX) * 0.45;
    if (hinten && Math.abs(relX) > this.radius * 0.12) theta = Math.PI - Math.sign(relX) * 0.45;
    this.flieg(new T.Spherical(d(2.6, 0.3), Math.min(1.75, Math.max(1.2, jetzt.phi)), theta), kugel.center, 1400);
    return true;
  }
  /** Teile mit userData.klappe um eine waagerechte Achse schwenken (Unterkiefer öffnen und schließen). */
  klappen(winkel: number, achse?: [number, number, number]) { if (achse) this.klappe.achse = achse; this.klappe.ziel = winkel; if (this.ruhe) this.klappe.winkel = winkel; this.wecken(); }
  /** Gesicht (1) oder Inneres (0) zeigen. */
  gesicht(wert: number) { this.gesichtWert = Math.max(0, Math.min(1, wert)); this.wecken(); }
  /** Atmen oder Herzschlag um diesen Mittelpunkt (nur ohne „Bewegung reduzieren“). */
  bewegen(art: "atmen" | "schlagen" | null, mitte?: [number, number, number]) {
    this.bewegung = art && !this.ruhe ? { art, mitte: new this.T.Vector3(...(mitte ?? [0, 0, 0])) } : null;
    // Drei Atemzüge bzw. ein gutes Dutzend Herzschläge, dann Ruhe (kein Dauerzeichnen)
    this.bewegungBis = performance.now() + (art === "atmen" ? 13500 : 10800);
    this.wecken();
  }

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
    this.beruehrt = true; this.steuerung.autoRotate = false; this.fahrtJetzt = null;
    // Nachlauf einer vorherigen Drehung beenden, sonst verschiebt er das Ziel der Fahrt
    this.steuerung.enableDamping = false; this.steuerung.update(); this.steuerung.enableDamping = true;
    this.flug = { von, nach, zielVon: this.steuerung.target.clone(), zielNach: ziel, start: performance.now(), dauer: this.ruhe ? 1 : dauer };
    this.wecken();
  }

  /**
   * Kamerafahrt entlang mehrerer Punkte (Kamera und Blickziel), mit kräftigem Anfahren und Abbremsen.
   * beiT erhält den Fortschritt 0…1 (z. B. um den Mund zu öffnen und das Gesicht auszublenden).
   * Anfassen bricht ab; dann wird abbruch aufgerufen. Mit „Bewegung reduzieren“ springt sie ans Ende.
   */
  fahrt(punkte: { pos: [number, number, number]; ziel: [number, number, number] }[], dauer: number, o: { beiT?: (e: number) => void; ende?: () => void; abbruch?: () => void; vonHier?: boolean } = {}) {
    const T = this.T;
    this.flug = null; this.steuerung.autoRotate = false;
    const f: Fahrt = { pos: punkte.map((p) => new T.Vector3(...p.pos)), ziel: punkte.map((p) => new T.Vector3(...p.ziel)), start: performance.now(), dauer: this.ruhe ? 0 : dauer, ...o };
    // Von der aktuellen Kamera aus starten (kein Sprung)
    if (o.vonHier) { f.pos.unshift(this.kamera.position.clone()); f.ziel.unshift(this.steuerung.target.clone()); }
    if (this.ruhe) { this.fahrtSetzen(f, 1); f.beiT?.(1); f.ende?.(); return; }
    this.fahrtSetzen(f, 0);
    this.fahrtJetzt = f;
    this.wecken();
  }
  private fahrtSetzen(f: Fahrt, e: number) {
    const T = this.T, n = f.pos.length - 1, x = e * n, i = Math.min(n - 1, Math.floor(x)), t = x - i;
    const punkt = (l: DREI.Vector3[]) => {
      const p0 = l[Math.max(0, i - 1)], p1 = l[i], p2 = l[Math.min(n, i + 1)], p3 = l[Math.min(n, i + 2)];
      // Catmull-Rom zwischen p1 und p2
      const t2 = t * t, t3 = t2 * t;
      return new T.Vector3().addScaledVector(p0, -0.5 * t3 + t2 - 0.5 * t).addScaledVector(p1, 1.5 * t3 - 2.5 * t2 + 1).addScaledVector(p2, -1.5 * t3 + 2 * t2 + 0.5 * t).addScaledVector(p3, 0.5 * t3 - 0.5 * t2);
    };
    this.kamera.position.copy(n ? punkt(f.pos) : f.pos[0]);
    this.steuerung.target.copy(n ? punkt(f.ziel) : f.ziel[0]);
    this.kamera.lookAt(this.steuerung.target);
  }

  private schleife = () => {
    this.rahmen = 0;
    if (!this.laeuft) return;
    this.inSchleife = true;
    let aktiv = !!this.flug || !!this.fahrtJetzt;
    const T = this.T, jetzt = performance.now(), dt = Math.min(0.05, (jetzt - (this.uhr || jetzt)) / 1000);
    // Langsames Gerät (Bilder brauchen deutlich länger als 1/15 s): Auflösung stufenweise senken, damit es flüssig bleibt
    if (this.uhr && this.bildzeitPause > 0) this.bildzeitPause--;
    else if (this.uhr) {
      this.bildzeiten.push(jetzt - this.uhr);
      if (this.bildzeiten.length > 6) this.bildzeiten.shift();
      const mittel = this.bildzeiten.reduce((a, b) => a + b, 0) / this.bildzeiten.length;
      // Umgebungslicht zuerst opfern, wenn die Bilder deutlich länger als 1/25 s brauchen
      if (this.umgebungAn && this.bildzeiten.length === 6 && mittel > 45) { this.umgebungAus(); this.bildzeiten = []; }
      else if (!this.scharf && this.bildzeiten.length === 6 && mittel > 70 && this.renderer.getPixelRatio() > 0.55) {
        this.renderer.setPixelRatio(Math.max(0.5, this.renderer.getPixelRatio() * 0.7));
        this.groesse();
        this.bildzeiten = [];
      }
    } else this.bildzeiten = [];
    this.uhr = jetzt;
    if (this.flug) {
      const f = this.flug, t = Math.min(1, (jetzt - f.start) / f.dauer), e = f.dauer > 900 ? weich(t) : sanft(t);
      this.steuerung.target.lerpVectors(f.zielVon, f.zielNach, e);
      const s = new T.Spherical(f.von.radius + (f.nach.radius - f.von.radius) * e, f.von.phi + (f.nach.phi - f.von.phi) * e, f.von.theta + (f.nach.theta - f.von.theta) * e);
      this.kamera.position.setFromSpherical(s).add(this.steuerung.target);
      if (t >= 1) { this.flug = null; f.ende?.(); }
    }
    if (this.fahrtJetzt) {
      // Zeit nur mit begrenzten Schritten weiterzählen: Ein langsames Bild lässt die Fahrt nicht springen
      const f = this.fahrtJetzt; f.zeit = this.fahrtHalt !== null ? this.fahrtHalt * f.dauer : (f.zeit ?? -1) < 0 ? 0 : f.zeit! + Math.min(dt, 0.05) * 1000;
      const t = Math.min(1, f.zeit / Math.max(1, f.dauer)), e = weich(t);
      this.fahrtSetzen(f, e);
      f.beiT?.(t);
      if (t >= 1) { this.fahrtJetzt = null; f.ende?.(); }
    }
    if (Math.abs(this.klappe.winkel - this.klappe.ziel) > 1e-4) aktiv = true;
    if (Math.abs(this.klappe.winkel - this.klappe.ziel) > 1e-4) this.klappe.winkel += (this.klappe.ziel - this.klappe.winkel) * (this.ruhe ? 1 : 1 - Math.exp(-dt * 6));
    const puls = 0.5 + 0.5 * Math.sin(jetzt / 320);
    const k = 1 - Math.exp(-dt * 9), kAuf = 1 - Math.exp(-dt * 5);
    const [, py, pz] = this.klappe.achse, w = this.klappe.winkel;
    // Atmen: ruhiger Zyklus von 4,5 s; Herzschlag: Doppelschlag alle 0,9 s
    let bs = 0;
    const bewegtJetzt = !!this.bewegung && jetzt < this.bewegungBis;
    if (bewegtJetzt) aktiv = true;
    const pulsiert = jetzt < this.pulsBis;
    if (pulsiert) aktiv = true;
    if (!bewegtJetzt) bs = 0;
    else if (this.bewegung?.art === "atmen") bs = 0.5 - 0.5 * Math.cos((jetzt / 4500) * Math.PI * 2);
    else if (this.bewegung?.art === "schlagen") { const ph = (jetzt % 900) / 900; bs = Math.exp(-(((ph - 0.06) / 0.05) ** 2)) + 0.55 * Math.exp(-(((ph - 0.3) / 0.06) ** 2)); }
    const { a: ma, b: mb, c: mc } = this.m;
    for (const t of this.teile) {
      const ud = t.mesh.userData;
      // Zielsichtbarkeit: Gesicht und Inneres werden gegeneinander überblendet
      const ueber = ud.ueber === "gesicht" ? this.gesichtWert : ud.ueber === "innen" ? 1 - this.gesichtWert : 1;
      const ziel = t.deckZiel * ueber;
      if (t.start > jetzt) { t.mesh.visible = false; aktiv = true; continue; }
      if (t.start >= 0 || Math.abs(t.deck - ziel) > 0.004) aktiv = true;
      if (!t.mesh.userData.haut) { t.mat.color.lerp(t.ziel, k); if (Math.abs(t.mat.color.r - t.ziel.r) + Math.abs(t.mat.color.g - t.ziel.g) + Math.abs(t.mat.color.b - t.ziel.b) > 0.003) aktiv = true; }
      t.deck += (ziel - t.deck) * (t.u ? kAuf : k);
      if (Math.abs(t.deck - ziel) < 0.004) t.deck = ziel;
      t.mesh.visible = t.deck > 0.004;
      if (!t.mesh.visible) continue;
      if (t.u) {
        // Echte Teile: deckende zerfließen beim Ein- und Ausblenden, durchscheinende blenden über
        const durch = t.grundDeck < 0.99 || !!t.durch;
        if (t.mat.userData.raster) {
          // Handy: Durchscheinen als feines Punktraster (kein eigenes Shader-Programm, kein Sortieren)
          if (durch) { t.u.auf.value = 1; t.u.deck.value = t.deck; } else { t.u.auf.value = t.deck / Math.max(0.01, t.grundDeck); t.u.deck.value = 1; }
          t.mat.opacity = 1;
        } else {
          if (durch) { t.u.auf.value = 1; t.mat.opacity = t.deck; } else { t.u.auf.value = t.deck / Math.max(0.01, t.grundDeck); t.mat.opacity = 1; }
          if (t.mat.transparent !== durch) { t.mat.transparent = durch; t.mat.depthWrite = !durch; t.mat.needsUpdate = true; }
        }
        t.u.kiefer.value = w * (ud.kieferVoll ? 1 : 0);
        t.u.achse.value.set(0, py, pz);
      } else {
        t.mat.opacity = t.deck;
        const deckend = t.deck > 0.96;
        if (t.mat.depthWrite !== deckend && !ud.haut) { t.mat.depthWrite = deckend; t.mat.needsUpdate = true; }
      }
      if (t.mat.emissive && !ud.eigenesLeuchten) {
        t.mat.emissive.setHex(t.an ? GEWAEHLT : t.markiert ? MARKIERT : t.patient ? PATIENT_FARBE : 0x000000);
        t.mat.emissiveIntensity = t.an ? (pulsiert ? 0.12 + 0.2 * puls : 0.24) : t.markiert || t.patient ? 0.1 : 0;
      }
      // Lage: Erscheinen (leicht wachsen), Atmen/Herzschlag, Kiefer
      const g = t.start < 0 ? 1 : Math.min(1, (jetzt - t.start) / 700);
      if (g >= 1) t.start = -1;
      const sg = 0.965 + 0.035 * sanft(g);
      ma.makeTranslation(t.mitte.x, t.mitte.y, t.mitte.z).multiply(mb.makeScale(sg, sg, sg)).multiply(mc.makeTranslation(-t.mitte.x, -t.mitte.y, -t.mitte.z));
      if (bewegtJetzt && this.bewegung) {
        const b = this.bewegung, s = this.bewegung.art === "atmen" ? 0.035 * bs : 0.04 * bs;
        const sx = 1 + s * (b.art === "atmen" ? 0.7 : 1), sy = 1 + s * (b.art === "atmen" ? 1.1 : 1), sz = 1 + s * (b.art === "atmen" ? 0.8 : 1);
        mb.makeTranslation(b.mitte.x, b.mitte.y, b.mitte.z).multiply(mc.makeScale(sx, sy, sz)).multiply(new T.Matrix4().makeTranslation(-b.mitte.x, -b.mitte.y, -b.mitte.z));
        ma.premultiply(mb);
      }
      const kl = ud.klappe as number | undefined;
      if (kl && w) {
        mb.makeTranslation(0, py, pz).multiply(mc.makeRotationX(w * kl)).multiply(new T.Matrix4().makeTranslation(0, -py, -pz));
        ma.premultiply(mb);
      }
      t.mesh.matrix.copy(ma);
      t.mesh.matrixWorldNeedsUpdate = true;
    }
    // Von selbst drehen nur in den ersten 12 Sekunden, danach ruht das Bild
    if (this.steuerung.autoRotate && jetzt - this.geboren > 12000) this.steuerung.autoRotate = false;
    if (!this.fahrtJetzt && this.steuerung.update()) aktiv = true;
    this.renderer.render(this.szene, this.kamera);
    if (this.ankerListe.length) this.ankerZeichnen();
    this.inSchleife = false;
    // Ohne Bewegung noch zwei Bilder (Nachlauf), dann ruht die Schleife bis zum nächsten Wecken
    this.ruheBilder = aktiv ? 0 : this.ruheBilder + 1;
    if (this.ruheBilder < 3 && this.laeuft) this.rahmen = requestAnimationFrame(this.schleife);
  };

  private ankerZeichnen() {
    const T = this.T, b = this.behaelter.clientWidth, h = this.behaelter.clientHeight, v = new T.Vector3(), zur = new T.Vector3();
    for (const a of this.ankerListe) {
      v.copy(a.pos).project(this.kamera);
      zur.copy(this.kamera.position).sub(a.pos).normalize();
      const vorn = a.normal.dot(zur) > -0.15 && v.z < 1;
      a.el.style.transform = `translate(${((v.x + 1) / 2) * b}px, ${((1 - v.y) / 2) * h}px) translate(-50%, -50%)`;
      a.el.style.opacity = vorn ? "1" : "0";
      a.el.style.pointerEvents = vorn ? "auto" : "none";
    }
  };

  entfernen() {
    this.entfernt = true;
    this.laeuft = false;
    if (this.rahmen) cancelAnimationFrame(this.rahmen);
    this.beobachter.disconnect(); this.sicht.disconnect();
    for (const f of this.aufraeumen) f();
    this.steuerung.dispose();
    // Geometrien echter Teile sind zwischengespeichert und werden wiederverwendet
    for (const t of this.teile) { if (!t.mesh.userData.geteilt) t.mesh.geometry.dispose(); t.mat.dispose(); }
    this.flecken([]);
    this.umgebungZiel?.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    delete (this.behaelter as unknown as Record<string, unknown>).__modell;
  }
}

/** Gibt es WebGL auf diesem Gerät? Sonst bleibt es bei der flachen Darstellung. */
export function webglDa(): boolean {
  try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; }
}
