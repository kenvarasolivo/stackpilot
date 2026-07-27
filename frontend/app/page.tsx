"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { BrandMark, ModeIcon } from "@/components/ConfigPanel";

/* =========================================================
   Hero art — seeded PRNG so server & client render the exact
   same bar field (no hydration mismatch, no layout shift).

   Palette is deliberately mostly grey: white and purple bars
   are the rare highlights that give the field its shape.
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

const GREY_DIM = "#3A3A42";
const GREY = "#5C5C68";
/* Kept below the purples' luminance: white bars sit next to purple ones and the
   blur mixes them, so a bright white here desaturates its neighbours to lavender. */
const WHITE = "#B4B4BE";
/* Brightness here has to come from saturation, not lightness. #A78BFA reads
   violet as thin dashboard text on black, but as a wide blurred field it reads
   near-white — so the workhorse is the more chromatic #8B5CF6, and #A78BFA is
   demoted to a sparse highlight. */
const PURPLE = "#8B5CF6";
const VIOLET = "#A78BFA";

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
    /* `lift` keeps the accent pillars from sinking into the grey field: the
       purples ride at a higher opacity floor so they stay lit through the dip
       of the flicker cycle instead of dropping out. */
    let c: string;
    let lift: number;
    if (roll < 0.32) {
      c = GREY_DIM;
      lift = 0;
    } else if (roll < 0.56) {
      c = GREY;
      lift = 0.04;
    } else if (roll < 0.89) {
      c = PURPLE;
      lift = 0.26;
    } else if (roll < 0.94) {
      c = WHITE;
      lift = 0.06;
    } else {
      c = VIOLET;
      lift = 0.26;
    }
    return {
      left: i * slot + rnd() * slot * 0.7,
      w: 0.4 + rnd() * 0.95,
      h: hMin + rnd() * (hMax - hMin),
      c,
      seg: 3 + Math.floor(rnd() * 3),
      oMax: Math.min(1, 0.66 + rnd() * 0.3 + lift),
      oMin: Math.min(0.92, 0.24 + rnd() * 0.22 + lift),
      dur: 2.6 + rnd() * 4.8,
      delay: -rnd() * 12,
    };
  });
}

const LAYER_BACK = makeBars(7, 46, 30, 78);
const LAYER_MID = makeBars(23, 34, 36, 92);
const LAYER_FRONT = makeBars(51, 22, 18, 60);

