"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { startGlobeScene } from "./globeScene";
import styles from "./landing.module.css";

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
          id: "r3ai-landing-globe", trigger: element, start: "top top", end: () => `+=${window.innerHeight * 1.65}`,
          pin: true, scrub: 0.8, invalidateOnRefresh: true,
        } });
        timeline.to(scene, { progress: 1, duration: 1, ease: "power1.inOut", onUpdate: () => { element.dataset.sceneProgress = scene.progress.toFixed(2); } }, 0)
          .to(`.${styles.heroCopy}`, { autoAlpha: 0, y: -60, duration: 0.25, ease: "none" }, 0.08)
          .fromTo(`.${styles.missionTitle}`, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.22 }, 0.52)
          .fromTo(`.${styles.callout}`, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, stagger: 0.07, duration: 0.18 }, 0.65)
          .to(`.${styles.scrollHint}`, { autoAlpha: 0, duration: 0.12 }, 0.02);
      }
      return dispose;
    }, element);
    return () => media.revert();
  }, []);

  return <section ref={root} className={styles.experience} aria-label="R3AI introduction">
    <div className={styles.stars} aria-hidden="true" />
    <canvas ref={canvas} className={styles.globeCanvas} aria-hidden="true" />
    <div className={styles.heroCopy}>
      <p className={styles.eyebrow}><span />Recognize. Recover. Restore.</p>
      <h1>A cleaner planet.<br /><span>A shared mission.</span></h1>
      <p className={styles.heroDescription}>From a global perspective to action on the ground.<br className={styles.desktopBreak} /> Explore a new way to coordinate environmental cleanup.</p>
      <div className={styles.actions}><Link className={styles.primaryButton} href="/command">Enter R3AI Command <span aria-hidden="true">↗</span></Link><Link className={styles.textButton} href="/go">Discover R3AI Go <span aria-hidden="true">→</span></Link></div>
      <span className={styles.prototype}>A hackathon prototype with a planet-sized ambition</span>
    </div>
    <div className={styles.missionTitle}><p className={styles.eyebrow}>One planet. Connected perspectives.</p><h2>See the bigger picture.<br /><span>Make a local difference.</span></h2></div>
    <aside className={`${styles.callout} ${styles.orbitCallout}`}><span className={styles.calloutIcon} aria-hidden="true">◎</span><p className={styles.eyebrow}>Above the horizon</p><h3>A connected vision</h3><p>Imagined satellite relays connect a global mission. Telemetry is simulated in this prototype.</p></aside>
    <aside className={`${styles.callout} ${styles.groundCallout}`}><span className={styles.calloutIcon} aria-hidden="true">⌘</span><p className={styles.eyebrow}>On the ground</p><h3>Small bots. Big purpose.</h3><p>Follow simulated R3 BOTS as they navigate street routes and turn mapped waste into cleanup action.</p></aside>
    <div className={styles.sceneFooter}><span className={styles.sceneBadge}><i />Illustrative 3D scene · not live operations</span><span className={styles.scrollHint}>Scroll to explore <span aria-hidden="true">↓</span></span></div>
  </section>;
}
