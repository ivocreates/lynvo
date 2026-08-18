-- Clients sign in to their own portal, so they need a role of their own.
-- Postgres forbids using a new enum value in the transaction that adds it.

alter type app_role add value if not exists 'client';
