#!/usr/bin/env php
<?php
declare(strict_types=1);
require_once __DIR__ . '/../app/backup.php';

function cli_password(array $args): string
{
    if (in_array('--password-stdin', $args, true)) {
        $password = rtrim(stream_get_contents(STDIN), "\r\n");
    } else { $password = bin2hex(random_bytes(12)); }
    if (strlen($password) < 12 || strlen($password) > 4096) { throw new TimefoldError('Use a password between 12 and 4096 bytes.'); }
    return $password;
}

function cli_write_config(array $config): void
{
    // Runtime session fingerprints are derived afresh and must never be persisted.
    unset($config['auth_fingerprint']);
    $path = getenv('TIMEFOLD_CONFIG_PATH') ?: TIMEFOLD_ROOT . '/config.local.php';
    $parent = dirname($path);
    if (!is_dir($parent) || !is_writable($parent)) { throw new TimefoldError('The config directory is not writable: ' . $parent); }
    $existing = is_file($path) ? stat($path) : null;
    $temporary = tempnam($parent, '.timefold-config-');
    if ($temporary === false) { throw new TimefoldError('Cannot prepare the local config.'); }
    try {
        if ($existing && filegroup($temporary) !== $existing['gid'] && !@chgrp($temporary, $existing['gid'])) {
            throw new TimefoldError('Cannot preserve the config file group. Run this command as the account that maintains the server config.');
        }
        $mode = $existing ? ($existing['mode'] & 0640) : 0600;
        $php = "<?php\n// Local secrets: keep this file outside the public web root and out of Git.\nreturn " . var_export($config, true) . ";\n";
        if (file_put_contents($temporary, $php) !== strlen($php) || !chmod($temporary, $mode) || !rename($temporary, $path)) {
            throw new TimefoldError('Cannot write the local config.');
        }
    } finally { if (is_file($temporary)) { unlink($temporary); } }
}

