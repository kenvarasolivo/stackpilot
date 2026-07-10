import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/ConfigPanel";

export const metadata: Metadata = {
  title: "Impressum — StackPilot",
  description: "Legal notice (Impressum) according to § 5 TMG / § 18 MStV.",
};

export default function Impressum() {
  return (
    <div className="flex min-h-screen flex-col bg-black text-ink">
      {/* ---------- Nav ---------- */}
      <header className="border-b border-edge/70">
        <nav className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-6 lg:px-10">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="drop-shadow-[0_0_12px_rgba(124,58,237,0.55)]">
              <BrandMark size={26} />
            </span>
            <span className="font-display text-[17px] font-bold tracking-[-0.03em]">StackPilot</span>
          </Link>
          <Link
            href="/"
            className="rounded-full border border-edge px-5 py-2 text-[13px] font-medium text-muted transition-colors hover:border-accent/50 hover:text-ink"
          >
            ← Back to home
          </Link>
        </nav>
      </header>

      {/* ---------- Content ---------- */}
      <main className="mx-auto w-full max-w-[760px] flex-1 px-6 py-20">
        <p className="flex items-center gap-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.3em] text-accent-bright/90">
          <span className="h-1.5 w-1.5 rounded-[2px] bg-[#FACC15] shadow-[0_0_10px_rgba(250,204,21,0.7)]" />
          Legal notice
        </p>
        <h1 className="mt-5 font-display text-4xl font-bold tracking-[-0.03em] sm:text-5xl">Impressum</h1>

        <div className="mt-12 space-y-10">
          <section>
            <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-accent/80">
              Information according to § 5 TMG / § 18 MStV
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-ink/90">
              Kenvara Solivo Lwie
              <br />
              52064 Aachen, Germany
            </p>
          </section>

          <section>
            <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-accent/80">Contact</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-ink/90">
              Email:{" "}
              <a
                href="mailto:kenvara.solivo@gmail.com"
                className="text-accent-bright underline decoration-accent/40 underline-offset-4 transition-colors hover:text-ink"
              >
                kenvara.solivo@gmail.com
              </a>
            </p>
          </section>

          <section className="rounded-2xl border border-edge bg-card p-6">
            <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-accent/80">Note</h2>
            <p className="mt-4 text-[14px] leading-relaxed text-muted">
              This website is a private, non-commercial portfolio whose sole purpose is to present my projects to
              potential employers and recruiters.
            </p>
          </section>
        </div>
      </main>

      {/* ---------- Footer ---------- */}
      <footer className="border-t border-edge/70 bg-[#050507]">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-4 px-6 py-8 sm:flex-row sm:items-center sm:justify-between lg:px-10">
          <div className="flex items-center gap-2.5">
            <BrandMark size={20} />
            <span className="font-display text-[15px] font-bold tracking-[-0.02em]">StackPilot</span>
            <span className="ml-2 font-mono text-[11px] text-muted">© 2026</span>
          </div>
          <Link
            href="/"
            className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted transition-colors hover:text-ink"
          >
            Home
          </Link>
        </div>
      </footer>
    </div>
  );
}
