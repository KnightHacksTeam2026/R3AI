"use client";

import useTheme from "./useTheme";
import styles from "./ThemeSwitch.module.css";

export default function ThemeSwitch() {
  const { theme, setTheme } = useTheme();
  return <button type="button" role="switch" aria-checked={theme === "dark"} aria-label="Dark mode" title="Dark mode" className={styles.switch} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
    <span className={styles.track} aria-hidden="true"><span className={styles.thumb}>{theme === "dark" ? "☾" : "☀"}</span></span>
  </button>;
}
