"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import styles from "./Navbar.module.css";
import ThemeSwitch from "./ThemeSwitch";

const links = [{ href: "/", label: "Home" }, { href: "/command", label: "Command" }, { href: "/go", label: "Go" }];

function NavIcon({ href }: { href: string }) {
  if (href === "/") return <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.filledIcon}><path d="M3.4 10.8 12 3.4l8.6 7.4a1.2 1.2 0 0 1-1.6 1.8l-.8-.7v7.7a1 1 0 0 1-1 1h-3.5v-5.8h-3.4v5.8H6.8a1 1 0 0 1-1-1v-7.7l-.8.7a1.2 1.2 0 1 1-1.6-1.8Z" /></svg>;
  if (href === "/command") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5V6" /><circle cx="12" cy="2.5" r="1" /><rect x="4.8" y="6" width="14.4" height="11.5" rx="4" /><path d="M4.8 9H3.4v5.3h1.4M19.2 9h1.4v5.3h-1.4M9.3 20h5.4M12 17.5V20" /><circle className={styles.robotEye} cx="9.2" cy="11.5" r="1.15" /><circle className={styles.robotEye} cx="14.8" cy="11.5" r="1.15" /><path d="M9.4 14.7h5.2" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 9.8c0 5.7-8 12-8 12s-8-6.3-8-12a8 8 0 1 1 16 0Z" /><circle cx="12" cy="9.7" r="4.8" /><path d="M7.2 9.7h9.6M12 4.9c1.4 1.3 2.1 2.9 2.1 4.8s-.7 3.5-2.1 4.8c-1.4-1.3-2.1-2.9-2.1-4.8S10.6 6.2 12 4.9Z" /></svg>;
}

export default function Navbar({ actions, search, floating = false }: { actions?: ReactNode; search?: ReactNode; floating?: boolean }) {
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
  return <div className={`${styles.surface} ${floating ? styles.floating : ""}`}>
    <Link href="/" aria-label="R3AI home" className={styles.brand}>
      <Image priority src="/r3ai-recycle-logo.png" width={52} height={52} alt="" aria-hidden="true" className={styles.logo} />
    </Link>
    {search && <div className={styles.search}>{search}</div>}
    <div className={styles.rightGroup}>
      <div className={styles.navigation} ref={navigationRef} onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setMenuOpen(false);
      }}>
        <button ref={toggleRef} type="button" className={styles.menuToggle} aria-label="Main navigation" aria-expanded={menuOpen} aria-controls={navigationId} onClick={() => setMenuOpen(!menuOpen)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d={menuOpen ? "M6 6l12 12M6 18L18 6" : "M4 7h16M4 12h16M4 17h16"} />
          </svg>
        </button>
        <nav id={navigationId} aria-label="Main navigation" className={styles.links} data-open={menuOpen}>
          {links.map(({ href, label }) => <Link key={href} href={href} onClick={() => setMenuOpen(false)} aria-label={label} title={label} className={styles.iconLink} aria-current={(pathname === href || (href !== "/" && pathname.startsWith(`${href}/`))) ? "page" : undefined}><NavIcon href={href} /></Link>)}
        </nav>
      </div>
      <div className={styles.actions}>{actions}<ThemeSwitch /></div>
    </div>
  </div>;
}
