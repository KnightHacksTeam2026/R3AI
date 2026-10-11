import type { ReactNode } from "react";

export default function GlassPanel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`command-glass rounded-[22px] ${className}`}>
      {children}
    </section>
  );
}