try {
    $args = array_slice($argv, 1);
    $command = array_shift($args) ?? 'help';
    if ($command === 'help' || $command === '--help') {
        echo "Timefold " . TIMEFOLD_VERSION . "\n\n";
        echo "  php bin/timefold.php init --sqlite [--demo] [--password-stdin]\n";
        echo "  php bin/timefold.php init [--demo] [--password-stdin]  # MySQL via TIMEFOLD_* env\n";
        echo "  php bin/timefold.php password [--password-stdin]\n";
        echo "  php bin/timefold.php export PATH.timefold.ndjson\n";
        echo "  php bin/timefold.php import PATH.timefold.ndjson\n";
        echo "  php bin/timefold.php verify\n\n";
        echo "Environment: TIMEFOLD_DSN, TIMEFOLD_DB_USER, TIMEFOLD_DB_PASSWORD,\n";
        echo "TIMEFOLD_PASSWORD or TIMEFOLD_PASSWORD_HASH, TIMEFOLD_DATA_DIR,\n";
        echo "TIMEFOLD_CONFIG_PATH, TIMEFOLD_ARCHIVE_NAME. No total backup size cap on CLI.\n";
        exit;
    }
    $config = tf_config();
    if ($command === 'init') {
        tf_directories($config);
        $generated = null;
        if (in_array('--sqlite', $args, true)) {
            if ($config['dsn'] !== '' && !str_starts_with($config['dsn'], 'sqlite:')) { throw new TimefoldError('A MySQL DSN is already configured; omit --sqlite or use a separate config/data directory.'); }
            $config['dsn'] = $config['dsn'] ?: 'sqlite:' . $config['data_dir'] . '/timefold.sqlite';
        }
        if ($config['dsn'] === '') { throw new TimefoldError('Set TIMEFOLD_DSN for MySQL, or pass --sqlite for a local demo.'); }
        $envPassword = getenv('TIMEFOLD_PASSWORD');
        if ($envPassword !== false && $envPassword !== '' && (strlen($envPassword) < 12 || strlen($envPassword) > 4096)) { throw new TimefoldError('TIMEFOLD_PASSWORD must be between 12 and 4096 bytes.'); }
        $chosen = in_array('--password-stdin', $args, true) ? cli_password($args) : null;
        if ($chosen !== null) {
            if (getenv('TIMEFOLD_PASSWORD') || getenv('TIMEFOLD_PASSWORD_HASH')) { throw new TimefoldError('Remove password environment overrides before using --password-stdin.'); }
            $config['password_hash'] = password_hash($chosen, PASSWORD_DEFAULT);
        } elseif ($config['password_hash'] === '') {
            $generated = cli_password([]);
            $config['password_hash'] = password_hash($generated, PASSWORD_DEFAULT);
        }
        $db = tf_db($config);
        $new = tf_schema($db);
        if ($new && in_array('--demo', $args, true)) {
            $db->beginTransaction();
            tf_demo($db);
            $db->commit();
        }
        $envComplete = getenv('TIMEFOLD_DSN') && (getenv('TIMEFOLD_PASSWORD') || getenv('TIMEFOLD_PASSWORD_HASH'));
        if (!$envComplete || $chosen !== null) { cli_write_config($config); }
        echo $new ? "Archive initialized.\n" : "Archive already initialized; existing capsules preserved.\n";
        if ($new && in_array('--demo', $args, true)) { echo "Added 16 fictional demo capsules.\n"; }
        if ($generated !== null) { echo "Owner password: " . $generated . "\nSave this password in your password manager.\n"; }
        if ($chosen !== null) { echo "Owner password set from stdin.\n"; }
        echo "Web root: public/\nLocal preview: php -S 127.0.0.1:8080 -t public\n";
        exit;
    }
    if ($command === 'password') {
        if (getenv('TIMEFOLD_PASSWORD') || getenv('TIMEFOLD_PASSWORD_HASH')) { throw new TimefoldError('This deployment uses a password environment override. Change TIMEFOLD_PASSWORD or TIMEFOLD_PASSWORD_HASH and restart instead.'); }
        if ($config['dsn'] === '') { throw new TimefoldError('Initialize Timefold first.'); }
        $password = cli_password($args);
        $config['password_hash'] = password_hash($password, PASSWORD_DEFAULT);
        cli_write_config($config);
        echo in_array('--password-stdin', $args, true) ? "Owner password updated.\n" : "New owner password: " . $password . "\nSave this password in your password manager.\n";
        exit;
    }
    tf_directories($config);
    $db = tf_db($config);
    if ($command === 'verify') {
        $result = tf_verify($db, $config);
        echo "Checked " . $result['checked'] . " unique attachment(s).\n";
        foreach ($result['errors'] as $error) { echo "Missing or damaged: " . $error['sha256'] . " (capsule " . $error['id'] . ")\n"; }
        exit($result['errors'] ? 1 : 0);
    }
    if ($command === 'export') {
        $path = $args[0] ?? '';
        if ($path === '') { throw new TimefoldError('Provide an output path. Existing files are never overwritten.'); }
        $output = @fopen($path, 'xb');
        if (!$output) { throw new TimefoldError('Cannot create the output path; it may already exist.'); }
        try { tf_export($db, $config, $output); }
        catch (Throwable $e) { fclose($output); unlink($path); throw $e; }
        fclose($output);
        echo "Exported complete archive to " . $path . "\n";
        exit;
    }
    if ($command === 'import') {
        $path = $args[0] ?? '';
        if ($path === '' || !is_file($path)) { throw new TimefoldError('Provide a readable backup path.'); }
        $result = tf_import($db, $config, $path);
        echo "Imported " . $result['imported'] . "; skipped " . $result['skipped'] . " existing capsule(s).\n";
        exit;
    }
    throw new TimefoldError('Unknown command. Run php bin/timefold.php help.');
} catch (Throwable $e) {
    if (isset($db) && $db->inTransaction()) { $db->rollBack(); }
    fwrite(STDERR, 'Timefold: ' . $e->getMessage() . "\n");
    exit(1);
}
