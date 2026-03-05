import fs from 'fs';
import path from 'path';

// Known 2024 Tournaments to ensure we get a vast majority of the touring field, including Europe.
const TOURNAMENTS = [
    '77759', // Austin
    '77765', // Portland Open
    '77750', // European Open
    '77766', // Beaver State Fling
    '77773', // MVP Open
    '77760', // Texas State
    '77762', // Champions Cup
];

const DIVISIONS = ['MPO', 'FPO'];

async function fetchPlayers() {
    const playersMap = new Map();

    for (const tournId of TOURNAMENTS) {
        for (const div of DIVISIONS) {
            console.log(`Fetching ${div} field for tournament ${tournId}...`);
            try {
                const response = await fetch(`https://www.pdga.com/apps/tournament/live-api/live_results_fetch_round?TournID=${tournId}&Division=${div}&Round=1`);
                if (!response.ok) {
                    console.log(`Failed to fetch ${tournId}`);
                    continue;
                }
                const data = await response.json();

                const playersList = data?.data?.scores;
                if (!playersList) {
                    console.log(`No ${div} pool data found for ${tournId}`);
                    continue;
                }

                for (const playerStats of playersList) {
                    const pdgaNum = parseInt(playerStats.PDGANum);
                    if (!pdgaNum) continue;

                    // Deduplicate, keep highest rating if multiple? Nah just first seen is fine.
                    if (!playersMap.has(pdgaNum)) {
                        const baseRating = parseInt(playerStats.Rating);
                        const fallbackRating = parseInt(playerStats.RoundRating);
                        const finalRating = isNaN(baseRating) ? (isNaN(fallbackRating) ? 0 : fallbackRating) : baseRating;

                        playersMap.set(pdgaNum, {
                            id: `${div.toLowerCase().charAt(0)}_${pdgaNum}`,
                            firstName: playerStats.FirstName,
                            lastName: playerStats.LastName,
                            rating: finalRating,
                            division: div,
                            price: 0, // Will be calculated dynamically
                            tier: getTier(finalRating, div),
                            pdgaNumber: pdgaNum
                        });
                    }
                }
            } catch (error) {
                console.error(`Error fetching ${tournId} ${div}:`, error);
            }
        }
    }

    const allPlayers = Array.from(playersMap.values());

    // Sort logic
    const mpo = allPlayers.filter(p => p.division === 'MPO').sort((a, b) => b.rating - a.rating);
    const fpo = allPlayers.filter(p => p.division === 'FPO').sort((a, b) => b.rating - a.rating);

    console.log(`Extracted total unique MPO: ${mpo.length}`);
    console.log(`Extracted total unique FPO: ${fpo.length}`);

    const fileContent = `import { Player } from './mock-schema';

export const MPO_PLAYERS: Player[] = ${JSON.stringify(mpo, null, 4)};

export const FPO_PLAYERS: Player[] = ${JSON.stringify(fpo, null, 4)};

export const ALL_PLAYERS = [...MPO_PLAYERS, ...FPO_PLAYERS];
`;

    const filePath = path.join(process.cwd(), 'src', 'data', 'mock-players.ts');
    fs.writeFileSync(filePath, fileContent);
    console.log('Successfully wrote to mock-players.ts!');
}

function getTier(rating: number, division: string) {
    if (division === 'MPO') {
        if (rating >= 1040) return 'S';
        if (rating >= 1025) return 'A';
        if (rating >= 1010) return 'B';
        if (rating >= 1000) return 'C';
        return 'D';
    } else {
        if (rating >= 980) return 'S';
        if (rating >= 960) return 'A';
        if (rating >= 940) return 'B';
        if (rating >= 920) return 'C';
        return 'D';
    }
}

fetchPlayers();
