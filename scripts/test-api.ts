export async function main() {
    const res = await fetch('http://localhost:3000/api/leaderboard?tournamentId=96402');
    const json = await res.json();
    console.log(JSON.stringify(json, null, 2));
}

main().catch(console.error);
