"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import styles from "./Navbar.module.css";
import ThemeSwitch from "./ThemeSwitch";

const links = [{ href: "/", label: "Home" }, { href: "/command", label: "Command" }, { href: "/go", label: "Go" }];

export default function Navbar({ actions, search }: { actions?: ReactNode; search?: ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigationId = useId();
  const navigationRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const dismiss = (event: PointerEvent) => {
      if (!navigationRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        toggleRef.current?.focus();
      }
    };
    const desktop = window.matchMedia("(min-width: 640px)");
    const resize = () => { if (desktop.matches) setMenuOpen(false); };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    desktop.addEventListener("change", resize);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
      desktop.removeEventListener("change", resize);
    };
  }, [menuOpen]);
  return <div className={styles.surface}>
    <Link href="/" aria-label="R3AI home" className={styles.brand}>
      <span className={styles.mark} aria-hidden="true">R3<span className={styles.ai}>AI</span></span>
    </Link>
    {search && <div className={styles.search}>{search}</div>}
    <div className={styles.navigation} ref={navigationRef} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setMenuOpen(false);
    }}>
      <button ref={toggleRef} type="button" className={styles.menuToggle} aria-label="Main navigation" aria-expanded={menuOpen} aria-controls={navigationId} onClick={() => setMenuOpen(!menuOpen)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <path d={menuOpen ? "M6 6l12 12M6 18L18 6" : "M4 7h16M4 12h16M4 17h16"} />
        </svg>
      </button>
      <nav id={navigationId} aria-label="Main navigation" className={styles.links} data-open={menuOpen}>
        {links.map(({ href, label }) => <Link key={href} href={href} onClick={() => setMenuOpen(false)} aria-current={(pathname === href || (href !== "/" && pathname.startsWith(`${href}/`))) ? "page" : undefined}>{label}</Link>)}
      </nav>
    </div>
    <div className={styles.actions}>{actions}<ThemeSwitch /></div>
  </div>;
}
