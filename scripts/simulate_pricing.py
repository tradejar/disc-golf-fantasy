import json

# Example Course: New London Tech (PDGA Champions Cup)
# Heavily wooded, extremely tight gaps, significant elevation.
# Actual ratings from courses.json:
new_london = {
    "name": "New London Tech",
    "distance": 3,
    "technical": 5,
    "elevation": 4,
    "climate": 3,
    "bias": 3
}

# Example Course: Olympus (Supreme Flight Open)
# Massive bomber course, mostly open, some elevation.
olympus = {
    "name": "Olympus",
    "distance": 5,
    "technical": 2,
    "elevation": 4,
    "climate": 3,
    "bias": 2
}

players = [
    {"name": "Gannon Buhr", "base_price": 179, "power": 5, "accuracy": 5, "recovery": 4, "resilience": 5, "versatility": 5},
    {"name": "Calvin Heimburg", "base_price": 171, "power": 5, "accuracy": 5, "recovery": 4, "resilience": 4, "versatility": 4},
    {"name": "Isaac Robinson", "base_price": 168, "power": 3, "accuracy": 5, "recovery": 4, "resilience": 4, "versatility": 3},
    {"name": "Aaron Gossage", "base_price": 159, "power": 5, "accuracy": 4, "recovery": 4, "resilience": 4, "versatility": 5},
    {"name": "Luke Samson", "base_price": 100, "power": 4, "accuracy": 3, "recovery": 3, "resilience": 3, "versatility": 3}, # Random low tier
]

def map_ratings(course):
    return [
        ('power', 'distance'),
        ('accuracy', 'technical'),
        ('recovery', 'elevation'), # using elevation as a proxy for scrambling? or maybe climate?
        ('resilience', 'climate'),
        ('versatility', 'bias')
    ]

# The user's rule:
# If player rating < course rating: 5% discount per star difference.
# If player rating > course rating: 5% premium per star difference.
# Cumulative across all 5 categories.

def simulate_price(player, course, hotness_points=0):
    modifiers = []
    total_delta = 0
    
    mapping = [
        ('power', 'distance', 'Pow vs Dist'),
        ('accuracy', 'technical', 'Acc vs Tech'),
        ('recovery', 'elevation', 'Rec vs Elev'),
        ('resilience', 'climate', 'Res vs Clim'),
        ('versatility', 'bias', 'Ver vs Bias')
    ]
    
    for p_key, c_key, label in mapping:
        p_val = player[p_key]
        c_val = course[c_key]
        delta = p_val - c_val
        total_delta += delta
        if delta != 0:
            modifiers.append(f"{label} ({p_val}v{c_val}): {delta*5}%")
            
    # Hotness
    # 1st = 3%, 2nd = 2%, 3rd = 1%
    hotness_modifier = hotness_points
    
    total_percentage_change = (total_delta * 5) + hotness_modifier
    
    # Apply change
    multiplier = 1.0 + (total_percentage_change / 100.0)
    new_price = int(player['base_price'] * multiplier)
    
    return {
        "name": player['name'],
        "base": player['base_price'],
        "new": new_price,
        "delta_val": new_price - player['base_price'],
        "pct_change": f"{total_percentage_change}%",
        "mods": ", ".join(modifiers),
        "hotness": f"+{hotness_modifier}%" if hotness_modifier > 0 else ""
    }

print("=== NEW LONDON TECH (Tight Woods, Tech=5, Dist=3) ===")
print(f"{'Player':<16} | {'Base':<5} | {'New':<5} | {'%':<5} | {'Modifiers'}")
print("-" * 80)
for p in players:
    res = simulate_price(p, new_london)
    print(f"{res['name']:<16} | ${res['base']:<4} | ${res['new']:<4} | {res['pct_change']:<5} | {res['mods']}")

print("\n=== OLYMPUS (Bomber Course, Tech=2, Dist=5) ===")
print(f"{'Player':<16} | {'Base':<5} | {'New':<5} | {'%':<5} | {'Modifiers'}")
print("-" * 80)
for p in players:
    res = simulate_price(p, olympus)
    print(f"{res['name']:<16} | ${res['base']:<4} | ${res['new']:<4} | {res['pct_change']:<5} | {res['mods']}")
    
print("\n=== HOTNESS IMPACT (Aaron Gossage wins previous, gets 2nd before that) ===")
print("Hotness = +3% (1st) + +2% (2nd) = +5%")
gossage = next(p for p in players if p['name'] == 'Aaron Gossage')
res_base = simulate_price(gossage, olympus, 0)
res_hot = simulate_price(gossage, olympus, 5)
print(f"Base Olympus Price: ${res_base['new']} ({res_base['pct_change']})")
print(f"Hot  Olympus Price: ${res_hot['new']} ({res_hot['pct_change']} with {res_hot['hotness']})")
