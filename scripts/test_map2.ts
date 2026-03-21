const saved = {
        "id": "f_133547",
        "tier": "S",
        "price": 186,
        "rating": 986,
        "division": "FPO",
        "lastName": "Handley",
        "firstName": "Holyn",
        "pdgaNumber": 133547
};
const currentPoolPlayer = {
        "id": "f_133547",
        "tier": "S",
        "price": 187,
        "rating": 987,
        "division": "FPO",
        "lastName": "Handley",
        "firstName": "Holyn",
        "pdgaNumber": 133547
};

const result = { ...currentPoolPlayer, price: (saved as any).price ?? currentPoolPlayer.price };
console.log("Result Price:", result.price);
