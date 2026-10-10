"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import styles from "./landing.module.css";

export default function HeroBackdrop() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = root.current;
    const hero = element?.parentElement;
    if (!element || !hero) return;
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const auroras = element.querySelectorAll(`.${styles.aurora}`);
      const drift = gsap.timeline({ repeat: -1, yoyo: true, defaults: { duration: 14, ease: "sine.inOut" } })
        .to(auroras[0], { xPercent: 18, yPercent: 12, rotation: 12, scaleX: 1.2, scaleY: 0.8, borderRadius: "38% 62% 65% 35% / 60% 35% 65% 40%" }, 0)
        .to(auroras[1], { xPercent: -18, yPercent: -12, rotation: -10, scaleX: 0.9, scaleY: 1.2, borderRadius: "65% 35% 38% 62% / 35% 60% 40% 65%" }, 0);
      let inView = true;
      const sync = () => { drift.paused(!inView || document.hidden); };
      const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; sync(); });
      observer.observe(hero);
      document.addEventListener("visibilitychange", sync);
      sync();
      return () => { observer.disconnect(); document.removeEventListener("visibilitychange", sync); };
    }, element);
    media.add("(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)", () => {
      const field = element.querySelector(`.${styles.auroraField}`);
      const x = gsap.quickTo(field, "x", { duration: 1.4, ease: "power3.out" });
      const y = gsap.quickTo(field, "y", { duration: 1.4, ease: "power3.out" });
      const move = (event: PointerEvent) => {
        const bounds = hero.getBoundingClientRect();
        const dx = event.clientX - bounds.left - bounds.width / 2;
        const dy = event.clientY - bounds.top - bounds.height / 2;
        x(dx * 0.07); y(dy * 0.07);
      };
      const reset = () => { x(0); y(0); };
      hero.addEventListener("pointermove", move, { passive: true });
      hero.addEventListener("pointerleave", reset);
      return () => { hero.removeEventListener("pointermove", move); hero.removeEventListener("pointerleave", reset); };
    }, element);
    return () => media.revert();
  }, []);

  return <div ref={root} className={styles.heroBackdrop} aria-hidden="true">
    <div className={styles.auroraField}><span className={`${styles.aurora} ${styles.auroraOne}`} /><span className={`${styles.aurora} ${styles.auroraTwo}`} /></div>
    <div className={styles.backdropVignette} />
  </div>;
}
