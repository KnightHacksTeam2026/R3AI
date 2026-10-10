import type { Theme } from "./types";

export default function ThemeToggle({ theme, onChange }: { theme: Theme; onChange: (theme: Theme) => void }) {
  const dark = theme === "dark";
  return <button type="button" onClick={() => onChange(dark ? "light" : "dark")} className="command-icon-button" aria-label={`Switch to ${dark ? "light" : "dark"} mode`} title={`Switch to ${dark ? "light" : "dark"} mode`}><span aria-hidden="true">{dark ? "☀" : "☾"}</span><span className="hidden sm:inline">{dark ? "Light" : "Dark"}</span></button>;
}
