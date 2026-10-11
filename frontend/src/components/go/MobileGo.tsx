"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import styles from "@/app/go/go.module.css";
import GoIcon from "./GoIcon";
import { DEMO_MISSIONS, WASTE_CATEGORIES, type CleanupEntry, type GoSession, type DemoMission } from "./demoData";

type MobileGoProps = {
  session: GoSession;
  onSessionChange: (session: GoSession) => void;
  installed: boolean;
  installing: boolean;
  onInstall: () => void;
  notice: string;
};

export default function MobileGo({ session, onSessionChange, installed, installing, onInstall, notice }: MobileGoProps) {
  const [tab, setTab] = useState<"explore" | "report" | "activity">("explore");
  const [selectedMission, setSelectedMission] = useState<DemoMission | null>(null);
  const [dismissInstall, setDismissInstall] = useState(false);
  const [formMessage, setFormMessage] = useState("");
  const missionDialog = useRef<HTMLDialogElement>(null);
  const active = DEMO_MISSIONS.find((mission) => mission.id === session.activeMissionId);
  const itemCount = session.entries.reduce((sum, entry) => sum + entry.count, 0);

  useEffect(() => {
    if (selectedMission) missionDialog.current?.showModal();
    else missionDialog.current?.close();
  }, [selectedMission]);

  function joinMission(mission: DemoMission) {
    onSessionChange({ ...session, activeMissionId: mission.id });
    setSelectedMission(null);
    setFormMessage("");
  }

  function saveEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const category = data.get("category");
    const count = Number(data.get("count"));
    if (!WASTE_CATEGORIES.includes(category as CleanupEntry["category"]) || !Number.isInteger(count) || count < 1 || count > 999) {
      setFormMessage("Choose a category and enter 1–999 items.");
      return;
    }
    const entry: CleanupEntry = {
      id: crypto.randomUUID(),
      missionId: session.activeMissionId,
      category: category as CleanupEntry["category"],
      count,
      note: String(data.get("note") || "").trim().slice(0, 240),
      createdAt: new Date().toISOString(),
    };
    onSessionChange({ ...session, entries: [entry, ...session.entries] });
    form.reset();
    setFormMessage("Saved to your personal log on this device.");
  }

  function finishMission() {
    if (!active) return;
    onSessionChange({ ...session, activeMissionId: null, completedMissionIds: [...new Set([...session.completedMissionIds, active.id])] });
    setTab("activity");
  }

  return <div className={styles.mobileShell}>
    <header className={styles.mobileHeader}>
      <Link href="/" className={styles.brand} aria-label="R3AI home"><span className={styles.brandMark}>R3</span><span>R3AI <span className={styles.brandGo}>Go</span></span></Link>
      <span className={styles.prototype}>EARLY ACCESS</span>
    </header>

    <div className={styles.mobileContent}>
      {!installed && !dismissInstall && <section className={styles.installCard} aria-label="Install R3AI Go">
        <button className={styles.dismiss} aria-label="Dismiss installation reminder" onClick={() => setDismissInstall(true)}><GoIcon name="close" size={16} /></button>
        <div className={styles.installIcon}><GoIcon name="download" /></div>
        <div><strong>A little closer to a cleaner planet.</strong><p>Add Go to your home screen for easy access.</p><button className={styles.textButton} onClick={onInstall} disabled={installing}>{installing ? "Opening installer…" : "Add to home screen"} <GoIcon name="arrow" size={16} /></button></div>
      </section>}

      {notice && <p className={styles.notice} role="status">{notice}</p>}

      {tab === "explore" && <>
        <div className={styles.pageIntro}><p className={styles.eyebrow}>RECOGNIZE. RECOVER. RESTORE.</p><h1>Good things start<br />on the ground.</h1><p>Find a little time. Make a little difference.</p></div>
        {active && <section className={styles.activeMission}><span className={styles.eyebrow}>YOUR ACTIVE DEMO MISSION</span><h2>{active.name}</h2><p>{active.area}</p><div className={styles.buttonRow}><button className={styles.limeButton} onClick={() => setTab("report")}>Log collected items <GoIcon name="plus" size={18} /></button><button className={styles.lightTextButton} onClick={finishMission}>Finish</button></div></section>}

        <div className={styles.sectionHeading}><h2>Pick a place to begin</h2><span>Demo missions</span></div>
        <button className={styles.featuredMission} onClick={() => setSelectedMission(DEMO_MISSIONS[0])}>
          <div className={styles.parkArt} aria-hidden="true"><span className={styles.parkLake} /><span className={styles.parkPath} /><span className={styles.parkPin}><GoIcon name="pin" size={25} /></span><span className={styles.artTag}>LAKE EOLA</span></div>
          <div className={styles.featuredBody}><span className={styles.eyebrow}>PARK PATHS · 20–30 MIN</span><h3>{DEMO_MISSIONS[0].name}</h3><p>A small walk. A fresh start.</p><span className={styles.cardArrow}><GoIcon name="arrow" /></span></div>
        </button>
        <div className={styles.missionList}>{DEMO_MISSIONS.slice(1).map((mission) => <button key={mission.id} className={styles.missionRow} onClick={() => setSelectedMission(mission)}><span className={styles.missionSymbol}><GoIcon name={mission.id === "local" ? "pin" : "leaf"} /></span><span><strong>{mission.name}</strong><small>{mission.category} · {mission.duration}</small></span><GoIcon name="arrow" size={18} /></button>)}</div>
        <p className={styles.disclaimer}>Demo suggestions, not live waste reports. Check public access and conditions before you go.</p>
      </>}

      {tab === "report" && <>
        <div className={styles.pageIntro}><p className={styles.eyebrow}>YOUR PERSONAL CLEANUP LOG</p><h1>Every small<br />action counts.</h1><p>Record what you collected. Keep it simple.</p></div>
        <form className={styles.reportForm} onSubmit={saveEntry}>
          <p className={styles.formMission}><GoIcon name="pin" size={18} />{active ? active.name : "Independent cleanup"}</p>
          <label>What did you collect?<select name="category" required defaultValue="Plastic">{WASTE_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
          <label>How many items?<input name="count" type="number" inputMode="numeric" min="1" max="999" step="1" required placeholder="e.g. 3" /></label>
          <label>A note <span className={styles.optional}>(optional)</span><textarea name="note" maxLength={240} rows={3} placeholder="A few details about your cleanup…" /></label>
          <button type="submit" className={styles.primaryButton}>Save to my log <GoIcon name="check" size={19} /></button>
          {formMessage && <p className={styles.success} role="status">{formMessage}</p>}
        </form>
        <p className={styles.disclaimer}>Entries are self-reported and saved on this device. No AI analysis or upload is performed.</p>
        <div className={styles.safetyNote}><GoIcon name="leaf" size={19} /><p>Take care of yourself, too. Use gloves and leave sharp, medical, or hazardous waste for trained crews.</p></div>
      </>}

      {tab === "activity" && <>
        <div className={styles.pageIntro}><p className={styles.eyebrow}>SMALL STEPS, SAVED HERE</p><h1>Your little<br />collection of good.</h1><p>Your cleanup activity, all in one place.</p></div>
        <section className={styles.activitySummary}><div><strong>{itemCount}</strong><span>items you logged</span></div><div><strong>{session.completedMissionIds.length}</strong><span>demo missions finished</span></div></section>
        <div className={styles.sectionHeading}><h2>Your log</h2><span>{session.entries.length} entries</span></div>
        {!session.entries.length ? <div className={styles.emptyState}><GoIcon name="leaf" size={38} /><h3>A fresh start.</h3><p>Your first cleanup entry will appear here.</p><button className={styles.textButton} onClick={() => setTab("report")}>Log your first items <GoIcon name="arrow" size={16} /></button></div> : <div className={styles.entryList}>{session.entries.map((entry) => <article key={entry.id} className={styles.entry}><span className={styles.missionSymbol}><GoIcon name="check" /></span><div><strong>{entry.count} {entry.category.toLowerCase()} {entry.count === 1 ? "item" : "items"}</strong><small>{DEMO_MISSIONS.find((mission) => mission.id === entry.missionId)?.area || "Independent cleanup"} · {new Date(entry.createdAt).toLocaleDateString()}</small>{entry.note && <p>{entry.note}</p>}</div></article>)}</div>}
        <p className={styles.disclaimer}>Personal records, not verified environmental impact. This log is not shared with Command or a backend.</p>
      </>}
    </div>

    <nav className={styles.bottomNav} aria-label="Go navigation">{([
      { id: "explore", icon: "compass", label: "Explore" },
      { id: "report", icon: "plus", label: "Log cleanup" },
      { id: "activity", icon: "log", label: "Activity" },
    ] as const).map((item) => <button key={item.id} onClick={() => { setTab(item.id); setFormMessage(""); }} aria-current={tab === item.id ? "page" : undefined} className={tab === item.id ? styles.tabActive : ""}><GoIcon name={item.icon} /><span>{item.label}</span></button>)}</nav>

    <dialog ref={missionDialog} className={styles.missionSheet} aria-labelledby="mission-title" onClose={() => setSelectedMission(null)} onClick={(event) => { if (event.target === event.currentTarget) setSelectedMission(null); }}>{selectedMission && <><button className={styles.sheetClose} aria-label="Close mission details" onClick={() => setSelectedMission(null)} autoFocus><GoIcon name="close" /></button><p className={styles.eyebrow}>DEMO MISSION · {selectedMission.duration}</p><h2 id="mission-title">{selectedMission.name}</h2><p className={styles.formMission}><GoIcon name="pin" size={18} />{selectedMission.area}</p><p>{selectedMission.description}</p>{active && active.id !== selectedMission.id ? <p className={styles.notice}>Finish your active demo mission before starting another.</p> : <button className={styles.primaryButton} onClick={() => joinMission(selectedMission)}>{active ? "Continue this mission" : "Start demo mission"}<GoIcon name="arrow" size={18} /></button>}<p className={styles.disclaimer}>A personal checklist. No crew or robot is dispatched.</p></>}</dialog>
  </div>;
}
