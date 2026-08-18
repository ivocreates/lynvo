import { requireTeamMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { NOTE_VISIBILITIES, VISIBILITY_LABELS, type Note } from "@/lib/team";
import ConfirmSubmit from "@/components/admin/confirm-submit";
import { createNote, updateNote, deleteNote } from "./actions";

export const metadata = { title: "Notes" };

const FIELD_CLASS =
  "mt-1 w-full rounded-card border border-border bg-canvas-warm px-3 py-2 text-sm focus:border-brand-700 focus:outline-none";
const LABEL_CLASS = "block text-xs uppercase tracking-[0.18em] text-text-primary/60";

export default async function StaffNotesPage() {
  const profile = await requireTeamMember();

  const supabase = createClient();
  const [{ data: noteRows }, { data: peopleRows }] = await Promise.all([
    supabase
      .from("staff_notes")
      .select("*")
      .order("pinned", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(200),
    supabase.from("profiles").select("id, display_name, email"),
  ]);

  const notes = (noteRows ?? []) as Note[];
  const people = (peopleRows ?? []) as Record<string, any>[];
  const authorOf = (id: string) => {
    const person = people.find((entry) => entry.id === id);
    return person ? person.display_name ?? person.email : "Someone";
  };

  return (
    <div>
      <p className="section-stamp">KNOWLEDGE</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-ink-900">Notes</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-text-primary/75">
        Keep working notes to yourself, share them with the team, or route them to managers only.
      </p>

      <form action={createNote} className="mt-8 rounded-card border border-border bg-surface p-5">
        <p className="section-stamp mb-3">NEW NOTE</p>
        <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <div>
            <label htmlFor="title" className={LABEL_CLASS}>
              Title
            </label>
            <input id="title" name="title" required className={FIELD_CLASS} />
          </div>
          <div>
            <label htmlFor="visibility" className={LABEL_CLASS}>
              Visible to
            </label>
            <select id="visibility" name="visibility" defaultValue="private" className={FIELD_CLASS}>
              {NOTE_VISIBILITIES.map((visibility) => (
                <option key={visibility} value={visibility}>
                  {VISIBILITY_LABELS[visibility]}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm text-text-primary/80">
            <input name="pinned" type="checkbox" className="h-4 w-4 rounded border-border accent-brand-700" />
            Pin
          </label>
        </div>
        <div className="mt-4">
          <label htmlFor="body" className={LABEL_CLASS}>
            Note
          </label>
          <textarea id="body" name="body" rows={4} className={FIELD_CLASS} />
        </div>
        <button
          type="submit"
          className="mt-4 rounded-card bg-brand-700 px-4 py-2 text-sm font-medium text-text-inverse hover:bg-ink-900"
        >
          Save note
        </button>
      </form>

      {notes.length === 0 ? (
        <div className="mt-8 rounded-card border border-dashed border-border p-10 text-center text-sm text-text-primary/70">
          No notes yet.
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {notes.map((note) => {
            const isMine = note.author_id === profile.id;

            return (
              <li key={note.id} className="rounded-card border border-border bg-surface p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-lg font-semibold text-ink-900">
                      {note.pinned && <span className="mr-2 text-brand-700">★</span>}
                      {note.title}
                    </p>
                    <p className="mt-1 text-xs text-text-primary/60">
                      {isMine ? "You" : authorOf(note.author_id)} · {VISIBILITY_LABELS[note.visibility]} ·{" "}
                      {new Date(note.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {note.body && (
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-text-primary/80">{note.body}</p>
                )}

                {isMine && (
                  <details className="mt-4 border-t border-border pt-3">
                    <summary className="cursor-pointer text-sm text-brand-700">Edit</summary>
                    <form action={updateNote} className="mt-3 grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                      <input type="hidden" name="id" value={note.id} />
                      <div>
                        <label htmlFor={`title-${note.id}`} className={LABEL_CLASS}>
                          Title
                        </label>
                        <input
                          id={`title-${note.id}`}
                          name="title"
                          defaultValue={note.title}
                          required
                          className={FIELD_CLASS}
                        />
                      </div>
                      <div>
                        <label htmlFor={`vis-${note.id}`} className={LABEL_CLASS}>
                          Visible to
                        </label>
                        <select
                          id={`vis-${note.id}`}
                          name="visibility"
                          defaultValue={note.visibility}
                          className={FIELD_CLASS}
                        >
                          {NOTE_VISIBILITIES.map((visibility) => (
                            <option key={visibility} value={visibility}>
                              {VISIBILITY_LABELS[visibility]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <label className="flex items-center gap-2 pb-2 text-sm text-text-primary/80">
                        <input
                          name="pinned"
                          type="checkbox"
                          defaultChecked={note.pinned}
                          className="h-4 w-4 rounded border-border accent-brand-700"
                        />
                        Pin
                      </label>
                      <div className="sm:col-span-3">
                        <label htmlFor={`body-${note.id}`} className={LABEL_CLASS}>
                          Note
                        </label>
                        <textarea
                          id={`body-${note.id}`}
                          name="body"
                          rows={4}
                          defaultValue={note.body ?? ""}
                          className={FIELD_CLASS}
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <button
                          type="submit"
                          className="rounded-card border border-border px-3 py-1.5 text-sm hover:bg-canvas-warm"
                        >
                          Save changes
                        </button>
                      </div>
                    </form>
                    <form action={deleteNote} className="mt-3">
                      <input type="hidden" name="id" value={note.id} />
                      <ConfirmSubmit message="Delete this note?" />
                    </form>
                  </details>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
