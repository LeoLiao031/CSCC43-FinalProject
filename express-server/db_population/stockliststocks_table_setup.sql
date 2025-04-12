CREATE TABLE StockListStocks (
    list_id INT NOT NULL REFERENCES StockLists(list_id) ON DELETE CASCADE, -- The stock list the stock belongs to
    stock_symbol TEXT NOT NULL REFERENCES Stocks(stock_symbol) ON DELETE CASCADE, -- The stock symbol
    quantity INT NOT NULL, -- The quantity of the stock in the list
    PRIMARY KEY (list_id, stock_symbol) -- Composite primary key to ensure each stock is unique in a list
);