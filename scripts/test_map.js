const BUDGET_CAP = 950;
const DB_ROSTER = [
      {
        "id": "f_133547", "tier": "S", "price": 186, "rating": 986, "division": "FPO",
        "lastName": "Handley", "firstName": "Holyn", "pdgaNumber": 133547
      },
      {
        "id": "m_38008", "tier": "S", "price": 171, "rating": 1051, "division": "MPO",
        "lastName": "Wysocki", "firstName": "Richard", "pdgaNumber": 38008
      },
      {
        "id": "m_56511", "tier": "C", "price": 126, "rating": 1006, "division": "MPO",
        "lastName": "Courtis", "firstName": "Jacob", "pdgaNumber": 56511
      },
      {
        "id": "m_35449", "tier": "A", "price": 159, "rating": 1039, "division": "MPO",
        "lastName": "Gossage", "firstName": "Aaron", "pdgaNumber": 35449
      },
      {
        "id": "f_32654", "tier": "B", "price": 153, "rating": 953, "division": "FPO",
        "lastName": "Fajkus", "firstName": "Lisa", "pdgaNumber": 32654
      },
      {
        "id": "m_78817", "tier": "B", "price": 140, "rating": 1020, "division": "MPO",
        "lastName": "Tipton", "firstName": "Sullivan", "pdgaNumber": 78817
      }
];

// Let's invent the "Live" pool players with higher prices
const PLAYERS_POOL = [
      { pdgaNumber: 133547, price: 196, firstName: "Holyn", lastName: "Handley" },
      { pdgaNumber: 38008, price: 181, firstName: "Richard", lastName: "Wysocki" },
      { pdgaNumber: 56511, price: 136, firstName: "Jacob", lastName: "Courtis" },
      { pdgaNumber: 35449, price: 169, firstName: "Aaron", lastName: "Gossage" },
      { pdgaNumber: 32654, price: 163, firstName: "Lisa", lastName: "Fajkus" },
      { pdgaNumber: 78817, price: 150, firstName: "Sullivan", lastName: "Tipton" }
];

const mappedRoster = DB_ROSTER.map(saved => {
    // Try matching by pdgaNumber first, then name
    const currentPoolPlayer = PLAYERS_POOL.find(p =>
        (saved.pdgaNumber && p.pdgaNumber === saved.pdgaNumber) ||
        (p.firstName === saved.firstName && p.lastName === saved.lastName)
    );
    // CRITICAL FIX: Preserve the original purchase price so dynamic inflation 
    // between sessions doesn't push the user's budget into the negative!
    if (currentPoolPlayer) {
        return { ...currentPoolPlayer, price: saved.price ?? currentPoolPlayer.price };
    }
    return saved;
});

const currentSpend = mappedRoster.reduce((sum, p) => sum + p.price, 0);
const remainingBudget = BUDGET_CAP - currentSpend;

console.log("Mapped Roster Prices:", mappedRoster.map(p => p.price));
console.log("Current Spend:", currentSpend);
console.log("Remaining Budget:", remainingBudget);
