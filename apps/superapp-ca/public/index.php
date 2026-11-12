<?php
declare(strict_types=1);
require __DIR__.'/../app/bootstrap.php';
security_headers();
$path=parse_url($_SERVER['REQUEST_URI']??'/',PHP_URL_PATH)?:'/';
$method=$_SERVER['REQUEST_METHOD']??'GET';
$isApi=str_starts_with($path,'/api/');
try {
    if ((int)($_SERVER['CONTENT_LENGTH']??0)>2100000) fail(413,'That request is too large. The limit is 2 MB.');
    if ($isApi) {
        $u=api_user(); rate_limit('api:'.$u['id'],180,60);
        if($path==='/api/me'&&$method==='GET')json_response(export_account($u)['profile']);
        if($path==='/api/entries'&&$method==='GET') {
            $offset=max(0,(int)($_GET['offset']??0));
            json_response(['entries'=>rows('SELECT * FROM entries WHERE user_id=? ORDER BY id DESC LIMIT 100 OFFSET '.$offset,[$u['id']]),'offset'=>$offset,'limit'=>100]);
        }
        $id=null;
        if(preg_match('~^/api/entries/([1-9][0-9]*)$~D',$path,$m))$id=(int)$m[1];
        if($id&&$method==='DELETE'){delete_entry($u,$id);json_response(['deleted'=>true]);}
        if(($path==='/api/entries'&&$method==='POST')||($id&&$method==='PATCH')) {
            $raw=file_get_contents('php://input',false,null,0,2100001);
            if(strlen($raw)>2100000)fail(413,'Request too large.');
            try{$data=json_decode($raw,true,64,JSON_THROW_ON_ERROR);}catch(JsonException){fail(422,'Invalid JSON.');}
            if(!is_array($data)||array_is_list($data))fail(422,'Send a JSON object.');
            $saved=save_entry($u,$data,$id);json_response(['id'=>$saved],$id?200:201);
        }
        fail(404,'API endpoint or method not found.');
    }
    start_session();
    if($method==='POST') {
        check_csrf();
        if($path==='/join') {
            if(!cfg('registration_open'))fail(403,'Registration is closed for this instance.');
            rate_limit('register',5,3600);
            $id=create_user($_POST);session_regenerate_id(true);$_SESSION['user_id']=$id;$_SESSION['auth_version']=1;$_SESSION['csrf']=bin2hex(random_bytes(32));flash('Welcome in. Your corner is ready.');redirect('/profile');
        }
        if($path==='/login') {
            rate_limit('login',15);
            $name=strtolower(input($_POST,'username',24));$pw=input($_POST,'password',72);
            $u=one('SELECT * FROM users WHERE username=?',[$name]);
            $valid=password_verify($pw,$u['password_hash']??'$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.');
            if(!$valid||!$u||$u['suspended'])fail(422,'We could not sign you in with those details.');
            session_regenerate_id(true);$_SESSION['user_id']=$u['id'];$_SESSION['auth_version']=$u['auth_version'];$_SESSION['csrf']=bin2hex(random_bytes(32));redirect('/workspace');
        }
        if($path==='/logout'){$_SESSION=[];session_regenerate_id(true);redirect('/');}
        $u=require_user();protect_demo($u);rate_limit('write:'.$u['id'],120,60);
        switch($path) {
            case '/profile/save': save_profile($u,$_POST);flash('Your corner has a fresh coat of paint.');redirect('/profile');
            case '/entry/save': $id=save_entry($u,$_POST,empty($_POST['id'])?null:(int)$_POST['id']);flash('Saved. Your words are right where you left them.');redirect('/compose?id='.$id);
            case '/entry/delete': delete_entry($u,(int)($_POST['id']??0));flash('Entry deleted.');redirect('/workspace');
            case '/directory/submit': rate_limit('directory:'.$u['id'],10,3600);submit_directory($u,$_POST);flash('Thanks for the discovery. A moderator will review your source before it appears.');redirect('/directory');
            case '/guestbook/sign':
                rate_limit('guestbook:'.$u['id'],10,3600);$owner=(int)($_POST['owner_id']??0);
                if(!one('SELECT id FROM users WHERE id=? AND suspended=0',[$owner]))fail(404,'Member not found.');
                $body=input($_POST,'body',1000);if($body==='')fail(422,'Write a little hello first.');
                query('INSERT INTO guestbook (owner_id,author_id,body,created_at) VALUES (?,?,?,?)',[$owner,$u['id'],$body,now()]);flash('Your hello is waiting for the page owner’s approval.');redirect('/@'.one('SELECT username FROM users WHERE id=?',[$owner])['username']);
            case '/guestbook/moderate':
                $id=(int)($_POST['id']??0);$decision=input($_POST,'decision',20);
                if($decision==='delete')query('DELETE FROM guestbook WHERE id=? AND owner_id=?',[$id,$u['id']]);
                elseif($decision==='approved')query("UPDATE guestbook SET status='approved' WHERE id=? AND owner_id=?",[$id,$u['id']]);else fail(422,'Invalid decision.');
                flash('Guestbook updated.');redirect('/guestbook');
            case '/token/create':
                $token=bin2hex(random_bytes(32));db()->beginTransaction();query('DELETE FROM api_tokens WHERE user_id=?',[$u['id']]);query('INSERT INTO api_tokens (user_id,token_hash,created_at) VALUES (?,?,?)',[$u['id'],hash('sha256',$token),now()]);db()->commit();$_SESSION['new_token']=$token;redirect('/settings');
            case '/token/revoke':query('DELETE FROM api_tokens WHERE user_id=?',[$u['id']]);flash('API tokens revoked.');redirect('/settings');
            case '/import':
                try{$data=json_decode(input($_POST,'json',2000000),true,64,JSON_THROW_ON_ERROR);}catch(JsonException){fail(422,'That is not valid JSON.');}
                if(!is_array($data))fail(422,'Invalid export.');$n=import_entries($u,$data);flash("Imported {$n} entries, all private.");redirect('/workspace');
            case '/password':
                if(!password_verify(input($_POST,'current_password',72),$u['password_hash']))fail(422,'Your current password did not match.');
                $pw=input($_POST,'password',72);validate_password($pw);
                query('UPDATE users SET password_hash=?,auth_version=auth_version+1 WHERE id=?',[password_hash($pw,PASSWORD_DEFAULT),$u['id']]);query('DELETE FROM api_tokens WHERE user_id=?',[$u['id']]);session_regenerate_id(true);$_SESSION['auth_version']=(int)$u['auth_version']+1;flash('Password changed. Other sessions and API tokens have been revoked.');redirect('/settings');
            case '/account/delete':
                if(!password_verify(input($_POST,'password',72),$u['password_hash']))fail(422,'Your password did not match.');
                if($u['role']==='admin')fail(422,'Create another administrator and transfer your role using the CLI before deleting this administrator account.');
                query('DELETE FROM users WHERE id=?',[$u['id']]);$_SESSION=[];session_regenerate_id(true);$_SESSION['csrf']=bin2hex(random_bytes(32));flash('Your account and its active records have been deleted.');redirect('/');
            case '/report':
                rate_limit('reports:'.$u['id'],10,3600);$reported=input($_POST,'path',500);$reason=input($_POST,'reason',2000);
                if(!str_starts_with($reported,'/@')||$reason==='')fail(422,'Provide the local entry path and a reason.');
                query('INSERT INTO reports (user_id,path,reason,created_at) VALUES (?,?,?,?)',[$u['id'],$reported,$reason,now()]);flash('Your report is with the instance moderator.');redirect('/commons');
            case '/admin/directory':
                require_admin();$decision=input($_POST,'decision',20);if(!in_array($decision,['approved','rejected']))fail(422,'Invalid decision.');
                query('UPDATE directory SET status=?,reviewed_at=? WHERE id=?',[$decision,now(),(int)($_POST['id']??0)]);flash('Directory review saved.');redirect('/admin');
            case '/admin/report':require_admin();query("UPDATE reports SET status='resolved' WHERE id=?",[(int)($_POST['id']??0)]);redirect('/admin');
            case '/admin/member':
                require_admin();query("UPDATE users SET suspended=?,auth_version=auth_version+1 WHERE id=? AND role<>'admin'",[($_POST['suspended']??'')==='1'?1:0,(int)($_POST['id']??0)]);flash('Member access updated.');redirect('/admin');
            default:fail(404,'Action not found.');
        }
    }
    if($method!=='GET')fail(405,'This method is not supported.');
    $pageNumber=max(1,min(100000,(int)($_GET['page']??1)));$offset=($pageNumber-1)*25;
    $q=input($_GET,'q',150);$kind=input($_GET,'kind',20);if($kind!==''&&!isset(APPS[$kind]))fail(404,'App not found.');
    if($path==='/feed.xml'||preg_match('~^/@([a-z][a-z0-9_-]{2,23})/feed.xml$~D',$path,$m)) {
        $profile=isset($m[1])?profile_for($m[1]):null;$entries=public_entries('', '',0,$profile?(int)$profile['id']:null);
        header('Content-Type: application/rss+xml; charset=utf-8');
        echo '<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>'.esc($profile?$profile['display_name'].' on Superapp':'Superapp commons').'</title><link>'.esc(url($profile?'/@'.$profile['username']:'')).'</link><description>A little more web.</description>';
        foreach($entries as $e) { $link=url('/@'.$e['username'].'/e/'.$e['slug']);echo '<item><title>'.esc($e['title']).'</title><link>'.esc($link).'</link><guid isPermaLink="true">'.esc($link).'</guid><pubDate>'.gmdate(DATE_RSS,strtotime($e['created_at'])).'</pubDate><description>'.esc($e['body']).'</description></item>'; }echo '</channel></rss>';exit;
    }
    if(preg_match('~^/(@|s/)([a-z][a-z0-9_-]{2,23})/(?:e/)?([a-z0-9][a-z0-9-]{0,79})$~D',$path,$m)&&($m[1]==='s/'||str_contains($path,'/e/'))) {
        $p=profile_for($m[2]);$entry=one('SELECT e.*,u.username FROM entries e JOIN users u ON u.id=e.user_id WHERE e.user_id=? AND e.slug=?',[$p['id'],$m[3]]);
        if(!$entry||!visible_entry($entry,current_user())||($m[1]==='s/'&&$entry['kind']!=='link'))fail(404,'Entry not found.');
        render($m[1]==='s/'?'shortlink':'entry',['title'=>$entry['title'],'entry'=>$entry,'profile'=>$p,'noindex'=>$entry['visibility']!=='public']);
    }
    if(preg_match('~^/@([a-z][a-z0-9_-]{2,23})(?:/(now|uses))?$~D',$path,$m)) {
        $p=profile_for($m[1]);$entries=public_entries('','',0,(int)$p['id']);
        $messages=rows("SELECT g.*,u.username FROM guestbook g JOIN users u ON u.id=g.author_id WHERE g.owner_id=? AND g.status='approved' AND u.suspended=0 ORDER BY g.id DESC LIMIT 50",[$p['id']]);
        render('profile',['title'=>$p['display_name'],'profile'=>$p,'section'=>$m[2]??'home','entries'=>$entries,'messages'=>$messages,'noindex'=>!$p['listed']]);
    }
    switch($path) {
        case '/':render('home');
        case '/apps':render('apps',['title'=>'The little apps']);
        case '/login':render('login',['title'=>'Welcome back']);
        case '/join':render('join',['title'=>'Make yourself at home']);
        case '/about':render('about',['title'=>'Our way']);
        case '/privacy':render('privacy',['title'=>'Privacy & community']);
        case '/support':render('support',['title'=>'Pay what you can']);
        case '/commons':render('commons',compact('kind','q','pageNumber')+['title'=>'The commons','entries'=>public_entries($kind,$q,$offset)]);
        case '/garden':render('garden',['title'=>'The /now garden','people'=>rows("SELECT * FROM users WHERE listed=1 AND suspended=0 AND now_text<>'' ORDER BY updated_at DESC LIMIT 100")]);
        case '/directory':
            $claim=input($_GET,'claim',40);$where="d.status='approved' AND u.suspended=0";$params=[];
            if($q!==''){$where.=' AND (d.name LIKE ? OR d.notes LIKE ? OR d.province LIKE ? OR d.category LIKE ?)';$params=array_fill(0,4,'%'.$q.'%');}
            if($claim!==''){$where.=' AND d.claim=?';$params[]=$claim;}
            render('directory',compact('q','claim')+['title'=>'Buy Canadian','listings'=>rows('SELECT d.* FROM directory d JOIN users u ON u.id=d.user_id WHERE '.$where.' ORDER BY d.name LIMIT 100',$params)]);
        case '/directory/submit':require_user();render('directory-submit',['title'=>'Share a Canadian discovery']);
        case '/workspace':
            $u=require_user();$where='user_id=?';$params=[$u['id']];
            if($kind!==''){$where.=' AND kind=?';$params[]=$kind;}if($q!==''){$where.=' AND (title LIKE ? OR body LIKE ? OR tags LIKE ?)';for($i=0;$i<3;$i++)$params[]='%'.$q.'%';}
            render('workspace',compact('kind','q','pageNumber')+['title'=>'My workspace','entries'=>rows('SELECT * FROM entries WHERE '.$where.' ORDER BY id DESC LIMIT 25 OFFSET '.$offset,$params)]);
        case '/compose':
            $u=require_user();$entry=null;if(isset($_GET['id'])){$entry=one('SELECT * FROM entries WHERE id=? AND user_id=?',[(int)$_GET['id'],$u['id']]);if(!$entry)fail(404,'Entry not found.');}
            render('compose',['title'=>'Make something','entry'=>$entry,'kind'=>$kind?:'post']);
        case '/profile':require_user();render('profile-edit',['title'=>'My page & /now']);
        case '/settings':require_user();render('settings',['title'=>'Settings & data']);
        case '/guestbook':$u=require_user();render('guestbook',['title'=>'My guestbook','messages'=>rows('SELECT g.*,u.username FROM guestbook g JOIN users u ON u.id=g.author_id WHERE g.owner_id=? ORDER BY g.id DESC LIMIT 100',[$u['id']])]);
        case '/export':$u=require_user();header('Content-Disposition: attachment; filename="superapp-'.$u['username'].'.json"');json_response(export_account($u));
        case '/export/bookmarks':
            $u=require_user();header('Content-Type: text/html; charset=utf-8');header('Content-Disposition: attachment; filename="superapp-bookmarks.html"');echo '<!DOCTYPE NETSCAPE-Bookmark-file-1><meta charset="utf-8"><title>Superapp bookmarks</title><h1>Superapp bookmarks</h1><dl><p>';
            foreach(rows("SELECT * FROM entries WHERE user_id=? AND kind='bookmark'",[$u['id']]) as $e)echo '<dt><a href="'.esc($e['target_url']).'">'.esc($e['title']).'</a><dd>'.esc($e['body']);echo '</dl>';exit;
        case '/admin':require_admin();render('admin',['title'=>'Moderation','submissions'=>rows('SELECT d.*,u.username FROM directory d JOIN users u ON u.id=d.user_id ORDER BY d.id DESC LIMIT 100'),'reports'=>rows("SELECT * FROM reports WHERE status='open' ORDER BY id DESC LIMIT 100"),'members'=>rows('SELECT id,username,role,suspended FROM users ORDER BY id DESC LIMIT 100')]);
        case '/robots.txt':header('Content-Type: text/plain');echo "User-agent: *\nDisallow: /workspace\nDisallow: /settings\nDisallow: /api/\nDisallow: /export\nDisallow: /compose\nDisallow: /admin\n";exit;
        default:fail(404,'This little corner hasn’t been built yet.');
    }
} catch(HttpError $e) {
    if(db()->inTransaction())db()->rollBack();
    if($isApi)json_response(['error'=>$e->getMessage()],$e->getCode());
    http_response_code($e->getCode());render('error',['title'=>'Let’s find your way back','code'=>$e->getCode(),'message'=>$e->getMessage(),'noindex'=>true]);
} catch(Throwable $e) {
    error_log('Superapp: '.$e->getMessage());
    http_response_code(500);header('Content-Type: text/plain; charset=utf-8');echo 'Superapp is taking a breather. The operator can check the server log. If this is a new install, run the database migration first.';
}
