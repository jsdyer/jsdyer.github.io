<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require __DIR__.'/../app/bootstrap.php';
function secret_prompt(string $label): string {
    fwrite(STDERR,$label);
    $tty=function_exists('stream_isatty')&&stream_isatty(STDIN);
    if($tty&&PHP_OS_FAMILY!=='Windows')system('stty -echo');
    try{$value=rtrim(fgets(STDIN)?:'',"\r\n");}finally{if($tty&&PHP_OS_FAMILY!=='Windows'){system('stty echo');fwrite(STDERR,"\n");}}
    return $value;
}
try{
    $cmd=$argv[1]??'help';
    switch($cmd){
        case 'migrate':migrate();echo "Database schema ready.\n";break;
        case 'seed-demo':require __DIR__.'/../app/seed.php';seed_demo();echo "Example corner ready: /@maple (no known login password).\n";break;
        case 'create-user':case 'create-admin':
            $id=create_user(['username'=>$argv[2]??'','email'=>$argv[3]??'','password'=>secret_prompt('Password (12–72 bytes): ')],$cmd==='create-admin'?'admin':'member');echo "Created account {$id}.\n";break;
        case 'reset-password':
            $u=one('SELECT * FROM users WHERE username=?',[$argv[2]??'']);if(!$u)throw new RuntimeException('Member not found.');$pw=secret_prompt('New password: ');validate_password($pw);
            query('UPDATE users SET password_hash=?,auth_version=auth_version+1 WHERE id=?',[password_hash($pw,PASSWORD_DEFAULT),$u['id']]);query('DELETE FROM api_tokens WHERE user_id=?',[$u['id']]);echo "Password reset. Sessions and API tokens revoked.\n";break;
        case 'set-role':
            $role=$argv[3]??'';if(!in_array($role,['admin','member']))throw new RuntimeException('Use admin or member.');
            $u=one('SELECT * FROM users WHERE username=?',[$argv[2]??'']);if(!$u)throw new RuntimeException('Member not found.');
            if($role==='member'&&$u['role']==='admin'&&(int)one("SELECT COUNT(*) AS n FROM users WHERE role='admin' AND suspended=0")['n']<2)throw new RuntimeException('Create another active admin first.');
            query('UPDATE users SET role=? WHERE id=?',[$role,$u['id']]);echo "Role updated.\n";break;
        case 'cleanup':query('DELETE FROM rate_limits WHERE expires_at < ?',[time()]);echo "Expired rate-limit buckets removed.\n";break;
        default:echo "Superapp console\n\nphp bin/console.php migrate\nphp bin/console.php create-admin USERNAME EMAIL\nphp bin/console.php create-user USERNAME EMAIL\nphp bin/console.php reset-password USERNAME\nphp bin/console.php set-role USERNAME admin|member\nphp bin/console.php seed-demo       # requires SUPERAPP_DEMO=true\nphp bin/console.php cleanup         # schedule daily\n\nPasswords are read from stdin, not command arguments.\n";
    }
}catch(Throwable $e){fwrite(STDERR,$e->getMessage()."\n");exit(1);}
