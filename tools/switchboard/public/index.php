<?php
declare(strict_types=1);

function html(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function loadServices(string $path): array
{
    $json = @file_get_contents($path);
    if ($json === false) {
        throw new RuntimeException('Check the path and read permissions.');
    }
    $records = json_decode($json, false, 32, JSON_THROW_ON_ERROR);
    if (!is_array($records)) {
        throw new RuntimeException('The file must contain a JSON array.');
    }
    $groups = [];
    foreach ($records as $i => $record) {
        $row = $i + 1;
        foreach (['group', 'name', 'url'] as $field) {
            if (!is_object($record) || !is_string($record->$field ?? null) || trim($record->$field) === '') {
                throw new RuntimeException("Entry $row needs a nonempty $field.");
            }
        }
        if (property_exists($record, 'note') && !is_string($record->note)) {
            throw new RuntimeException("The note on entry $row must be text.");
        }
        $url = $record->url;
        $parts = parse_url($url);
        if (!filter_var($url, FILTER_VALIDATE_URL) || !$parts
            || !in_array(strtolower($parts['scheme'] ?? ''), ['https', 'http'], true)
            || empty($parts['host']) || isset($parts['user']) || str_contains($url, '\\')
            || preg_match('/[\x00-\x20\x7f]/', $url)) {
            throw new RuntimeException("Entry $row needs an HTTP or HTTPS URL without embedded credentials.");
        }
        $groups[$record->group][] = $record;
    }
    return $groups;
}

if (!empty($_SERVER['PATH_INFO']) && $_SERVER['PATH_INFO'] !== '/') {
    http_response_code(404);
    header('Content-Type: text/plain; charset=UTF-8');
    exit("Page not found.\n");
}

$path = getenv('SWITCHBOARD_CONFIG');
$demo = $path === false || $path === '';
header('Content-Type: text/html; charset=UTF-8');
header('Cache-Control: no-store');
header('Referrer-Policy: no-referrer');
$error = false;
try {
    $groups = loadServices($demo ? dirname(__DIR__) . '/services.example.json' : $path);
} catch (RuntimeException | JsonException $e) {
    http_response_code(500);
    error_log('Switchboard: ' . $e->getMessage());
    $groups = [];
    $error = true;
}
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Switchboard · CoolCode</title>
  <link rel="stylesheet" href="switchboard.css">
</head>
<body>
<main>
  <header>
    <span class="imprint">coolcode.ca / self-hosting</span>
    <h1>Switchboard<span aria-hidden="true">_</span></h1>
    <p>Your local service directory.</p>
  </header>
  <?php if ($error): ?>
    <p role="alert" class="notice">The directory could not load. Check the server error log for the configuration issue.</p>
  <?php elseif ($demo): ?>
    <p class="notice">Example directory. Set <code>SWITCHBOARD_CONFIG</code> to a JSON file containing your service URLs.</p>
  <?php elseif (!$groups): ?>
    <p class="notice">Your directory is empty. Add a service to your configuration file.</p>
  <?php endif; ?>
  <?php foreach ($groups as $group => $services): ?>
    <section>
      <h2><?= html((string) $group) ?></h2>
      <ul>
        <?php foreach ($services as $service): ?>
          <li>
            <a href="<?= html($service->url) ?>">
              <strong><?= html($service->name) ?></strong>
              <?php if (($service->note ?? '') !== ''): ?><span><?= html($service->note) ?></span><?php endif; ?>
              <code><?= html($service->url) ?></code>
            </a>
          </li>
        <?php endforeach; ?>
      </ul>
    </section>
  <?php endforeach; ?>
</main>
</body>
</html>
