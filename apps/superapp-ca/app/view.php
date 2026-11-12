<?php
declare(strict_types=1);
function icon(string $name): string {
    $paths=[
        'grid'=>'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
        'radio'=>'M9 9a4.3 4.3 0 0 0 0 6 M15 9a4.3 4.3 0 0 1 0 6 M5 5a10 10 0 0 0 0 14 M19 5a10 10 0 0 1 0 14 M12 11v2',
        'book'=>'M4 3h13a3 3 0 0 1 3 3v15H7a3 3 0 0 1-3-3V3z M4 17h16 M8 7h8 M8 11h5',
        'bookmark'=>'M6 3h12v19l-6-4-6 4z',
        'code'=>'m8 6-6 6 6 6 m8-12 6 6-6 6 M14 3l-4 18',
        'link'=>'m10 14 4-4 M8 16l-2 2a3 3 0 0 1-4-4l5-5a3 3 0 0 1 4 0 M16 8l2-2a3 3 0 0 1 4 4l-5 5a3 3 0 0 1-4 0',
        'server'=>'M3 3h18v7H3z M3 14h18v7H3z M6 6h1 M6 17h1 M15 6h3 M15 17h3',
        'archive'=>'M3 3h18v5H3z M5 8v13h14V8 M9 12h6',
        'compass'=>'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M15 9l-2 4-4 2 2-4z',
        'leaf'=>'M12 22V12 M12 18 3 10l4-1-1-5 4 3 2-6 2 6 4-3-1 5 4 1-9 8z',
        'person'=>'M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 22v-3a8 8 0 0 1 16 0v3',
        'heart'=>'M12 21 3 12a6 6 0 0 1 9-8 6 6 0 0 1 9 8z',
        'arrow'=>'M4 12h16 m-6-6 6 6-6 6',
        'plant'=>'M12 22V10 M12 14C4 14 3 10 3 5c7 0 9 3 9 9 M12 10c0-7 4-8 9-8 0 6-3 8-9 8',
        'search'=>'M16 10a6 6 0 1 1-12 0 6 6 0 0 1 12 0 m-2 4 7 7',
        'sun'=>'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M12 1v3 M12 20v3 M1 12h3 M20 12h3 M4 4l2 2 M18 18l2 2 M20 4l-2 2 M6 18l-2 2',
    ];
    return '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'.($paths[$name]??$paths['grid']).'"></path></svg>';
}
function tag(string $text,string $class=''): string { return '<span class="tag '.esc($class).'">'.esc($text).'</span>'; }
function avatar(array $u): string { return '<span class="avatar" aria-hidden="true">'.esc(strtoupper(substr($u['username'],0,2))).'</span>'; }
function text_body(string $text): string { return '<div class="prose">'.nl2br(esc($text)).'</div>'; }
function field(string $label,string $name,string $value='',string $type='text',int $max=160,bool $required=false): void { echo '<label>'.esc($label).'<input type="'.esc($type).'" name="'.esc($name).'" value="'.esc($value).'" maxlength="'.$max.'" '.($required?'required':'').'></label>'; }
function textarea(string $label,string $name,string $value='',int $rows=5,int $max=60000): void { echo '<label>'.esc($label).'<textarea name="'.esc($name).'" rows="'.$rows.'" maxlength="'.$max.'">'.esc($value).'</textarea></label>'; }
function select_field(string $label,string $name,array $options,string $selected=''): void {
    echo '<label>'.esc($label).'<select name="'.esc($name).'">'; foreach($options as $val=>$name)echo '<option value="'.esc($val).'" '.($selected===(string)$val?'selected':'').'>'.esc($name).'</option>'; echo '</select></label>';
}
function empty_state(string $title,string $detail,string $href='',string $action='Create something'): void {
    echo '<div class="empty">'.icon('plant').'<h3>'.esc($title).'</h3><p>'.esc($detail).'</p>';if($href)echo '<a class="button" href="'.esc($href).'">'.esc($action).'</a>';echo '</div>';
}
function entry_card(array $e,bool $manage=false): void { ?>
 <article class="entry h-entry">
  <div class="entry-meta"><span class="app-small"><?=icon(APPS[$e['kind']][2])?> <?=esc(APPS[$e['kind']][0])?></span><time class="dt-published" datetime="<?=esc($e['created_at'])?>"><?=esc(substr($e['created_at'],0,10))?></time></div>
  <h3><a class="p-name u-url" href="/@<?=esc($e['username'])?>/e/<?=esc($e['slug'])?>"><?=esc($e['title'])?></a></h3>
  <p class="excerpt p-summary"><?=esc(strlen($e['body'])>210?substr($e['body'],0,207).'…':$e['body'])?></p>
  <div class="entry-bottom"><a class="byline p-author h-card" href="/@<?=esc($e['username'])?>">@<?=esc($e['username'])?></a><span><?=esc($e['tags'])?></span><?php if($manage): ?><a href="/compose?id=<?=$e['id']?>">Edit →</a><?=tag($e['visibility'])?><?php endif ?></div>
 </article>
<?php }
function app_card(string $kind,bool $workspace=false): void { [$name,$description,$ico]=APPS[$kind]; ?>
 <a class="app-card app-<?=esc($kind)?>" href="<?=$workspace?'/workspace?kind=':'/commons?kind='?><?=esc($kind)?>"><span class="app-icon"><?=icon($ico)?></span><span class="app-card-arrow">↗</span><h3><?=esc($name)?></h3><p><?=esc($description)?></p><span class="app-label"><?=$workspace?'OPEN APP':'EXPLORE'?></span></a>
<?php }
function render(string $page,array $data=[]): never {
    extract($data,EXTR_SKIP); $user=current_user(); $title=$data['title']??'A little more web.'; $theme=$data['profile']['theme']??'cedar';
    ?><!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title><?=esc($title)?> · superapp.ca</title><meta name="description" content="A Canadian indie-web commons. Personal pages, little apps, and a web that belongs to people. Free to use. Pay what you can."><link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/assets/app.css"><script src="/assets/app.js" defer></script><link rel="alternate" type="application/rss+xml" title="Superapp commons" href="/feed.xml"><?php if(!empty($noindex)):?><meta name="robots" content="noindex,nofollow"><?php endif?></head><body class="theme-<?=esc($theme)?>">
    <a class="skip" href="#main">Skip to content</a><div class="topline"><span>INDEPENDENT BY NATURE.</span><span><?=icon('leaf')?> A SMALLER, MORE CANADIAN WEB</span><span>FREE TO USE. YOURS TO KEEP.</span></div>
    <header class="header"><a class="brand" href="/"><span class="brand-mark"><?=icon('leaf')?></span>superapp<span class="domain">.ca</span></a><nav aria-label="Main"><a href="/apps" <?=$page==='apps'?'aria-current="page"':''?>>The little apps</a><a href="/commons" <?=$page==='commons'?'aria-current="page"':''?>>The commons</a><a href="/directory" <?=$page==='directory'?'aria-current="page"':''?>>Buy Canadian <?=icon('leaf')?></a><a href="/about">Our way</a></nav><div class="header-actions"><?php if($user):?><a class="button small" href="/workspace">My workspace <?=icon('arrow')?></a><?php else:?><a class="signin" href="/login">Log in</a><a class="button small" href="/join">Make yourself at home <?=icon('arrow')?></a><?php endif?></div></header>
    <?php if(cfg('demo')):?><div class="demo-strip">DEMO INSTANCE <span>Fictional example member “maple”. Your own account can try every app. No payments are collected here.</span></div><?php endif?>
    <?php if(isset($_SESSION['flash'])):?><div class="flash" role="status"><?=esc($_SESSION['flash'])?></div><?php unset($_SESSION['flash']);endif?>
    <main id="main"><?php require __DIR__.'/pages.php'; ?></main>
    <footer><div><a class="brand" href="/">superapp<span class="domain">.ca</span></a><p>Good tools. Open doors. A web worth keeping.</p></div><div><a href="/support">Keep the lights on</a><a href="/about">About & principles</a><a href="/privacy">Privacy & community</a><a href="/feed.xml">RSS</a><a href="<?=esc(web_url(cfg('source_url')))?>" rel="noopener">Source · GPL-3.0</a></div><p class="footer-note">Made for people, not engagement metrics. <span>From coast to coast to coast. <?=icon('leaf')?></span></p></footer></body></html><?php exit;
}
function workspace_nav(string $active,array $user): void { ?>
 <aside class="sidebar"><div class="sidebar-person"><?=avatar($user)?><div><strong><?=esc($user['display_name'])?></strong><small>@<?=esc($user['username'])?></small></div></div><a class="<?=$active==='overview'?'active':''?>" href="/workspace"><?=icon('grid')?> Overview</a><a href="/profile"><?=icon('person')?> My page & /now</a><?php foreach(APPS as $kind=>$app):?><a class="<?=$active===$kind?'active':''?>" href="/workspace?kind=<?=$kind?>"><?=icon($app[2])?> <?=esc($app[0])?></a><?php endforeach?><div class="sidebar-rule"></div><a href="/guestbook"><?=icon('book')?> Guestbook</a><a href="/settings"><?=icon('code')?> Settings & data</a><?php if($user['role']==='admin'):?><a href="/admin"><?=icon('server')?> Moderation</a><?php endif?><a href="/@<?=esc($user['username'])?>">View my public page ↗</a><form action="/logout" method="post"><?=csrf()?><button class="quiet">Log out</button></form><a class="sidebar-support" href="/support"><?=icon('heart')?><strong>Everyone belongs.</strong><small>Chip in if you can.<br>Stay if you can’t.</small></a></aside>
<?php }
