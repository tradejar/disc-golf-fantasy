import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

const STATMANDO_PLAYERS_API = 'https://statmando.com/api/v2/players';

interface ScrapedPlayer {
    name: string;
    pdga_number: string;
    rating: number;
    division: 'MPO' | 'FPO';
}

async function scrapeRankings(): Promise<{ mpo: ScrapedPlayer[], fpo: ScrapedPlayer[] }> {
    const mpoPlayers: ScrapedPlayer[] = [];
    const fpoPlayers: ScrapedPlayer[] = [];

    console.log(`Fetching player data from StatMando API...`);

    try {
        const { data } = await axios.get(STATMANDO_PLAYERS_API, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            }
        });

        // Statmando API structure typically returns an array of player objects
        // We will take the top 150 MPO and 75 FPO based on rating

        const allPlayers = data.filter((p: any) => p.rating !== null && p.rating > 0);

        // Sort by rating descending
        allPlayers.sort((a: any, b: any) => b.rating - a.rating);

        // Separate and slice
        const mpoList = allPlayers.filter((p: any) => p.gender === 'M' || p.division === 'MPO').slice(0, 150);
        const fpoList = allPlayers.filter((p: any) => p.gender === 'F' || p.division === 'FPO').slice(0, 75);

        mpoList.forEach((p: any) => {
            mpoPlayers.push({
                name: p.first_name + ' ' + p.last_name,
                pdga_number: p.pdga_no?.toString() || '',
                rating: p.rating,
                division: 'MPO'
            });
        });

        fpoList.forEach((p: any) => {
            fpoPlayers.push({
                name: p.first_name + ' ' + p.last_name,
                pdga_number: p.pdga_no?.toString() || '',
                rating: p.rating,
                division: 'FPO'
            });
        });

    } catch (error: any) {
        console.error(`Failed to fetch from StatMando: ${error.message}`);
    }

    return { mpo: mpoPlayers, fpo: fpoPlayers };
}

function calculateStartingPrice(rating: number, division: 'MPO' | 'FPO'): number {
    let basePrice = 0;

    if (division === 'MPO') {
        if (rating >= 1045) basePrice = 350;
        else if (rating >= 1040) basePrice = 300;
        else if (rating >= 1030) basePrice = 250;
        else if (rating >= 1020) basePrice = 200;
        else if (rating >= 1010) basePrice = 150;
        else if (rating >= 1000) basePrice = 100;
        else basePrice = 50;
    } else {
        if (rating >= 985) basePrice = 300;
        else if (rating >= 975) basePrice = 250;
        else if (rating >= 960) basePrice = 200;
        else if (rating >= 945) basePrice = 150;
        else if (rating >= 930) basePrice = 100;
        else basePrice = 50;
    }

    // Add slight variance to make numbers look organic (e.g. 350 -> 357)
    const variance = Math.floor(Math.random() * 15) - 5;
    return Math.max(50, basePrice + variance);
}

async function main() {
    console.log('--- Starting Player Roster Extraction (2026 Season Prep) ---');

    const { mpo, fpo } = await scrapeRankings();

    if (mpo.length === 0 || fpo.length === 0) {
        console.error('🚨 Failed to extract player data. Check API status.');
        return;
    }

    console.log(`✅ Extracted ${mpo.length} MPO players.`);
    console.log(`✅ Extracted ${fpo.length} FPO players.`);

    const allPlayers = [...mpo, ...fpo];

    // Generate TypeScript file output
    let outputContent = `import { Player } from './mock-schema';\n\n`;
    outputContent += `// Automatically generated from StatMando API\n\n`;

    outputContent += `export const MOCK_MPO_PLAYERS: Player[] = [\n`;
    mpo.forEach(p => {
        outputContent += `  { id: '${p.name.replace(/[^a-zA-Z]/g, '').toLowerCase()}', ObjectName: '${p.name.replace(/'/g, "\\'")}', team: 'MPO', startingPrice: ${calculateStartingPrice(p.rating, 'MPO')}, pdgaNumber: '${p.pdga_number}', rating: ${p.rating} },\n`;
    });
    outputContent += `];\n\n`;

    outputContent += `export const MOCK_FPO_PLAYERS: Player[] = [\n`;
    fpo.forEach(p => {
        outputContent += `  { id: '${p.name.replace(/[^a-zA-Z]/g, '').toLowerCase()}', ObjectName: '${p.name.replace(/'/g, "\\'")}', team: 'FPO', startingPrice: ${calculateStartingPrice(p.rating, 'FPO')}, pdgaNumber: '${p.pdga_number}', rating: ${p.rating} },\n`;
    });
    outputContent += `];\n`;

    const outputPath = path.resolve(__dirname, '../src/data/players.ts');
    fs.writeFileSync(outputPath, outputContent, 'utf-8');

    console.log(`\n🎉 Successfully injected ${allPlayers.length} total players into src/data/players.ts`);
    console.log(`Pricing and ratings algorithms have generated organic 2026 baselines.`);
}

main().catch(console.error);
