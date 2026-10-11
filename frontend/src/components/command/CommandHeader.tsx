import Navbar from "@/components/shared/Navbar";
import type { ReactNode } from "react";

export default function CommandHeader({ search }: { search: ReactNode }) {
  return <Navbar search={search} floating />;
}
