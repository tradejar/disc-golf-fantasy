
// Types
export interface Player {
    id: string;
    firstName: string;
    lastName: string;
    rating: number; // PDGA Rating
    division: 'MPO' | 'FPO';
    price: number; // Calculated based on rating/tier
    tier: 'S' | 'A' | 'B' | 'C' | 'D'; // Optional tiering
    pdgaNumber?: number; // Optional until all players have it
    country?: string; // ISO alpha-2 nationality (PDGA Nationality ?? Country), e.g. 'US', 'FI'
    power?: number;
    accuracy?: number;
    recovery?: number;
    resilience?: number;
    versatility?: number;
    statmando?: import('./statmando-types').StatmandoStats; // StatMando season stats (draft dropdown)
    abilities?: import('@/lib/derive-stars').Abilities;     // 1-5 stars derived from StatMando data
}

export interface Tournament {
    id: string;
    name: string;
    date: string;
    status: 'upcoming' | 'live' | 'completed';
    course: string;
}

export interface Score {
    playerId: string;
    tournamentId: string;
    round1: number;
    round2: number;
    round3: number;
    total: number;
    position: number;
    thru: number; // Holes completed in current round
}

// Pricing Algorithm Idea
// Price = Base * (Multiplier ^ (Rating - Threshold))
// Example: 
// Base = 1000
// 1050 Rated Player: 1000 * (1.02 ^ (1050-900)) ...
// Or simple exponential curve mapping.

// Mock Players
export const MOCK_PLAYERS: Player[] = [
    { id: '1', firstName: 'Paul', lastName: 'McBeth', rating: 1055, division: 'MPO', price: 0, tier: 'S', pdgaNumber: 27523 },
    { id: '2', firstName: 'Ricky', lastName: 'Wysocki', rating: 1052, division: 'MPO', price: 0, tier: 'S', pdgaNumber: 38008 },
    { id: '3', firstName: 'Calvin', lastName: 'Heimburg', rating: 1048, division: 'MPO', price: 0, tier: 'S', pdgaNumber: 45971 },
    { id: '4', firstName: 'Gannon', lastName: 'Buhr', rating: 1045, division: 'MPO', price: 0, tier: 'S', pdgaNumber: 75412 },
    { id: '5', firstName: 'Eagle', lastName: 'McMahon', rating: 1040, division: 'MPO', price: 0, tier: 'A', pdgaNumber: 37817 },
    // ... more players
];

