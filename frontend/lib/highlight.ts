/** Lightweight regex-based syntax highlighter (GitHub-dark adjacent).
 *  Returns HTML with all content escaped; token classes live in globals.css. */

const KEYWORDS: Record<string, string> = {
  js: "const|let|var|function|return|async|await|import|export|from|default|if|else|for|of|in|new|class|extends|try|catch|finally|throw|typeof|instanceof|null|undefined|true|false|this",
  ts: "const|let|var|function|return|async|await|import|export|from|default|if|else|for|of|in|new|class|extends|try|catch|finally|throw|typeof|instanceof|null|undefined|true|false|this|type|interface|as|satisfies|enum|readonly|number|string|boolean|void|unknown|any",
  py: "def|return|import|from|as|if|elif|else|for|in|while|try|except|finally|raise|with|class|lambda|None|True|False|and|or|not|async|await|yield|pass|global|nonlocal|del|assert|is",
  sql: "CREATE|TABLE|EXTENSION|IF|NOT|EXISTS|ALTER|ENABLE|FORCE|ROW|LEVEL|SECURITY|POLICY|FOR|ALL|TO|USING|WITH|CHECK|INDEX|ON|SELECT|INSERT|INTO|UPDATE|DELETE|FROM|WHERE|GROUP|ORDER|BY|LIMIT|VALUES|SET|LOCAL|BEGIN|COMMIT|ROLLBACK|AND|OR|AS|COUNT|DEFAULT|PRIMARY|KEY|REFERENCES|UNIQUE|NULL|SERIAL|TEXT|DROP",
  bash: "npm|npx|pnpm|node|python|pip|uvicorn|export|echo|cd|curl|git|psql|source",
};

const ALIASES: Record<string, string> = {
  javascript: "js",
  jsx: "js",
  typescript: "ts",
  tsx: "ts",
  python: "py",
  shell: "bash",
  sh: "bash",
  powershell: "bash",
  postgres: "sql",
  postgresql: "sql",
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function highlight(raw: string, language: string): string {
  const lang = ALIASES[language] ?? language;
  const kw = KEYWORDS[lang] ?? KEYWORDS.js;
  const comment =
    lang === "sql" ? "--[^\\n]*"
    : lang === "bash" || lang === "py" ? "#[^\\n]*"
    : "\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/";
  const flags = lang === "sql" ? "gi" : "g";

  // Alternation order = precedence: comments, strings, keywords, functions, numbers
  const re = new RegExp(
    `(${comment})` +
      `|("(?:\\\\.|[^"\\\\])*"|'(?:\\\\.|[^'\\\\])*'|\`(?:\\\\.|[^\`\\\\])*\`)` +
      `|\\b(${kw})\\b` +
      `|\\b([A-Za-z_]\\w*)(?=\\s*\\()` +
      `|\\b(\\d[\\d_]*(?:\\.\\d+)?)\\b`,
    flags
  );

  let out = "";
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    out += escapeHtml(raw.slice(last, m.index));
    const cls = m[1] ? "tok-com" : m[2] ? "tok-str" : m[3] ? "tok-kw" : m[4] ? "tok-fn" : "tok-num";
    out += `<span class="${cls}">${escapeHtml(m[0])}</span>`;
    last = m.index + m[0].length;
  }
  out += escapeHtml(raw.slice(last));
  return out;
}
