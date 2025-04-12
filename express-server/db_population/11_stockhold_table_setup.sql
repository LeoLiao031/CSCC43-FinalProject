CREATE TABLE Stockholdings (
    hold_id SERIAL PRIMARY KEY,
    port_id INT NOT NULL REFERENCES Portfolios(port_id) ON DELETE CASCADE,
    stock_symbol TEXT NOT NULL REFERENCES Stocks(stock_symbol) ON DELETE CASCADE,
    quantity NUMERIC(10, 2) NOT NULL,
    UNIQUE (port_id, stock_symbol)
);
