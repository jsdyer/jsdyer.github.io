-- Shared by MySQL/MariaDB and the optional SQLite local demo.
-- bin/timefold.php init applies this schema; no manual import is needed.
CREATE TABLE IF NOT EXISTS timefold_meta (
    meta_key VARCHAR(64) PRIMARY KEY,
    meta_value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS capsules (
    id VARCHAR(32) PRIMARY KEY,
    title VARCHAR(180) NOT NULL,
    note TEXT NOT NULL,
    capsule_date VARCHAR(10) NOT NULL,
    kind VARCHAR(16) NOT NULL,
    tags TEXT NOT NULL,
    source TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_mime VARCHAR(100) NOT NULL,
    file_size INTEGER NOT NULL,
    sha256 VARCHAR(64) NOT NULL,
    created_at VARCHAR(25) NOT NULL,
    updated_at VARCHAR(25) NOT NULL
);
