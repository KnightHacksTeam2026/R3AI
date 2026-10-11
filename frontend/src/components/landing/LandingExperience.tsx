"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { startGlobeScene } from "./globeScene";
import Navbar from "@/components/shared/Navbar";
import styles from "./landing.module.css";
import HeroBackdrop from "./HeroBackdrop";

export default function LandingExperience() {
  const root = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!root.current || !canvas.current) return;
    gsap.registerPlugin(ScrollTrigger);
    const element = root.current;
    const drawing = canvas.current;
    const media = gsap.matchMedia();
    media.add({ animate: "(prefers-reduced-motion: no-preference)", reduce: "(prefers-reduced-motion: reduce)" }, context => {
      const motion = Boolean(context.conditions?.animate);
      const scene = { progress: 0 };
      const dispose = startGlobeScene(drawing, scene, motion);
      if (motion) {
        const timeline = gsap.timeline({ scrollTrigger: {
          id: "r3ai-landing-globe", trigger: element, start: "top top", end: () => `+=${window.innerHeight * 0.85}`,
          pin: true, scrub: 0.8, invalidateOnRefresh: true,
        } });
        timeline.to(scene, { progress: 1, duration: 1, ease: "power1.inOut", onUpdate: () => { element.dataset.sceneProgress = scene.progress.toFixed(2); } }, 0)
          .to(`.${styles.heroCopy}`, { autoAlpha: 0, y: -60, duration: 0.25, ease: "none" }, 0.08)
          .fromTo(`.${styles.missionTitle}`, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.22 }, 0.52)
          .fromTo(`.${styles.callout}`, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, stagger: 0.07, duration: 0.18 }, 0.65)
          .to(`.${styles.scrollHint}`, { autoAlpha: 0, duration: 0.12 }, 0.02)
          .to(`.${styles.heroBackdrop}`, { opacity: 0.45, duration: 0.8, ease: "none" }, 0.15);
      }
      return dispose;
    }, element);
    return () => media.revert();
  }, []);

  return <section ref={root} className={styles.experience} aria-label="R3AI introduction">
    <HeroBackdrop />
    <header className={styles.landingNav} data-theme="shared"><Navbar floating /></header>
    <canvas ref={canvas} className={styles.globeCanvas} aria-hidden="true" />
    <div className={styles.heroCopy}>
      <p className={styles.eyebrow}><span />Robotics · Maps · Community cleanup</p>
      <h1>A cleaner planet.<br /><span>A shared mission.</span></h1>
      <p className={styles.heroDescription}>R3AI is a project connecting robot-assisted cleanup with community action. Explore the robot fleet in Command, or discover cleanup routes with Go.</p>
      <div className={styles.actions}><a className={styles.primaryButton} href="#mission">See how R3AI works <span aria-hidden="true">↓</span></a><a className={styles.textButton} href="#platform">Choose where to explore <span aria-hidden="true">→</span></a></div>
      <p className={styles.heroNote}>Interactive prototype · Simulated fleet and sample routes</p>
    </div>
    <div className={styles.missionTitle}><p className={styles.eyebrow}>One planet. Connected perspectives.</p><h2>See the bigger picture.<br /><span>Make a local difference.</span></h2></div>
    <aside className={`${styles.callout} ${styles.orbitCallout}`}><span className={styles.calloutIcon} aria-hidden="true">◎</span><p className={styles.eyebrow}>Above the horizon</p><h3>A connected vision</h3><p>A global perspective brings local cleanup efforts into the bigger picture.</p></aside>
    <aside className={`${styles.callout} ${styles.groundCallout}`}><span className={styles.calloutIcon} aria-hidden="true">⌘</span><p className={styles.eyebrow}>On the ground</p><h3>Small bots. Big purpose.</h3><p>Explore R3 BOTS, their street routes, and the journey from recognizing waste to planning a cleanup.</p></aside>
    <div className={styles.sceneFooter}><span className={styles.sceneBadge}><i />Recognize. Recover. Restore.</span><a className={styles.skipStory} href="#platform">Skip to the apps <span aria-hidden="true">↗</span></a></div>
  </section>;
}
