"use client";

import { Fragment, memo, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import CodeBlock from "./CodeBlock";

interface Props {
  markdown: string;
  /** ids of retrieved sources; only these markers become clickable chips */
  citeIds: number[];
  onCite: (id: number) => void;
}

/** Replaces footnote markers like [1] in text nodes with clickable chips,
 *  but only for ids that correspond to an actual retrieved source. */
function withCitations(children: ReactNode, valid: Set<number>, onCite: (id: number) => void): ReactNode {
  if (typeof children === "string") {
    const parts = children.split(/\[(\d{1,2})\]/g);
    if (parts.length === 1) return children;
    return parts.map((part, i) =>
      i % 2 === 1 && valid.has(Number(part)) ? (
        <button
          key={i}
          type="button"
          className="cite-chip"
          title={`View source [${part}] in the RAG sidebar`}
          onClick={() => onCite(Number(part))}
        >
          {part}
        </button>
      ) : (
        <Fragment key={i}>{i % 2 === 1 ? `[${part}]` : part}</Fragment>
      )
    );
  }
  if (Array.isArray(children)) {
    return children.map((child, i) => <Fragment key={i}>{withCitations(child, valid, onCite)}</Fragment>);
  }
  return children;
}

function MasterclassMarkdown({ markdown, citeIds, onCite }: Props) {
  const valid = new Set(citeIds);
  const components: Components = {
    p: ({ children }) => <p>{withCitations(children, valid, onCite)}</p>,
    li: ({ children }) => <li>{withCitations(children, valid, onCite)}</li>,
    strong: ({ children }) => <strong>{withCitations(children, valid, onCite)}</strong>,
    em: ({ children }) => <em>{withCitations(children, valid, onCite)}</em>,
    th: ({ children }) => <th>{withCitations(children, valid, onCite)}</th>,
    td: ({ children }) => <td>{withCitations(children, valid, onCite)}</td>,
    // horizontal scroll for wide comparison tables instead of overflowing the feed
    table: ({ children }) => (
      <div className="overflow-x-auto">
        <table>{children}</table>
      </div>
    ),
    // unwrap <pre>; the code component below decides block vs inline
    pre: ({ children }) => <>{children}</>,
    code: ({ className, children }) => {
      const text = String(children ?? "").replace(/\n$/, "");
      const match = /language-(\w+)/.exec(className ?? "");
      if (match || text.includes("\n")) {
        return <CodeBlock language={match?.[1] ?? "text"} code={text} />;
      }
      return <code>{text}</code>;
    },
  };

  return (
    <div className="md-feed">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}

// memo keeps re-renders cheap while deltas stream in
export default memo(MasterclassMarkdown);
