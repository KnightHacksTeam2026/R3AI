
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
    const pathname = usePathname();

    // Command and Go provide navigation within their own app shells.
    if (pathname === "/command" || pathname.startsWith("/command/") || pathname === "/go" || pathname.startsWith("/go/")) {
        return null;
    }

    return (
        <nav aria-label="Main navigation" className="flex items-center justify-between border-b border-white/10 bg-[#101C19] px-6 py-4 text-white">
            <Link href="/" className="text-xl font-bold tracking-tight">
                R3<span className="text-[#C5F47B]">AI</span>
            </Link>

            <div className="flex items-center gap-5 text-sm">
                <Link href="/" className="hover:text-[#C5F47B]">
                    Home
                </Link>
                <Link href="/command" className="hover:text-[#C5F47B]">
                    Command
                </Link>
                <Link href="/go" className="hover:text-[#C5F47B]">
                    Go
                </Link>
            </div>
        </nav>
    );
}
