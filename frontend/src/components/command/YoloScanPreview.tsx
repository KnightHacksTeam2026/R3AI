"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { RobotState } from "./types";

type ScanFrame = NonNullable<NonNullable<RobotState["collection"]>["scanFrames"]>[number];
type Filter = "all" | "detected" | "clear";

function imageUrl(name: string) {
  return `/api/command/scan/image?name=${encodeURIComponent(name)}`;
}

function statusText(frame: ScanFrame) {
  return frame.trashDetected ? "Trash detected" : "No detection";
}

export default function YoloScanPreview({ frames, phase, traveledDistanceM, compact = false }: {
  frames: ScanFrame[];
  phase: "scanning" | "collecting";
  traveledDistanceM: number;
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const completedFrames = phase === "collecting"
    ? frames
    : frames.filter(frame => frame.scanDistanceM <= traveledDistanceM);
  const completedCount = completedFrames.length;
  const filteredFrames = useMemo(() => completedFrames.filter(frame =>
    filter === "all" || (filter === "detected" ? frame.trashDetected : !frame.trashDetected)), [completedFrames, filter]);
  const compactFrames = completedFrames.slice(-3);

  useEffect(() => {
    if (!expanded) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setExpanded(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [expanded]);

  const close = () => {
    setExpanded(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const modal = expanded ? <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#020908]/80 p-3 backdrop-blur-md sm:p-6" onMouseDown={event => {
    if (event.currentTarget === event.target) close();
  }}>
    <section role="dialog" aria-modal="true" aria-labelledby="yolo-review-title" className="command-glass flex max-h-[90dvh] w-full max-w-5xl flex-col overflow-hidden rounded-[24px]">
      <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--cmd-border)] p-4 sm:p-5">
        <div><p className="command-kicker">R3-YOLO vision log</p><h2 id="yolo-review-title" className="mt-1 text-lg font-semibold">Scanned image review</h2><p className="mt-1 text-xs text-[var(--cmd-muted)]">{completedCount} of {frames.length} frames processed along the current route.</p></div>
        <button autoFocus type="button" onClick={close} aria-label="Close image review" className="command-map-button shrink-0 rounded-xl">×</button>
      </header>
      <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-[var(--cmd-border)] p-3 sm:px-5" role="group" aria-label="Filter scan images">
        {(["all", "detected", "clear"] as const).map(option => <button key={option} type="button" aria-pressed={filter === option} onClick={() => setFilter(option)} className={`min-h-10 rounded-full border px-4 text-xs font-semibold capitalize ${filter === option ? "border-[var(--cmd-accent)] bg-[var(--cmd-accent)] text-[var(--cmd-accent-text)]" : "border-[var(--cmd-border)] bg-[var(--cmd-soft)]"}`}>{option === "clear" ? "No detection" : option}</button>)}
      </div>
      <div className="command-panel-scroll min-h-0 overflow-y-auto p-3 sm:p-5">
        {filteredFrames.length ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredFrames.map(frame => <article key={frame.candidateIndex} className="overflow-hidden rounded-2xl border border-[var(--cmd-border)] bg-[var(--cmd-soft)]">
            <div className="relative aspect-[4/3] bg-black/20">
              <Image unoptimized fill sizes="(max-width: 640px) 100vw, 33vw" src={imageUrl(frame.image)} alt={`YOLO sample ${frame.image}: ${statusText(frame)}`} className="object-cover" />
              <span className={`absolute left-2 top-2 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide backdrop-blur-md ${frame.trashDetected ? "border-emerald-200/60 bg-emerald-950/80 text-emerald-100" : "border-amber-200/60 bg-amber-950/80 text-amber-100"}`}>{statusText(frame)}</span>
              <span className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-[10px] text-white">#{frame.candidateIndex}</span>
            </div>
            <div className="p-3"><div className="flex items-center justify-between gap-3 text-xs"><strong className="truncate">{frame.image}</strong><span className="shrink-0 text-[var(--cmd-muted)]">{frame.confidence === null ? "—" : `${Math.round(frame.confidence * 100)}%`}</span></div><p className="mt-1 text-[10px] text-[var(--cmd-muted)]">{frame.trashDetected ? `${frame.detectedCount} ${frame.labels.join(" / ") || "object"}${frame.detectedCount === 1 ? "" : "s"}` : "Excluded from the pickup route"}</p><p className="mt-1 text-[10px] text-[var(--cmd-muted)]">Developer-known: {frame.knownTrash === null ? "Unlabeled" : frame.knownTrash ? "Trash present" : "No trash"}</p></div>
          </article>)}
        </div> : <div className="grid min-h-48 place-items-center rounded-2xl border border-dashed border-[var(--cmd-border)] text-center text-sm text-[var(--cmd-muted)]">No processed frames match this filter yet.</div>}
      </div>
    </section>
  </div> : null;

  return <>
    <button ref={triggerRef} type="button" onClick={() => setExpanded(true)} className={`${compact ? "relative min-h-[136px] flex-col items-stretch p-3" : "mb-3 items-center gap-3 p-2.5"} flex w-full rounded-2xl border border-[var(--cmd-border)] bg-[var(--cmd-soft)] text-left transition hover:bg-[var(--cmd-hover)]`} aria-haspopup="dialog">
      <span className={`${compact ? "flex-col items-start" : "items-center"} flex min-w-0 flex-1`}>
        <span className="flex items-center">
          {compactFrames.length ? compactFrames.map((frame, index) => <span key={frame.candidateIndex} className={`relative block ${compact ? "h-10 w-10" : "h-12 w-12"} shrink-0 overflow-hidden rounded-xl border-2 border-[var(--cmd-panel-solid)] bg-black/20 ${index ? "-ml-3" : ""}`}>
            <Image unoptimized fill sizes={compact ? "40px" : "48px"} src={imageUrl(frame.image)} alt="" className="object-cover" />
            <i className={`absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full border border-white/80 ${frame.trashDetected ? "bg-emerald-400" : "bg-amber-400"}`} />
          </span>) : <span className={`${compact ? "h-10 w-10" : "h-12 w-12"} grid place-items-center rounded-xl border border-dashed border-[var(--cmd-border)] text-lg text-[var(--cmd-muted)]`}>⌁</span>}
        </span>
        <span className={`${compact ? "mt-2" : "ml-3"} min-w-0`}><strong className="block text-xs">YOLO scan feed</strong><span className="mt-1 block truncate text-[10px] text-[var(--cmd-muted)]">{completedCount ? `${completedCount} / ${frames.length} processed` : "Frames appear on entry"}</span></span>
      </span>
      <span className={`${compact ? "absolute right-3 top-3" : "shrink-0"} text-lg text-[var(--cmd-muted)]`} aria-hidden="true">↗</span>
    </button>
    {typeof document !== "undefined" ? createPortal(modal, document.querySelector("main.command") ?? document.body) : null}
  </>;
}
