CREATE TABLE Visibility (
    visibility_id SERIAL PRIMARY KEY,
    list_id INT NOT NULL REFERENCES StockLists(list_id) ON DELETE CASCADE, -- The stock list being shared
    user_id INT NOT NULL REFERENCES Users(id) ON DELETE CASCADE       -- The user the list is shared with
);