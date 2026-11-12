<?php
declare(strict_types=1);

const TIMEFOLD_VERSION = '1.0.0';
const TIMEFOLD_ROOT = __DIR__ . '/..';
const TIMEFOLD_MAX_FILE = 8 * 1024 * 1024;
const TIMEFOLD_WEB_BACKUP_LIMIT = 64 * 1024 * 1024;

final class TimefoldError extends RuntimeException
{
    public function __construct(string $message, public readonly int $status = 400) { parent::__construct($message); }
}

function tf_config(): array
{
    $path = getenv('TIMEFOLD_CONFIG_PATH') ?: TIMEFOLD_ROOT . '/config.local.php';
    $local = is_file($path) ? require $path : [];
    $env = static function (string $key, mixed $fallback = ''): mixed {
        $value = getenv($key);
        return $value === false || $value === '' ? $fallback : $value;
    };
    $config = [
        'dsn' => $env('TIMEFOLD_DSN', $local['dsn'] ?? ''),
        'db_user' => $env('TIMEFOLD_DB_USER', $local['db_user'] ?? ''),
        'db_password' => $env('TIMEFOLD_DB_PASSWORD', $local['db_password'] ?? ''),
        'password_hash' => $env('TIMEFOLD_PASSWORD_HASH', $local['password_hash'] ?? ''),
        'archive_name' => $env('TIMEFOLD_ARCHIVE_NAME', $local['archive_name'] ?? 'My time machine'),
        'data_dir' => $env('TIMEFOLD_DATA_DIR', $local['data_dir'] ?? TIMEFOLD_ROOT . '/var'),
    ];
    $password = $env('TIMEFOLD_PASSWORD');
    if ($password !== '') { $config['password_hash'] = password_hash($password, PASSWORD_DEFAULT); }
    $config['auth_fingerprint'] = hash('sha256', $password !== '' ? $password : $config['password_hash']);
    return $config;
}

function tf_directories(array $config): void
{
    foreach ([$config['data_dir'], $config['data_dir'] . '/files', $config['data_dir'] . '/staging'] as $dir) {
        if (!is_dir($dir) && !mkdir($dir, 0700, true) && !is_dir($dir)) {
            throw new TimefoldError('The archive storage directory is not writable.', 503);
        }
    }
}

function tf_db(array $config): PDO
{
    if ($config['dsn'] === '' || $config['password_hash'] === '') {
        throw new TimefoldError('Timefold is not initialized. Run php bin/timefold.php init --sqlite --demo on the server.', 503);
    }
    if (!str_starts_with($config['dsn'], 'mysql:') && !str_starts_with($config['dsn'], 'sqlite:')) {
        throw new TimefoldError('Use a MySQL/MariaDB or SQLite PDO connection.', 503);
    }
    $db = new PDO($config['dsn'], $config['db_user'], $config['db_password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    if ($db->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite') {
        $db->exec('PRAGMA busy_timeout = 5000');
        $db->exec('PRAGMA journal_mode = WAL');
    }
    return $db;
}

function tf_schema(PDO $db): bool
{
    $db->exec(file_get_contents(TIMEFOLD_ROOT . '/database/schema.sql'));
    $new = $db->query("SELECT meta_value FROM timefold_meta WHERE meta_key = 'schema_version'")->fetchColumn() === false;
    if ($new) {
        $stmt = $db->prepare('INSERT INTO timefold_meta (meta_key,meta_value) VALUES (?,?)');
        $stmt->execute(['schema_version', '1']);
        $stmt->execute(['demo', '0']);
    }
    return $new;
}

function tf_json(array $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    exit;
}

function tf_now(): string { return gmdate('Y-m-d\TH:i:s\Z'); }
function tf_id(): string { return bin2hex(random_bytes(16)); }
function tf_file_path(array $config, string $hash): string
{
    if (!preg_match('/^[a-f0-9]{64}$/D', $hash)) { throw new TimefoldError('Invalid attachment fingerprint.'); }
    return $config['data_dir'] . '/files/' . $hash . '.blob';
}

function tf_session(array $config): void
{
    tf_directories($config);
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    session_name('timefold_session');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    session_start();
    if (!empty($_SESSION['authenticated']) && !hash_equals($config['auth_fingerprint'], (string) ($_SESSION['auth_fingerprint'] ?? ''))) {
        $_SESSION = [];
        session_regenerate_id(true);
    }
    if (!isset($_SESSION['csrf'])) { $_SESSION['csrf'] = bin2hex(random_bytes(32)); }
    if (isset($_SESSION['last_seen']) && time() - (int) $_SESSION['last_seen'] > 12 * 60 * 60) {
        $_SESSION = ['csrf' => bin2hex(random_bytes(32))];
        session_regenerate_id(true);
    }
    $_SESSION['last_seen'] = time();
}

function tf_require_csrf(): void
{
    if (!hash_equals($_SESSION['csrf'], (string) ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? ''))) {
        throw new TimefoldError('Your session changed. Reload Timefold and try again.', 403);
    }
}

function tf_login(array $config, string $password): void
{
    if ($config['password_hash'] === '') { throw new TimefoldError('Initialize Timefold on the server first.', 503); }
    $key = hash('sha256', $_SERVER['REMOTE_ADDR'] ?? 'local');
    $path = $config['data_dir'] . '/login-attempts.json';
    $handle = fopen($path, 'c+');
    if ($handle === false || !flock($handle, LOCK_EX)) { throw new TimefoldError('Cannot open the sign-in limiter.', 503); }
    try {
        $attempts = json_decode(stream_get_contents($handle) ?: '{}', true) ?: [];
        $now = time();
        $attempts = array_filter($attempts, static fn($row) => isset($row['since']) && $now - $row['since'] < 300);
        $row = $attempts[$key] ?? ['since' => $now, 'count' => 0];
        if ($row['count'] >= 8) { throw new TimefoldError('Too many sign-in attempts. Try again in five minutes.', 429); }
        $valid = strlen($password) <= 4096 && password_verify($password, $config['password_hash']);
        if ($valid) { unset($attempts[$key]); }
        else { $row['count']++; $attempts[$key] = $row; }
        rewind($handle);
        ftruncate($handle, 0);
        fwrite($handle, json_encode($attempts, JSON_THROW_ON_ERROR));
        fflush($handle);
    } finally { flock($handle, LOCK_UN); fclose($handle); }
    if (!$valid) { throw new TimefoldError('That password did not unlock the archive.', 401); }
    session_regenerate_id(true);
    $_SESSION['authenticated'] = true;
    $_SESSION['auth_fingerprint'] = $config['auth_fingerprint'];
    $_SESSION['csrf'] = bin2hex(random_bytes(32));
}
