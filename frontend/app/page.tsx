"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { BrandMark, ModeIcon } from "@/components/ConfigPanel";

/* =========================================================
   Skyline data — seeded PRNG so server & client render the
   exact same "city" (no hydration mismatch, no layout shift)
   ========================================================= */

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PURPLE = "#A78BFA";
const BLUE = "#7DA9FF";
const YELLOW = "#FDE68A";

interface Bar {
  left: number;
  w: number;
  h: number;
  c: string;
  seg: number;
  oMax: number;
  oMin: number;
  dur: number;
  delay: number;
}

function makeBars(seed: number, count: number, hMin: number, hMax: number): Bar[] {
  const rnd = mulberry32(seed);
  const slot = 100 / count;
  return Array.from({ length: count }, (_, i) => {
    const roll = rnd();
    const c = roll < 0.52 ? PURPLE : roll < 0.88 ? BLUE : YELLOW;
    return {
      left: i * slot + rnd() * slot * 0.7,
      w: 0.45 + rnd() * 1.05,
      h: hMin + rnd() * (hMax - hMin),
      c,
      seg: 3 + Math.floor(rnd() * 3),
      oMax: 0.72 + rnd() * 0.28,
      oMin: 0.3 + rnd() * 0.24,
      dur: 2.4 + rnd() * 4.5,
      delay: -rnd() * 12,
    };
  });
}

const LAYER_BACK = makeBars(7, 42, 28, 74);
const LAYER_MID = makeBars(23, 32, 34, 86);
const LAYER_FRONT = makeBars(51, 20, 18, 58);

