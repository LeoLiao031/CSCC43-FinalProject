CREATE TABLE Friends (
  relation_id SERIAL PRIMARY KEY,
  req_friend TEXT NOT NULL REFERENCES Users(username) ON DELETE CASCADE,
  rec_friend TEXT NOT NULL REFERENCES Users(username) ON DELETE CASCADE,
  pending BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (req_friend, rec_friend)
);