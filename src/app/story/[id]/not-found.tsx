import Link from "next/link";

/**
 * Deliberate public 404: never reveal unverified, withheld, removed, or
 * unavailable editorial material merely because its story ID was requested.
 */
export default function StoryUnavailable() {
  return (
    <main className="mx-auto max-w-[900px] px-5 py-20 text-[#17202a]">
      <p className="text-xs font-black uppercase tracking-[.18em] text-[#0b6b63]">
        BUILDPULSE · EDITORIAL AVAILABILITY
      </p>
      <h1 className="mt-5 text-4xl font-black tracking-[-.04em] md:text-6xl">
        This story is not available.
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-[#53606b]">
        The report may have been withdrawn, may not have completed verification,
        or may no longer be available. BuildPulse does not publish unverified
        material or replace missing reporting with invented content.
      </p>
      <nav aria-label="Continue browsing BuildPulse" className="mt-9 flex flex-wrap gap-3">
        <Link href="/archive" className="rounded-xl bg-[#0b6b63] px-6 py-3 font-bold text-white focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#0b6b63]">
          Browse verified editions
        </Link>
        <Link href="/" className="rounded-xl border border-[#17202a]/25 bg-white px-6 py-3 font-bold text-[#17202a] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#0b6b63]">
          Latest reporting
        </Link>
      </nav>
    </main>
  );
}
