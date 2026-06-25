import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveCourseRating, CourseRatingRow } from '../src/lib/derive-course';

const row = (season: number, event_name: string, distance_rating: number, technical_rating: number): CourseRatingRow => ({
    pdga_event_id: String(Math.random()), season, event_name, round_length_ft: 9000, distance_rating, technical_rating,
});

const rows: CourseRatingRow[] = [
    row(2024, 'DGPT - Swedish Open presented by Kastaplast', 1, 5),
    row(2025, 'DGPT - Ale Open presented by Discraft', 2, 4),
    row(2026, '2026 PDGA European Open', 3, 5),
    row(2024, 'Coolbet presents: European Disc Golf Festival 2024', 2, 1),
];

test('matches a tournament to its venue by name (ignoring sponsor/org noise)', () => {
    const r = deriveCourseRating(rows, '2026 Swedish Open');
    assert.ok(r);
    assert.equal(r!.distance, 1);
    assert.equal(r!.technical, 5);
    assert.equal(r!.season, 2024);
});

test('returns null when no venue history exists', () => {
    assert.equal(deriveCourseRating(rows, '2026 Heinola Open'), null);
});

test('does not confuse "European Open" with "European Disc Golf Festival"', () => {
    const r = deriveCourseRating(rows, '2026 European Open');
    assert.ok(r);
    assert.equal(r!.technical, 5); // the Open (tech 5), not the Festival (tech 1)
});

test('on multiple playings, the most recent season wins', () => {
    const multi: CourseRatingRow[] = [
        row(2024, 'DGPT - Ale Open presented by Discraft', 2, 2),
        row(2025, 'DGPT - Ale Open presented by Discraft', 4, 4),
    ];
    const r = deriveCourseRating(multi, '2026 Ale Open');
    assert.ok(r);
    assert.equal(r!.season, 2025);
    assert.equal(r!.distance, 4);
});
