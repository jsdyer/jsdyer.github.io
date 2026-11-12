<?php
declare(strict_types=1);
require_once __DIR__ . '/../app/backup.php';

header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: no-referrer');

try {
    $config = tf_config();
    tf_session($config);
    $action = $_GET['action'] ?? 'session';
    $method = $_SERVER['REQUEST_METHOD'];
    $read = ['session', 'list', 'file', 'export'];
    $write = ['login', 'logout', 'save', 'delete', 'import'];
    if (!in_array($action, array_merge($read, $write), true)) { throw new TimefoldError('Unknown action.', 404); }
    if (($method !== 'GET' || !in_array($action, $read, true)) && ($method !== 'POST' || !in_array($action, $write, true))) {
        header('Allow: ' . (in_array($action, $read, true) ? 'GET' : 'POST'));
        throw new TimefoldError('This action uses a different HTTP method.', 405);
    }
    if ($method === 'POST') { tf_require_csrf(); }
    if ($action === 'session') {
        $demo = false;
        if (!empty($_SESSION['authenticated'])) {
            $db = tf_db($config);
            $demo = $db->query("SELECT meta_value FROM timefold_meta WHERE meta_key = 'demo'")->fetchColumn() === '1';
        }
        tf_json([
            'authenticated' => !empty($_SESSION['authenticated']), 'csrf' => $_SESSION['csrf'],
            'archiveName' => $config['archive_name'], 'demo' => $demo, 'version' => TIMEFOLD_VERSION,
            'initialized' => $config['dsn'] !== '' && $config['password_hash'] !== '',
        ]);
    }
    $json = [];
    if (str_contains($_SERVER['CONTENT_TYPE'] ?? '', 'application/json')) {
        $body = file_get_contents('php://input', false, null, 0, 32769);
        if (strlen($body) > 32768) { throw new TimefoldError('Request too large.', 413); }
        try { $object = json_decode($body, false, 32, JSON_THROW_ON_ERROR); }
        catch (JsonException) { throw new TimefoldError('Invalid JSON request.'); }
        if (!is_object($object)) { throw new TimefoldError('Send a JSON object.'); }
        $json = (array) $object;
    }
    if ($action === 'login') {
        if (!is_string($json['password'] ?? null)) { throw new TimefoldError('Enter your owner password.'); }
        tf_login($config, $json['password']);
        tf_json(['authenticated' => true, 'csrf' => $_SESSION['csrf']]);
    }
    if (empty($_SESSION['authenticated'])) { throw new TimefoldError('Unlock your archive first.', 401); }
    if ($action === 'logout') {
        $_SESSION = ['csrf' => bin2hex(random_bytes(32))];
        session_regenerate_id(true);
        tf_json(['authenticated' => false, 'csrf' => $_SESSION['csrf']]);
    }
    $db = tf_db($config);
    if ($action === 'list') { tf_json(['capsules' => tf_list($db)]); }
    if ($action === 'save') {
        if (empty($_POST) && (int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) { throw new TimefoldError('Upload exceeded the PHP post limit. See the installation guide.', 413); }
        tf_json(['capsule' => tf_save($db, $config, $_POST, $_FILES['attachment'] ?? null)]);
    }
    if ($action === 'delete') {
        tf_delete($db, (string) ($json['id'] ?? ''));
        tf_json(['deleted' => true]);
    }
    if ($action === 'file') {
        $capsule = tf_find($db, (string) ($_GET['id'] ?? ''));
        if (!$capsule || !$capsule['has_file']) { throw new TimefoldError('Attachment not found.', 404); }
        $path = tf_file_path($config, $capsule['sha256']);
        if (!is_file($path)) { throw new TimefoldError('Attachment bytes are missing from this server.', 404); }
        $inline = $capsule['is_image'] && ($_GET['download'] ?? '') !== '1';
        session_write_close();
        header('Content-Type: ' . ($inline ? $capsule['file_mime'] : 'application/octet-stream'));
        header("Content-Disposition: " . ($inline ? 'inline' : 'attachment') . "; filename=\"attachment\"; filename*=UTF-8''" . rawurlencode($capsule['file_name']));
        header('Content-Length: ' . filesize($path));
        header("Content-Security-Policy: default-src 'none'; sandbox");
        readfile($path);
        exit;
    }
    if ($action === 'export') {
        // Validate before headers so a broken archive produces a useful JSON error.
        if (tf_verify($db, $config)['errors']) { throw new TimefoldError('An attachment is missing or damaged. Run php bin/timefold.php verify.', 409); }
        session_write_close();
        header('Content-Type: application/x-ndjson; charset=utf-8');
        header('Content-Disposition: attachment; filename="timefold-' . gmdate('Y-m-d') . '.timefold.ndjson"');
        $output = fopen('php://output', 'wb');
        tf_export($db, $config, $output);
        fclose($output);
        exit;
    }
    if ($action === 'import') {
        $upload = $_FILES['backup'] ?? null;
        if (!$upload || ($upload['error'] ?? 1) !== UPLOAD_ERR_OK) { throw new TimefoldError('Choose a .timefold.ndjson backup. Check the PHP post/upload limits if the upload failed.', 413); }
        if (filesize($upload['tmp_name']) > TIMEFOLD_WEB_BACKUP_LIMIT) { throw new TimefoldError('Browser imports are limited to 64 MiB. Use the CLI import command for a larger backup.', 413); }
        tf_json(tf_import($db, $config, $upload['tmp_name']));
    }
} catch (TimefoldError $e) {
    tf_json(['error' => $e->getMessage()], $e->status);
} catch (PDOException $e) {
    error_log('Timefold database error: ' . $e->getMessage());
    tf_json(['error' => 'The archive database is unavailable or not initialized. Check the server configuration and run the init command.'], 503);
} catch (Throwable $e) {
    error_log('Timefold error: ' . $e->getMessage());
    tf_json(['error' => 'Timefold could not complete this request. Check the server error log.'], 500);
}
