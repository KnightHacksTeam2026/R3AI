import Link from "next/link";
import GlassPanel from "./GlassPanel";
import ThemeToggle from "./ThemeToggle";
import type { Theme } from "./types";

type HeaderProps = { variant: "landing" } | { variant?: "command"; theme: Theme; onThemeChange: (theme: Theme) => void; area: string };

export default function CommandHeader(props: HeaderProps) {
  if (props.variant === "landing") return (
    <GlassPanel className="command-nav-surface flex items-center justify-between gap-3 px-3 py-2 sm:px-4">
      <Link href="/" aria-label="R3AI home" className="flex min-w-0 items-center gap-3">
        <span className="command-go-brand" aria-hidden="true">r3</span>
        <span className="command-nav-identity"><span className="block text-sm font-semibold">R3AI</span><span className="command-nav-subtitle mt-0.5 block text-[10px] text-[var(--cmd-muted)]">Recognize. Recover. Restore.</span></span>
      </Link>
      <nav aria-label="Main navigation" className="flex shrink-0 items-center gap-1 border-l border-[var(--cmd-border)] pl-2 text-xs sm:pl-3">
        <Link href="/" aria-current="page" className="flex min-h-11 items-center rounded-xl bg-[var(--cmd-soft)] px-3 font-semibold text-[var(--cmd-accent)]">Home</Link>
        <Link href="/command" className="flex min-h-11 items-center rounded-xl px-3 text-[var(--cmd-muted)] transition-colors hover:bg-[var(--cmd-hover)] hover:text-[var(--cmd-text)]">Command</Link>
        <Link href="/go" className="flex min-h-11 items-center rounded-xl px-3 text-[var(--cmd-muted)] transition-colors hover:bg-[var(--cmd-hover)] hover:text-[var(--cmd-text)]">Go</Link>
      </nav>
    </GlassPanel>
  );
  const { theme, onThemeChange, area } = props;
  return (
    <GlassPanel className="command-nav-surface flex items-center justify-between gap-3 px-3 py-2 sm:px-4">
      <div className="flex min-w-0 items-center gap-3">
        <Link href="/" aria-label="R3AI home" className="command-brand grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xs font-black">R3AI</Link>
        <div className="command-nav-identity"><h1 className="text-sm font-semibold">Command</h1><p className="command-nav-subtitle mt-0.5 text-[10px] text-[var(--cmd-muted)]">Simulation workspace</p></div>
      </div>
      <div className="command-nav-tools flex items-center gap-2">
        <span title={area} className="command-nav-context hidden max-w-32 truncate rounded-full border border-[var(--cmd-border)] bg-[var(--cmd-soft)] px-3 py-2 text-xs text-[var(--cmd-muted)] sm:inline">{area}</span>
        <ThemeToggle theme={theme} onChange={onThemeChange} />
        <Link href="/go" className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-[var(--cmd-border)] text-xs md:hidden" aria-label="R3AI Go">Go</Link>
      </div>
      <nav aria-label="Main navigation" className="hidden items-center gap-1 border-l border-[var(--cmd-border)] pl-3 text-xs md:flex">
        <Link href="/" className="rounded-lg px-3 py-2 text-[var(--cmd-muted)] transition-colors hover:bg-[var(--cmd-hover)] hover:text-[var(--cmd-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cmd-accent)]">Home</Link>
        <Link href="/command" aria-current="page" className="rounded-lg bg-[var(--cmd-soft)] px-3 py-2 font-semibold text-[var(--cmd-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cmd-accent)]">Command</Link>
        <Link href="/go" className="rounded-lg px-3 py-2 text-[var(--cmd-muted)] transition-colors hover:bg-[var(--cmd-hover)] hover:text-[var(--cmd-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cmd-accent)]">Go</Link>
      </nav>
    </GlassPanel>
  );
}
