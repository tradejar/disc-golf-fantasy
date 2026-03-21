// Simulate exactly what Next.js RSC does when serializing existingEntry to the client
// RSC uses JSON serialization. Let's check if there's any issue with the data.
const existingEntry = {
    id: "7619bb1d-3c44-44e2-8cd1-27dc4c7eddae",
    roster_data: [
        { "id": "f_133547", "tier": "S", "price": 186, "rating": 986, "division": "FPO", "lastName": "Handley", "firstName": "Holyn", "pdgaNumber": 133547 },
        { "id": "m_38008", "tier": "S", "price": 171, "rating": 1051, "division": "MPO", "lastName": "Wysocki", "firstName": "Richard", "pdgaNumber": 38008 },
    ],
    budget_remaining: 15
};

// Simulate RSC serialization (JSON round-trip)
const serialized = JSON.stringify(existingEntry);
const deserialized = JSON.parse(serialized);

console.log("After JSON round-trip:");
console.log("price:", deserialized.roster_data[0].price);
console.log("type:", typeof deserialized.roster_data[0].price);
console.log("pdgaNumber:", deserialized.roster_data[0].pdgaNumber);

// Now simulate the mapping
const players = [
    { id: "133547", pdgaNumber: 133547, firstName: "Holyn", lastName: "Handley", price: 187, division: "FPO", rating: 987, tier: "S" },
];

const rawRoster = deserialized.roster_data;
const mappedRoster = rawRoster.map(saved => {
    const currentPoolPlayer = players.find(p =>
        (saved.pdgaNumber && p.pdgaNumber === saved.pdgaNumber) ||
        (p.firstName === saved.firstName && p.lastName === saved.lastName)
    );
    if (currentPoolPlayer) {
        const result = { ...currentPoolPlayer, price: saved.price ?? currentPoolPlayer.price };
        console.log(`Mapped ${saved.firstName}: saved.price=${saved.price}, poolPrice=${currentPoolPlayer.price}, result.price=${result.price}`);
        return result;
    }
    return saved;
});

const total = mappedRoster.reduce((sum, p) => sum + p.price, 0);
console.log("Total spend:", total, "Budget remaining:", 950 - total);
