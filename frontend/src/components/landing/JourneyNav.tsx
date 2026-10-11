"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import styles from "./landing.module.css";

const chapters = [
  { id: "mission", label: "Understand the project" },
  { id: "platform", label: "Choose an app" },
  { id: "questions", label: "Before you start" },
];

export default function JourneyNav() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const nav = root.current;
    if (!nav) return;
    gsap.registerPlugin(ScrollTrigger);
    const sections = chapters.map(chapter => document.getElementById(chapter.id));
    if (sections.some(section => !section)) return;
    const links = Array.from(nav.querySelectorAll("a"));
    const media = gsap.matchMedia();
    media.add({ motion: "(prefers-reduced-motion: no-preference)", reduced: "(prefers-reduced-motion: reduce)" }, context => {
      const motion = Boolean(context.conditions?.motion);
      const progressTo = gsap.quickTo(nav, "--journey-progress", { duration: motion ? 0.4 : 0, ease: "power2.out" });
      let positions: number[] = [];
      let active = -2;
      const update = () => {
        const readingPosition = window.scrollY + window.innerHeight * 0.45;
        let current = -1;
        positions.forEach((position, index) => { if (readingPosition >= position) current = index; });
        if (current !== active) {
          active = current;
          links.forEach((link, index) => {
            if (index === current) link.setAttribute("aria-current", "location");
            else link.removeAttribute("aria-current");
            link.dataset.complete = String(index < current);
          });
        }
        const segment = Math.max(0, Math.min(current, 1));
        const fraction = gsap.utils.clamp(0, 1, (readingPosition - positions[segment]) / Math.max(1, positions[segment + 1] - positions[segment]));
        progressTo((segment + fraction) / 2);
      };
      const measure = () => {
        positions = sections.map(section => section!.getBoundingClientRect().top + window.scrollY);
        update();
      };
      ScrollTrigger.create({ trigger: document.documentElement, start: 0, end: "max", onUpdate: update, onRefresh: measure });
      measure();
      const refresh = requestAnimationFrame(() => ScrollTrigger.refresh());
      return () => cancelAnimationFrame(refresh);
    }, nav);
    return () => media.revert();
  }, []);

  return <nav ref={root} className={styles.journeyNav} aria-label="Explore this page">
    <span className={styles.journeyTrack} aria-hidden="true"><span /></span>
    {chapters.map((chapter, index) => <a key={chapter.id} href={`#${chapter.id}`} aria-label={`${index + 1}. ${chapter.label}`}>
      <span className={styles.journeyNumber} aria-hidden="true">0{index + 1}</span>
      <span className={styles.journeyLabel}>{chapter.label}</span>
    </a>)}
  </nav>;
}
