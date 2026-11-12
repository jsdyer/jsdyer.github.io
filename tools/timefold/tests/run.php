<?php
declare(strict_types=1);
/** Dependency-free domain/storage regression tests. Always use a temporary SQLite DB. */
require_once __DIR__ . '/../app/backup.php';

$checks = 0;
function check(bool $condition, string $message): void
{
    global $checks;
    $checks++;
    if (!$condition) { throw new RuntimeException($message); }
}
function rejects(callable $operation, string $message, int $status = 400): void
{
    try { $operation(); }
    catch (TimefoldError $error) {
        check($error->status === $status, $message . ' (status)');
        return;
    }
    throw new RuntimeException($message . ' was unexpectedly accepted');
}
function fixture(string $title = 'A saved fragment'): array
{
    return ['title' => $title, 'note' => 'literal <script>markup</script>', 'date' => '2000-02-29',
        'kind' => 'note', 'tags' => ' Linux, archive, linux, , Archive ', 'source' => 'An old notebook'];
}
function remove_tree(string $directory): void
{
    if (!is_dir($directory)) { return; }
    $entries = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($directory, FilesystemIterator::SKIP_DOTS), RecursiveIteratorIterator::CHILD_FIRST);
    foreach ($entries as $entry) {
        if ($entry->isDir()) { rmdir($entry->getPathname()); }
        else { unlink($entry->getPathname()); }
    }
    rmdir($directory);
}

