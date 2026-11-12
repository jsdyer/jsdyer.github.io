<?php
declare(strict_types=1);
require_once __DIR__ . '/bootstrap.php';

function tf_tags(mixed $input): array
{
    $values = is_array($input) ? $input : explode(',', (string) $input);
    if (count($values) > 20) { throw new TimefoldError('Use at most 20 tags.'); }
    $tags = [];
    foreach ($values as $value) {
        if (!is_string($value)) { throw new TimefoldError('Tags must be text.'); }
        $tag = strtolower(trim($value));
        if ($tag === '') { continue; }
        if (!preg_match('//u', $tag) || strlen($tag) > 40 || preg_match('/[\x00-\x1f,]/', $tag)) { throw new TimefoldError('Keep each tag under 40 bytes, without commas or control characters.'); }
        $tags[$tag] = true;
    }
    return array_keys($tags);
}

function tf_validate(array $input): array
{
    $string = static function (string $key, int $limit, string $default = '') use ($input): string {
        $value = $input[$key] ?? $default;
        if (!is_string($value) || !preg_match('//u', $value) || strlen($value) > $limit || str_contains($value, "\0")) {
            throw new TimefoldError('Invalid or too-long ' . str_replace('_', ' ', $key) . '.');
        }
        return trim($value);
    };
    $id = $string('id', 32) ?: tf_id();
    if (!preg_match('/^[a-f0-9]{32}$/D', $id)) { throw new TimefoldError('Invalid capsule ID.'); }
    $title = $string('title', 180);
    if ($title === '') { throw new TimefoldError('Give this capsule a title.'); }
    $date = $string('date', 10);
    $parsed = DateTimeImmutable::createFromFormat('!Y-m-d', $date);
    if (!$parsed || $parsed->format('Y-m-d') !== $date || $date < '0001-01-01') { throw new TimefoldError('Use a real date in YYYY-MM-DD format.'); }
    $kind = $string('kind', 16, 'note');
    if (!in_array($kind, ['photo', 'note', 'save', 'web'], true)) { throw new TimefoldError('Choose photo, note, save, or web.'); }
    $timestamps = [];
    foreach (['created_at', 'updated_at'] as $key) {
        if (isset($input[$key])) {
            $stamp = $string($key, 25);
            $parsedStamp = DateTimeImmutable::createFromFormat('!Y-m-d\\TH:i:s\\Z', $stamp, new DateTimeZone('UTC'));
            if (!$parsedStamp || $parsedStamp->format('Y-m-d\\TH:i:s\\Z') !== $stamp) { throw new TimefoldError('Invalid backup ' . $key . '.'); }
            $timestamps[$key] = $stamp;
        }
    }
    return $timestamps + [
        'id' => $id, 'title' => $title, 'note' => $string('note', 16000), 'date' => $date,
        'kind' => $kind, 'tags' => tf_tags($input['tags'] ?? []), 'source' => $string('source', 2048),
    ];
}

function tf_capsule(array $row): array
{
    $row['date'] = $row['capsule_date'];
    unset($row['capsule_date']);
    $row['tags'] = json_decode($row['tags'], true, 32, JSON_THROW_ON_ERROR);
    $row['file_size'] = (int) $row['file_size'];
    $row['has_file'] = $row['sha256'] !== '';
    $row['is_image'] = $row['has_file'] && in_array($row['file_mime'], ['image/jpeg', 'image/png', 'image/webp'], true);
    $row['file_url'] = $row['has_file'] ? 'api.php?action=file&id=' . rawurlencode($row['id']) : null;
    return $row;
}

function tf_list(PDO $db): array
{
    return array_map('tf_capsule', $db->query('SELECT * FROM capsules ORDER BY capsule_date DESC, created_at DESC')->fetchAll());
}

function tf_find(PDO $db, string $id): ?array
{
    $stmt = $db->prepare('SELECT * FROM capsules WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    return $row ? tf_capsule($row) : null;
}

function tf_file_metadata(string $path, string $name): array
{
    $size = filesize($path);
    if ($size === false || $size > TIMEFOLD_MAX_FILE) { throw new TimefoldError('Attachments can be at most 8 MiB.', 413); }
    $name = basename(str_replace('\\', '/', $name));
    $name = preg_replace('/[\x00-\x1f\x7f]/', '', $name) ?: 'attachment';
    if (!preg_match('//u', $name)) { $name = 'attachment'; }
    $name = strlen($name) > 240 ? 'attachment' : $name;
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($path) ?: 'application/octet-stream';
    if (in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true)) {
        $image = @getimagesize($path);
        if (!$image || $image[0] > 20000 || $image[1] > 20000 || ($image['mime'] ?? '') !== $mime) {
            throw new TimefoldError('This image is invalid or exceeds 20,000 pixels on one side.');
        }
    } else { $mime = 'application/octet-stream'; }
    return ['file_name' => $name, 'file_mime' => $mime, 'file_size' => $size, 'sha256' => hash_file('sha256', $path)];
}

