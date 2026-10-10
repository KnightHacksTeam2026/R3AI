import Image from "next/image";
import type { RobotState } from "./types";

export const BOT_ICONS: Record<RobotState["type"], string> = {
  ground: "/command/r3-ground-bot.svg",
};

export default function BotIcon({ type }: { type: RobotState["type"] }) {
  return <Image src={BOT_ICONS[type]} width={38} height={38} alt="" aria-hidden="true" unoptimized draggable={false} />;
}
