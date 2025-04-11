CREATE TABLE StockHistory (
    history_id SERIAL PRIMARY KEY,
    stock_symbol TEXT NOT NULL REFERENCES Stocks(stock_symbol) ON DELETE CASCADE,
    timestamp TIMESTAMP NOT NULL,
    open_price NUMERIC(12, 2) NOT NULL,
    high_price NUMERIC(12, 2) NOT NULL,
    low_price NUMERIC(12, 2) NOT NULL,
    close_price NUMERIC(12, 2) NOT NULL,
    volume BIGINT NOT NULL,
    UNIQUE (stock_symbol, timestamp)
);