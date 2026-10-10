"use client";

import { useEffect, useRef, useState } from "react";
import GoDownloadPage from "@/components/go/GoDownloadPage";
import MobileGo from "@/components/go/MobileGo";
import GoIcon from "@/components/go/GoIcon";
import useGoPlatform from "@/components/go/useGoPlatform";
import { EMPTY_SESSION, readSession, type GoSession } from "@/components/go/demoData";
import styles from "./go.module.css";

const STORAGE_KEY = "r3ai-go-session-v1";

export default function GoPage() {
  const platform = useGoPlatform();
  const [preview, setPreview] = useState(false);
  const [session, setSession] = useState<GoSession>({ ...EMPTY_SESSION });
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  const installDialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setSession(readSession(window.localStorage.getItem(STORAGE_KEY)));
      } catch {
        setNotice("Your saved log could not be loaded. New entries can still be kept for this session.");
      }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function saveSession(next: GoSession) {
    setSession(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setNotice("");
    } catch {
      setNotice("Device storage is unavailable. Your changes will last only until you close or reload this page.");
    }
  }

  async function addToHomeScreen() {
    if (!(await platform.install())) installDialog.current?.showModal();
  }

  if (platform.platform === "loading" || !ready) return <main className={styles.loading} aria-busy="true"><span className={styles.brandMark}>R3</span><p>Opening R3AI Go…</p></main>;

  return <>
    {platform.platform === "desktop" && !preview ? <GoDownloadPage onPreview={() => setPreview(true)} /> : <main className={styles.appPage}>
      {preview && <div className={styles.previewBar}><span>Mobile web app preview</span><button onClick={() => setPreview(false)}>Back to download page <GoIcon name="close" size={16} /></button></div>}
      <MobileGo session={session} onSessionChange={saveSession} installed={platform.installed} installing={platform.installing} onInstall={addToHomeScreen} notice={notice || platform.installError} />
    </main>}

    <dialog ref={installDialog} className={styles.installDialog} onClick={(event) => { if (event.target === event.currentTarget) installDialog.current?.close(); }} aria-labelledby="install-title">
      <div className={styles.installDialogBody}><button className={styles.sheetClose} onClick={() => installDialog.current?.close()} aria-label="Close installation instructions" autoFocus><GoIcon name="close" /></button><div className={styles.installIcon}><GoIcon name="download" size={26} /></div><p className={styles.eyebrow}>TAKE GO WITH YOU</p><h2 id="install-title">A home on your<br />home screen.</h2><section><h3>iPhone & iPad</h3><p>Open this page in Safari. Tap <strong>Share</strong>, then <strong>Add to Home Screen</strong> (or More → Add to Home Screen), and confirm <strong>Add</strong>.</p></section><section><h3>Android</h3><p>Open the browser menu <strong>⋮</strong> and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>. If your browser offers an installer, the Go button will open it.</p></section><p className={styles.disclaimer}>Installation requires HTTPS, or localhost for development. You can keep using Go in your browser.</p><button className={styles.primaryButton} onClick={() => installDialog.current?.close()}>Got it <GoIcon name="check" size={18} /></button></div>
    </dialog>
  </>;
}
