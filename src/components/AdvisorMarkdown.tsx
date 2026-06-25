"use client";

import { Fragment, type ReactNode, useState } from "react";

type MarkdownBlock =
  | { type: "code"; language: string; content: string }
  | { type: "heading"; level: number; content: string }
  | { type: "unordered"; items: string[] }
  | { type: "ordered"; items: string[] }
  | { type: "paragraph"; lines: string[] };

function renderInline(value: string): ReactNode[] {
  const cleaned = value.replace(/^\s*\*{3,}\s*$/, "");
  const pieces = cleaned.split(/(\*\*\*.+?\*\*\*|\*\*.+?\*\*|`[^`]+`)/g).filter(Boolean);

  return pieces.map((piece, index) => {
    if (piece.startsWith("***") && piece.endsWith("***")) {
      return <strong key={index}>{piece.slice(3, -3)}</strong>;
    }
    if (piece.startsWith("**") && piece.endsWith("**")) {
      return <strong key={index}>{piece.slice(2, -2)}</strong>;
    }
    if (piece.startsWith("`") && piece.endsWith("`")) {
      return <code key={index} className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.9em] text-slate-900">{piece.slice(1, -1)}</code>;
    }
    return <Fragment key={index}>{piece.replace(/\*{2,3}/g, "")}</Fragment>;
  });
}

function parseMarkdown(content: string): MarkdownBlock[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim() || /^\s*\*{3,}\s*$/.test(line)) {
      index += 1;
      continue;
    }

    const fence = line.match(/^\s*```([\w-]*)\s*$/);
    if (fence) {
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !/^\s*```\s*$/.test(lines[index])) {
        codeLines.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push({ type: "code", language: fence[1] || "text", content: codeLines.join("\n").trimEnd() });
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length, content: heading[2] });
      index += 1;
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*[-*]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*[-*]\s+/, ""));
        index += 1;
      }
      blocks.push({ type: "unordered", items });
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*\d+\.\s+/, ""));
        index += 1;
      }
      blocks.push({ type: "ordered", items });
      continue;
    }

    const paragraphLines: string[] = [];
    while (
      index < lines.length
      && lines[index].trim()
      && !/^\s*```/.test(lines[index])
      && !/^(#{1,3})\s+/.test(lines[index])
      && !/^\s*[-*]\s+/.test(lines[index])
      && !/^\s*\d+\.\s+/.test(lines[index])
      && !/^\s*\*{3,}\s*$/.test(lines[index])
    ) {
      paragraphLines.push(lines[index]);
      index += 1;
    }
    if (paragraphLines.length) blocks.push({ type: "paragraph", lines: paragraphLines });
  }

  return blocks;
}

function CodeBlock({ content, language }: { content: string; language: string }) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="my-4 min-w-0 overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 text-slate-100">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2 text-xs font-semibold text-slate-300">
        <span>{language}</span>
        <button type="button" onClick={() => void copyCode()} className="rounded-lg border border-white/15 px-2.5 py-1 text-white transition hover:bg-white/10" aria-label="Copy code block">
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="max-w-full overflow-x-auto whitespace-pre p-4 text-xs leading-6">
        <code>{content}</code>
      </pre>
    </div>
  );
}

export function AdvisorMarkdown({ content }: { content: string }) {
  const blocks = parseMarkdown(content);

  return (
    <div className="advisor-markdown min-w-0 max-w-full break-words text-sm leading-6 text-slate-700">
      {blocks.map((block, index) => {
        if (block.type === "code") return <CodeBlock key={index} content={block.content} language={block.language} />;
        if (block.type === "heading") {
          const className = block.level === 1 ? "mt-5 text-lg font-semibold text-slate-950" : "mt-4 text-base font-semibold text-slate-950";
          return <p key={index} className={className}>{renderInline(block.content)}</p>;
        }
        if (block.type === "unordered") {
          return <ul key={index} className="my-3 list-disc space-y-1.5 pl-5">{block.items.map((item, itemIndex) => <li key={itemIndex}>{renderInline(item)}</li>)}</ul>;
        }
        if (block.type === "ordered") {
          return <ol key={index} className="my-3 list-decimal space-y-1.5 pl-5">{block.items.map((item, itemIndex) => <li key={itemIndex}>{renderInline(item)}</li>)}</ol>;
        }
        return (
          <p key={index} className="my-3 first:mt-0 last:mb-0">
            {block.lines.map((line, lineIndex) => <Fragment key={lineIndex}>{renderInline(line)}{lineIndex < block.lines.length - 1 ? <br /> : null}</Fragment>)}
          </p>
        );
      })}
    </div>
  );
}