$temporary = sys_get_temp_dir() . '/timefold-domain-' . bin2hex(random_bytes(8));
mkdir($temporary, 0700);
try {
    $config = ['dsn' => 'sqlite:' . $temporary . '/archive.sqlite', 'db_user' => '', 'db_password' => '',
        'password_hash' => password_hash('domain-test-password', PASSWORD_DEFAULT), 'data_dir' => $temporary . '/data'];
    tf_directories($config);
    $db = tf_db($config);
    check(tf_schema($db), 'first schema initialization creates the archive');
    check(!tf_schema($db), 'schema initialization is idempotent');
    check(tf_list($db) === [], 'new archive is empty');
    $input = tf_validate(fixture());
    check(preg_match('/^[a-f0-9]{32}$/D', $input['id']) === 1, 'new capsules have opaque stable IDs');
    check($input['tags'] === ['linux', 'archive'], 'tags are trimmed, lowercase, unique, and stable');
    check($input['date'] === '2000-02-29', 'leap-day original dates remain exact');
    rejects(fn() => tf_validate(array_replace(fixture(), ['date' => '1900-02-29'])), 'invalid leap day');
    rejects(fn() => tf_validate(array_replace(fixture(), ['date' => '2026-11-31'])), 'invalid day for month');
    rejects(fn() => tf_validate(array_replace(fixture(), ['id' => '../../etc/passwd'])), 'path-like capsule ID');
    rejects(fn() => tf_validate(array_replace(fixture(), ['title' => '   '])), 'empty title');
    rejects(fn() => tf_validate(array_replace(fixture(), ['title' => str_repeat('x', 181)])), 'overlong title');
    rejects(fn() => tf_validate(array_replace(fixture(), ['source' => str_repeat('s', 2049)])), 'overlong source');
    rejects(fn() => tf_validate(array_replace(fixture(), ['note' => "bad\0note"])), 'NUL in text');
    rejects(fn() => tf_validate(array_replace(fixture(), ['title' => "\xff"])), 'invalid UTF-8');
    rejects(fn() => tf_validate(array_replace(fixture(), ['kind' => 'execute'])), 'unknown capsule kind');
    rejects(fn() => tf_tags([['nested']] ), 'non-text tag');
    rejects(fn() => tf_tags(["tag\nother"]), 'control character in tag');
    rejects(fn() => tf_tags(array_fill(0, 21, 'tag')), 'overlong tag input');
    rejects(fn() => tf_file_path($config, '../../outside'), 'path-like attachment fingerprint');

    $one = tf_save($db, $config, fixture('One'));
    check($one['note'] === 'literal <script>markup</script>', 'literal text survives storage without being interpreted');
    check(!$one['has_file'] && !$one['is_image'], 'note without attachment has no file metadata');
    $edited = tf_save($db, $config, array_replace(fixture('Edited'), ['id' => $one['id']]));
    check($edited['id'] === $one['id'], 'edits retain capsule identity');
    check(count(tf_list($db)) === 1, 'edit does not insert another record');
    rejects(fn() => tf_save($db, $config, array_replace(fixture(), ['id' => str_repeat('f', 32)])), 'edit missing capsule', 404);

    $upload_path = $temporary . '/unsafe.php';
    $payload = "<?php echo 'only bytes'; ?>";
    file_put_contents($upload_path, $payload);
    $upload = ['error' => UPLOAD_ERR_OK, 'name' => '../../unsafe.php', 'tmp_name' => $upload_path];
    $two = tf_save($db, $config, fixture('Attachment'), $upload);
    $three = tf_save($db, $config, fixture('Duplicate bytes'), $upload);
    check($two['file_name'] === 'unsafe.php', 'upload names cannot create a directory path');
    check($two['file_mime'] === 'application/octet-stream' && !$two['is_image'], 'PHP attachments are generic downloadable data');
    check($two['sha256'] === hash('sha256', $payload), 'attachment fingerprint matches its original bytes');
    check($two['sha256'] === $three['sha256'], 'identical bytes have one content address');
    check(count(glob($config['data_dir'] . '/files/*.blob')) === 1, 'duplicate upload stores one physical blob');
    // Model an existing archive whose audit timestamps predate this test process.
    $historical_created = '2003-05-12T04:03:02Z';
    $historical_updated = '2017-09-21T16:15:14Z';
    $history = $db->prepare('UPDATE capsules SET created_at=?,updated_at=? WHERE id=?');
    $history->execute([$historical_created, $historical_updated, $two['id']]);
    $backup_path = $temporary . '/complete.ndjson';
    $output = fopen($backup_path, 'wb');
    tf_export($db, $config, $output);
    fclose($output);
    $restored_config = array_replace($config, ['dsn' => 'sqlite:' . $temporary . '/restored.sqlite', 'data_dir' => $temporary . '/restored-data']);
    tf_directories($restored_config);
    $restored_db = tf_db($restored_config);
    tf_schema($restored_db);
    $restored = tf_import($restored_db, $restored_config, $backup_path);
    check($restored['imported'] === 3 && $restored['skipped'] === 0, 'portable backup restores every capsule into a new archive');
    $restored_capsule = tf_find($restored_db, $two['id']);
    check($restored_capsule['date'] === '2000-02-29', 'backup restore preserves capsule identity and original date');
    check($restored_capsule['created_at'] === $historical_created, 'backup restore preserves historical creation timestamp');
    check($restored_capsule['updated_at'] === $historical_updated, 'backup restore preserves historical modification timestamp');
    check(file_get_contents(tf_file_path($restored_config, $two['sha256'])) === $payload, 'backup restore includes original attachment bytes');
    check(count(glob($restored_config['data_dir'] . '/files/*.blob')) === 1, 'restored duplicates still store one physical blob');
    $again = tf_import($restored_db, $restored_config, $backup_path);
    check($again['imported'] === 0 && $again['skipped'] === 3, 'backup merge is idempotent');
    check(tf_verify($restored_db, $restored_config)['errors'] === [], 'restored archive passes attachment integrity verification');
    file_put_contents(tf_file_path($restored_config, $two['sha256']), 'damaged');
    check(count(tf_verify($restored_db, $restored_config)['errors']) === 1, 'integrity verification detects a damaged shared blob once');
    $failed_output = fopen('php://temp', 'w+b');
    rejects(fn() => tf_export($restored_db, $restored_config, $failed_output), 'export refuses damaged attachments', 409);
    check(ftell($failed_output) === 0, 'export detects damaged attachments before writing any backup bytes');
    fclose($failed_output);
    unset($restored_db);
    tf_delete($db, $two['id']);
    check(file_get_contents(tf_file_path($config, $three['sha256'])) === $payload, 'deleting duplicate capsule preserves remaining attachment');
    $removed = tf_save($db, $config, array_replace(fixture('Without file'), ['id' => $three['id'], 'remove_file' => '1']));
    check(!$removed['has_file'], 'explicit attachment removal clears its record metadata');
    tf_delete($db, $three['id']);
    tf_delete($db, $one['id']);
    check(tf_list($db) === [], 'delete removes all test capsules');
    rejects(fn() => tf_delete($db, $one['id']), 'delete already-removed capsule', 404);
    // Password changes rewrite config atomically without removing Apache group read access.
    $config_path = $temporary . '/config.local.php';
    file_put_contents($config_path, "<?php\nreturn " . var_export($config, true) . ";\n");
    chmod($config_path, 0640);
    clearstatcache(true, $config_path);
    $config_group = filegroup($config_path);
    $environment = getenv();
    foreach (['TIMEFOLD_DSN', 'TIMEFOLD_DB_USER', 'TIMEFOLD_DB_PASSWORD', 'TIMEFOLD_DATA_DIR',
        'TIMEFOLD_PASSWORD', 'TIMEFOLD_PASSWORD_HASH', 'TIMEFOLD_ARCHIVE_NAME'] as $key) {
        unset($environment[$key]);
    }
    $environment['TIMEFOLD_CONFIG_PATH'] = $config_path;
    $process = proc_open([PHP_BINARY, __DIR__ . '/../bin/timefold.php', 'password', '--password-stdin'],
        [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes, dirname(__DIR__), $environment);
    check(is_resource($process), 'password CLI starts with an isolated config');
    fwrite($pipes[0], "Changed-test-password-2031\n");
    fclose($pipes[0]);
    $cli_output = stream_get_contents($pipes[1]);
    $cli_error = stream_get_contents($pipes[2]);
    fclose($pipes[1]);
    fclose($pipes[2]);
    $cli_status = proc_close($process);
    check($cli_status === 0, 'password CLI succeeds: ' . $cli_error);
    clearstatcache(true, $config_path);
    check((fileperms($config_path) & 0777) === 0640, 'password CLI preserves existing config mode 0640');
    check(filegroup($config_path) === $config_group, 'password CLI preserves existing config group');
    $rewritten_config = require $config_path;
    check(password_verify('Changed-test-password-2031', $rewritten_config['password_hash']), 'password CLI stores a hash of the new password');
    check($rewritten_config['dsn'] === $config['dsn'], 'password CLI preserves the archive database connection');
    check(!str_contains($cli_output, 'Changed-test-password-2031'), 'password CLI does not echo passwords supplied through stdin');
    unset($db);
    echo "PASS: $checks domain and storage checks\n";
} finally {
    unset($db, $restored_db);
    remove_tree($temporary);
}
