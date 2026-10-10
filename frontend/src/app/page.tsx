import Link from "next/link";

export default function HomePage() {
  return (
      <main className="flex min-h-[calc(100vh-65px)] flex-col items-center justify-center bg-[#101C19] px-6 text-center text-white">
        <p className="mb-5 text-sm font-medium uppercase tracking-[0.3em] text-[#C5F47B]">
          Recognize · Recover · Restore
        </p>

        <h1 className="max-w-4xl text-5xl font-semibold tracking-tight md:text-7xl">
          A cleaner planet
          <br />
          starts from above.
        </h1>

        <p className="mt-8 max-w-xl text-lg text-white/60">
          Turning environmental observations into
          coordinated cleanup action through AI,
          geospatial intelligence, and community.
        </p>

        <Link
            href="/command"
            className="mt-10 rounded-full bg-[#C5F47B] px-8 py-4 font-semibold text-[#101C19] transition hover:bg-white"
        >
          Explore R3AI Command →
        </Link>
      </main>
  );
}
