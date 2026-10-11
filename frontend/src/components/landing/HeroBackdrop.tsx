"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { gsap } from "gsap";
import styles from "./landing.module.css";

// Stable positions keep server-rendered stars identical during hydration.
const stars = Array.from({ length: 72 }, (_, index) => ({
  x: ((index * 73.37 + 17) % 100),
  y: ((index * 41.63 + 9) % 100),
  depth: 0.3 + (index % 5) * 0.17,
}));

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
      const particles = Array.from(element.querySelectorAll<HTMLElement>(`.${styles.star}`)).map((star, index) => ({
        ...stars[index],
        moveX: gsap.quickTo(star, "x", { duration: 0.9, ease: "power3.out" }),
        moveY: gsap.quickTo(star, "y", { duration: 0.9, ease: "power3.out" }),
      }));
      const move = (event: PointerEvent) => {
        const bounds = hero.getBoundingClientRect();
        const dx = event.clientX - bounds.left - bounds.width / 2;
        const dy = event.clientY - bounds.top - bounds.height / 2;
        x(dx * 0.07); y(dy * 0.07);
        particles.forEach(particle => {
          const offsetX = bounds.width * particle.x / 100 - (event.clientX - bounds.left);
          const offsetY = bounds.height * particle.y / 100 - (event.clientY - bounds.top);
          const distance = Math.hypot(offsetX, offsetY);
          const force = Math.max(0, 1 - distance / 180) * 42;
          particle.moveX(dx * 0.025 * particle.depth + offsetX / Math.max(distance, 1) * force);
          particle.moveY(dy * 0.025 * particle.depth + offsetY / Math.max(distance, 1) * force);
        });
      };
      const reset = () => { x(0); y(0); particles.forEach(particle => { particle.moveX(0); particle.moveY(0); }); };
      hero.addEventListener("pointermove", move, { passive: true });
      hero.addEventListener("pointerleave", reset);
      return () => { hero.removeEventListener("pointermove", move); hero.removeEventListener("pointerleave", reset); };
    }, element);
    return () => media.revert();
  }, []);

  return <div ref={root} className={styles.heroBackdrop} aria-hidden="true">
    <div className={styles.auroraField}><span className={`${styles.aurora} ${styles.auroraOne}`} /><span className={`${styles.aurora} ${styles.auroraTwo}`} /></div>
    <div className={styles.starfield}>{stars.map((star, index) => <span key={index} className={styles.star} style={{ left: `${star.x}%`, top: `${star.y}%`, "--star-size": `${1 + star.depth * 2}px`, opacity: 0.25 + star.depth * 0.6 } as CSSProperties} />)}</div>
    <div className={styles.backdropVignette} />
  </div>;
}
