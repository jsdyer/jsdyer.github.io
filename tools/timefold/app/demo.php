<?php
declare(strict_types=1);

// Fictional records, written for Timefold. Replace these with your own history.
function tf_demo_capsules(): array
{
    $items = [
        ['1989-08-19', 'The summer that fits in a square', 'photo', 'A fictional faded instant photograph: a bicycle outside a cabin, and a handwritten promise to come back.', ['polaroid', 'summer', 'outside']],
        ['1993-07-17', 'Fourteen floppy disks', 'note', 'Fictional installation notes: label every disk before starting. The machine finally reaches a login prompt after midnight.', ['linux', 'slackware', 'firsts']],
        ['1995-11-04', 'A save file from another lifetime', 'save', 'Fictional archive entry: the last checkpoint before the final boss. The original hardware is gone; the small file survives.', ['games', 'preservation', 'firsts']],
        ['1998-03-21', 'Under construction, forever', 'web', 'Fictional catalogue note for a saved personal homepage. A tiled star field, a guestbook, and a list of links someone cared about.', ['web', 'preservation', 'stars']],
        ['2001-08-06', 'A shoebox of unlabelled light', 'photo', 'Fictional contact-sheet note: twelve instant photographs from a summer trip. The places are familiar; the dates are a puzzle.', ['polaroid', 'summer', 'archive']],
        ['2004-12-28', 'The first quiet server', 'note', 'Fictional build log: an old desktop becomes a file server. It hums under a desk, serving a tiny personal corner of the web.', ['linux', 'homelab', 'web']],
        ['2007-04-14', 'Everything needs a checksum', 'note', 'Fictional preservation experiment: copy a folder to two disks, compare SHA-256 manifests, then write down what the folder actually means.', ['archive', 'preservation', 'linux']],
        ['2010-02-09', 'LAN party, one more round', 'save', 'Fictional map pack, saved configuration and a note naming the players. Games are software, but also places people have been.', ['games', 'homelab', 'friends']],
        ['2013-09-22', 'Sunlight on a scratched print', 'photo', 'Fictional scanning journal: keep the scratches. A perfectly restored image might erase the evidence that this object was held.', ['polaroid', 'preservation', 'outside']],
        ['2016-05-30', 'A website in a suitcase', 'web', 'Fictional offline archive note: a saved site opens without a network. Its links lead back into the small world that was captured.', ['web', 'archive', 'travel']],
        ['2019-11-16', 'Services by the light of the rack', 'note', 'Fictional home-lab map: DNS, a NAS and an Apache server. A short README explains how to rebuild each piece without a cloud account.', ['homelab', 'linux', 'independence']],
        ['2021-08-19', 'The bicycle is still there', 'photo', 'Fictional companion to the 1989 capsule. Another square photograph, taken decades later. The same cabin, a different bicycle.', ['polaroid', 'summer', 'outside']],
        ['2023-06-11', 'A backup that leaves the house', 'note', 'Fictional packing list: one encrypted drive, one printed recovery note, and a second copy somewhere that is not this room.', ['archive', 'preservation', 'travel']],
        ['2025-01-26', 'A small corner of the free web', 'web', 'Fictional design notebook: plain files, readable code, no tracking. A website should be easy to inspect and possible to keep.', ['web', 'independence', 'linux']],
        ['2026-07-17', 'The long thread', 'note', 'Fictional reflection: a Linux install, a rescued save file, a faded photograph. Different objects; the same instinct to keep what matters.', ['linux', 'games', 'polaroid', 'preservation']],
        ['2026-11-12', 'Build your own time machine', 'note', 'These sample capsules are fictional. Add a real photograph, a game save, a local web archive or a simple note. Then turn the dial.', ['archive', 'firsts', 'independence']],
    ];
    return array_map(static fn(array $item): array => [
        'title' => $item[1], 'date' => $item[0], 'kind' => $item[2], 'note' => $item[3],
        'tags' => $item[4], 'source' => 'Fictional Timefold demo collection',
    ], $items);
}