function SkylineLayer({
  bars,
  blur,
  opacity,
  drift,
}: {
  bars: Bar[];
  blur: number;
  opacity: number;
  drift: number;
}) {
  return (
    <div
      className="lp-layer"
      style={{ filter: `blur(${blur}px)`, opacity, "--drift": `${drift}s` } as CSSProperties}
      aria-hidden="true"
    >
      {bars.map((b, i) => (
        <span
          key={i}
          className="lp-bar"
          style={
            {
              left: `${b.left}%`,
              width: `${b.w}%`,
              height: `${b.h}%`,
              backgroundImage: `repeating-linear-gradient(to top, ${b.c} 0px, ${b.c} ${b.seg}px, transparent ${b.seg}px, transparent ${b.seg * 2.4}px)`,
              animationDuration: `${b.dur}s, 12s`,
              animationDelay: `${b.delay}s, ${b.delay}s`,
              "--o-max": b.oMax,
              "--o-min": b.oMin,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

/** Full animated cityscape: three parallax layers + beams + horizon glow. */
function Skyline({ dim = false }: { dim?: boolean }) {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${dim ? "opacity-40" : ""}`} aria-hidden="true">
      {/* searchlights */}
      <div
        className="lp-beam left-[18%]"
        style={{ background: `linear-gradient(to top, rgba(96,165,250,0.18), transparent 72%)`, "--sway": "16s" } as CSSProperties}
      />
      <div
        className="lp-beam left-[63%]"
        style={{ background: `linear-gradient(to top, rgba(139,92,246,0.28), transparent 72%)`, "--sway": "12s" } as CSSProperties}
      />
      {/* city */}
      <SkylineLayer bars={LAYER_BACK} blur={14} opacity={0.65} drift={40} />
      <SkylineLayer bars={LAYER_MID} blur={6} opacity={0.92} drift={28} />
      <SkylineLayer bars={LAYER_FRONT} blur={1.6} opacity={1} drift={20} />
      {/* horizon glow */}
      <div className="absolute inset-x-0 bottom-0 h-[38%] bg-[radial-gradient(60%_100%_at_50%_100%,rgba(139,92,246,0.95),rgba(109,40,217,0.5)_40%,transparent_72%)]" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />
      {/* readability vignettes */}
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/45 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black to-transparent" />
    </div>
  );
}

/* =========================================================
   Content data
   ========================================================= */

const STRIP = [
  { lead: "Agentic pipeline.", body: "Five self-correcting stages: plan, retrieve, grade, write, verify." },
  { lead: "Live streaming.", body: "Stage progress, graded sources, and prose stream in over NDJSON." },
  { lead: "Verified citations.", body: "Every claim is audited against its source and gets a verdict badge." },
  { lead: "Three modes.", body: "Deep-dive for concepts, code-first for working examples, comparison for stack trade-offs." },
  { lead: "Never fails silently.", body: "Model overloaded? It degrades to naive RAG — and tells you why." },
];

const STAGES = [
  {
    n: "01",
    title: "Plan",
    chip: "flash-lite",
    chipColor: "blue",
    desc: "Decomposes your learning goal into up to three targeted documentation search queries.",
  },
  {
    n: "02",
    title: "Retrieve",
    chip: "pgvector · neon",
    chipColor: "blue",
    desc: "Embeds each query and runs cosine search over Neon Postgres with an HNSW index.",
  },
  {
    n: "03",
    title: "Grade",
    chip: "flash-lite",
    chipColor: "yellow",
    desc: "Scores every chunk, drops the junk, and re-retrieves with a refined query when it detects a coverage gap.",
    loop: true,
  },
  {
    n: "04",
    title: "Write",
    chip: "gemini-2.5-flash",
    chipColor: "purple",
    desc: "Streams the tutorial as markdown from graded context only, with inline [n] citations.",
  },
  {
    n: "05",
    title: "Verify",
    chip: "flash-lite",
    chipColor: "purple",
    desc: "Audits each citation against its source chunk and issues a per-source verdict.",
  },
];

const CHIP_STYLES: Record<string, string> = {
  blue: "text-[#7DA9FF] border-[#3B82F6]/40 bg-[#3B82F6]/10",
  purple: "text-accent-bright border-accent/40 bg-accent/10",
  yellow: "text-[#FDE68A] border-[#FACC15]/35 bg-[#FACC15]/[0.07]",
};

const SPECS = [
  { label: "Frontend", value: "Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS" },
  { label: "Intelligence", value: "Gemini 2.5 Flash (writer) · Flash-Lite (planner / grader / verifier) · 768-dim embeddings" },
  { label: "Database", value: "Neon Serverless Postgres · pgvector · HNSW cosine index" },
  { label: "Backend", value: "FastAPI · psycopg · NDJSON streaming" },
  { label: "Deploy", value: "Vercel (frontend) · Render (backend)" },
];

/* =========================================================
   Small building blocks
   ========================================================= */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.3em] text-accent-bright/90">
      <span className="h-1.5 w-1.5 rounded-[2px] bg-[#FACC15] shadow-[0_0_10px_rgba(250,204,21,0.7)]" />
      {children}
    </p>
  );
}

function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <div className={`lp-reveal ${className}`} style={{ "--rd": `${delay}ms` } as CSSProperties}>
      {children}
    </div>
  );
}

function Verdict({ kind }: { kind: "supported" | "partial" | "unsupported" }) {
  const map = {
    supported: "text-[#7DA9FF] border-[#3B82F6]/45 bg-[#3B82F6]/10",
    partial: "text-[#FDE68A] border-[#FACC15]/40 bg-[#FACC15]/[0.08]",
    unsupported: "text-[#FB8BA5] border-[#FB7185]/35 bg-[#FB7185]/[0.07]",
  } as const;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] ${map[kind]}`}>
      <span className="h-1 w-1 rounded-full bg-current" />
      {kind}
    </span>
  );
}

/* =========================================================
   Page
   ========================================================= */

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".lp-reveal"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -48px 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="bg-black text-ink">
      {/* ---------- Nav ---------- */}
      <header
        className={`sticky top-0 z-50 transition-colors duration-300 ${
          scrolled ? "border-b border-edge/70 bg-black/75 backdrop-blur-xl" : "border-b border-transparent bg-transparent"
        }`}
      >
        <nav className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-6 lg:px-10">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="drop-shadow-[0_0_12px_rgba(139,92,246,0.7)]">
              <BrandMark size={26} />
            </span>
            <span className="font-display text-[17px] font-bold tracking-[-0.03em]">StackPilot</span>
          </Link>

          <div className="hidden items-center gap-8 font-mono text-[12px] uppercase tracking-[0.14em] text-muted md:flex">
            <a href="#pipeline" className="transition-colors hover:text-ink">Pipeline</a>
            <a href="#features" className="transition-colors hover:text-ink">Features</a>
            <a href="#stack" className="transition-colors hover:text-ink">Stack</a>
          </div>

          <Link
            href="/studio"
            className="rounded-full bg-ink px-5 py-2 text-[13px] font-semibold text-black transition-all hover:bg-white hover:shadow-[0_0_24px_rgba(167,139,250,0.45)]"
          >
            Launch Studio
          </Link>
        </nav>
      </header>

      {/* ---------- Hero ---------- */}
      <section className="relative -mt-16 flex min-h-[100svh] flex-col justify-end overflow-hidden">
        <Skyline />

        <div className="relative mx-auto w-full max-w-[1400px] px-6 pb-16 pt-44 lg:px-10">
          <div className="rise-in" style={{ animationDelay: "80ms" }}>
            <Eyebrow>Agentic RAG · Streamed live · Citations verified</Eyebrow>
          </div>

          <h1
            className="rise-in mt-7 max-w-[15ch] font-display text-[44px] font-bold leading-[1.05] tracking-[-0.035em] text-ink sm:text-[64px] lg:text-[80px]"
            style={{ animationDelay: "180ms" }}
          >
            <span className="bg-gradient-to-b from-white from-45% via-[#c4b5fd] via-70% to-[#a78bfa] bg-clip-text text-transparent">
              StackPilot
            </span>{" "}
            is the{" "}
            <span className="bg-gradient-to-b from-white from-45% via-[#c4b5fd] via-70% to-[#a78bfa] bg-clip-text text-transparent">
              masterclass engine
            </span>{" "}
            built on real documentation.
          </h1>

          <p className="rise-in mt-7 max-w-xl text-[17px] leading-relaxed text-muted" style={{ animationDelay: "300ms" }}>
            Pick a stack. Describe what you want to learn. A five-stage agent plans, retrieves, grades, writes, and
            verifies a fully cited tutorial — streamed to your screen as it thinks.
          </p>

          <div className="rise-in mt-10 flex flex-wrap items-center gap-4" style={{ animationDelay: "420ms" }}>
            <Link
              href="/studio"
              className="group inline-flex h-12 items-center gap-2.5 rounded-full bg-ink px-7 text-[15px] font-semibold text-black transition-all hover:bg-white hover:shadow-[0_0_36px_rgba(167,139,250,0.5)]"
            >
              Launch the studio
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
            <a
              href="#pipeline"
              className="inline-flex h-12 items-center rounded-full border border-edge bg-black/40 px-7 text-[15px] font-medium text-ink backdrop-blur transition-colors hover:border-accent/50"
            >
              See the pipeline
            </a>
          </div>

          {/* feature strip */}
          <div
            className="rise-in mt-20 grid grid-cols-1 gap-x-10 gap-y-6 border-t border-edge/60 pt-8 sm:grid-cols-2 lg:grid-cols-5"
            style={{ animationDelay: "560ms" }}
          >
            {STRIP.map((f) => (
              <p key={f.lead} className="text-[13px] leading-relaxed text-muted">
                <strong className="font-semibold text-ink">{f.lead}</strong> {f.body}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Pipeline ---------- */}
      <section id="pipeline" className="relative scroll-mt-24 border-t border-edge/50">
        <div className="mx-auto max-w-[1400px] px-6 py-28 lg:px-10">
          <div className="grid gap-10 lg:grid-cols-[1fr_minmax(0,420px)] lg:items-end">
            <Reveal>
              <Eyebrow>Self-correcting by design</Eyebrow>
              <h2 className="mt-5 max-w-[16ch] font-display text-4xl font-bold tracking-[-0.03em] sm:text-5xl">
                Five stages. Zero unverified claims.
              </h2>
            </Reveal>
            <Reveal delay={120}>
              <p className="text-[15px] leading-relaxed text-muted">
                Most RAG demos retrieve once and hope. StackPilot grades what it retrieves, loops back when coverage is
                thin (CRAG-style), and audits its own citations before you ever read them.
              </p>
            </Reveal>
          </div>

          <Reveal delay={150} className="mt-16">
            <div className="lp-flow mb-8 hidden rounded-full lg:block" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {STAGES.map((s, i) => (
                <div
                  key={s.n}
                  className="lp-card lp-reveal relative rounded-2xl border border-edge bg-card p-6"
                  style={{ "--rd": `${i * 90}ms` } as CSSProperties}
                >
                  <div className="flex items-baseline justify-between">
                    <span className="font-mono text-[11px] font-bold text-accent/70">{s.n}</span>
                    {s.loop && (
                      <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#FDE68A]">
                        ↺ crag loop
                      </span>
                    )}
                  </div>
                  <h3 className="mt-4 font-display text-[19px] font-bold tracking-[-0.02em]">{s.title}</h3>
                  <span
                    className={`mt-2.5 inline-block rounded-md border px-2 py-0.5 font-mono text-[10px] tracking-wide ${CHIP_STYLES[s.chipColor]}`}
                  >
                    {s.chip}
                  </span>
                  <p className="mt-4 text-[13px] leading-relaxed text-muted">{s.desc}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- Features (bento) ---------- */}
      <section id="features" className="relative scroll-mt-24 border-t border-edge/50">
        <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-[720px] -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(59,130,246,0.09),transparent)]" />
        <div className="mx-auto max-w-[1400px] px-6 py-28 lg:px-10">
          <Reveal>
            <Eyebrow>The workspace</Eyebrow>
            <h2 className="mt-5 max-w-[20ch] font-display text-4xl font-bold tracking-[-0.03em] sm:text-5xl">
              Built like an instrument, not a chatbot.
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-4 lg:grid-cols-6">
            {/* Live streaming */}
            <Reveal className="lg:col-span-4">
              <div className="lp-card h-full rounded-2xl border border-edge bg-card p-7">
                <h3 className="font-display text-xl font-bold tracking-[-0.02em]">Live streaming workspace</h3>
                <p className="mt-2 max-w-lg text-[13.5px] leading-relaxed text-muted">
                  Agent trace, graded source cards, and the tutorial itself stream in over NDJSON. Citations are
                  clickable — <span className="cite-chip">2</span> flashes the matching source card.
                </p>
                <div className="mt-6 overflow-hidden rounded-xl border border-edge bg-black">
                  <div className="flex items-center gap-1.5 border-b border-edge/70 px-4 py-2.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-edge" />
                    <span className="h-2.5 w-2.5 rounded-full bg-edge" />
                    <span className="h-2.5 w-2.5 rounded-full bg-edge" />
                    <span className="ml-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
                      masterclass · streaming
                    </span>
                  </div>
                  <div className="space-y-1.5 px-5 py-4 font-mono text-[12px] leading-relaxed">
                    <p><span className="text-accent-bright">▸ plan</span> <span className="text-muted">3 queries generated · 0.8s</span></p>
                    <p><span className="text-[#7DA9FF]">▸ retrieve</span> <span className="text-muted">12 chunks · pgvector cosine</span></p>
                    <p><span className="text-[#FDE68A]">▸ grade</span> <span className="text-muted">9 kept · 3 dropped · 1 refined query</span></p>
                    <p><span className="text-accent-bright">▸ write</span> <span className="text-muted">streaming…</span></p>
                    <p className="pt-2 text-ink/85">
                      Server Components render on the server and stream HTML to the client
                      <span className="cite-chip">1</span>, cutting the hydration payload
                      <span className="cite-chip">3</span>
                      <span className="stream-caret" />
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Verified citations */}
            <Reveal delay={100} className="lg:col-span-2">
              <div className="lp-card flex h-full flex-col rounded-2xl border border-edge bg-card p-7">
                <h3 className="font-display text-xl font-bold tracking-[-0.02em]">Citations you can trust</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
                  A dedicated verifier stage re-reads every source chunk and grades each claim.
                </p>
                <div className="mt-6 flex flex-1 flex-col justify-end gap-3">
                  {(["supported", "partial", "unsupported"] as const).map((k, i) => (
                    <div key={k} className="flex items-center justify-between rounded-lg border border-edge/80 bg-black/50 px-3.5 py-2.5">
                      <span className="font-mono text-[11px] text-muted">source [{i + 1}]</span>
                      <Verdict kind={k} />
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            {/* Three modes */}
            <Reveal className="lg:col-span-2">
              <div className="lp-card flex h-full flex-col rounded-2xl border border-edge bg-card p-7">
                <h3 className="font-display text-xl font-bold tracking-[-0.02em]">Three ways to learn</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
                  The same pipeline, tuned to how you think.
                </p>
                <div className="mt-6 flex flex-1 flex-col justify-end gap-3">
                  <div className="flex items-start gap-3 rounded-lg border border-accent/35 bg-accent/[0.06] px-3.5 py-3">
                    <span className="mt-0.5 text-accent-bright"><ModeIcon mode="deep-dive" size={17} /></span>
                    <div>
                      <p className="text-[13px] font-semibold">Deep-dive</p>
                      <p className="text-[12px] leading-relaxed text-muted">Architecture, trade-offs, the why behind the API.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg border border-[#3B82F6]/35 bg-[#3B82F6]/[0.06] px-3.5 py-3">
                    <span className="mt-0.5 text-[#7DA9FF]"><ModeIcon mode="code-first" size={17} /></span>
                    <div>
                      <p className="text-[13px] font-semibold">Code-first</p>
                      <p className="text-[12px] leading-relaxed text-muted">Working examples first, with copy-ready blocks.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg border border-[#FACC15]/35 bg-[#FACC15]/[0.06] px-3.5 py-3">
                    <span className="mt-0.5 text-[#FDE68A]"><ModeIcon mode="comparison" size={17} /></span>
                    <div>
                      <p className="text-[13px] font-semibold">Comparison</p>
                      <p className="text-[12px] leading-relaxed text-muted">Two stacks head-to-head, ending in a clear recommendation.</p>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Graceful degradation */}
            <Reveal delay={100} className="lg:col-span-4">
              <div className="lp-card h-full rounded-2xl border border-edge bg-card p-7">
                <h3 className="font-display text-xl font-bold tracking-[-0.02em]">It never fails silently</h3>
                <p className="mt-2 max-w-lg text-[13.5px] leading-relaxed text-muted">
                  If any agent stage hits a rate limit or overload, the pipeline falls back to the naive RAG path
                  instead of failing your request — and the trace shows exactly why.
                </p>
                <div className="mt-6 space-y-1.5 rounded-xl border border-edge bg-black px-5 py-4 font-mono text-[12px] leading-relaxed">
                  <p><span className="text-accent-bright">▸ write</span> <span className="text-[#FB8BA5]">✕ 503 RESOURCE_EXHAUSTED</span> <span className="text-muted">· model overloaded</span></p>
                  <p><span className="text-[#7DA9FF]">↳ fallback</span> <span className="text-muted">switching to naive RAG path…</span></p>
                  <p><span className="text-[#FDE68A]">✓ done</span> <span className="text-muted">tutorial served · trace annotated with degradation reason</span></p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- Stack ---------- */}
      <section id="stack" className="scroll-mt-24 border-t border-edge/50">
        <div className="mx-auto max-w-[1400px] px-6 py-28 lg:px-10">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,400px)_1fr]">
            <Reveal>
              <Eyebrow>Under the hood</Eyebrow>
              <h2 className="mt-5 font-display text-4xl font-bold tracking-[-0.03em] sm:text-5xl">
                A serious stack, end to end.
              </h2>
              <p className="mt-5 text-[15px] leading-relaxed text-muted">
                Serverless Postgres with vector search, a streaming Python backend, and a React 19 frontend — the same
                architecture you&apos;d ship to production.
              </p>
            </Reveal>

            <Reveal delay={120}>
              <dl className="border-t border-edge">
                {SPECS.map((s) => (
                  <div
                    key={s.label}
                    className="grid grid-cols-1 gap-1 border-b border-edge py-5 transition-colors hover:bg-card/60 sm:grid-cols-[170px_1fr] sm:gap-6 sm:px-4"
                  >
                    <dt className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-accent/80">
                      {s.label}
                    </dt>
                    <dd className="text-[14px] text-ink/85">{s.value}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- Final CTA ---------- */}
      <section className="relative overflow-hidden border-t border-edge/50">
        <Skyline dim />
        <div className="relative mx-auto flex min-h-[70vh] max-w-[1400px] flex-col justify-center px-6 py-28 lg:px-10">
          <Reveal>
            <Eyebrow>No waitlist · Free tier works</Eyebrow>
            <h2 className="mt-6 max-w-[16ch] font-display text-4xl font-bold leading-[1.08] tracking-[-0.03em] sm:text-6xl">
              Stop skimming docs. Get taught by them.
            </h2>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                href="/studio"
                className="group inline-flex h-12 items-center gap-2.5 rounded-full bg-ink px-7 text-[15px] font-semibold text-black transition-all hover:bg-white hover:shadow-[0_0_36px_rgba(167,139,250,0.5)]"
              >
                Launch the studio
                <span className="transition-transform group-hover:translate-x-0.5">→</span>
              </Link>
              <p className="font-mono text-[12px] text-muted">
                Bring a Gemini key + a Neon database. Seed once, learn forever.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="border-t border-edge/70 bg-[#050507]">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between lg:px-10">
          <div className="flex items-center gap-2.5">
            <BrandMark size={20} />
            <span className="font-display text-[15px] font-bold tracking-[-0.02em]">StackPilot</span>
            <span className="ml-2 font-mono text-[11px] text-muted">© 2026 · Agentic documentation masterclasses</span>
          </div>
          <div className="flex items-center gap-7 font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
            <a href="#pipeline" className="transition-colors hover:text-ink">Pipeline</a>
            <a href="#features" className="transition-colors hover:text-ink">Features</a>
            <a href="#stack" className="transition-colors hover:text-ink">Stack</a>
            <Link href="/impressum" className="transition-colors hover:text-ink">Impressum</Link>
            <Link href="/studio" className="text-accent-bright transition-colors hover:text-ink">Studio →</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
