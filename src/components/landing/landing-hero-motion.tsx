"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

const INK = "#0c0c0c";
const MAP_URL = "/landing/earth-print-map.png";
const PENCIL_URL = "/landing/print-pencil.png";

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

function makeGrain(size: number) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const g = c.getContext("2d")!;
  const id = g.createImageData(size, size);
  for (let i = 0; i < id.data.length; i += 4) {
    const v = (Math.random() * 255) | 0;
    id.data[i] = v;
    id.data[i + 1] = v;
    id.data[i + 2] = v;
    id.data[i + 3] = 52;
  }
  g.putImageData(id, 0, 0);
  return c;
}

/**
 * Print-style spinning Earth (cream oceans, black land + grid, grain)
 * with a matching pencil resting on top. Solid disk — no holes.
 */
export function LandingHeroMotion() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let cancelled = false;
    let raf = 0;
    let rot = 0.55;
    let last = performance.now();
    let cssW = 0;
    let cssH = 0;
    let mapData: Uint8ClampedArray | null = null;
    let mapW = 0;
    let mapH = 0;
    let globe: HTMLCanvasElement | null = null;
    let globeCtx: CanvasRenderingContext2D | null = null;
    let globeBuf: ImageData | null = null;
    const grain = makeGrain(180);

    const creamR = 0xe6;
    const creamG = 0xdf;
    const creamB = 0xd2;

    const sample = (lon: number, lat: number) => {
      if (!mapData) return [creamR, creamG, creamB] as const;
      let u = (lon / (Math.PI * 2) + 0.5) * mapW;
      let v = (0.5 - lat / Math.PI) * mapH;
      u = ((u % mapW) + mapW) % mapW;
      v = Math.max(0, Math.min(mapH - 1.0001, v));
      const i = ((v | 0) * mapW + (u | 0)) * 4;
      return [mapData[i]!, mapData[i + 1]!, mapData[i + 2]!] as const;
    };

    const ensureGlobe = (diameter: number) => {
      const size = Math.max(180, diameter | 0);
      if (globe && globe.width === size && globeBuf) return size;
      globe = document.createElement("canvas");
      globe.width = size;
      globe.height = size;
      globeCtx = globe.getContext("2d");
      globeBuf = globeCtx ? globeCtx.createImageData(size, size) : null;
      return size;
    };

    const paintGlobe = () => {
      if (!globe || !globeCtx || !globeBuf) return;
      const diam = globe.width;
      const R = diam * 0.5;
      const R2 = R * R;
      const out = globeBuf.data;
      const cosR = Math.cos(rot);
      const sinR = Math.sin(rot);
      out.fill(0);

      for (let py = 0; py < diam; py++) {
        const dy = py + 0.5 - R;
        const yNorm = dy / R;
        for (let px = 0; px < diam; px++) {
          const dx = px + 0.5 - R;
          if (dx * dx + dy * dy > R2) continue;

          let r = creamR;
          let g = creamG;
          let b = creamB;

          const xNorm = dx / R;
          const rr = xNorm * xNorm + yNorm * yNorm;
          if (rr <= 1 && mapData) {
            const z = Math.sqrt(1 - rr);
            const xr = xNorm * cosR + z * sinR;
            const zr = -xNorm * sinR + z * cosR;
            const lon = Math.atan2(xr, zr);
            const lat = Math.asin(Math.max(-1, Math.min(1, -yNorm)));
            const s = sample(lon, lat);
            r = s[0];
            g = s[1];
            b = s[2];
          }

          const i = (py * diam + px) * 4;
          out[i] = r;
          out[i + 1] = g;
          out[i + 2] = b;
          out[i + 3] = 255;
        }
      }
      globeCtx.putImageData(globeBuf, 0, 0);
    };

    const resize = () => {
      const stage = root.querySelector<HTMLElement>("[data-earth-compose]");
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      cssW = rect.width;
      cssH = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (now: number) => {
      if (cancelled) return;
      if (cssW < 2 || !mapData) {
        raf = requestAnimationFrame(draw);
        return;
      }

      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!reduce) rot += dt * 0.08;

      const W = cssW;
      const H = cssH;
      const globeSize = Math.min(W, H) * 0.78;
      const cx = W * 0.52;
      const cy = H * 0.54;
      const R = globeSize * 0.5;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      ctx.clearRect(0, 0, W, H);

      const diam = Math.max(200, Math.round(R * 2 * Math.min(dpr, 1.35)));
      ensureGlobe(diam);
      paintGlobe();

      if (globe) {
        ctx.drawImage(globe, cx - R, cy - R, R * 2, R * 2);
      }

      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = INK;
      ctx.lineWidth = Math.max(1.75, R * 0.008);
      ctx.stroke();

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();
      ctx.globalAlpha = 0.32;
      ctx.globalCompositeOperation = "multiply";
      const pattern = ctx.createPattern(grain, "repeat");
      if (pattern) {
        ctx.fillStyle = pattern;
        ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
      }
      ctx.restore();

      raf = requestAnimationFrame(draw);
    };

    const ro = new ResizeObserver(resize);
    const compose = root.querySelector<HTMLElement>("[data-earth-compose]");
    if (compose) ro.observe(compose);

    const pencilEl = root.querySelector<HTMLElement>("[data-pencil]");
    const hit = root.querySelector<HTMLElement>("[data-earth-hit]");
    let closer: (() => void) | null = null;
    let rest: (() => void) | null = null;

    const armPencilHover = () => {
      if (!pencilEl || !hit || reduce) return;

      // Counter foreshortening from rotateY so length stays visually constant
      const turnDeg = 26;
      const lengthCompensate = 1 / Math.cos((turnDeg * Math.PI) / 180);

      requestAnimationFrame(() => {
        gsap.set(pencilEl, {
          xPercent: -50,
          yPercent: -50,
          x: 0,
          y: 0,
          rotate: -32,
          rotateY: 0,
          scaleX: 1,
          scaleY: 1,
          transformOrigin: "center center",
          transformPerspective: 900,
          force3D: true,
        });
      });

      closer = () => {
        gsap.to(pencilEl, {
          xPercent: -50,
          yPercent: -50,
          x: 14,
          y: 20,
          rotate: -14,
          rotateY: -turnDeg,
          scaleX: lengthCompensate,
          scaleY: 1,
          duration: 0.5,
          ease: "power2.out",
          overwrite: "auto",
        });
      };
      rest = () => {
        gsap.to(pencilEl, {
          xPercent: -50,
          yPercent: -50,
          x: 0,
          y: 0,
          rotate: -32,
          rotateY: 0,
          scaleX: 1,
          scaleY: 1,
          duration: 0.55,
          ease: "power2.out",
          overwrite: "auto",
        });
      };
      hit.addEventListener("pointerenter", closer);
      hit.addEventListener("pointerleave", rest);
    };

    const gsapCtx = gsap.context(() => {
      gsap.fromTo(
        "[data-earth-stage]",
        { autoAlpha: 0 },
        { autoAlpha: 1, duration: 0.9, ease: "power2.out" }
      );
      armPencilHover();
    }, root);

    (async () => {
      try {
        const mapImg = await loadImage(MAP_URL);
        if (cancelled) return;

        const mc = document.createElement("canvas");
        mc.width = mapImg.naturalWidth;
        mc.height = mapImg.naturalHeight;
        const mctx = mc.getContext("2d", { willReadFrequently: true })!;
        mctx.drawImage(mapImg, 0, 0);
        mapW = mc.width;
        mapH = mc.height;
        mapData = mctx.getImageData(0, 0, mapW, mapH).data;

        resize();
        last = performance.now();
        raf = requestAnimationFrame(draw);
      } catch {
        resize();
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      if (hit && closer && rest) {
        hit.removeEventListener("pointerenter", closer);
        hit.removeEventListener("pointerleave", rest);
      }
      gsapCtx.revert();
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="keepr-on-dark pointer-events-none absolute inset-0 overflow-hidden bg-black"
      aria-hidden
    >
      <div
        data-earth-stage
        className="landing-earth-stage absolute inset-y-0 right-0 z-[3] flex items-center justify-end opacity-0"
      >
        <div data-earth-compose className="landing-earth-compose">
          <canvas ref={canvasRef} className="landing-earth-canvas" />
          <img
            data-pencil
            src={PENCIL_URL}
            alt=""
            draggable={false}
            className="landing-pencil"
          />
          <div data-earth-hit className="landing-earth-hit" />
        </div>
      </div>

      <div className="landing-hero-vignette absolute inset-0 z-[1]" />
      <div className="landing-hero-grain absolute inset-0 z-[2]" />
    </div>
  );
}