function ArtLayer({
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

/** Band of light bars across the upper hero, faded to pure black at both ends. */
function HeroArt({ dim = false }: { dim?: boolean }) {
  return (
    <div className={`lp-art lp-grain ${dim ? "opacity-40" : ""}`} aria-hidden="true">
      <ArtLayer bars={LAYER_BACK} blur={11} opacity={0.66} drift={44} />
      <ArtLayer bars={LAYER_MID} blur={4} opacity={0.92} drift={30} />
      <ArtLayer bars={LAYER_FRONT} blur={1.2} opacity={1} drift={22} />
    </div>
  );
}

/* =========================================================
   Content data
   ========================================================= */

const STATS = [
  { value: 5, suffix: "", label: "Agent stages", sub: "plan to verify" },
  { value: 3, suffix: "", label: "Learning modes", sub: "tuned prompts" },
  { value: 8, suffix: "", label: "Stacks indexed", sub: "real docs, chunked" },
  { value: 100, suffix: "%", label: "Claims audited", sub: "per-source verdict" },
];

const MARQUEE = [
  "Next.js 15",
  "React 19",
  "FastAPI",
  "Neon Postgres",
  "pgvector",
  "Django 5.2",
  "Express 5",
  "Vite 6",
  "Gemini 2.5",
  "HNSW",
  "NDJSON",
  "TypeScript",
];

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
    desc: "Decomposes your learning goal into up to three targeted documentation search queries.",
  },
  {
    n: "02",
    title: "Retrieve",
    chip: "pgvector · neon",
    desc: "Embeds each query and runs cosine search over Neon Postgres with an HNSW index.",
  },
  {
    n: "03",
    title: "Grade",
    chip: "flash-lite",
    desc: "Scores every chunk, drops the junk, and re-retrieves with a refined query when it detects a coverage gap.",
    loop: true,
  },
  {
    n: "04",
    title: "Write",
    chip: "gemini-2.5-flash",
    desc: "Streams the tutorial as markdown from graded context only, with inline [n] citations.",
  },
  {
    n: "05",
    title: "Verify",
    chip: "flash-lite",
    desc: "Audits each citation against its source chunk and issues a per-source verdict.",
  },
];

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
    <p className="flex items-center gap-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-muted">
      <span className="h-[7px] w-[7px] rounded-[1px] bg-accent" />
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
    supported: "text-ok/90 border-ok/25",
    partial: "text-warn/90 border-warn/25",
    unsupported: "text-bad/90 border-bad/25",
  } as const;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] ${map[kind]}`}>
      <span className="h-1 w-1 rounded-full bg-current" />
      {kind}
    </span>
  );
}

/** Counts from 0 to `to` the first time it scrolls into view. */
function CountUp({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setN(to);
      return;
    }

    let raf = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const dur = 1000;
        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / dur);
          const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p); // easeOutExpo
          setN(Math.round(eased * to));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.5 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to]);

  return (
    <span ref={ref}>
      {n}
      {suffix}
    </span>
  );
}

/* =========================================================
   Page
   ========================================================= */

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);

  /* header state + scroll progress, both off one rAF-throttled listener */
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const y = window.scrollY;
      setScrolled(y > 12);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, y / max) : 0;
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${p})`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  /* scroll reveal */
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

  /* pointer wash on cards: one delegated listener feeds --mx/--my */
  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    let raf = 0;
    let pending: { el: HTMLElement; x: number; y: number } | null = null;

    const flush = () => {
      raf = 0;
      if (!pending) return;
      const { el, x, y } = pending;
      el.style.setProperty("--mx", `${x}px`);
      el.style.setProperty("--my", `${y}px`);
    };

    const onMove = (ev: MouseEvent) => {
      const card = (ev.target as HTMLElement | null)?.closest<HTMLElement>(".lp-card");
      if (!card) return;
      const r = card.getBoundingClientRect();
      pending = { el: card, x: ev.clientX - r.left, y: ev.clientY - r.top };
      if (!raf) raf = requestAnimationFrame(flush);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="bg-canvas text-ink">
      {/* ---------- Nav ---------- */}
      <header
        className={`sticky top-0 z-50 transition-colors duration-300 ${
          scrolled ? "border-b border-edge bg-canvas/80 backdrop-blur-xl" : "border-b border-transparent bg-transparent"
        }`}
      >
        <nav className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-6 lg:px-10">
          <Link href="/" className="flex items-center gap-2.5">
            <BrandMark size={24} />
            <span className="font-display text-[17px] font-bold tracking-[-0.03em]">StackPilot</span>
          </Link>

          <div className="hidden items-center gap-9 text-[14px] text-muted md:flex">
            {[
              ["Pipeline", "#pipeline"],
              ["Features", "#features"],
              ["Stack", "#stack"],
            ].map(([label, href]) => (
              <a key={href} href={href} className="transition-colors hover:text-ink">
                {label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/studio"
              className="lp-btn lp-btn-ghost hidden rounded-full px-5 py-2 text-[13px] font-medium sm:inline-flex"
            >
              Docs
            </Link>
            <Link href="/studio" className="lp-btn lp-btn-primary rounded-full px-5 py-2 text-[13px] font-semibold">
              Launch Studio
            </Link>
          </div>
        </nav>

        <div ref={progressRef} className="lp-progress absolute inset-x-0 bottom-0 h-px scale-x-0" aria-hidden="true" />
      </header>

      {/* ---------- Hero ---------- */}
      <section className="relative -mt-16 flex min-h-[100svh] flex-col justify-end overflow-hidden">
        <HeroArt />

        <div className="relative mx-auto w-full max-w-[1400px] px-6 pb-16 pt-44 lg:px-10">
          <div className="rise-in" style={{ animationDelay: "80ms" }}>
            <Eyebrow>Agentic RAG · Streamed live · Citations verified</Eyebrow>
          </div>

          <h1
            className="rise-in mt-6 max-w-[19ch] font-display text-[44px] font-bold leading-[1.04] tracking-[-0.035em] text-ink sm:text-[64px] lg:text-[76px]"
            style={{ animationDelay: "180ms" }}
          >
            StackPilot is the masterclass engine built on real documentation.
          </h1>

          <p className="rise-in mt-7 max-w-xl text-[17px] leading-relaxed text-muted" style={{ animationDelay: "300ms" }}>
            Pick a stack. Describe what you want to learn. A five-stage agent plans, retrieves, grades, writes, and
            verifies a fully cited tutorial — streamed to your screen as it thinks.
          </p>

          <div className="rise-in mt-10 flex flex-wrap items-center gap-3" style={{ animationDelay: "420ms" }}>
            <Link
              href="/studio"
              className="lp-btn lp-btn-primary group inline-flex h-12 items-center gap-2 rounded-full px-7 text-[15px] font-semibold"
            >
              Get started
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
            <a
              href="#pipeline"
              className="lp-btn lp-btn-ghost inline-flex h-12 items-center rounded-full px-7 text-[15px] font-medium"
            >
              See the pipeline
            </a>
          </div>

          {/* feature strip */}
          <div
            className="rise-in mt-20 grid grid-cols-1 gap-x-10 gap-y-6 pt-8 sm:grid-cols-2 lg:grid-cols-5"
            style={{ animationDelay: "560ms" }}
          >
            {STRIP.map((f) => (
              <p key={f.lead} className="text-[13.5px] leading-relaxed text-muted">
                <strong className="font-semibold text-ink">{f.lead}</strong> {f.body}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Marquee ---------- */}
      <section className="border-y border-edge py-5" aria-label="Indexed technologies">
        <div className="lp-marquee-wrap">
          <div className="lp-marquee">
            {[...MARQUEE, ...MARQUEE].map((item, i) => (
              <span
                key={i}
                className="flex shrink-0 items-center gap-7 px-7 font-mono text-[12px] uppercase tracking-[0.2em] text-muted/70"
              >
                {item}
                <span className="h-px w-4 bg-edge" />
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Stats ---------- */}
      <section className="border-b border-edge">
        <div className="mx-auto grid max-w-[1400px] grid-cols-2 px-6 py-16 lg:grid-cols-4 lg:px-10">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 80}>
              <div className="px-1 lg:px-6">
                <p className="font-display text-[42px] font-bold leading-none tracking-[-0.04em] text-ink sm:text-[54px]">
                  <CountUp to={s.value} suffix={s.suffix} />
                </p>
                <p className="mt-3 text-[14px] font-semibold text-ink">{s.label}</p>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted/80">{s.sub}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- Pipeline ---------- */}
      <section id="pipeline" className="scroll-mt-24">
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
            <div className="lp-flow mb-8 hidden lg:block" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {STAGES.map((s, i) => (
                <div
                  key={s.n}
                  className="lp-card lp-reveal rounded-xl border border-edge bg-card p-6"
                  style={{ "--rd": `${i * 80}ms` } as CSSProperties}
                >
                  <div className="flex items-baseline justify-between">
                    <span className="font-mono text-[11px] font-bold text-accent-bright">{s.n}</span>
                    {s.loop && (
                      <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-muted">
                        ↺ crag loop
                      </span>
                    )}
                  </div>
                  <h3 className="mt-4 font-display text-[19px] font-bold tracking-[-0.02em]">{s.title}</h3>
                  <span className="mt-2.5 inline-block rounded border border-edge px-2 py-0.5 font-mono text-[10px] tracking-wide text-muted">
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
      <section id="features" className="scroll-mt-24 border-t border-edge">
        <div className="mx-auto max-w-[1400px] px-6 py-28 lg:px-10">
          <Reveal>
            <Eyebrow>The workspace</Eyebrow>
            <h2 className="mt-5 max-w-[20ch] font-display text-4xl font-bold tracking-[-0.03em] sm:text-5xl">
              Built like an instrument, not a chatbot.
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-3 lg:grid-cols-6">
            {/* Live streaming */}
            <Reveal className="lg:col-span-4">
              <div className="lp-card h-full rounded-xl border border-edge bg-card p-7">
                <h3 className="font-display text-xl font-bold tracking-[-0.02em]">Live streaming workspace</h3>
                <p className="mt-2 max-w-lg text-[13.5px] leading-relaxed text-muted">
                  Agent trace, graded source cards, and the tutorial itself stream in over NDJSON. Citations are
                  clickable — <span className="cite-chip">2</span> flashes the matching source card.
                </p>
                <div className="mt-6 overflow-hidden rounded-lg border border-edge bg-canvas">
                  <div className="flex items-center gap-3 border-b border-edge px-4 py-2.5">
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
                      masterclass · streaming
                    </span>
                    <span className="ml-auto flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
                      <span className="lp-live h-1.5 w-1.5 rounded-full bg-ok" />
                      live
                    </span>
                  </div>
                  <div className="space-y-1.5 px-5 py-4 font-mono text-[12px] leading-relaxed">
                    <p><span className="text-accent-bright">▸ plan</span> <span className="text-muted">3 queries generated · 0.8s</span></p>
                    <p><span className="text-accent-bright">▸ retrieve</span> <span className="text-muted">12 chunks · pgvector cosine</span></p>
                    <p><span className="text-accent-bright">▸ grade</span> <span className="text-muted">9 kept · 3 dropped · 1 refined query</span></p>
                    <p><span className="text-accent-bright">▸ write</span> <span className="text-muted">streaming…</span></p>
                    <p className="pt-2 text-ink/80">
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
              <div className="lp-card flex h-full flex-col rounded-xl border border-edge bg-card p-7">
                <h3 className="font-display text-xl font-bold tracking-[-0.02em]">Citations you can trust</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
                  A dedicated verifier stage re-reads every source chunk and grades each claim.
                </p>
                <div className="mt-6 flex flex-1 flex-col justify-end gap-2.5">
                  {(["supported", "partial", "unsupported"] as const).map((k, i) => (
                    <div key={k} className="flex items-center justify-between rounded-lg border border-edge bg-canvas px-3.5 py-2.5">
                      <span className="font-mono text-[11px] text-muted">source [{i + 1}]</span>
                      <Verdict kind={k} />
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            {/* Three modes */}
            <Reveal className="lg:col-span-2">
              <div className="lp-card flex h-full flex-col rounded-xl border border-edge bg-card p-7">
                <h3 className="font-display text-xl font-bold tracking-[-0.02em]">Three ways to learn</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
                  The same pipeline, tuned to how you think.
                </p>
                <div className="mt-6 flex flex-1 flex-col justify-end gap-2.5">
                  {[
                    ["deep-dive", "Deep-dive", "Architecture, trade-offs, the why behind the API."],
                    ["code-first", "Code-first", "Working examples first, with copy-ready blocks."],
                    ["comparison", "Comparison", "Two stacks head-to-head, ending in a clear recommendation."],
                  ].map(([mode, title, desc]) => (
                    <div
                      key={mode}
                      className="flex items-start gap-3 rounded-lg border border-edge bg-canvas px-3.5 py-3 transition-colors hover:border-accent/50"
                    >
                      <span className="mt-0.5 text-accent-bright">
                        <ModeIcon mode={mode as "deep-dive" | "code-first" | "comparison"} size={17} />
                      </span>
                      <div>
                        <p className="text-[13px] font-semibold">{title}</p>
                        <p className="text-[12px] leading-relaxed text-muted">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            {/* Graceful degradation */}
            <Reveal delay={100} className="lg:col-span-4">
              <div className="lp-card h-full rounded-xl border border-edge bg-card p-7">
                <h3 className="font-display text-xl font-bold tracking-[-0.02em]">It never fails silently</h3>
                <p className="mt-2 max-w-lg text-[13.5px] leading-relaxed text-muted">
                  If any agent stage hits a rate limit or overload, the pipeline falls back to the naive RAG path
                  instead of failing your request — and the trace shows exactly why.
                </p>
                <div className="mt-6 space-y-1.5 rounded-lg border border-edge bg-canvas px-5 py-4 font-mono text-[12px] leading-relaxed">
                  <p><span className="text-accent-bright">▸ write</span> <span className="text-bad/90">✕ 503 RESOURCE_EXHAUSTED</span> <span className="text-muted">· model overloaded</span></p>
                  <p><span className="text-warn/90">↳ fallback</span> <span className="text-muted">switching to naive RAG path…</span></p>
                  <p><span className="text-ok/90">✓ done</span> <span className="text-muted">tutorial served · trace annotated with degradation reason</span></p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- Stack ---------- */}
      <section id="stack" className="scroll-mt-24 border-t border-edge">
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
                    className="grid grid-cols-1 gap-1 border-b border-edge py-5 transition-colors hover:bg-card sm:grid-cols-[170px_1fr] sm:gap-6 sm:px-4"
                  >
                    <dt className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-muted">
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
      <section className="relative overflow-hidden border-t border-edge">
        <HeroArt dim />
        <div className="relative mx-auto flex min-h-[60vh] max-w-[1400px] flex-col justify-center px-6 py-28 lg:px-10">
          <Reveal>
            <Eyebrow>No waitlist · Free tier works</Eyebrow>
            <h2 className="mt-6 max-w-[16ch] font-display text-4xl font-bold leading-[1.06] tracking-[-0.03em] sm:text-6xl">
              Stop skimming docs. Get taught by them.
            </h2>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                href="/studio"
                className="lp-btn lp-btn-primary group inline-flex h-12 items-center gap-2 rounded-full px-7 text-[15px] font-semibold"
              >
                Get started
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
      <footer className="border-t border-edge">
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
            <Link href="/studio" className="transition-colors hover:text-ink">Studio →</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
