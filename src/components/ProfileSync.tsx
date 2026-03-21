'use client';
import { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';

// Sends the current user's fresh name/email directly from the Clerk client-side
// session to our sync endpoint. useUser() always has the latest data from the
// active session — no server-side API keys required, no caching issues.
export default function ProfileSync() {
    const { isSignedIn, user } = useUser();

    useEffect(() => {
        if (!isSignedIn || !user) return;

        const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ')
            || user.primaryEmailAddress?.emailAddress?.split('@')[0]
            || 'Player';

        // Send the current name directly — the server just verifies auth and upserts
        fetch('/api/sync-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                displayName,
                email: user.primaryEmailAddress?.emailAddress ?? null,
                avatarUrl: user.imageUrl ?? null,
            }),
        }).catch(() => { });
    }, [isSignedIn, user, user?.firstName, user?.lastName]);

    return null;
}
