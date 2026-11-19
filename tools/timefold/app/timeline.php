<?php
declare(strict_types=1);
require_once __DIR__ . '/archive.php';

function tf_import_csv(PDO $db, string $path): array
{
    if (!is_file($path) || !is_readable($path)) { throw new TimefoldError('Choose a readable UTF-8 timeline CSV.'); }
    if (filesize($path) > 8 * 1024 * 1024) { throw new TimefoldError('Timeline CSV files can be at most 8 MiB.', 413); }
    $input = fopen($path, 'rb');
    if (!$input) { throw new TimefoldError('Cannot open the timeline CSV.'); }
    try {
        if (fread($input, 3) !== "\xEF\xBB\xBF") { rewind($input); }
        $fields = fgetcsv($input, null, ',', '"', '');
        if (!$fields) { throw new TimefoldError('The timeline CSV is empty.'); }
        $fields = array_map(static fn($field) => strtolower(trim((string) $field)), $fields);
        $allowed = ['date', 'title', 'kind', 'note', 'tags', 'source'];
        if (array_diff(['date', 'title'], $fields) || array_diff($fields, $allowed) || count($fields) !== count(array_unique($fields))) {
            throw new TimefoldError('CSV needs date and title. Optional columns are kind, note, tags and source. Use each header once.');
        }
        $file = ['file_name' => '', 'file_mime' => '', 'file_size' => 0, 'sha256' => ''];
        $record = 1;
        $imported = 0;
        $skipped = 0;
        $db->beginTransaction();
        while (($cells = fgetcsv($input, null, ',', '"', '')) !== false) {
            $record++;
            if ($cells === [null]) { continue; }
            if ($imported + $skipped >= 10000) { throw new TimefoldError('Use at most 10,000 timeline records per CSV.', 413); }
            if (count($cells) !== count($fields)) { throw new TimefoldError("CSV record $record has the wrong number of fields."); }
            $item = array_combine($fields, $cells);
            if (trim($item['kind'] ?? '') === '') { $item['kind'] = 'note'; }
            try { $capsule = tf_validate($item); }
            catch (TimefoldError $error) { throw new TimefoldError("CSV record $record: " . $error->getMessage()); }
            unset($capsule['id']);
            // Canonical field order comes from tf_validate even if CSV columns were rearranged.
            $capsule['id'] = substr(hash('sha256', 'timefold-timeline-v1:' . json_encode($capsule, JSON_THROW_ON_ERROR)), 0, 32);
            if (tf_find($db, $capsule['id'])) { $skipped++; continue; }
            tf_write($db, $capsule, $file);
            $imported++;
        }
        if (!feof($input)) { throw new TimefoldError('The CSV could not be read completely.'); }
        if (!$imported && !$skipped) { throw new TimefoldError('Add at least one dated record after the CSV header.'); }
        $db->commit();
        return ['imported' => $imported, 'skipped' => $skipped];
    } catch (Throwable $e) {
        if ($db->inTransaction()) { $db->rollBack(); }
        throw $e;
    } finally { fclose($input); }
}
