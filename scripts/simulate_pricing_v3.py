new_london = { "name": "New London Tech", "distance": 3, "technical": 5, "elevation": 4, "climate": 3, "bias": 3 }
olympus = { "name": "Olympus", "distance": 5, "technical": 2, "elevation": 4, "climate": 3, "bias": 2 }

# Let's say we are simulating before the 4th tournament of the season, 
# so players only have 3 recent finishes so far.
players = [
    {
        "name": "Gannon Buhr", "base_price": 179, "power": 5, "accuracy": 5, "recovery": 4, "resilience": 5, "versatility": 5,
        "recent_finishes": ["1st", "1st", "2nd"] # 3 tournaments played so far
    },
    {
        "name": "Calvin Heimburg", "base_price": 171, "power": 5, "accuracy": 5, "recovery": 4, "resilience": 4, "versatility": 4,
        "recent_finishes": ["2nd", "3rd", "ITM"]
    },
    {
        "name": "Isaac Robinson", "base_price": 168, "power": 3, "accuracy": 5, "recovery": 4, "resilience": 4, "versatility": 3,
        "recent_finishes": ["ITM", "ITM", "ITM"]
    },
    {
        "name": "Aaron Gossage", "base_price": 159, "power": 5, "accuracy": 4, "recovery": 4, "resilience": 4, "versatility": 5,
        "recent_finishes": ["3rd", "Out", "Out"]
    },
    {
        "name": "Luke Samson", "base_price": 100, "power": 4, "accuracy": 3, "recovery": 3, "resilience": 3, "versatility": 3,
        "recent_finishes": ["Out", "Out", "Out"]
    },
]

def map_finishes_to_modifier(finishes):
    mod = 0
    # Process up to the last 5 finishes (or less if early in season)
    for f in finishes[-5:]:
        if f == "1st": mod += 3
        elif f == "2nd": mod += 2
        elif f == "3rd": mod += 1
        elif f == "Out": mod -= 3
        # ITM = 0
    return mod

def simulate_price(player, course):
    total_delta = 0
    
    mapping = [
        ('accuracy', 'technical'),
        ('recovery', 'elevation'),
        ('resilience', 'climate'),
        ('versatility', 'bias')
    ]
    
    for p_key, c_key in mapping:
        p_val = player[p_key]
        c_val = course[c_key]
        total_delta += (p_val - c_val)
    
    # Standard 1% per star diff for tech, elev, clim, bias
    rating_modifier = total_delta * 1
    
    # Distance special exception
    p_dist = player['power']
    c_dist = course['distance']
    dist_mod = 0
    if c_dist == 5 and p_dist == 5:
        dist_mod = 5 # 5% increase for 5/5 arm on 5/5 bomber course
    else:
        dist_mod = (p_dist - c_dist) * 1 # standard 1% rule
        
    rating_modifier += dist_mod
    
    # Recent Form Modulation
    form_modifier = map_finishes_to_modifier(player['recent_finishes'])
    
    total_percentage_change = rating_modifier + form_modifier
    
    # Apply change
    multiplier = 1.0 + (total_percentage_change / 100.0)
    new_price = int(player['base_price'] * multiplier)
    
    return {
        "name": player['name'],
        "base": player['base_price'],
        "new": new_price,
        "rate_mod": f"+{rating_modifier}%" if rating_modifier>0 else f"{rating_modifier}%",
        "dist_mod": f"+{dist_mod}%" if dist_mod>0 else f"{dist_mod}%",
        "form_mod": f"+{form_modifier}%" if form_modifier>0 else f"{form_modifier}%",
        "total_pct": f"+{total_percentage_change}%" if total_percentage_change>0 else f"{total_percentage_change}%",
        "finishes": ",".join(player['recent_finishes'])
    }

print("=== NEW LONDON TECH (Tight Woods, Tech=5, Dist=3) ===")
print(f"{'Player':<16} | {'Base':<5} | {'New':<5} | {'RateMod':<8} | {'DistMod':<8} | {'FormMod':<8} | {'Total%':<6} | {'Recent Form'}")
print("-" * 90)
for p in players:
    res = simulate_price(p, new_london)
    print(f"{res['name']:<16} | ${res['base']:<4} | ${res['new']:<4} | {res['rate_mod']:<8} | {res['dist_mod']:<8} | {res['form_mod']:<8} | {res['total_pct']:<6} | {res['finishes']}")

print("\n=== OLYMPUS (Bomber Course, Tech=2, Dist=5) ===")
print(f"{'Player':<16} | {'Base':<5} | {'New':<5} | {'RateMod':<8} | {'DistMod':<8} | {'FormMod':<8} | {'Total%':<6} | {'Recent Form'}")
print("-" * 90)
for p in players:
    res = simulate_price(p, olympus)
    print(f"{res['name']:<16} | ${res['base']:<4} | ${res['new']:<4} | {res['rate_mod']:<8} | {res['dist_mod']:<8} | {res['form_mod']:<8} | {res['total_pct']:<6} | {res['finishes']}")
