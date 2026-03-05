'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ResetButton() {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleReset = async () => {
        if (!confirm('⚠️ ADMIN: This will delete ALL entries for ALL users across all tournaments. Are you sure?')) return;

        setIsLoading(true);
        try {
            const res = await fetch('/api/reset-history', { method: 'POST' });
            if (res.ok) {
                router.refresh();
            } else {
                const body = await res.json().catch(() => ({}));
                if (res.status === 401) alert('Not signed in — please log in first.');
                else alert(`Reset failed (${res.status}): ${body?.error || 'Unknown error'}`);
            }
        } catch (e) {
            console.error(e);
            alert('Network error — could not reach server.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <button
            onClick={handleReset}
            disabled={isLoading}
            style={{
                background: '#ef4444',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1,
                fontSize: '0.85rem',
                fontWeight: 600,
                marginTop: '1rem'
            }}
        >
            {isLoading ? 'Resetting...' : '⚠️ Reset All Game Data (Admin)'}
        </button>
    );
}
