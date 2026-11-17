-- Company letters on the LYNVO letterhead (bank letters, telecom / SIM
-- requests, authorisations, NOCs...). Admins write the body in Markdown and
-- drag signatures and stamps onto the page.
--
-- placements is a JSON array of images laid over the letter:
--   { id, kind: 'signature' | 'stamp' | 'image', src, x, y, w, rotate, anchor }
-- x / y / w are millimetres. anchor = null places the image relative to the
-- sheet's top-left corner; anchor = n places it relative to the n-th
-- [[signature]] area in the body, so it moves with the text.

create table if not exists "letters" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "reference" TEXT,
  "letter_date" TEXT NOT NULL,
  "recipient" TEXT,
  "subject" TEXT,
  "body" TEXT NOT NULL DEFAULT '',
  "placements" TEXT NOT NULL DEFAULT '[]',
  "show_letterhead" INTEGER NOT NULL DEFAULT 1,
  "status" TEXT NOT NULL DEFAULT 'draft' check ("status" in ('draft', 'final')),
  "created_by" TEXT REFERENCES "profiles" ("id") ON DELETE SET NULL,
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create index if not exists letters_updated_idx on letters (updated_at);
