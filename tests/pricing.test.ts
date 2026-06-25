import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculatePrice, calculateDynamicPrice } from '../src/lib/pricing';

const ab = (power: number, accuracy: number) => ({
    power, accuracy, recovery: null, putting: null, consistency: null,
});

test('calculatePrice = rating minus division floor', () => {
    assert.equal(calculatePrice(1050, 'MPO'), 170); // 1050 - 880
    assert.equal(calculatePrice(1000, 'MPO'), 120);
    assert.equal(calculatePrice(900, 'FPO'), 100);  // 900 - 800
});

test('calculatePrice floors at MIN_PRICE (never below 1)', () => {
    assert.equal(calculatePrice(700, 'MPO'), 1);
    assert.equal(calculatePrice(800, 'FPO'), 1);
});

test('no course and no form leaves base price unchanged', () => {
    assert.equal(calculateDynamicPrice(100, {}, undefined, []), 100);
});

test('course-fit: elite power+accuracy on a max-demand course adds ~12%', () => {
    // 6·((100-50)/50)·(5/5) per axis × 2 axes = +12%
    assert.equal(calculateDynamicPrice(100, { abilities: ab(100, 100) }, { distance: 5, technical: 5 }, []), 112);
});

test('course-fit: poor skills on a demanding course discount the price', () => {
    assert.equal(calculateDynamicPrice(100, { abilities: ab(0, 0) }, { distance: 5, technical: 5 }, []), 88);
});

test('course-fit: average (50) player is neutral', () => {
    assert.equal(calculateDynamicPrice(100, { abilities: ab(50, 50) }, { distance: 5, technical: 5 }, []), 100);
});

test('course-fit: low course demand mutes the swing', () => {
    // distance demand 1/5 = 0.2 → elite power adds only 6·1·0.2 = 1.2%, no accuracy axis
    assert.equal(calculateDynamicPrice(100, { abilities: ab(100, 50) }, { distance: 1, technical: 1 }, []), 101);
});

test('untracked player (no abilities) gets neutral course-fit', () => {
    assert.equal(calculateDynamicPrice(100, {}, { distance: 5, technical: 5 }, []), 100);
});

test('recent form: a win adds +3%', () => {
    assert.equal(calculateDynamicPrice(100, {}, undefined, [{ finish_position: 1, cashed: true }]), 103);
});

test('recent form: a missed cash subtracts 3%', () => {
    assert.equal(calculateDynamicPrice(100, {}, undefined, [{ finish_position: 80, cashed: false }]), 97);
});

test('final price never drops below MIN_PRICE', () => {
    assert.equal(calculateDynamicPrice(1, { abilities: ab(0, 0) }, { distance: 5, technical: 5 }, []), 1);
});
