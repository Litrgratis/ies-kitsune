CREATE TABLE sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    problem TEXT,
    history JSON,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_timestamp ON sessions(timestamp);