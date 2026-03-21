
import styles from './PlayerRow.module.css';
import { Player } from '@/data/mock-schema';
import PlayerRatings from './PlayerRatings';

interface PlayerRowProps {
    player: Player;
    onDraft: (player: Player) => void;
    disabled: boolean;
    isSelected: boolean;
    isRegistered?: boolean;
    isPremium?: boolean;
}

export default function PlayerRow({ player, onDraft, disabled, isSelected, isRegistered, isPremium = false }: PlayerRowProps) {
    const value = player.price > 0 ? (player.rating / player.price).toFixed(2) : '-';

    return (
        <div className={`${styles.row} ${isSelected ? styles.selected : ''} ${disabled ? styles.disabled : ''}`}>
            <div className={styles.ratingBadge}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.55rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.1rem' }}>Rating</span>
                    <span className={styles.rating}>{player.rating}</span>
                </div>
            </div>

            <div className={styles.mobileInfo}>
                <span className={styles.name}>
                    {player.firstName} {player.lastName}
                    {isRegistered === true && (
                        <span style={{ marginLeft: '6px', fontSize: '0.65em', padding: '2px 4px', backgroundColor: '#dcfce7', color: '#166534', borderRadius: '4px', display: 'inline-block', verticalAlign: 'middle' }}>
                            ✅ Registered
                        </span>
                    )}
                </span>
                <span className={styles.division}>{player.division}</span>
                <PlayerRatings player={player} isPremium={isPremium} />
            </div>

            <div className={styles.mobileStats}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.1rem' }}>Price</span>
                    <span className={styles.price}>${player.price}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.1rem' }}>Value</span>
                    <span className={styles.value}>{value} pts/$</span>
                </div>
            </div>

            <div className={styles.mobileAction}>
                <button
                    className={styles.button}
                    onClick={() => onDraft(player)}
                    disabled={disabled && !isSelected}
                >
                    {isSelected ? 'Remove' : 'Draft'}
                </button>
            </div>
        </div>
    );
}
