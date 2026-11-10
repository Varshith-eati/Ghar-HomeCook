CREATE TABLE ghar_kitchens (
  owner_id TEXT PRIMARY KEY NOT NULL,
  kitchen_id TEXT NOT NULL UNIQUE,
  settings TEXT NOT NULL,
  revision INTEGER NOT NULL
);
