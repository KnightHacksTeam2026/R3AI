import Link from "next/link";
import { useState } from "react";
import styles from "@/app/go/go.module.css";
import GoIcon from "./GoIcon";

export default function GoDownloadPage({ onPreview }: { onPreview: () => void }) {
  const [message, setMessage] = useState("");

  async function copyLink() {
    const url = `${window.location.origin}/go`;
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Link copied. Open it on your phone to install Go.");
    } catch {
      setMessage(`Open this address on your phone: ${url}`);
    }
  }

  return <main className={styles.downloadPage}>
    <header className={styles.desktopHeader}><Link href="/" className={styles.brand}><span className={styles.brandMark}>R3</span><span>R3AI <span className={styles.brandGo}>Go</span></span></Link><nav aria-label="Main navigation"><Link href="/">Home</Link><Link href="/command">Open Command <GoIcon name="arrow" size={16} /></Link></nav></header>
    <div className={styles.downloadGrid}>
      <section className={styles.downloadIntro}><span className={styles.releaseTag}><span /> THE MOBILE COMPANION TO R3AI</span><h1>A cleaner planet.<br /><span>One small step<br />at a time.</span></h1><p>Meet R3AI Go. Explore cleanup missions, get outside, and keep a little record of the good you do.</p>
        <div className={styles.storeBadges}><div><span className={styles.storeGlyph}>●</span><span><small>PLANNED FOR</small><strong>App Store</strong></span></div><div><span className={styles.storeGlyph}>▷</span><span><small>PLANNED FOR</small><strong>Google Play</strong></span></div></div>
        <p className={styles.storeNote}>Native apps aren’t published yet. The web app is available now.</p>
        <div className={styles.webInstall}><span className={styles.installIcon}><GoIcon name="download" /></span><div><strong>Your phone. Your home screen.</strong><p>Open this page on your phone, then add R3AI Go to your home screen.</p><button className={styles.textButton} onClick={copyLink}>Copy mobile link <GoIcon name="arrow" size={16} /></button>{message && <p role="status">{message}</p>}</div></div>
        <button className={styles.previewButton} onClick={onPreview}>Try the mobile preview <GoIcon name="arrow" size={18} /></button>
      </section>
      <div className={styles.phoneStage} aria-label="Preview of the R3AI Go mobile interface"><div className={styles.orbitOne} /><div className={styles.orbitTwo} /><span className={styles.floatingTag}><GoIcon name="leaf" size={17} /> Small actions. Fresh starts.</span><div className={styles.phone}><div className={styles.phoneNotch} /><div className={styles.phoneScreen}><span className={styles.phoneWordmark}>R3AI <b>Go</b></span><p className={styles.eyebrow}>RECOGNIZE. RECOVER. RESTORE.</p><h2>Good things start<br />on the ground.</h2><p>Find a little time. Make a little difference.</p><div className={styles.phonePark}><div className={styles.parkArt}><span className={styles.parkLake} /><span className={styles.parkPath} /><span className={styles.parkPin}><GoIcon name="pin" size={25} /></span></div><div><small>DEMO MISSION · 20–30 MIN</small><h3>A little care for Lake Eola</h3><p>A small walk. A fresh start.</p></div></div><div className={styles.phoneMiniCard}><GoIcon name="leaf" /><span><strong>Start on your own street</strong><small>10–15 minutes is a good start.</small></span></div><div className={styles.phoneNav}><GoIcon name="compass" /><GoIcon name="plus" /><GoIcon name="log" /></div></div></div><span className={styles.previewCaption}>A preview of the web app · demo missions</span></div>
    </div>
    <footer className={styles.downloadFooter}><span>Recognize. Recover. Restore.</span><span>Built for a little everyday good.</span></footer>
  </main>;
}
