import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getPlacementPoints } from '../src/lib/scoring';

test('placement points: podium tiers', () => {
    assert.equal(getPlacementPoints(1), 33);
    assert.equal(getPlacementPoints(2), 24);
    assert.equal(getPlacementPoints(3), 20);
    assert.equal(getPlacementPoints(4), 18);
    assert.equal(getPlacementPoints(5), 16);
});

test('placement points: banded tiers', () => {
    assert.equal(getPlacementPoints(10), 10);
    assert.equal(getPlacementPoints(11), 6);
    assert.equal(getPlacementPoints(20), 6);
    assert.equal(getPlacementPoints(30), 4);
    assert.equal(getPlacementPoints(40), 3);
    assert.equal(getPlacementPoints(50), 2);
    assert.equal(getPlacementPoints(100), 1);
});

test('placement points: outside the money is zero', () => {
    assert.equal(getPlacementPoints(101), 0);
    assert.equal(getPlacementPoints(500), 0);
});

test('placement points are monotonically non-increasing', () => {
    let prev = Infinity;
    for (let r = 1; r <= 120; r++) {
        const p = getPlacementPoints(r);
        assert.ok(p <= prev, `rank ${r} (${p}) should be <= rank ${r - 1} (${prev})`);
        prev = p;
    }
});
