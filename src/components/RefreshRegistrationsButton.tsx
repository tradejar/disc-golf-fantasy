'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './RefreshRegistrationsButton.module.css';

interface CooldownInfo {
    on_cooldown: boolean;
    next_allowed_at: string;
    seconds_remaining: number;
}

/**
 * Manual "refresh PDGA registrations" button.
 *
 * Server enforces a 30-min global cooldown across all users — one click
 * blocks everyone else for half an hour. The button polls the cooldown
 * state on mount so it renders disabled if a teammate just refreshed.
 */
export default function RefreshRegistrationsButton() {
    const router = useRouter();
    const [secondsLeft, setSecondsLeft] = useState(0);
    const [busy, setBusy] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const tickRef = useRef<NodeJS.Timeout | null>(null);

    // ── Initial cooldown state ────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;
        fetch('/api/registrations/refresh').then(r => r.json()).then((d: CooldownInfo) => {
            if (cancelled) return;
            if (d.on_cooldown) setSecondsLeft(d.seconds_remaining);
        }).catch(() => { /* render as available, server will reject if not */ });
        return () => { cancelled = true; };
    }, []);

    // ── Tick down each second while on cooldown ───────────────────────────
    useEffect(() => {
        if (secondsLeft <= 0) {
            if (tickRef.current) clearInterval(tickRef.current);
            return;
        }
        tickRef.current = setInterval(() => {
            setSecondsLeft(s => Math.max(0, s - 1));
        }, 1000);
        return () => { if (tickRef.current) clearInterval(tickRef.current); };
    }, [secondsLeft]);

    // ── Auto-clear toast after 5s ─────────────────────────────────────────
    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 5000);
        return () => clearTimeout(t);
    }, [toast]);

    async function handleClick() {
        if (busy || secondsLeft > 0) return;
        setBusy(true);
        try {
            const res = await fetch('/api/registrations/refresh', { method: 'POST' });
            const data = await res.json();

            if (res.status === 429) {
                setSecondsLeft(data.seconds_remaining || 1800);
                setToast('Someone else just refreshed — try again later.');
                return;
            }
            if (!res.ok) {
                setToast(data.message || 'Refresh failed. Try again later.');
                if (data.next_allowed_at) {
                    setSecondsLeft(Math.max(0, Math.ceil((new Date(data.next_allowed_at).getTime() - Date.now()) / 1000)));
                }
                return;
            }

            // Success — kick off cooldown locally and refresh server data.
            setSecondsLeft(30 * 60);
            const added = data.added || 0;
            const removed = data.removed || 0;
            if (added === 0 && removed === 0) {
                setToast('Player list is already up to date.');
            } else {
                const parts: string[] = [];
                if (added)   parts.push(`+${added} added`);
                if (removed) parts.push(`-${removed} withdrew`);
                setToast(`Updated: ${parts.join(', ')}`);
            }
            router.refresh();
        } catch {
            setToast('Network error. Try again.');
        } finally {
            setBusy(false);
        }
    }

    const disabled = busy || secondsLeft > 0;
    const label = busy
        ? 'Refreshing…'
        : secondsLeft > 0
            ? `Wait ${formatCountdown(secondsLeft)}`
            : 'Refresh';

    return (
        <div className={styles.wrap}>
            <button
                type="button"
                onClick={handleClick}
                disabled={disabled}
                className={styles.btn}
                title={
                    secondsLeft > 0
                        ? 'Refresh is on cooldown — only one refresh per 30 minutes is allowed across all users.'
                        : 'Pull the latest registered player list from PDGA'
                }
                aria-label="Refresh registered player list"
            >
                <span className={busy ? styles.iconSpin : styles.icon} aria-hidden="true">↻</span>
                <span>{label}</span>
            </button>
            {toast && <div className={styles.toast}>{toast}</div>}
        </div>
    );
}

function formatCountdown(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s.toString().padStart(2, '0')}s`;
}
