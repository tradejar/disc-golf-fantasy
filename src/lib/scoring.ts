
export interface ScoringRule {
    name: string;
    albatross: number; // -3 or better
    eagle: number;    // -2
    birdie: number;
    par: number;
    bogey: number;
    double: number;
    triple: number;
    // Bonuses
    bogeyFree: number;
    streak3: number;
    ace: number;
}

export interface RoundStats {
    strokes: number; // Actual golf score (e.g. 58)
    toPar?: number; // +/- par
    totalPoints: number; // Fantasy points
    placementPoints?: number; // Added after full field sim
    tournamentRank?: number;
    breakdown: {
        albatrosses: number;
        eagles: number;
        birdies: number;
        pars: number;
        bogeys: number;
        doubles: number;
        triples: number;
        aces: number;
    };
    advanced?: {
        c1xPutting: number; // percentage 0-100
        c2Putting: number;  // percentage 0-100
        fairwayHits: number; // percentage 0-100
        c1InReg: number;
        c2InReg: number;
        scramble: number;
    };
    bonuses: {
        bogeyFree: boolean;
        streak3: boolean;
        ace: boolean;
    };
}

export const SCORING_RULES = {
    CUSTOM_USER: {
        name: 'User Custom',
        albatross: 24, // -3 or better — the rarest shot in disc golf
        eagle: 8,     // -2
        birdie: 3,
        par: 0,
        bogey: -2,
        double: -4,
        triple: -5,
        bogeyFree: 5,
        streak3: 3,
        ace: 15
    }
};

export function getPlacementPoints(rank: number): number {
    if (rank === 1) return 33;
    if (rank === 2) return 24;
    if (rank === 3) return 20;
    if (rank === 4) return 18;
    if (rank === 5) return 16;

    if (rank <= 10) return 10;
    if (rank <= 20) return 6;
    if (rank <= 30) return 4;
    if (rank <= 40) return 3;
    if (rank <= 50) return 2;
    if (rank <= 100) return 1;

    return 0;
}


