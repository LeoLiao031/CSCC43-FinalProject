CREATE TABLE Users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  reg_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
