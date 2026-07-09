/* ============================================================
   StackPilot — static app data
   Generation is fully live via the Gemini API (scripts/gemini.js);
   only the selectable stack catalog lives here.

   Inline text mini-syntax used by the renderer (app.js):
     [[n]]      -> citation chip pointing at source id n
     `code`     -> inline code
     **bold**   -> emphasis
   ============================================================ */

const STACKS = [
  { id: "nextjs",  label: "Next.js (App Router)", sub: "v15", color: "#E6EDF3" },
  { id: "fastapi", label: "FastAPI",              sub: "0.115", color: "#2DD4BF" },
  { id: "neon",    label: "Neon Postgres",        sub: "pg17", color: "#00FFFF" },
];
