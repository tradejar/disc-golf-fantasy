'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface Message {
    id: string;
    user_id: string;
    display_name: string;
    content: string;
    reactions: Record<string, string[]>;
    reactionNames: Record<string, string[]>;
    created_at: string;
    parent_id: string | null;
    replies?: Message[];
}

const EMOJI_OPTIONS = ['👍', '❤️', '😂', '🔥', '😮', '👎'];

// Deterministic color per user — hashes user_id to one of 8 distinct palette colors
const USER_COLORS = ['#38bdf8', '#a78bfa', '#fb923c', '#4ade80', '#f472b6', '#fbbf24', '#34d399', '#f87171'];
function getUserColor(userId: string): string {
    let h = 0;
    for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) >>> 0;
    return USER_COLORS[h % USER_COLORS.length];
}

function formatTime(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function ReactionBar({ msg, leagueId, currentUserId, onReacted, isOwn }: {
    msg: Message; leagueId: string; currentUserId: string;
    onReacted: (msgId: string, reactions: Record<string, string[]>) => void;
    isOwn: boolean;
}) {
    const [tooltip, setTooltip] = useState<{ emoji: string; names: string[] } | null>(null);

    const react = async (emoji: string) => {
        const res = await fetch(`/api/leagues/${leagueId}/messages/${msg.id}/react`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emoji }),
        });
        const data = await res.json();
        if (data.reactions) onReacted(msg.id, data.reactions);
    };

    const existing = Object.entries(msg.reactions ?? {}).filter(([, users]) => users.length > 0);

    return (
        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginTop: '0.35rem', alignItems: 'center', justifyContent: isOwn ? 'flex-end' : 'flex-start' }}>
            {existing.map(([emoji, users]) => {
                const names = msg.reactionNames?.[emoji] ?? [];
                const active = users.includes(currentUserId);
                return (
                    <div key={emoji} style={{ position: 'relative' }}
                        onMouseEnter={() => setTooltip({ emoji, names })}
                        onMouseLeave={() => setTooltip(null)}>
                        <button onClick={() => { react(emoji); setTooltip(null); }}
                            style={{
                                background: active ? '#1e3a5f' : '#0f172a',
                                border: `1px solid ${active ? '#3b82f6' : '#334155'}`,
                                borderRadius: '20px', padding: '0.1rem 0.5rem', cursor: 'pointer',
                                fontSize: '0.8rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.2rem',
                            }}>
                            {emoji} {users.length}
                        </button>
                        {tooltip?.emoji === emoji && names.length > 0 && (
                            <div style={{
                                position: 'absolute', bottom: '110%',
                                [isOwn ? 'right' : 'left']: 0,
                                background: '#0f172a', border: '1px solid #334155',
                                borderRadius: '8px', padding: '0.4rem 0.6rem',
                                fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap',
                                zIndex: 20, pointerEvents: 'none',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                            }}>
                                <div style={{ color: '#38bdf8', fontWeight: 700, marginBottom: '0.2rem' }}>{emoji}</div>
                                {names.map(n => <div key={n}>{n}</div>)}
                            </div>
                        )}
                    </div>
                );
            })}
            <AddReaction onPick={react} align={isOwn ? 'right' : 'left'} />
        </div>
    );
}

