import { Fragment, type ReactNode } from "react";

/**
 * Small, safe Markdown renderer for blog posts. Builds React elements (never
 * raw HTML) and only allows http(s) links and images, so post content cannot
 * inject scripts.
 *
 * Supports: # / ## / ### headings, paragraphs, - and 1. lists, > quotes,
 * ``` code blocks, --- rules, images ![alt](url "caption"), **bold**, *italic*,
 * `code` and [links](url).
 */

const safeUrl = (url: string) => (/^https?:\/\//i.test(url.trim()) ? url.trim() : /^\/[^/]/.test(url.trim()) ? url.trim() : null);

function inline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)|\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*|_([^_]+)_|`([^`]+)`/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = pattern.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const key = `${keyPrefix}-${index++}`;
    if (match[2] !== undefined) {
      const src = safeUrl(match[2]);
      // eslint-disable-next-line @next/next/no-img-element
      nodes.push(src ? <img key={key} src={src} alt={match[1]} loading="lazy" className="inline-block max-h-[1.5em] align-middle" /> : match[0]);
    } else if (match[5] !== undefined) {
      const href = safeUrl(match[5]);
      nodes.push(
        href ? (
          <a key={key} href={href} className="text-brand-700 underline underline-offset-2" {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
            {match[4]}
          </a>
        ) : (
          match[4]
        )
      );
    } else if (match[6] !== undefined) nodes.push(<strong key={key}>{match[6]}</strong>);
    else if (match[7] !== undefined || match[8] !== undefined) nodes.push(<em key={key}>{match[7] ?? match[8]}</em>);
    else if (match[9] !== undefined) nodes.push(<code key={key} className="rounded bg-canvas-warm px-1 py-0.5 font-mono text-[0.9em]">{match[9]}</code>);
    last = pattern.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

type Block =
  | { kind: "h"; level: 1 | 2 | 3; text: string }
  | { kind: "p"; text: string }
  | { kind: "ul" | "ol"; items: string[] }
  | { kind: "quote"; text: string }
  | { kind: "code"; text: string }
  | { kind: "img"; alt: string; src: string; caption?: string }
  | { kind: "hr" };

function parse(source: string): Block[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let paragraph: string[] = [];

  const flush = () => {
    if (paragraph.length) blocks.push({ kind: "p", text: paragraph.join(" ") });
    paragraph = [];
  };

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    const line = raw.trim();

    if (line.startsWith("```")) {
      flush();
      const code: string[] = [];
      for (i += 1; i < lines.length && !lines[i].trim().startsWith("```"); i += 1) code.push(lines[i]);
      blocks.push({ kind: "code", text: code.join("\n") });
      continue;
    }
    if (!line) {
      flush();
      continue;
    }
    const image = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)$/.exec(line);
    if (image) {
      flush();
      blocks.push({ kind: "img", alt: image[1], src: image[2], caption: image[3] });
      continue;
    }
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      flush();
      blocks.push({ kind: "h", level: heading[1].length as 1 | 2 | 3, text: heading[2] });
      continue;
    }
    if (/^(-{3,}|\*{3,})$/.test(line)) {
      flush();
      blocks.push({ kind: "hr" });
      continue;
    }
    if (/^>\s?/.test(line)) {
      flush();
      const quote = [line.replace(/^>\s?/, "")];
      while (i + 1 < lines.length && /^>\s?/.test(lines[i + 1].trim())) quote.push(lines[++i].trim().replace(/^>\s?/, ""));
      blocks.push({ kind: "quote", text: quote.join(" ") });
      continue;
    }
    const listMatch = /^([-*]|\d+[.)])\s+(.*)$/.exec(line);
    if (listMatch) {
      flush();
      const ordered = /\d/.test(listMatch[1]);
      const items = [listMatch[2]];
      while (i + 1 < lines.length) {
        const next = /^([-*]|\d+[.)])\s+(.*)$/.exec(lines[i + 1].trim());
        if (!next || /\d/.test(next[1]) !== ordered) break;
        items.push(next[2]);
        i += 1;
      }
      blocks.push({ kind: ordered ? "ol" : "ul", items });
      continue;
    }
    paragraph.push(line);
  }
  flush();
  return blocks;
}

export default function Markdown({ source, className = "" }: { source: string; className?: string }) {
  const blocks = parse(source);

  return (
    <div className={`space-y-5 text-[1.0625rem] leading-8 text-text-primary/90 ${className}`}>
      {blocks.map((block, index) => {
        const key = `b-${index}`;
        switch (block.kind) {
          case "h":
            return block.level === 1 ? (
              <h2 key={key} className="pt-4 font-display text-3xl font-semibold text-ink-900">{inline(block.text, key)}</h2>
            ) : block.level === 2 ? (
              <h2 key={key} className="pt-4 font-display text-2xl font-semibold text-ink-900">{inline(block.text, key)}</h2>
            ) : (
              <h3 key={key} className="pt-2 font-display text-xl font-semibold text-ink-900">{inline(block.text, key)}</h3>
            );
          case "ul":
          case "ol": {
            const List = block.kind === "ul" ? "ul" : "ol";
            return (
              <List key={key} className={`space-y-2 pl-6 ${block.kind === "ul" ? "list-disc" : "list-decimal"}`}>
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{inline(item, `${key}-${itemIndex}`)}</li>
                ))}
              </List>
            );
          }
          case "quote":
            return (
              <blockquote key={key} className="border-l-4 border-brand-700 bg-canvas-warm/60 py-2 pl-5 pr-3 font-display text-xl leading-8 text-ink-900">
                {inline(block.text, key)}
              </blockquote>
            );
          case "code":
            return (
              <pre key={key} className="overflow-x-auto rounded-card bg-ink-900 p-4 font-mono text-sm leading-6 text-text-inverse">
                <code>{block.text}</code>
              </pre>
            );
          case "img": {
            const src = safeUrl(block.src);
            if (!src) return <Fragment key={key} />;
            return (
              <figure key={key} className="my-8">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={block.alt} loading="lazy" className="w-full rounded-card border border-border object-cover" />
                {(block.caption || block.alt) && (
                  <figcaption className="mt-2 text-center text-sm text-text-primary/60">{block.caption || block.alt}</figcaption>
                )}
              </figure>
            );
          }
          case "hr":
            return <hr key={key} className="my-8 border-border" />;
          default:
            return <p key={key}>{inline(block.text, key)}</p>;
        }
      })}
    </div>
  );
}
