import { Fragment, type HTMLAttributes, type ReactNode } from "react";
import { LetterMarkdown } from "@/components/ui/markdown";
import type { BillingSettings } from "@/lib/admin/billing";
import { SHEET, SIGNOFF_MARKER, fillLetter, formatLetterDate, type Letter, type Placement } from "@/lib/letters";

type SheetLetter = Pick<Letter, "title" | "reference" | "letter_date" | "recipient" | "subject" | "body" | "show_letterhead">;

/** Static image laid over the letter. The editor swaps this for a draggable version. */
export function PlacedImage({
  placement,
  children,
  ...rest
}: { placement: Placement; children?: ReactNode } & Omit<HTMLAttributes<HTMLDivElement>, "style">) {
  return (
    <div
      {...rest}
      data-placement={placement.id}
      style={{
        position: "absolute",
        left: `${placement.x}mm`,
        top: `${placement.y}mm`,
        width: `${placement.w}mm`,
        transform: placement.rotate ? `rotate(${placement.rotate}deg)` : undefined,
        // Stamps are pressed on top of signatures; multiply lets ink and text show through like real ink.
        zIndex: placement.kind === "stamp" ? 20 : 10,
        mixBlendMode: "multiply",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={placement.src} alt={placement.kind} draggable={false} className="pointer-events-none block h-auto w-full select-none" />
      {children}
    </div>
  );
}

/** Splits the body on [[signature]] lines. */
function splitBody(body: string) {
  const segments: string[] = [];
  let current: string[] = [];
  for (const line of body.replace(/\r\n/g, "\n").split("\n")) {
    if (SIGNOFF_MARKER.test(line.trim())) {
      segments.push(current.join("\n"));
      current = [];
    } else current.push(line);
  }
  segments.push(current.join("\n"));
  return segments;
}

/**
 * One A4 letter on the LYNVO letterhead. Shared by the editor preview and the
 * print view so dragged signature / stamp positions land in the same place on paper.
 */
export default function LetterSheet({
  letter,
  settings,
  placements,
  renderPlacement = (placement) => <PlacedImage key={placement.id} placement={placement} />,
  overlay,
}: {
  letter: SheetLetter;
  settings: BillingSettings;
  placements: Placement[];
  renderPlacement?: (placement: Placement) => ReactNode;
  /** Extra layer inside the sheet (editor page guides). */
  overlay?: ReactNode;
}) {
  const fill = (text: string) => fillLetter(text, letter, settings);
  const segments = splitBody(fill(letter.body));
  const markers = segments.length - 1;

  const anchored = placements.filter((placement) => placement.anchor !== null);
  const loose = placements.filter((placement) => placement.anchor === null);
  // With no [[signature]] line, attached images go in an area after the body.
  const areas = markers > 0 ? markers : anchored.length > 0 ? 1 : 0;
  const inArea = (index: number) =>
    anchored.filter((placement) => Math.min(placement.anchor ?? 0, Math.max(areas - 1, 0)) === index);

  const legalName = settings.billing_legal_name || "LYNVO LLP";
  const identifiers = [settings.billing_llpin && `LLPIN ${settings.billing_llpin}`, settings.billing_gstin && `GSTIN ${settings.billing_gstin}`].filter(Boolean);
  const contacts = [settings.billing_email, settings.billing_phone, settings.billing_website].filter(Boolean);

  return (
    <article
      className="letter-sheet relative flex flex-col bg-white text-ink-900"
      style={{
        width: `${SHEET.widthMm}mm`,
        minHeight: `${SHEET.heightMm}mm`,
        padding: `${SHEET.padTopMm}mm ${SHEET.padXMm}mm ${SHEET.padBottomMm}mm`,
      }}
    >
      {letter.show_letterhead ? (
        <header className="mb-[7mm]">
          <div className="flex items-start justify-between gap-[8mm]">
            <div className="min-w-0">
              {settings.billing_logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={settings.billing_logo_url} alt={legalName} className="h-[14mm] w-auto max-w-[70mm] object-contain object-left" />
              ) : (
                <p className="font-display text-[22pt] font-semibold leading-none tracking-tight">{settings.billing_brand_name || "LYNVO"}</p>
              )}
            </div>
            <div className="text-right text-[8.5pt] leading-[1.45] text-ink-900/75">
              <p className="font-display text-[11pt] font-semibold text-ink-900">{legalName}</p>
              {settings.billing_registered_address && <p className="whitespace-pre-line">{settings.billing_registered_address}</p>}
              {contacts.length > 0 && <p>{contacts.join("  ·  ")}</p>}
            </div>
          </div>
          <div className="mt-[4mm] h-[0.6mm] bg-ink-900" />
          <div className="mt-[0.6mm] h-[0.25mm] bg-brand-700" />
        </header>
      ) : (
        // Printing on pre-printed letterhead paper: leave the top of the page empty.
        <div className="h-[30mm]" />
      )}

      <div className="flex flex-wrap items-baseline justify-between gap-x-[6mm] text-[10pt]">
        <p>{letter.reference ? <><span className="text-ink-900/60">Ref:</span> {fill(letter.reference)}</> : null}</p>
        <p>
          <span className="text-ink-900/60">Date:</span> {formatLetterDate(letter.letter_date)}
        </p>
      </div>

      {letter.recipient?.trim() && <p className="mt-[5mm] whitespace-pre-line text-[11pt] leading-[1.45]">{fill(letter.recipient)}</p>}

      {letter.subject?.trim() && (
        <p className="mt-[5mm] text-[11pt]">
          <span className="font-semibold">Subject: </span>
          <span className="font-semibold underline decoration-ink-900/40 underline-offset-2">{fill(letter.subject)}</span>
        </p>
      )}

      <div className="mt-[5mm]">
        {segments.map((segment, index) => (
          <Fragment key={index}>
            {segment.trim() && <LetterMarkdown source={segment} />}
            {index < areas && (
              <div data-signoff={index} className="relative break-inside-avoid" style={{ height: `${SHEET.signoffMm}mm` }}>
                {inArea(index).map((placement) => renderPlacement(placement))}
              </div>
            )}
          </Fragment>
        ))}
      </div>

      {letter.show_letterhead && (
        <footer className="mt-auto pt-[8mm]">
          <div className="border-t border-ink-900/30 pt-[2mm] text-center text-[7.5pt] leading-[1.5] text-ink-900/65">
            <p>{[legalName, ...identifiers].join("  ·  ")}</p>
            {settings.letter_footer_note && <p className="whitespace-pre-line">{settings.letter_footer_note}</p>}
          </div>
        </footer>
      )}

      {loose.map((placement) => renderPlacement(placement))}
      {overlay}
    </article>
  );
}
