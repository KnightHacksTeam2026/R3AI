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
      const sections = element.querySelectorAll<HTMLElement>(`.${styles.platform}, .${styles.closing}`);
      sections.forEach(section => {
        const heading = section.querySelector(`.${styles.sectionHeading}`);
        const targets = heading ? Array.from(heading.children) : Array.from(section.children).filter(child => !child.hasAttribute("aria-hidden"));
        gsap.from(targets, { y: 38, opacity: 0, duration: 0.9, stagger: 0.12, ease: "power3.out", scrollTrigger: { trigger: section, start: "top 82%", once: true } });
      });
      const words = element.querySelectorAll<HTMLElement>(`.${styles.missionTagline} span`);
      element.querySelectorAll<HTMLElement>(`.${styles.missionChapter}`).forEach((chapter, index) => {
        gsap.fromTo(words[index], { "--word-progress": 0 }, { "--word-progress": 1, ease: "none", scrollTrigger: { trigger: chapter, start: "top 75%", end: "top 30%", scrub: 0.4 } });
        gsap.from(chapter.children, { y: 40, opacity: 0.25, stagger: 0.08, ease: "none", scrollTrigger: { trigger: chapter, start: "top 85%", end: "top 25%", scrub: 0.5 } });
      });
      const rings = element.querySelector(`.${styles.closingRings}`);
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

    return () => media.revert();
  }, []);

  return <main ref={root} className={styles.page}>{children}</main>;
}
