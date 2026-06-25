import crypto from 'crypto';

// Signs unsubscribe links so a user can only unsubscribe themselves.
// Without this, anyone could unsubscribe any user by guessing their id.
// Keyed off CRON_SECRET (server-only, already configured).

function key(): string {
    return process.env.CRON_SECRET || '';
}

export function unsubscribeToken(uid: string): string {
    return crypto.createHmac('sha256', key()).update(uid).digest('hex').slice(0, 32);
}

export function verifyUnsubscribe(uid: string | null, token: string | null): boolean {
    if (!uid || !token) return false;
    const expected = unsubscribeToken(uid);
    const a = Buffer.from(expected);
    const b = Buffer.from(token);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function unsubscribeUrl(uid: string): string {
    return `https://eagly.app/api/unsubscribe?uid=${encodeURIComponent(uid)}&token=${unsubscribeToken(uid)}`;
}
