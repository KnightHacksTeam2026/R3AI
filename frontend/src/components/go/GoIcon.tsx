type IconName = "leaf" | "compass" | "plus" | "log" | "arrow" | "download" | "check" | "close" | "pin";

const paths: Record<IconName, string> = {
  leaf: "M20 4c0 9-2 14-8 14a6 6 0 0 1-6-6C6 6 11 4 20 4ZM4 20l11-11",
  compass: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM16 8l-2 6-6 2 2-6 6-2Z",
  plus: "M12 5v14M5 12h14",
  log: "M8 4h12v17H4V4h4M8 2h8v4H8V2ZM8 11h8M8 16h6",
  arrow: "M5 12h14m-6-6 6 6-6 6",
  download: "M12 3v12m-5-5 5 5 5-5M5 16v5h14v-5",
  check: "m5 12 4 4L19 6",
  close: "m6 6 12 12M6 18 18 6",
  pin: "M12 22s8-8 8-13a8 8 0 0 0-16 0c0 5 8 13 8 13ZM12 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
};

export default function GoIcon({ name, size = 22 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}
