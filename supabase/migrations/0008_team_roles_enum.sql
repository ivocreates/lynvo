-- Extend the role model for the team platform.
--
-- Postgres will not let a new enum value be *used* in the same transaction that
-- adds it, so this migration only widens the type. Everything that references
-- the new values lives in 0009.

alter type app_role add value if not exists 'senior_partner';
alter type app_role add value if not exists 'junior_partner';
alter type app_role add value if not exists 'employee';
alter type app_role add value if not exists 'intern';
