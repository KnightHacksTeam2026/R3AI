"use client";

import { useEffect, useRef } from "react";
import type { Theme } from "./types";

type Star = {
  x: number;
  y: number;
  radius: number;
  brightness: number;
  phase: number;
  depth: number;
  color: string;
};

// A stable seed keeps the same sky when switching themes or resizing.
function seededRandom(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

export default function UniverseBackdrop({ theme }: { theme: Theme }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    const context = canvas?.getContext("2d", { alpha: false });
    if (!canvas || !host || !context) return;

    const dark = theme === "dark";
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const nebula = document.createElement("canvas");
    const nebulaContext = nebula.getContext("2d");
    if (!nebulaContext) return;

    let width = 0;
    let height = 0;
    let stars: Star[] = [];
    let frame = 0;
    let lastTime = 0;
    let elapsed = 0;
    let targetX = 0;
    let targetY = 0;
    let offsetX = 0;
    let offsetY = 0;

    function createSky() {
      if (!canvas || !context || !nebulaContext) return;
      width = host!.clientWidth;
      height = host!.clientHeight;
      if (!width || !height) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      // Clouds are generated once at half resolution, then reused each frame.
      nebula.width = Math.ceil(width / 2);
      nebula.height = Math.ceil(height / 2);
      const random = seededRandom(3301);
      const colors = dark ? ["55,80,164", "83,49,134", "28,116,122"] : ["70,111,153", "110,78,144", "49,134,141"];
      for (let index = 0; index < 34; index++) {
        const x = random() * nebula.width;
        const y = nebula.height * (0.27 + 0.30 * x / nebula.width) + (random() - 0.5) * nebula.height * 0.32;
        const radius = nebula.width * (0.08 + random() * 0.17);
        const gradient = nebulaContext.createRadialGradient(x, y, 0, x, y, radius);
        const color = colors[index % colors.length];
        gradient.addColorStop(0, `rgba(${color},${dark ? 0.09 : 0.10})`);
        gradient.addColorStop(0.5, `rgba(${color},0.025)`);
        gradient.addColorStop(1, `rgba(${color},0)`);
        nebulaContext.fillStyle = gradient;
        nebulaContext.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      }

      const count = Math.min(700, Math.max(180, Math.round(width * height / 2700)));
      stars = Array.from({ length: count }, (_, index) => {
        const x = random();
        const inCloud = index % 3 === 0;
        return {
          x,
          y: inCloud ? Math.max(0, Math.min(1, 0.27 + x * 0.30 + (random() - 0.5) * 0.32)) : random(),
          radius: 0.35 + Math.pow(random(), 4) * 1.2,
          brightness: 0.25 + random() * 0.60,
          phase: random() * Math.PI * 2,
          depth: 0.3 + random() * 0.7,
          color: ["226,238,255", "174,211,232", "243,220,193"][index % 3],
        };
      });
    }

    function draw(time: number) {
      if (!context || !width || !height) return;
      offsetX += (targetX - offsetX) * 0.04;
      offsetY += (targetY - offsetY) * 0.04;
      context.fillStyle = dark ? "#030811" : "#101c30";
      context.fillRect(0, 0, width, height);
      context.drawImage(nebula, Math.sin(time * 0.025) * 8 - 12, Math.cos(time * 0.02) * 6 - 12, width + 24, height + 24);

      for (const star of stars) {
        const drift = time * 0.65 * star.depth;
        const x = ((star.x * width + drift + offsetX * star.depth) % width + width) % width;
        const y = ((star.y * height + offsetY * star.depth) % height + height) % height;
        const brightness = star.brightness * (0.80 + Math.sin(time * 0.65 + star.phase) * 0.20);
        context.fillStyle = `rgba(${star.color},${brightness})`;
        context.beginPath();
        context.arc(x, y, star.radius, 0, Math.PI * 2);
        context.fill();
        if (star.radius > 1.25) {
          context.fillStyle = `rgba(${star.color},${brightness * 0.06})`;
          context.beginPath();
          context.arc(x, y, star.radius * 4, 0, Math.PI * 2);
          context.fill();
        }
      }
    }

    function animate(timestamp: number) {
      frame = window.requestAnimationFrame(animate);
      if (timestamp - lastTime < 1000 / 30) return;
      elapsed += lastTime ? Math.min((timestamp - lastTime) / 1000, 0.1) : 0;
      lastTime = timestamp;
      draw(elapsed);
    }

    function updatePlayback() {
      window.cancelAnimationFrame(frame);
      lastTime = 0;
      if (document.hidden) return;
      if (motion.matches) {
        offsetX = targetX = 0;
        offsetY = targetY = 0;
        draw(0);
      } else {
        frame = window.requestAnimationFrame(animate);
      }
    }

    function onPointerMove(event: PointerEvent) {
      if (motion.matches || event.pointerType !== "mouse") return;
      const bounds = host!.getBoundingClientRect();
      targetX = ((event.clientX - bounds.left) / width - 0.5) * 12;
      targetY = ((event.clientY - bounds.top) / height - 0.5) * 12;
    }

    function onPointerLeave() { targetX = targetY = 0; }

    const resizeObserver = new ResizeObserver(() => {
      createSky();
      draw(motion.matches ? 0 : elapsed);
    });
    resizeObserver.observe(host);
    createSky();
    draw(0);
    updatePlayback();
    motion.addEventListener("change", updatePlayback);
    document.addEventListener("visibilitychange", updatePlayback);
    host.addEventListener("pointermove", onPointerMove);
    host.addEventListener("pointerleave", onPointerLeave);

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      motion.removeEventListener("change", updatePlayback);
      document.removeEventListener("visibilitychange", updatePlayback);
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [theme]);

  return <canvas ref={canvasRef} aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", background: theme === "dark" ? "#030811" : "#101c30" }} />;
}
