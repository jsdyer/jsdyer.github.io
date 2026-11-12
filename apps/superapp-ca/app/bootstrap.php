<?php
declare(strict_types=1);

const ROOT = __DIR__ . '/..';
$config = require ROOT . '/config/config.example.php';
if (is_file(ROOT . '/config/local.php')) $config = array_replace($config, require ROOT . '/config/local.php');
foreach ($config as $key => $value) {
    $env = getenv('SUPERAPP_' . strtoupper($key));
    if ($env !== false) $config[$key] = is_bool($value) ? filter_var($env, FILTER_VALIDATE_BOOLEAN) : $env;
}
date_default_timezone_set('UTC');
ini_set('display_errors','0');
ini_set('log_errors','1');
require __DIR__ . '/database.php';
require __DIR__ . '/domain.php';
require __DIR__ . '/view.php';

function cfg(string $key): mixed { global $config; return $config[$key] ?? null; }
function esc(mixed $value): string { return htmlspecialchars((string)$value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
function url(string $path = ''): string { return rtrim((string)cfg('app_url'), '/') . $path; }
function fail(int $code, string $message): never { throw new HttpError($message, $code); }
class HttpError extends RuntimeException {}
function redirect(string $path): never { header('Location: ' . $path, true, 303); exit; }
function json_response(mixed $data, int $status = 200): never {
    http_response_code($status); header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR); exit;
}
function start_session(): void {
    if (session_status() === PHP_SESSION_ACTIVE) return;
    $sessions=ROOT.'/var/sessions';
    if(!is_dir($sessions)&&!mkdir($sessions,0700,true)&&!is_dir($sessions))throw new RuntimeException('Session storage is not writable.');
    session_save_path($sessions);
    ini_set('session.use_strict_mode', '1'); ini_set('session.use_only_cookies', '1');
    session_name('superapp_session');
    session_set_cookie_params(['lifetime'=>0, 'path'=>'/', 'secure'=>cfg('session_secure'), 'httponly'=>true, 'samesite'=>'Lax']);
    if(!session_start())throw new RuntimeException('Could not start a session.');
    if (!isset($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
}
function csrf(): string { return '<input type="hidden" name="csrf" value="' . esc($_SESSION['csrf']) . '">'; }
function check_csrf(): void {
    if (!is_string($_POST['csrf'] ?? null) || !hash_equals($_SESSION['csrf'], $_POST['csrf'])) fail(403, 'Your form expired. Reload the page and try again.');
}
function flash(string $message): void { $_SESSION['flash'] = $message; }
function current_user(): ?array {
    if (empty($_SESSION['user_id'])) return null;
    $u = one('SELECT * FROM users WHERE id = ? AND suspended = 0', [$_SESSION['user_id']]);
    if ($u && (int)$u['auth_version'] !== (int)($_SESSION['auth_version'] ?? 0)) $u=null;
    if (!$u) unset($_SESSION['user_id']);
    return $u;
}
function require_user(): array { $u=current_user(); if (!$u) fail(401, 'Please sign in to use your workspace.'); return $u; }
function require_admin(): array { $u=require_user(); if ($u['role'] !== 'admin') fail(403, 'This action is for instance administrators.'); return $u; }
function protect_demo(array $user): void { if (cfg('demo') && $user['username'] === 'maple') fail(403, 'The shared example account is read-only. Create your own account to try publishing.'); }
function security_headers(): void {
    header("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    header('X-Content-Type-Options: nosniff'); header('Referrer-Policy: no-referrer');
    header('X-Frame-Options: DENY'); header('Permissions-Policy: camera=(), microphone=(), geolocation=()');
    header('Cache-Control: no-store');
    if (cfg('session_secure')) header('Strict-Transport-Security: max-age=31536000');
}
