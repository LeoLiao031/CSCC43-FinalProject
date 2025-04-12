CREATE TABLE StockLists (
    list_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public', 'shared'))
);