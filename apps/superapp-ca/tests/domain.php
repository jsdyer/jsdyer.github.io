<?php
declare(strict_types=1);
// Always use an isolated database. Set SUPERAPP_TEST_DSN for a disposable MariaDB database.
putenv('SUPERAPP_DSN='.(getenv('SUPERAPP_TEST_DSN')?:'sqlite::memory:'));
putenv('SUPERAPP_DB_USER='.(getenv('SUPERAPP_TEST_DB_USER')?:''));
putenv('SUPERAPP_DB_PASS='.(getenv('SUPERAPP_TEST_DB_PASS')?:''));
putenv('SUPERAPP_DEMO=false');
require __DIR__.'/../app/bootstrap.php';
$checks=0;
function ok(bool $value,string $label):void{global $checks;if(!$value)throw new RuntimeException('FAILED: '.$label);$checks++;echo "ok {$checks} - {$label}\n";}
function rejects(callable $fn,int $code,string $label):void{try{$fn();}catch(HttpError $e){ok($e->getCode()===$code,$label);return;}throw new RuntimeException('FAILED: '.$label.' (accepted invalid input)');}
migrate();migrate();
$prefix='test'.bin2hex(random_bytes(4));
$a=create_user(['username'=>$prefix.'a','email'=>$prefix.'a@example.invalid','password'=>'an excellent test passphrase']);
$b=create_user(['username'=>$prefix.'b','email'=>$prefix.'b@example.invalid','password'=>'another test passphrase']);
try{
    $alice=one('SELECT * FROM users WHERE id=?',[$a]);$bob=one('SELECT * FROM users WHERE id=?',[$b]);
    ok(password_verify('an excellent test passphrase',$alice['password_hash']),'password is hashed and verifiable');
    rejects(fn()=>create_user(['username'=>$prefix.'a','email'=>'duplicate@example.invalid','password'=>'an excellent test passphrase']),422,'duplicate handle rejected');
    rejects(fn()=>username('admin'),422,'reserved handle rejected');
    rejects(fn()=>username('../../escape'),422,'path-like handle rejected');
    rejects(fn()=>validate_password('tiny'),422,'short password rejected');
    foreach(['javascript:alert(1)','data:text/html,hello','file:///etc/passwd','//example.org','https://name:secret@example.org/',"https://example.org/\r\nBad: header"] as $bad)rejects(fn()=>web_url($bad,true),422,'unsafe URL rejected');
    ok(web_url('https://example.org/a?b=c')==='https://example.org/a?b=c','HTTPS URL accepted');
    ok(web_url('')==='','optional blank URL accepted');
    rejects(fn()=>input(['body'=>"bad\x01xml"],'body',100),422,'XML-invalid control characters rejected');
    ok(input(['body'=>'Bonjour 🍁'],'body',100)==='Bonjour 🍁','UTF-8 content survives validation');
    $ids=[];
    foreach(APPS as $kind=>$app){$ids[$kind]=save_entry($alice,['kind'=>$kind,'title'=>'A '.$kind,'body'=>'Test body','target_url'=>in_array($kind,['bookmark','archive','link'])?'https://example.org/':'','slug'=>$kind,'visibility'=>'public']);ok($ids[$kind]>0,$kind.' persists');}
    $private=save_entry($alice,['kind'=>'post','title'=>'PRIVATE-SECRET','body'=>'hidden','slug'=>'private-one']);
    $unlisted=save_entry($alice,['kind'=>'post','title'=>'UNLISTED-SECRET','body'=>'not discoverable','slug'=>'unlisted-one','visibility'=>'unlisted']);
    ok(!str_contains(json_encode(public_entries()),'PRIVATE-SECRET'),'private entry excluded from commons');
    ok(!str_contains(json_encode(public_entries()),'UNLISTED-SECRET'),'unlisted entry excluded from commons');
    $row=one('SELECT * FROM entries WHERE id=?',[$private]);
    ok(!visible_entry($row,$bob),'other member cannot view private entry');
    ok(!visible_entry($row,null),'anonymous visitor cannot view private entry');
    ok(visible_entry($row,$alice),'owner can view private entry');
    rejects(fn()=>save_entry($bob,['title'=>'stolen'],$private),404,'cross-account edit rejected');
    rejects(fn()=>delete_entry($bob,$private),404,'cross-account deletion rejected');
    rejects(fn()=>save_entry($alice,['kind'=>'post','title'=>'duplicate','slug'=>'private-one']),422,'duplicate slug rejected');
    rejects(fn()=>save_entry($alice,['kind'=>'admin','title'=>'bad']),422,'unknown kind rejected');
    rejects(fn()=>save_entry($alice,['kind'=>'post','title'=>'bad','visibility'=>'everybody']),422,'unknown visibility rejected');
    rejects(fn()=>save_entry($alice,['kind'=>'status','title'=>'long','body'=>str_repeat('a',1001)]),422,'status length enforced');
    save_entry($alice,['body'=>'Updated'], $private);ok(one('SELECT body FROM entries WHERE id=?',[$private])['body']==='Updated','partial updates preserve entry fields');
    $data=export_account($alice);ok(!isset($data['profile']['password_hash'])&&!isset($data['profile']['email']),'export omits credentials and private contact');
    ok(count($data['entries'])===10,'export includes public, unlisted and private entries');
    $n=import_entries($bob,$data);ok($n===10,'entry export imports successfully');
    ok((int)one("SELECT COUNT(*) AS n FROM entries WHERE user_id=? AND visibility<>'private'",[$b])['n']===0,'imports default to private');
    $broken=$data;$broken['entries'][1]['kind']='invalid';
    rejects(fn()=>import_entries($bob,$broken),422,'bad import rejected');
    ok((int)one('SELECT COUNT(*) AS n FROM entries WHERE user_id=?',[$b])['n']===10,'failed import rolls back all writes');
    $large=$data;$large['entries']=array_fill(0,501,$data['entries'][0]);rejects(fn()=>import_entries($bob,$large),422,'oversized import rejected');
    submit_directory($alice,['name'=>'Example','category'=>'Testing','province'=>'BC','website'=>'https://example.org/','claim'=>'Canadian-owned','evidence_url'=>'https://example.org/about','notes'=>'Self-described connection.']);
    ok(one('SELECT status FROM directory WHERE user_id=?',[$a])['status']==='pending','directory submissions await moderation');
    rejects(fn()=>submit_directory($alice,['name'=>'No evidence','website'=>'https://example.org/','claim'=>'Canadian-owned','evidence_url'=>'']),422,'directory source is required');
    query('UPDATE users SET listed=0 WHERE id=?',[$a]);ok(!str_contains(json_encode(public_entries()),$prefix.'a'),'discovery opt-out excludes public entries from commons');
    ok(count(public_entries('','',0,$a))===8,'direct profile still shows its public entries');
    query('UPDATE users SET suspended=1 WHERE id=?',[$a]);ok(count(public_entries('','',0,$a))===0,'suspended members disappear from public results');
    $scope='test-'.bin2hex(random_bytes(8));rate_limit($scope,2);rate_limit($scope,2);rejects(fn()=>rate_limit($scope,2),429,'rate limiter rejects over-limit requests');
    ok(esc('<script>alert("x")</script>')==='&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;','HTML is escaped at output');
    query('INSERT INTO guestbook (owner_id,author_id,body,created_at) VALUES (?,?,?,?)',[$b,$a,'hello',now()]);
    query('DELETE FROM users WHERE id=?',[$a]);
    ok((int)one('SELECT COUNT(*) AS n FROM entries WHERE user_id=?',[$a])['n']===0,'account deletion cascades entries');
    ok((int)one('SELECT COUNT(*) AS n FROM directory WHERE user_id=?',[$a])['n']===0,'account deletion cascades directory submissions');
    ok((int)one('SELECT COUNT(*) AS n FROM guestbook WHERE author_id=?',[$a])['n']===0,'account deletion cascades guestbook messages');
    echo "PASS: {$checks} checks on ".db()->getAttribute(PDO::ATTR_DRIVER_NAME)."\n";
}finally{query('DELETE FROM users WHERE id IN (?,?)',[$a,$b]);}
