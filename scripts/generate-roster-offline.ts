import * as fs from 'fs';
import * as path from 'path';
import { Player } from '../src/data/mock-schema';

const mpoNames = [
    "Calvin Heimburg", "Gannon Buhr", "Ricky Wysocki", "Isaac Robinson", "Eagle McMahon",
    "Simon Lizotte", "Paul McBeth", "Anthony Barela", "Niklas Anttila", "Chris Dickerson",
    "Matthew Orum", "Cole Redalen", "Kyle Klein", "Aaron Gossage", "Bradley Williams",
    "Corey Ellis", "James Conrad", "Kevin Jones", "Alden Harris", "Ezra Aderhold",
    "Joel Freeman", "Adam Hammes", "James Proctor", "Väinö Mäkelä", "Evan Smith",
    "Mason Ford", "Luke Humphries", "Garrett Gurthie", "Chris Clemons", "Evan Scott",
    "Ben Callaway", "Linus Carlsson", "Drew Gibson", "Brodie Smith", "Sullivan Tipton",
    "Andrew Marwede", "Chandler Kramer", "Emerson Keith", "Joseph Anderson", "Lauri Lehtinen",
    "Gavin Rathbun", "Albert Tamm", "Gavin Babcock", "Luke Samson", "Paul Ulibarri",
    "Casey White", "Gregg Barsby", "Jermaine Walton", "Nate Sexton", "Andrew Presnell",
    "Ezra Robinson", "Maciey Kulis", "Thomas Gilbert", "Cale Leiviska", "Zackeriath Johnson",
    "Jeremy Koling", "Nathan Queen", "Austin Hannum", "Uli", "Zack Melton",
    "Terry Rothlisberger", "Jason Pinkal", "Robert Burridge", "Luke Taylor",
    "Jake Hebenheimer", "Jesse Nieminen", "Cody Bradshaw", "A.J. Carey", "Tristan Tanner"
];

const fpoNames = [
    "Kristin Tattar", "Missy Gannon", "Ohn Scoggins", "Holyn Handley", "Eveliina Salonen",
    "Valerie Mandujano", "Henna Blomroos", "Ella Hansen", "Macie Velediaz", "Hailey King",
    "Kat Mertsch", "Sarah Hokom", "Jessica Weese", "Silva Saarinen", "Catrina Allen",
    "Paige Pierce", "Natalie Ryan", "Ali Smith", "Rebecca Cox", "Maria Oliva",
    "Deann Carey", "Lisa Fajkus", "Juliana Korver", "Madison Walker", "Hannah Huynh",
    "Ariana Lempke", "Alexis Mandujano", "Rachel Turton", "Sai Ananda", "Chandler Heinz",
    "Lauren Butler", "Lykke Lorentzen", "Chantel Budinsky", "Stacie Rawnsley", "Lydia Lyons",
    "Holly Finley"
];

function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}

function generatePlayers(names: string[], division: 'MPO' | 'FPO'): Player[] {
    const uniqueNames = [...new Set(names)];

    return uniqueNames.map((name, index) => {
        const hash = hashString(name);
        let baseRating = division === 'MPO' ? 1050 : 995;
        let ratingDecay = Math.floor(index * 1.5);
        let rating = baseRating - ratingDecay + (hash % 5);

        let basePrice = 50;
        let tier: 'S' | 'A' | 'B' | 'C' | 'D' = 'C';

        if (division === 'MPO') {
            if (rating >= 1040) { basePrice = 350; tier = 'S'; }
            else if (rating >= 1030) { basePrice = 300; tier = 'A'; }
            else if (rating >= 1020) { basePrice = 250; tier = 'B'; }
            else if (rating >= 1010) { basePrice = 200; tier = 'C'; }
            else if (rating >= 1000) { basePrice = 150; tier = 'D'; }
            else if (rating >= 990) { basePrice = 100; tier = 'D'; }
        } else {
            if (rating >= 980) { basePrice = 350; tier = 'S'; }
            else if (rating >= 970) { basePrice = 300; tier = 'A'; }
            else if (rating >= 960) { basePrice = 250; tier = 'B'; }
            else if (rating >= 950) { basePrice = 200; tier = 'C'; }
            else if (rating >= 940) { basePrice = 150; tier = 'D'; }
            else if (rating >= 930) { basePrice = 100; tier = 'D'; }
        }

        let variance = Math.floor((hash % 16)) - 5;
        let finalPrice = Math.max(50, basePrice + variance);

        // Ensure pdgaNumber is a number to satisfy mock-schema.ts
        let pdgaNumber = (10000 + (hash % 80000));

        const nameParts = name.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ');

        return {
            id: name.replace(/[^a-zA-Z]/g, '').toLowerCase(),
            firstName: firstName,
            lastName: lastName,
            division: division,
            price: finalPrice,
            pdgaNumber: pdgaNumber,
            rating: rating,
            tier: tier
        };
    });
}

function main() {
    console.log('Generating expansive 2026 player roster offline with strict schema typing...');

    const mpoPlayers = generatePlayers(mpoNames, 'MPO');
    const fpoPlayers = generatePlayers(fpoNames, 'FPO');

    let outputContent = `import { Player } from './mock-schema';\n\n`;
    outputContent += `// Exhaustive MPO & FPO Roster generated for the 2026 Season\n`;
    outputContent += `// Simulated ratings and prices based on world rank tiers.\n\n`;

    outputContent += `export const MOCK_MPO_PLAYERS: Player[] = ${JSON.stringify(mpoPlayers, null, 4).replace(/"([^"]+)":/g, '$1:')};\n\n`;
    outputContent += `export const MOCK_FPO_PLAYERS: Player[] = ${JSON.stringify(fpoPlayers, null, 4).replace(/"([^"]+)":/g, '$1:')};\n`;

    const outputPath = path.resolve(__dirname, '../src/data/players.ts');
    fs.writeFileSync(outputPath, outputContent, 'utf-8');

    console.log(`Successfully generated ${mpoPlayers.length} MPO and ${fpoPlayers.length} FPO players!`);
}

main();
