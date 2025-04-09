CREATE TABLE Stockholdings (
  hold_id SERIAL PRIMARY KEY,
  username TEXT NOT NULL,
  port_name TEXT NOT NULL,
  stock_symbol TEXT NOT NULL UNIQUE,
  shares NUMERIC(10, 2) NOT NULL
);
