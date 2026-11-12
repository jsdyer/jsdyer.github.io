<?php
declare(strict_types=1);
function db(): PDO {
    static $db;
    if ($db) return $db;
    $db=new PDO(cfg('dsn'), cfg('db_user'), cfg('db_pass'), [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC, PDO::ATTR_EMULATE_PREPARES=>false]);
    if ($db->getAttribute(PDO::ATTR_DRIVER_NAME)==='sqlite') { $db->exec('PRAGMA foreign_keys = ON'); $db->exec('PRAGMA busy_timeout = 5000'); }
    return $db;
}
function query(string $sql, array $params=[]): PDOStatement { $stmt=db()->prepare($sql); $stmt->execute($params); return $stmt; }
function one(string $sql, array $params=[]): ?array { return query($sql,$params)->fetch() ?: null; }
function rows(string $sql, array $params=[]): array { return query($sql,$params)->fetchAll(); }
function migrate(): void {
    $sql=file_get_contents(ROOT . '/database/schema.sql');
    if (db()->getAttribute(PDO::ATTR_DRIVER_NAME)==='sqlite') {
        $sql=str_replace('BIGINT PRIMARY KEY AUTO_INCREMENT', 'INTEGER PRIMARY KEY AUTOINCREMENT', $sql);
        $sql=str_replace(' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci', '', $sql);
    }
    foreach (explode(';', $sql) as $part) if (trim($part)) db()->exec($part);
    foreach(['entries_discovery'=>'entries (visibility, kind, created_at)', 'entries_owner'=>'entries (user_id, kind, id)', 'directory_review'=>'directory (status, id)', 'guestbook_owner'=>'guestbook (owner_id, status, id)', 'limits_expiry'=>'rate_limits (expires_at)'] as $name=>$definition) {
        try { db()->exec('CREATE INDEX '.$name.' ON '.$definition); }
        catch(PDOException $e) {
            $duplicate=db()->getAttribute(PDO::ATTR_DRIVER_NAME)==='mysql' ? (int)($e->errorInfo[1]??0)===1061 : str_contains($e->getMessage(),'already exists');
            if(!$duplicate)throw $e;
        }
    }
}
function rate_limit(string $scope, int $limit, int $window=900): void {
    // REMOTE_ADDR intentionally ignores untrusted forwarded headers. Configure a trusted proxy at Apache.
    $key=hash('sha256', $scope . '|' . ($_SERVER['REMOTE_ADDR'] ?? 'cli') . '|' . intdiv(time(),$window));
    if (db()->getAttribute(PDO::ATTR_DRIVER_NAME)==='mysql') {
        query('INSERT INTO rate_limits (bucket, hits, expires_at) VALUES (?, 1, ?) ON DUPLICATE KEY UPDATE hits = hits + 1', [$key,time()+$window]);
    } else {
        query('INSERT INTO rate_limits (bucket, hits, expires_at) VALUES (?, 1, ?) ON CONFLICT(bucket) DO UPDATE SET hits = hits + 1', [$key,time()+$window]);
    }
    if ((int)one('SELECT hits FROM rate_limits WHERE bucket = ?',[$key])['hits'] > $limit) { if(PHP_SAPI!=='cli')header('Retry-After: ' . $window); fail(429,'A few too many attempts. Please try again later.'); }
}
