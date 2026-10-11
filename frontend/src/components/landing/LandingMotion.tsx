"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import styles from "./landing.module.css";

export default function LandingMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const sections = element.querySelectorAll<HTMLElement>(`.${styles.intro}, .${styles.platform}, .${styles.closing}`);
      sections.forEach(section => {
        const heading = section.querySelector(`.${styles.sectionHeading}`);
        const targets = heading ? Array.from(heading.children) : Array.from(section.children).filter(child => !child.hasAttribute("aria-hidden"));
        gsap.from(targets, { y: 38, opacity: 0, duration: 0.9, stagger: 0.12, ease: "power3.out", scrollTrigger: { trigger: section, start: "top 82%", once: true } });
      });
      const steps = element.querySelectorAll<HTMLElement>(`.${styles.step}`);
      steps.forEach((step, index) => {
        gsap.from(step.children, { y: 28, opacity: 0, duration: 0.7, stagger: 0.08, delay: index * 0.08, ease: "power3.out", scrollTrigger: { trigger: step, start: "top 88%", once: true } });
        gsap.fromTo(step, { "--step-progress": 0 }, { "--step-progress": 1, ease: "none", scrollTrigger: { trigger: step, start: "top 85%", end: "bottom 65%", scrub: 0.5 } });
      });
      element.querySelectorAll<HTMLElement>(`.${styles.platformCard}`).forEach((card, index) => {
        gsap.from(card, { y: 60, opacity: 0, duration: 1, delay: index * 0.15, ease: "power3.out", scrollTrigger: { trigger: card, start: "top 90%", once: true } });
        gsap.from(card.querySelectorAll("li"), { x: 18, opacity: 0, stagger: 0.12, duration: 0.65, ease: "power2.out", scrollTrigger: { trigger: card, start: "top 65%", once: true } });
      });
      const rings = element.querySelector(`.${styles.closingRings}`);
      const signal = element.querySelector<HTMLElement>(`.${styles.signalSection}`);
      if (signal) {
        const sequence = gsap.timeline({ scrollTrigger: { trigger: signal, start: "top 70%", end: "bottom 65%", scrub: 0.7 } });
        sequence.fromTo(signal.querySelector("[data-signal-path]"), { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.5, ease: "none" }, 0)
          .from(signal.querySelectorAll(`.${styles.signalNodes} article`), { y: 48, opacity: 0.2, stagger: 0.4, duration: 0.6 }, 0)
          .fromTo(signal.querySelector(`.${styles.signalOrbit}`), { rotation: -45, scale: 0.7 }, { rotation: 45, scale: 1, duration: 1.5, ease: "none" }, 0);
      }
      const manifesto = element.querySelector<HTMLElement>(`.${styles.manifesto}`);
      if (manifesto) {
        const words = manifesto.querySelectorAll(`.${styles.manifestoWords} span`);
        words.forEach((word, index) => {
          gsap.from(word, { xPercent: index % 2 ? 18 : -18, rotation: index % 2 ? 3 : -3, opacity: 0.15, ease: "none", scrollTrigger: { trigger: word, start: "top 95%", end: "top 40%", scrub: 0.8 } });
        });
      }
      if (rings) {
        // Move one bounded layer only in response to scrolling. No perpetual
        // per-ring updates, oversized masks, or blurred shadow surfaces.
        gsap.fromTo(rings, { scale: 1.08 }, { scale: 0.7, force3D: true, ease: "none", scrollTrigger: { trigger: rings.parentElement, start: "top bottom", end: "bottom bottom", scrub: true } });
      }
      // The hero creates a pinned scroll sequence before these sections.
      // Refresh after all child effects and font layout have settled.
      const refresh = requestAnimationFrame(() => ScrollTrigger.refresh());
      let disposed = false;
      void document.fonts.ready.then(() => { if (!disposed) ScrollTrigger.refresh(); });
      return () => { disposed = true; cancelAnimationFrame(refresh); };
    }, element);

    media.add("(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)", () => {
      const cleanups: (() => void)[] = [];
      element.querySelectorAll<HTMLElement>(`.${styles.platformCard}`).forEach(card => {
        const tiltX = gsap.quickTo(card, "rotationX", { duration: 0.65, ease: "power3.out" });
        const tiltY = gsap.quickTo(card, "rotationY", { duration: 0.65, ease: "power3.out" });
        const spotlightX = gsap.quickTo(card, "--spot-x", { duration: 0.4 });
        const spotlightY = gsap.quickTo(card, "--spot-y", { duration: 0.4 });
        const glow = gsap.quickTo(card, "--spot-opacity", { duration: 0.4 });
        const arrow = card.querySelector("a span");
        const arrowX = arrow ? gsap.quickTo(arrow, "x", { duration: 0.4, ease: "power3.out" }) : null;
        const move = (event: PointerEvent) => {
          const rect = card.getBoundingClientRect();
          const x = (event.clientX - rect.left) / rect.width;
          const y = (event.clientY - rect.top) / rect.height;
          tiltX((0.5 - y) * 5); tiltY((x - 0.5) * 6);
          spotlightX(x * 100); spotlightY(y * 100); glow(1); arrowX?.(7);
        };
        const reset = () => { tiltX(0); tiltY(0); glow(0); arrowX?.(0); };
        const focus = () => { glow(0.7); arrowX?.(7); };
        card.addEventListener("pointermove", move, { passive: true });
        card.addEventListener("pointerleave", reset);
        card.addEventListener("focusin", focus);
        card.addEventListener("focusout", reset);
        cleanups.push(() => { card.removeEventListener("pointermove", move); card.removeEventListener("pointerleave", reset); card.removeEventListener("focusin", focus); card.removeEventListener("focusout", reset); });
      });
      return () => cleanups.forEach(cleanup => cleanup());
    }, element);
    return () => media.revert();
  }, []);

  return <main ref={root} className={styles.page}>{children}</main>;
}
