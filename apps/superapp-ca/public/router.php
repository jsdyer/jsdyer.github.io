<?php
// Development server only. Apache uses its virtual host rewrite rule.
$path=parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH) ?: '/';
if (str_starts_with($path,'/assets/')) {
    $real=realpath(__DIR__.$path);
    if($real && str_starts_with($real,__DIR__.'/assets/') && is_file($real)) return false;
}
require __DIR__.'/index.php';
