
import styles from './PlayerCard.module.css';
import { Player } from '@/data/mock-schema';

interface PlayerCardProps {
    player: Player;
    onDraft: (player: Player) => void;
    disabled: boolean;
    isSelected: boolean;
}

export default function PlayerCard({ player, onDraft, disabled, isSelected }: PlayerCardProps) {
    // Value Ratio: Rating / Price
    const value = (player.rating / Math.max(1, player.price)).toFixed(2);

    return (
        <div className={`${styles.card} ${isSelected ? styles.selected : ''} ${disabled ? styles.disabled : ''}`}>
            <div className={styles.header}>
                <span className={styles.rating}>{player.rating}</span>
                <span className={styles.name}>{player.firstName} {player.lastName}</span>
            </div>

            <div className={styles.stats}>
                <div className={styles.stat}>
                    <span className={styles.label}>Price</span>
                    <span className={styles.value}>${player.price}</span>
                </div>
                <div className={styles.stat}>
                    <span className={styles.label}>Value</span>
                    <span className={styles.value}>{value}</span>
                </div>
            </div>

            <button
                className={styles.button}
                onClick={() => onDraft(player)}
                disabled={disabled && !isSelected}
            >
                {isSelected ? 'Remove' : 'Draft'}
            </button>
        </div>
    );
}
