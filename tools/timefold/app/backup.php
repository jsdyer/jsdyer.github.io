<?php
declare(strict_types=1);
require_once __DIR__ . '/archive.php';

function tf_verify(PDO $db, array $config): array
{
    $checked = [];
    $errors = [];
    foreach ($db->query("SELECT id,sha256,file_size FROM capsules WHERE sha256 <> ''") as $row) {
        $hash = $row['sha256'];
        if (isset($checked[$hash])) { continue; }
        $checked[$hash] = true;
        $path = tf_file_path($config, $hash);
        if (!is_file($path) || filesize($path) !== (int) $row['file_size'] || !hash_equals($hash, hash_file('sha256', $path))) {
            $errors[] = ['id' => $row['id'], 'sha256' => $hash];
        }
    }
    return ['checked' => count($checked), 'errors' => $errors];
}

function tf_export(PDO $db, array $config, $output): void
{
    if (!is_resource($output)) { throw new TimefoldError('Cannot open backup output.'); }
    $verification = tf_verify($db, $config);
    if ($verification['errors']) { throw new TimefoldError('An attachment is missing or damaged. Run php bin/timefold.php verify before exporting.', 409); }
    $flags = JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR;
    fwrite($output, json_encode(['format' => 'timefold', 'version' => 1, 'exported_at' => tf_now()], $flags) . "\n");
    foreach ($db->query('SELECT * FROM capsules ORDER BY capsule_date, id') as $row) {
        $capsule = tf_capsule($row);
        unset($capsule['file_url'], $capsule['is_image'], $capsule['has_file']);
        $capsule['attachment'] = $capsule['sha256'] === '' ? null : [
            'sha256' => $capsule['sha256'],
            'data' => base64_encode(file_get_contents(tf_file_path($config, $capsule['sha256']))),
        ];
        if (fwrite($output, json_encode($capsule, $flags) . "\n") === false) { throw new TimefoldError('Writing the backup failed.', 500); }
    }
}

function tf_import(PDO $db, array $config, string $path): array
{
    $input = fopen($path, 'rb');
    if ($input === false) { throw new TimefoldError('Cannot read the backup.'); }
    tf_directories($config);
    $stage = $config['data_dir'] . '/staging/import-' . bin2hex(random_bytes(12));
    if (!mkdir($stage, 0700)) { fclose($input); throw new TimefoldError('Cannot prepare backup staging.', 503); }
    $metadata = fopen($stage . '/records.ndjson', 'w+b');
    if ($metadata === false) { fclose($input); rmdir($stage); throw new TimefoldError('Cannot stage backup metadata.', 503); }
    $lineNumber = 1;
    $seen = [];
    $stagedHashes = [];
    try {
        $header = fgets($input, 4098);
        $description = $header === false ? null : json_decode($header, true);
        if (!is_array($description) || ($description['format'] ?? null) !== 'timefold' || ($description['version'] ?? null) !== 1) {
            throw new TimefoldError('This is not a Timefold v1 NDJSON backup.');
        }
        while (($line = fgets($input, 12 * 1024 * 1024 + 2)) !== false) {
            $lineNumber++;
            if (strlen($line) > 12 * 1024 * 1024 || (!str_ends_with($line, "\n") && !feof($input))) {
                throw new TimefoldError('A backup record exceeds the 12 MiB line limit.', 413);
            }
            if (trim($line) === '') { continue; }
            try { $record = json_decode($line, true, 64, JSON_THROW_ON_ERROR); }
            catch (JsonException) { throw new TimefoldError('Invalid JSON at backup line ' . $lineNumber . '.'); }
            if (!is_array($record) || array_is_list($record) || !isset($record['id'])) { throw new TimefoldError('Missing capsule at backup line ' . $lineNumber . '.'); }
            if (!is_string($record['id']) || !preg_match('/^[a-f0-9]{32}$/D', $record['id'])) { throw new TimefoldError('Invalid capsule ID at backup line ' . $lineNumber . '.'); }
            $capsule = tf_validate($record);
            if (isset($seen[$capsule['id']])) { throw new TimefoldError('A capsule ID appears twice in the backup.'); }
            $seen[$capsule['id']] = true;
            $file = ['file_name' => '', 'file_mime' => '', 'file_size' => 0, 'sha256' => ''];
            $attachment = $record['attachment'] ?? null;
            if ($attachment !== null) {
                if (!is_array($attachment) || !is_string($attachment['data'] ?? null) || strlen($attachment['data']) > 4 * (int) ceil(TIMEFOLD_MAX_FILE / 3)) {
                    throw new TimefoldError('Invalid or oversized attachment at backup line ' . $lineNumber . '.', 413);
                }
                $bytes = base64_decode($attachment['data'], true);
                if ($bytes === false || strlen($bytes) > TIMEFOLD_MAX_FILE) { throw new TimefoldError('Invalid attachment encoding at backup line ' . $lineNumber . '.'); }
                $hash = hash('sha256', $bytes);
                if (($attachment['sha256'] ?? '') !== $hash || ($record['sha256'] ?? '') !== $hash) {
                    throw new TimefoldError('Attachment fingerprint mismatch at backup line ' . $lineNumber . '.');
                }
                if (!is_string($record['file_name'] ?? null) || ($record['file_name'] ?? '') === '') { throw new TimefoldError('Attachment filename is missing.'); }
                $staged = $stage . '/' . $hash . '.blob';
                if (!isset($stagedHashes[$hash])) {
                    if (file_put_contents($staged, $bytes) !== strlen($bytes)) { throw new TimefoldError('Cannot stage the backup attachment.', 503); }
                    $stagedHashes[$hash] = true;
                }
                unset($bytes);
                $file = tf_file_metadata($staged, $record['file_name']);
                if (isset($record['file_size']) && (int) $record['file_size'] !== $file['file_size']) { throw new TimefoldError('Attachment size mismatch at backup line ' . $lineNumber . '.'); }
            } elseif (($record['sha256'] ?? '') !== '' || !empty($record['file_name']) || !empty($record['file_size'])) {
                throw new TimefoldError('A backup capsule references an attachment without its bytes.');
            }
            fwrite($metadata, json_encode(['capsule' => $capsule, 'file' => $file], JSON_THROW_ON_ERROR) . "\n");
        }
        if (!feof($input)) { throw new TimefoldError('The backup could not be read completely.'); }
        // Only after every line validates can files be promoted or rows change.
        foreach (array_keys($stagedHashes) as $hash) { tf_store_file($config, $stage . '/' . $hash . '.blob', $hash); }
        rewind($metadata);
        $db->beginTransaction();
        $imported = 0;
        $skipped = 0;
        while (($line = fgets($metadata)) !== false) {
            $item = json_decode($line, true, 64, JSON_THROW_ON_ERROR);
            if (tf_find($db, $item['capsule']['id'])) { $skipped++; continue; }
            tf_write($db, $item['capsule'], $item['file']);
            $imported++;
        }
        $db->commit();
        return ['imported' => $imported, 'skipped' => $skipped];
    } catch (Throwable $e) {
        if ($db->inTransaction()) { $db->rollBack(); }
        throw $e;
    } finally {
        fclose($input);
        if (is_resource($metadata)) { fclose($metadata); }
        foreach (glob($stage . '/*') ?: [] as $file) { unlink($file); }
        rmdir($stage);
    }
}
