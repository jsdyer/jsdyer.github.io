<?php
declare(strict_types=1);
const APPS = [
 'status'=>['Signal','Little updates, in chronological order.','radio'],
 'post'=>['Notebook','A small blog for your big rabbit holes.','book'],
 'bookmark'=>['Link shelf','Good corners of the web, kept close.','bookmark'],
 'paste'=>['Paste tin','Scripts, snippets, and plain-text things.','code'],
 'link'=>['Short links','Memorable addresses that you control.','link'],
 'lab'=>['Homelab','Build notes, runbooks, and useful failures.','server'],
 'archive'=>['Time capsule','Catalogue the web worth remembering.','archive'],
 'field'=>['Field notes','Trails, makerspaces, and the in-between.','compass'],
];
function input(array $data, string $key, int $max, string $default=''): string {
    $value=$data[$key] ?? $default;
    if (!is_string($value)) fail(422, "Invalid {$key}.");
    $value=trim($value);
    if (!preg_match('//u',$value) || preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/',$value) || strlen($value)>$max) fail(422,"{$key} is too long or contains invalid text.");
    return $value;
}
function web_url(string $value, bool $required=false): string {
    if ($value==='' && !$required) return '';
    $p=parse_url($value);
    if (!$p || !in_array(strtolower($p['scheme']??''),['https','http'],true) || empty($p['host']) || isset($p['user']) || isset($p['pass']) || preg_match('/[\x00-\x20\x7f]/',$value) || !filter_var($value,FILTER_VALIDATE_URL)) fail(422,'Use a complete http:// or https:// URL without embedded credentials.');
    return $value;
}
function now(): string { return gmdate('Y-m-d\TH:i:s\Z'); }
function username(string $name): string {
    $name=strtolower(trim($name));
    if (!preg_match('/^[a-z][a-z0-9_-]{2,23}$/D',$name) || in_array($name,['admin','api','support','superapp','www','root','help','abuse'])) fail(422,'Use 3–24 lowercase letters, numbers, hyphens or underscores, starting with a letter. Reserved names are unavailable.');
    return $name;
}
function validate_password(string $password): void { if (strlen($password)<12 || strlen($password)>72) fail(422,'Choose a password between 12 and 72 bytes. A few unrelated words work well.'); }
function create_user(array $data, string $role='member'): int {
    $name=username(input($data,'username',24));
    $email=strtolower(input($data,'email',190));
    if (!filter_var($email,FILTER_VALIDATE_EMAIL)) fail(422,'Enter a valid email address.');
    $password=input($data,'password',72); validate_password($password);
    if (one('SELECT id FROM users WHERE username = ? OR email = ?',[$name,$email])) fail(422,'That username or email is unavailable.');
    query('INSERT INTO users (username,email,password_hash,display_name,bio,now_text,uses_text,role,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)',[$name,$email,password_hash($password,PASSWORD_DEFAULT),$name,'','','',$role,now(),now()]);
    return (int)db()->lastInsertId();
}
function save_profile(array $user,array $data): void {
    protect_demo($user);
    $name=input($data,'display_name',80); if ($name==='') fail(422,'Your display name needs a little something.');
    $theme=input($data,'theme',20); if (!in_array($theme,['cedar','maple','terminal'])) fail(422,'Choose a theme from the list.');
    query('UPDATE users SET display_name=?,bio=?,location=?,website=?,now_text=?,uses_text=?,theme=?,listed=?,updated_at=? WHERE id=?',[$name,input($data,'bio',3000),input($data,'location',100),web_url(input($data,'website',1000)),input($data,'now_text',15000),input($data,'uses_text',15000),$theme,isset($data['listed'])?1:0,now(),$user['id']]);
}
function save_entry(array $user,array $data,?int $id=null): int {
    protect_demo($user);
    $old=$id?one('SELECT * FROM entries WHERE id=? AND user_id=?',[$id,$user['id']]):null;
    if ($id && !$old) fail(404,'That entry is not in your workspace.');
    $data=array_replace($old??[], $data);
    $kind=input($data,'kind',20); if (!isset(APPS[$kind])) fail(422,'Choose an app from the list.');
    $title=input($data,'title',160); if ($title==='') fail(422,'Give this entry a title.');
    $body=input($data,'body',$kind==='status'?1000:60000);
    $slug=input($data,'slug',80);
    if ($slug==='') $slug=trim(substr(strtolower(preg_replace('/[^a-zA-Z0-9]+/','-',$title)),0,60),'-').'-'.bin2hex(random_bytes(3));
    if (!preg_match('/^[a-z0-9][a-z0-9-]{0,79}$/D',$slug)) fail(422,'Slugs use lowercase letters, numbers and hyphens.');
    $target=web_url(input($data,'target_url',2000),in_array($kind,['bookmark','link','archive']));
    $visibility=input($data,'visibility',20,'private'); if (!in_array($visibility,['private','unlisted','public'])) fail(422,'Choose a valid visibility.');
    $dup=one('SELECT id FROM entries WHERE user_id=? AND slug=?',[$user['id'],$slug]);
    if ($dup && (int)$dup['id']!==$id) fail(422,'That slug is already in use.');
    $tags=input($data,'tags',250);
    if (!$id && (int)one('SELECT COUNT(*) AS n FROM entries WHERE user_id=?',[$user['id']])['n']>=10000) fail(422,'This account has reached the 10,000 entry limit. Export your entries or contact the instance operator.');
    if ($id) query('UPDATE entries SET kind=?,slug=?,title=?,body=?,target_url=?,tags=?,visibility=?,updated_at=? WHERE id=? AND user_id=?',[$kind,$slug,$title,$body,$target,$tags,$visibility,now(),$id,$user['id']]);
    else { query('INSERT INTO entries (user_id,kind,slug,title,body,target_url,tags,visibility,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)',[$user['id'],$kind,$slug,$title,$body,$target,$tags,$visibility,now(),now()]); $id=(int)db()->lastInsertId(); }
    return $id;
}
function delete_entry(array $user,int $id): void { protect_demo($user); if (!query('DELETE FROM entries WHERE id=? AND user_id=?',[$id,$user['id']])->rowCount()) fail(404,'Entry not found.'); }
function visible_entry(array $entry,?array $viewer): bool { return $entry['visibility']!=='private' || ($viewer && (int)$viewer['id']===(int)$entry['user_id']); }
function public_entries(string $kind='',string $search='',int $offset=0,?int $userId=null): array {
    $where="e.visibility='public' AND u.suspended=0"; $p=[];
    if ($userId===null) $where.=' AND u.listed=1'; else {$where.=' AND e.user_id=?';$p[]=$userId;}
    if ($kind!=='') { $where.=' AND e.kind=?';$p[]=$kind; }
    if ($search!=='') { $where.=' AND (e.title LIKE ? OR e.body LIKE ? OR e.tags LIKE ?)'; for($i=0;$i<3;$i++)$p[]='%'.$search.'%'; }
    return rows('SELECT e.*,u.username,u.display_name FROM entries e JOIN users u ON u.id=e.user_id WHERE '.$where.' ORDER BY e.created_at DESC,e.id DESC LIMIT 25 OFFSET '.max(0,$offset),$p);
}
function profile_for(string $name): array { return one('SELECT * FROM users WHERE username=? AND suspended=0',[$name]) ?? throw new HttpError('This corner of the web could not be found.',404); }
function export_account(array $user): array {
    return ['format'=>'superapp-export','version'=>1,'exported_at'=>now(),'profile'=>array_intersect_key($user,array_flip(['username','display_name','bio','location','website','now_text','uses_text','theme','listed','created_at','updated_at'])), 'entries'=>rows('SELECT kind,slug,title,body,target_url,tags,visibility,created_at,updated_at FROM entries WHERE user_id=? ORDER BY id',[$user['id']]),'directory_submissions'=>rows('SELECT name,category,province,website,claim,evidence_url,notes,status,reviewed_at,created_at FROM directory WHERE user_id=?',[$user['id']]),'guestbook'=>rows('SELECT g.body,g.status,g.created_at,u.username AS author FROM guestbook g JOIN users u ON u.id=g.author_id WHERE g.owner_id=?',[$user['id']])];
}
function import_entries(array $user,array $data): int {
    if (($data['format']??'')!=='superapp-export' || ($data['version']??0)!==1 || !is_array($data['entries']??null) || count($data['entries'])>500) fail(422,'Use a Superapp v1 export containing at most 500 entries. Split larger exports into batches.');
    db()->beginTransaction();
    try { foreach($data['entries'] as $entry) { if (!is_array($entry)) fail(422,'Invalid entry in import.'); $entry['visibility']='private'; $entry['slug']=''; save_entry($user,$entry); } db()->commit(); }
    catch(Throwable $e){db()->rollBack();throw $e;}
    return count($data['entries']);
}
function submit_directory(array $user,array $data): void {
    protect_demo($user);
    $name=input($data,'name',120);if($name==='')fail(422,'Enter the business or project name.');
    $claim=input($data,'claim',40); if(!in_array($claim,['Canadian-owned','Made in Canada','Canadian-hosted','Community organization']))fail(422,'Choose the type of Canadian connection.');
    query('INSERT INTO directory (user_id,name,category,province,website,claim,evidence_url,notes,created_at) VALUES (?,?,?,?,?,?,?,?,?)',[$user['id'],$name,input($data,'category',30),input($data,'province',30),web_url(input($data,'website',2000),true),$claim,web_url(input($data,'evidence_url',2000),true),input($data,'notes',3000),now()]);
}
function api_user(): array {
    $auth=$_SERVER['HTTP_AUTHORIZATION']??'';
    if (!preg_match('/^Bearer ([a-f0-9]{64})$/D',$auth,$m)) fail(401,'A bearer token is required.');
    $user=one('SELECT u.* FROM users u JOIN api_tokens t ON t.user_id=u.id WHERE t.token_hash=? AND u.suspended=0',[hash('sha256',$m[1])]);
    return $user ?? throw new HttpError('Invalid or revoked token.',401);
}
