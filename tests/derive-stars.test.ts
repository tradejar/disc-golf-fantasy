import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveStars, StatRowLite } from '../src/lib/derive-stars';

// Synthetic MPO field: an elite all-rounder, a pure putter (low power), and a
// weak player — plus one player with no driving data (Power should be null).
function main(name: string, o: Record<string, number>): StatRowLite {
    return {
        norm_name: name, division: 'MPO', category: 'main', events: 8, rounds: 30,
        stats: { FWY: o.fwy, C1R: o.c1r, SCR: o.scr, C1X: o.c1x, C2P: o.c2p, 'Tot. SG:P': o.sgp, 'Birdie Avg': o.bird, 'Bogey Avg': o.bog, 'OB/18': o.ob },
    };
}
function drv(name: string, slg: number): StatRowLite {
    return { norm_name: name, division: 'MPO', category: 'driving', events: null, rounds: 90, stats: { SLG: slg } };
}

const rows: StatRowLite[] = [
    main('star', { fwy: 78, c1r: 48, scr: 75, c1x: 91, c2p: 42, sgp: 60, bird: 9.3, bog: 1.4, ob: 1.2 }), drv('star', 1.20),
    main('mid', { fwy: 70, c1r: 38, scr: 50, c1x: 85, c2p: 25, sgp: 10, bird: 6, bog: 3, ob: 1.8 }), drv('mid', 0.85),
    main('putter', { fwy: 66, c1r: 30, scr: 45, c1x: 95, c2p: 38, sgp: 62, bird: 6.3, bog: 2.7, ob: 1.4 }), drv('putter', 0.58),
    main('low', { fwy: 60, c1r: 22, scr: 35, c1x: 80, c2p: 15, sgp: -20, bird: 3.5, bog: 5, ob: 2.7 }), drv('low', 0.35),
    main('nodrive', { fwy: 75, c1r: 44, scr: 60, c1x: 88, c2p: 30, sgp: 20, bird: 7, bog: 2, ob: 1.3 }), // no driving row
];

const m = deriveStars(rows);
const get = (n: string) => m.get(`${n}|MPO`)!;

test('every player is rated, values within 0-100 or null', () => {
    for (const n of ['star', 'mid', 'putter', 'low', 'nodrive']) {
        const a = get(n);
        assert.ok(a, `${n} should be present`);
        for (const v of [a.power, a.accuracy, a.recovery, a.putting, a.consistency]) {
            assert.ok(v === null || (v >= 0 && v <= 100), `value ${v} out of range`);
        }
    }
});

test('highest driver gets Power 100, lowest gets 0', () => {
    assert.equal(get('star').power, 100); // top SLG among qualified
    assert.equal(get('low').power, 0);
});

test('missing driving data => Power is null (not a fake score)', () => {
    assert.equal(get('nodrive').power, null);
});

test('elite all-rounder grades high; weak player grades low', () => {
    assert.ok((get('star').accuracy ?? 0) > (get('low').accuracy ?? 0));
    assert.ok((get('star').consistency ?? 0) > (get('low').consistency ?? 0));
});

test('pure putter: strong Putting, weak Power', () => {
    const p = get('putter');
    assert.ok((p.putting ?? 0) >= 75, `putting ${p.putting} should be high`);
    assert.ok((p.power ?? 100) <= 40, `power ${p.power} should be low`);
});

test('FPO Power uses the lower long-hole threshold (18) so the field is rated', () => {
    // FPO sees far fewer 400'+ holes; a ~20-hole sample must still earn a Power rating.
    const fpoRows: StatRowLite[] = [
        { ...main('w1', { fwy: 72, c1r: 40, scr: 55, c1x: 90, c2p: 30, sgp: 30, bird: 7, bog: 2, ob: 1.4 }), division: 'FPO' },
        { norm_name: 'w1', division: 'FPO', category: 'driving', events: null, rounds: 20, stats: { SLG: 1.0 } },
        { ...main('w2', { fwy: 66, c1r: 30, scr: 45, c1x: 85, c2p: 22, sgp: 5, bird: 5, bog: 3, ob: 2 }), division: 'FPO' },
        { norm_name: 'w2', division: 'FPO', category: 'driving', events: null, rounds: 22, stats: { SLG: 0.6 } },
    ];
    const out = deriveStars(fpoRows);
    assert.notEqual(out.get('w1|FPO')!.power, null);
    assert.notEqual(out.get('w2|FPO')!.power, null);
    assert.ok((out.get('w1|FPO')!.power ?? 0) > (out.get('w2|FPO')!.power ?? 0));
});

test('FPO players are scored independently of MPO (separate field)', () => {
    const out = deriveStars([
        main('a', { fwy: 70, c1r: 40, scr: 55, c1x: 90, c2p: 30, sgp: 30, bird: 7, bog: 2, ob: 1.4 }),
    ].map(r => ({ ...r, division: 'FPO' as const })));
    assert.ok(out.has('a|FPO'));
    assert.ok(!out.has('a|MPO'));
});
