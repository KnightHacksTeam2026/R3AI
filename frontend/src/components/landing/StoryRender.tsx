"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import mobileScreenshot from "../../../public/images/MobileScreenshot.png";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import styles from "./landing.module.css";

// Add public video URLs here when the app renders are ready.
const renders: Record<"simulation" | "mobile", string | undefined> = {
  simulation: "/robot-simulation-scroll.mp4",
  mobile: undefined, // e.g. /videos/r3ai-go.mp4
};

export default function StoryRender({ variant }: { variant: keyof typeof renders }) {
  const root = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const src = renders[variant];
  const showScreenshot = variant === "mobile" && (!src || failed);
  const title = variant === "simulation" ? "Robot simulation" : "R3AI Go walkthrough";

  useEffect(() => {
    const element = root.current;
    if (!element || !src || failed) return;
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const state = { progress: 0 };
      let manual = false;
      const useControls = () => { manual = true; };
      const sync = () => {
        if (manual) return;
        const clip = video.current;
        if (clip && Number.isFinite(clip.duration) && clip.duration > 0 && clip.paused && !clip.seeking) {
          const target = state.progress * Math.max(0, clip.duration - 0.05);
          if (Math.abs(clip.currentTime - target) > 1 / 30) clip.currentTime = target;
        }
      };
      const clip = video.current;
      clip?.addEventListener("loadedmetadata", sync);
      clip?.addEventListener("seeked", sync);
      clip?.addEventListener("pointerdown", useControls);
      clip?.addEventListener("keydown", useControls);
      gsap.to(state, { progress: 1, ease: "none", onUpdate: () => { manual = false; sync(); }, scrollTrigger: { trigger: element, start: "top 75%", end: "bottom 25%", scrub: 0.4 } });
      return () => {
        clip?.removeEventListener("loadedmetadata", sync);
        clip?.removeEventListener("seeked", sync);
        clip?.removeEventListener("pointerdown", useControls);
        clip?.removeEventListener("keydown", useControls);
      };
    }, element);
    return () => media.revert();
  }, [src, failed]);

  return <figure ref={root} className={styles.storyRender} data-format={variant}>
    <div className={styles.renderBar}><span>{variant === "simulation" ? "R3AI / COMMAND" : "R3AI / GO"}</span><span>{showScreenshot ? "APP PREVIEW" : src && !failed ? "APP RENDER" : "VIDEO PLACEHOLDER"}</span></div>
    <div className={styles.renderViewport} data-screenshot={showScreenshot}>
      {showScreenshot ? <Image src={mobileScreenshot} alt="R3AI Go on mobile: a map with a location marker above the Explore, Saved, and My activity tabs and cleanup-route search." sizes="290px" placeholder="blur" /> : src && !failed ? <video ref={video} src={src} poster={variant === "simulation" ? "/robot-simulation-poster.jpg" : undefined} muted playsInline controls preload="metadata" aria-label={title} onError={() => setFailed(true)}>Your browser does not support this video.</video> : <div className={styles.renderPlaceholder}>
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true"><rect x="4" y="4" width="40" height="40" rx="12" stroke="currentColor" /><path d="m20 16 12 8-12 8V16Z" stroke="currentColor" strokeLinejoin="round" /></svg>
        <strong>{title}</strong>
        <span>{failed ? "Video unavailable" : variant === "simulation" ? "Robot movement through the simulation" : "From a flagged item to a community cleanup"}</span>
      </div>}
    </div>
    <figcaption>{showScreenshot ? "R3AI Go: explore cleanup routes, save places, and keep track of your activity." : src && !failed ? "Scroll to move through the render, or use the video controls. Reduced motion uses manual playback." : "Render coming soon. This space is reserved for the app video."}</figcaption>
  </figure>;
}