function tf_store_file(array $config, string $path, string $hash): void
{
    $destination = tf_file_path($config, $hash);
    if (is_file($destination)) {
        if (!hash_equals($hash, hash_file('sha256', $destination))) { throw new TimefoldError('An existing attachment failed its integrity check.', 500); }
        return;
    }
    // An exclusive temporary file and rename keep readers from seeing partial bytes.
    $temp = tempnam($config['data_dir'] . '/staging', 'file-');
    if ($temp === false) { throw new TimefoldError('Cannot create attachment staging file.', 503); }
    try {
        if (!copy($path, $temp) || !rename($temp, $destination)) { throw new TimefoldError('Cannot save attachment.', 503); }
        chmod($destination, 0600);
    } finally { if (is_file($temp)) { unlink($temp); } }
}

function tf_write(PDO $db, array $capsule, array $file, ?array $previous = null): array
{
    $now = tf_now();
    $values = [
        $capsule['title'], $capsule['note'], $capsule['date'], $capsule['kind'],
        json_encode($capsule['tags'], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR), $capsule['source'],
        $file['file_name'], $file['file_mime'], $file['file_size'], $file['sha256'],
        $previous['created_at'] ?? $capsule['created_at'] ?? $now, $capsule['updated_at'] ?? $now, $capsule['id'],
    ];
    if ($previous) {
        $stmt = $db->prepare('UPDATE capsules SET title=?,note=?,capsule_date=?,kind=?,tags=?,source=?,file_name=?,file_mime=?,file_size=?,sha256=?,created_at=?,updated_at=? WHERE id=?');
    } else {
        $stmt = $db->prepare('INSERT INTO capsules (title,note,capsule_date,kind,tags,source,file_name,file_mime,file_size,sha256,created_at,updated_at,id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)');
    }
    $stmt->execute($values);
    return tf_find($db, $capsule['id']);
}

function tf_save(PDO $db, array $config, array $input, ?array $upload = null): array
{
    $capsule = tf_validate($input);
    unset($capsule['created_at'], $capsule['updated_at']);
    $previous = !empty($input['id']) ? tf_find($db, $capsule['id']) : null;
    if (!empty($input['id']) && !$previous) { throw new TimefoldError('That capsule no longer exists.', 404); }
    $file = $previous ?: ['file_name' => '', 'file_mime' => '', 'file_size' => 0, 'sha256' => ''];
    if (($input['remove_file'] ?? '') === '1') { $file = ['file_name' => '', 'file_mime' => '', 'file_size' => 0, 'sha256' => '']; }
    if ($upload && ($upload['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
        if (($upload['error'] ?? 1) !== UPLOAD_ERR_OK) { throw new TimefoldError('Upload failed. Check the 8 MiB file limit and PHP upload settings.', 413); }
        $file = tf_file_metadata($upload['tmp_name'], $upload['name']);
        tf_store_file($config, $upload['tmp_name'], $file['sha256']);
    }
    return tf_write($db, $capsule, $file, $previous);
}

function tf_delete(PDO $db, string $id): void
{
    $stmt = $db->prepare('DELETE FROM capsules WHERE id = ?');
    $stmt->execute([$id]);
    if ($stmt->rowCount() === 0) { throw new TimefoldError('That capsule no longer exists.', 404); }
    // Bytes are retained until an explicit maintenance run, allowing safe concurrent readers/imports.
}

function tf_demo(PDO $db): void
{
    require_once __DIR__ . '/demo.php';
    foreach (tf_demo_capsules() as $input) {
        tf_write($db, tf_validate($input), ['file_name' => '', 'file_mime' => '', 'file_size' => 0, 'sha256' => '']);
    }
    $db->exec("UPDATE timefold_meta SET meta_value = '1' WHERE meta_key = 'demo'");
}
