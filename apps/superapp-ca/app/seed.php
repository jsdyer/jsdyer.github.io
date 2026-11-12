<?php
declare(strict_types=1);
function seed_demo(): void {
    if (!cfg('demo')) fail(422,'Set SUPERAPP_DEMO=true explicitly before seeding examples. Never seed a production instance.');
    if(one('SELECT id FROM users WHERE username=?',['maple']))return;
    $id=create_user(['username'=>'maple','email'=>'maple@example.invalid','password'=>bin2hex(random_bytes(24))]);
    query('UPDATE users SET display_name=?,bio=?,location=?,now_text=?,uses_text=? WHERE id=?',[
        'Maple’s small web',"A fictional example member. Tinkerer, trail wanderer, and collector of good internet.\nThis is a demo corner — make your own and see what grows.",'Somewhere in Canada',
        "Making: a quieter home server and a little website for my notes.\nLearning: how to preserve a piece of the web without losing its context.\nReading: old Linux manuals and handwritten trail maps.\nEnjoying: the walk home, especially when it rains.",
        "OS: a Linux distribution that lets me get on with things.\nWeb stack: Apache, MariaDB, and PHP.\nNotes: plain text, SQLite, and a well-worn notebook.\nCamera: the one I already have.\nPrinciple: repair before replace.",$id]);
    // Use ordinary domain validation without mutating the protected example identity.
    $u=one('SELECT * FROM users WHERE id=?',[$id]);$u['username']='seed-writer';
    $samples=[
        ['post','The small web is still out there',"It’s in the personal site with a guestbook. The community network that still answers email. The meticulously documented hobby you didn’t know existed.\n\nMaybe the next version of the web starts with making one small, useful thing — and leaving the gate open.",'','indieweb, community'],
        ['lab','A little home.arpa housekeeping',"Today’s build note: keep local names local. Document what answers DNS, where the configuration lives, and how to get online if the resolver takes a nap.\n\nA runbook is a gift to your future self. Do not publish your private addresses or credentials.",'','homelab, linux'],
        ['field','The long way home',"An example field note: take a familiar walk and notice the quiet infrastructure. A pedestrian bridge, an old shop sign, a public noticeboard.\n\nA camera and a notebook are plenty. Stay on public paths and ask before entering private spaces.",'','wandering, photography'],
        ['status','A small victory for the shelf',"Finally labelled the backup drives. Future me is having an unusually good day.",'','making'],
        ['bookmark','A home for independent websites','A starting point for people who want to publish on a web they control.','https://indieweb.org/','indieweb, reading'],
        ['paste','A tiny disk-space check',"#!/bin/sh\n# Read-only check; inspect every script before running it.\ndf -h\n",'','shell, linux'],
        ['archive','A note for the archive shelf',"Catalogue entry only: a starting point for exploring the web’s memory.\nRecord what you saved, when you saved it, and why it matters. Superapp does not download or capture this URL.",'https://archive.org/','archiving, history'],
        ['link','A shorter path to the indie web','A memorable, inspectable link.','https://indieweb.org/','indieweb'],
    ];
    foreach($samples as $i=>$s){$eid=save_entry($u,['kind'=>$s[0],'title'=>$s[1],'body'=>$s[2],'target_url'=>$s[3],'tags'=>$s[4],'visibility'=>'public']);query('UPDATE entries SET created_at=?,updated_at=? WHERE id=?',[gmdate('Y-m-d\TH:i:s\Z',time()-$i*3600),now(),$eid]);}
    $listings=[
        ['Vancouver Community Network','Community','British Columbia','https://www2.vcn.bc.ca/','Community organization','https://www2.vcn.bc.ca/who-we-are/','A community network with roots in public access and the non-commercial web. Its own mission page describes its community role.'],
        ['Canadian Web Hosting','Web hosting','Canada-wide','https://canadianwebhosting.com/','Canadian-owned','https://canadianwebhosting.com/','The provider describes itself as 100% Canadian owned and operated. Check current ownership and the location of your specific hosting plan.'],
    ];
    foreach($listings as $l)query('INSERT INTO directory (user_id,name,category,province,website,claim,evidence_url,notes,status,reviewed_at,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)',[$id,...$l,'approved','2026-11-12T00:00:00Z',now()]);
}
