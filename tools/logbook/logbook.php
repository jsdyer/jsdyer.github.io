<?php

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

$usage = "Usage: php logbook.php [FILE|-]\n"
    . "Read an Apache Common or Combined access log from a local file or standard input.\n";
if ($argc === 2 && in_array($argv[1], ['-h', '--help'], true)) {
    fwrite(STDOUT, $usage);
    exit(0);
}
if ($argc > 2) {
    fwrite(STDERR, $usage);
    exit(2);
}

$input = STDIN;
if ($argc === 2 && $argv[1] !== '-') {
    $path = realpath($argv[1]);
    if ($path === false || !is_file($path) || ($input = @fopen($path, 'rb')) === false) {
        fwrite(STDERR, "Unable to open a regular log file. You can pipe a log on standard input.\n");
        exit(2);
    }
}

// Capture the timestamp, final HTTP status and response-body bytes. The optional
// leading field supports vhost_combined. Quoted fields may contain escaped quotes.
$pattern = <<<'REGEX'
~\A(?:\S+\h+){3,4}\[(?<time>\d{2}/[A-Za-z]{3}/\d{4}:\d{2}:\d{2}:\d{2} [+-]\d{4})\]\h+"(?:[^"\\]++|\\.)*"\h+(?<status>[1-5]\d{2})\h+(?<bytes>\d+|-)(?:\h+"(?:[^"\\]++|\\.)*"\h+"(?:[^"\\]++|\\.)*")?\h*\z~
REGEX;
$days = [];
$statuses = [];
$read = 0;
$skipped = 0;

while (($line = fgets($input)) !== false) {
    ++$read;
    if (!preg_match($pattern, rtrim($line, "\r\n"), $entry)) {
        ++$skipped;
        continue;
    }
    $date = DateTimeImmutable::createFromFormat('!d/M/Y:H:i:s O', $entry['time']);
    $errors = DateTimeImmutable::getLastErrors();
    if ($date === false || ($errors && ($errors['warning_count'] || $errors['error_count']))) {
        ++$skipped;
        continue;
    }

    $day = $date->format('Y-m-d');
    $status = (int) $entry['status'];
    $family = intdiv($status, 100);
    $days[$day] ??= ['requests' => 0, 'families' => array_fill(1, 5, 0), 'bytes' => 0];
    ++$days[$day]['requests'];
    ++$days[$day]['families'][$family];
    $days[$day]['bytes'] += ($entry['bytes'] === '-') ? 0 : (int) $entry['bytes'];
    $statuses[$status] = ($statuses[$status] ?? 0) + 1;
}
if (!feof($input)) {
    fwrite(STDERR, "The input stream could not be read completely.\n");
    exit(2);
}

if ($days) {
    ksort($days, SORT_STRING);
    printf("%-10s %9s %7s %7s %7s %7s %7s %14s\n",
        'Date', 'Requests', '1xx', '2xx', '3xx', '4xx', '5xx', 'Body bytes');
    foreach ($days as $day => $counts) {
        printf("%-10s %9d %7d %7d %7d %7d %7d %14d\n",
            $day, $counts['requests'], $counts['families'][1], $counts['families'][2],
            $counts['families'][3], $counts['families'][4], $counts['families'][5], $counts['bytes']);
    }

    ksort($statuses, SORT_NUMERIC);
    $codes = [];
    foreach ($statuses as $status => $count) {
        $codes[] = "$status=$count";
    }
    echo "\nHTTP status counts  " . implode('  ', $codes) . "\n";
} else {
    echo "No matching access-log entries.\n";
}
printf("Lines read %d, counted %d, skipped %d.\n", $read, $read - $skipped, $skipped);
exit($skipped ? 1 : 0);
