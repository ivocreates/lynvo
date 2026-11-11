import type { DocBlock } from "@/lib/documents";

/** Renders parsed document blocks. Text is always text, never HTML. */
export default function DocumentBody({ blocks }: { blocks: DocBlock[] }) {
  return (
    <section className="mt-4 space-y-3">
      {blocks.map((block, index) => {
        switch (block.kind) {
          case "pagebreak":
            return (
              <div
                key={index}
                aria-hidden
                className="break-after-page my-8 border-t border-dashed border-ink-900/25 print:my-0 print:border-0"
              />
            );
          case "heading":
            return (
              <h2 key={index} className="mt-5 break-after-avoid font-display text-base font-semibold">
                {block.text}
              </h2>
            );
          case "subheading":
            return (
              <h3 key={index} className="mt-4 break-after-avoid text-[13px] font-semibold uppercase tracking-wide text-ink-900/80">
                {block.text}
              </h3>
            );
          case "list":
            return (
              <ul key={index} className="list-disc space-y-1 pl-5">
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="break-inside-avoid">
                    {item}
                  </li>
                ))}
              </ul>
            );
          case "ordered":
            return (
              <ol key={index} className="list-decimal space-y-1 pl-5">
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="break-inside-avoid">
                    {item}
                  </li>
                ))}
              </ol>
            );
          case "table": {
            const [head, ...body] = block.rows;
            return (
              <table key={index} className="w-full break-inside-avoid border-collapse text-[12px]">
                <thead>
                  <tr className="border-y border-ink-900/25 bg-ink-900/[0.04]">
                    {head.map((cell, cellIndex) => (
                      <th key={cellIndex} className={`px-2 py-1.5 font-semibold ${cellIndex > 0 ? "text-right" : "text-left"}`}>
                        {cell}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {body.map((row, rowIndex) => {
                    const isTotal = /^(total|net|gross)/i.test(row[0] ?? "");
                    return (
                      <tr key={rowIndex} className={`border-b border-ink-900/10 ${isTotal ? "font-semibold" : ""}`}>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex} className={`px-2 py-1.5 ${cellIndex > 0 ? "text-right" : "text-left"}`}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            );
          }
          default:
            return (
              <p key={index} className="break-inside-avoid text-justify">
                {block.text}
              </p>
            );
        }
      })}
    </section>
  );
}
