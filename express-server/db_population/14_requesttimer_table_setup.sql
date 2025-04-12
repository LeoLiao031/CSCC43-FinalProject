CREATE TABLE FriendRequests (
    request_id SERIAL PRIMARY KEY,
    sender_id TEXT NOT NULL REFERENCES Users(username) ON DELETE CASCADE,
    receiver_id TEXT NOT NULL REFERENCES Users(username) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'DELETED')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (sender_id, receiver_id)
);

-- Index to optimize queries based on sender and receiver
CREATE INDEX idx_friendrequests_sender_receiver ON FriendRequests (sender_id, receiver_id);

-- Trigger to update the `updated_at` column on row updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON FriendRequests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();