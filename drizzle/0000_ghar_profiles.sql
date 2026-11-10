CREATE TABLE ghar_profiles (
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('customer', 'cook')),
  details TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, role)
);
