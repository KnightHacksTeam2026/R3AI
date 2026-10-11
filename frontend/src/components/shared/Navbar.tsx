"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import styles from "./Navbar.module.css";
import ThemeSwitch from "./ThemeSwitch";

const links = [{ href: "/", label: "Home" }, { href: "/command", label: "Command" }, { href: "/go", label: "Go" }];

export default function Navbar({ actions, search }: { actions?: ReactNode; search?: ReactNode }) {
  const pathname = usePathname();
  return <div className={styles.surface}>
    <Link href="/" aria-label="R3AI home" className={styles.brand}><span className={styles.mark} aria-hidden="true">r3</span><span className={styles.identity}>R3AI<span className={styles.subtitle}>Recognize. Recover. Restore.</span></span></Link>
    {search && <div className={styles.search}>{search}</div>}
    <nav aria-label="Main navigation" className={styles.links}>
      {links.map(({ href, label }) => <Link key={href} href={href} aria-current={(pathname === href || (href !== "/" && pathname.startsWith(`${href}/`))) ? "page" : undefined}>{label}</Link>)}
    </nav>
    <div className={styles.actions}>{actions}<ThemeSwitch /></div>
  </div>;
}