function AddReaction({ onPick, align }: { onPick: (e: string) => void; align: 'left' | 'right' }) {
    const [open, setOpen] = useState(false);
    return (
        <div style={{ position: 'relative' }}>
            <button onClick={() => setOpen(o => !o)}
                style={{ background: 'none', border: '1px solid #334155', borderRadius: '20px', padding: '0.1rem 0.5rem', cursor: 'pointer', color: '#64748b', fontSize: '0.8rem' }}>
                + 😊
            </button>
            {open && (
                <div style={{
                    position: 'absolute', bottom: '110%',
                    [align]: 0,
                    zIndex: 20,
                    background: '#1e293b', border: '1px solid #334155', borderRadius: '10px',
                    padding: '0.4rem', display: 'flex', gap: '0.25rem',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                }}>
                    {EMOJI_OPTIONS.map(e => (
                        <button key={e} onClick={() => { onPick(e); setOpen(false); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', padding: '0.1rem' }}>
                            {e}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

interface Props {
    leagueId: string;
    currentUserId: string;
    onUnreadChange?: (hasUnread: boolean) => void;
}

export default function LeagueChat({ leagueId, currentUserId, onUnreadChange }: Props) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [replyTo, setReplyTo] = useState<Message | null>(null);
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState('');
    const [chatError, setChatError] = useState('');
    const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
    const [initialScrollDone, setInitialScrollDone] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const lsKey = `league_chat_seen_${leagueId}`;

    // Scroll the chat container (not the page) to the bottom
    const scrollToBottom = (instant: boolean) => {
        const el = scrollContainerRef.current;
        if (!el) return;
        if (instant) {
            el.scrollTop = el.scrollHeight;
        } else {
            el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
        }
    };

    // Scroll to bottom on initial load (instant) and on new messages (smooth)
    useEffect(() => {
        if (messages.length === 0) return;
        if (!initialScrollDone) {
            scrollToBottom(true);
            setInitialScrollDone(true);
        } else {
            scrollToBottom(false);
        }
        // Mark chat as seen (store latest message timestamp)
        const latest = messages.at(-1)?.created_at ?? '';
        try { localStorage.setItem(lsKey, latest); } catch { }
        onUnreadChange?.(false);
    }, [messages]); // eslint-disable-line react-hooks/exhaustive-deps

    // Load initial messages + poll every 2s for new ones
    useEffect(() => {
        let latestTs = '';

        const fetchMessages = async (initial = false) => {
            try {
                const res = await fetch(`/api/leagues/${leagueId}/messages`);
                const d = await res.json();
                if (d.error) { if (initial) setChatError(d.error); return; }
                const msgs: Message[] = d.messages ?? [];
                if (initial) {
                    setMessages(msgs);
                    latestTs = msgs.at(-1)?.created_at ?? '';
                } else {
                    // Only append genuinely new top-level messages
                    setMessages(prev => {
                        const prevIds = new Set(prev.map(m => m.id));
                        const newMsgs = msgs.filter(m => !prevIds.has(m.id) && !m.parent_id);
                        // Update replies on existing messages too
                        const updated = prev.map(p => {
                            const fresh = msgs.find(m => m.id === p.id);
                            return fresh ? { ...p, replies: fresh.replies ?? p.replies } : p;
                        });
                        return newMsgs.length > 0 ? [...updated, ...newMsgs] : updated;
                    });
                    latestTs = msgs.at(-1)?.created_at ?? latestTs;
                }
            } catch { if (initial) setChatError('Could not connect to chat'); }
        };

        fetchMessages(true);
        const interval = setInterval(() => fetchMessages(false), 2000);
        return () => clearInterval(interval);
    }, [leagueId]);

    const sendMessage = async () => {
        const content = input.trim();
        if (!content || sending) return;
        setSending(true);
        setSendError('');
        try {
            const res = await fetch(`/api/leagues/${leagueId}/messages`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content, parentId: replyTo?.id ?? null }),
            });
            const d = await res.json();
            if (!res.ok) { setSendError(d.error ?? 'Failed to send'); }
            else { setInput(''); setReplyTo(null); }
        } catch { setSendError('Failed to send — check your connection'); }
        finally { setSending(false); }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    };

    const onReacted = useCallback((msgId: string, reactions: Record<string, string[]>) => {
        setMessages(prev => prev.map(m => {
            if (m.id === msgId) return { ...m, reactions };
            if (m.replies) return { ...m, replies: m.replies.map(r => r.id === msgId ? { ...r, reactions } : r) };
            return m;
        }));
    }, []);

    const toggleReplies = (id: string) => setExpandedReplies(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });

    const renderMessage = (msg: Message, isReply = false, rootMsg?: Message) => {
        const isOwn = msg.user_id === currentUserId;
        return (
            <div key={msg.id} style={{
                display: 'flex', flexDirection: 'column',
                alignItems: isOwn ? 'flex-end' : 'flex-start',
                marginBottom: isReply ? '0.4rem' : '0.75rem',
                paddingLeft: isReply ? '1.5rem' : 0,
            }}>
                {/* Name label above bubble for top-level messages */}
                {!isReply && (
                    <span style={{ color: getUserColor(msg.user_id), fontSize: '0.72rem', marginBottom: '0.15rem', fontWeight: 700 }}>
                        {msg.display_name}
                    </span>
                )}
                {/* Constrain bubble + reactions to same max width, no overflow */}
                <div style={{ maxWidth: '78%', display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                        width: '100%',
                        background: isOwn ? '#1e3a5f' : '#1e293b',
                        border: `1px solid ${isOwn ? '#3b82f6' : '#334155'}`,
                        borderRadius: isOwn ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                        padding: '0.55rem 0.85rem',
                        boxSizing: 'border-box',
                    }}>
                        {/* Always show sender name inside reply bubbles so OP knows who replied */}
                        {isReply && (
                            <div style={{ color: getUserColor(msg.user_id), fontSize: '0.7rem', fontWeight: 700, marginBottom: '0.2rem' }}>{msg.display_name}</div>
                        )}
                        <p style={{ color: 'white', margin: 0, fontSize: '0.9rem', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                            {msg.content}
                        </p>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.2rem', justifyContent: isOwn ? 'flex-end' : 'flex-start' }}>
                            <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>{formatTime(msg.created_at)}</span>
                            <button onClick={() => { setReplyTo(rootMsg ?? msg); inputRef.current?.focus(); }}
                                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.7rem', padding: 0 }}>
                                Reply
                            </button>
                        </div>
                    </div>
                    <ReactionBar msg={msg} leagueId={leagueId} currentUserId={currentUserId} onReacted={onReacted} isOwn={isOwn} />
                </div>

                {/* Reply toggle */}
                {!isReply && msg.replies && msg.replies.length > 0 && (
                    <button onClick={() => toggleReplies(msg.id)}
                        style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '0.75rem', marginTop: '0.25rem', padding: 0 }}>
                        {expandedReplies.has(msg.id) ? '▲ Hide' : `▼ ${msg.replies.length} ${msg.replies.length === 1 ? 'reply' : 'replies'}`}
                    </button>
                )}
                {!isReply && expandedReplies.has(msg.id) && msg.replies?.map(r => renderMessage(r, true, msg))}
            </div>
        );
    };

    return (
        <div style={{ background: '#1e293b', borderRadius: '14px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', height: '520px' }}>
            {/* Header */}
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.1rem' }}>💬</span>
                <h2 style={{ color: 'white', margin: 0, fontSize: '1rem', fontWeight: 700 }}>League Chat</h2>
                <span style={{ color: '#0ea5e9', fontSize: '0.65rem', fontWeight: 700, background: '#0c2231', padding: '0.1rem 0.45rem', borderRadius: '10px', border: '1px solid #0ea5e9' }}>LIVE</span>
            </div>

            {/* Messages */}
            <div ref={scrollContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column' }}>
                {chatError ? (
                    <div style={{ color: '#fca5a5', textAlign: 'center', margin: 'auto', fontSize: '0.85rem', background: '#450a0a', border: '1px solid #dc2626', borderRadius: '8px', padding: '1rem' }}>
                        <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⚠️</div>
                        Chat unavailable — the database table may not be set up yet.<br />
                        <span style={{ fontSize: '0.75rem', color: '#f87171' }}>{chatError}</span>
                    </div>
                ) : messages.length === 0 ? (
                    <div style={{ color: '#475569', textAlign: 'center', margin: 'auto', fontSize: '0.9rem' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💬</div>
                        No messages yet. Say something!
                    </div>
                ) : (
                    messages.map(m => renderMessage(m))
                )}
                <div ref={bottomRef} />
            </div>

            {/* Reply preview */}
            {replyTo && (
                <div style={{ padding: '0.5rem 1.25rem', background: '#0f172a', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b', fontSize: '0.8rem' }}>
                        ↩️ Replying to <strong style={{ color: '#38bdf8' }}>{replyTo.display_name}</strong>: "{replyTo.content.substring(0, 40)}{replyTo.content.length > 40 ? '…' : ''}"
                    </span>
                    <button onClick={() => setReplyTo(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1rem' }}>×</button>
                </div>
            )}

            {/* Input */}
            <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {sendError && <div style={{ color: '#fca5a5', fontSize: '0.78rem', paddingLeft: '0.25rem' }}>⚠️ {sendError}</div>}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={replyTo ? `Reply to ${replyTo.display_name}…` : 'Type a message… (Enter to send, Shift+Enter for newline)'}
                        rows={1}
                        style={{
                            flex: 1, background: '#0f172a', border: '1px solid #334155', borderRadius: '10px',
                            color: 'white', padding: '0.65rem 0.9rem', fontSize: '0.9rem', resize: 'none',
                            maxHeight: '100px', overflow: 'auto', lineHeight: 1.5, outline: 'none',
                        }}
                    />
                    <button
                        onClick={sendMessage} disabled={sending || !input.trim()}
                        style={{
                            background: sending || !input.trim() ? '#334155' : '#3b82f6',
                            border: 'none', borderRadius: '10px', color: 'white',
                            padding: '0.65rem 1rem', cursor: sending || !input.trim() ? 'not-allowed' : 'pointer',
                            fontWeight: 700, fontSize: '0.95rem', whiteSpace: 'nowrap', flexShrink: 0,
                        }}>
                        {sending ? '…' : '↑'}
                    </button>
                </div>
            </div>
        </div>
    );
}
