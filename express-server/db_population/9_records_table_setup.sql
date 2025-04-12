CREATE TABLE Records (
    port_id INT NOT NULL REFERENCES Portfolios(port_id) ON DELETE CASCADE,
    record_type TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    date DATE NOT NULL
)