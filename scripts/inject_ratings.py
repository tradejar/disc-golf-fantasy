import json
import re

with open("src/data/ratings_export_mpo.json") as f: mpo_ratings = json.load(f)
with open("src/data/ratings_export_fpo.json") as f: fpo_ratings = json.load(f)
with open("src/data/ratings_export_courses.json") as f: course_ratings = json.load(f)

# Normalize names for matching
def normalize(name):
    return re.sub(r'[^a-zA-Z]', '', name).lower()

mpo_map = {normalize(x["name"]): x for x in mpo_ratings}
fpo_map = {normalize(x["name"]): x for x in fpo_ratings}

# Read players.ts
with open("src/data/players.ts", "r") as f:
    players_ts = f.read()

# Replace MPO players
def mpo_replacer(match):
    full_str = match.group(0)
    # extract firstName and lastName
    first = re.search(r"firstName:\s*'([^']+)'", full_str).group(1)
    last = re.search(r"lastName:\s*'([^']+)'", full_str).group(1)
    norm = normalize(first + last)
    if norm in mpo_map:
        r = mpo_map[norm]
        inject = f", power: {r['power']}, accuracy: {r['accuracy']}, recovery: {r['recovery']}, resilience: {r['resilience']}, versatility: {r['versatility']}"
        return full_str.replace(" }", inject + " }")
    return full_str

players_ts = re.sub(r"\{[^}]*division:\s*'MPO'[^}]*\}", mpo_replacer, players_ts)

# Replace FPO players
def fpo_replacer(match):
    full_str = match.group(0)
    first = re.search(r"firstName:\s*'([^']+)'", full_str).group(1)
    last = re.search(r"lastName:\s*'([^']+)'", full_str).group(1)
    n = normalize(first + last)
    # Special cases:
    # "Kristin Tattar" vs "Kristin Latt" (in 2026 FPO it says Kristin Latt, but in players.ts it might be Tattar)
    if n == "kristintattar" and "kristinlatt" in fpo_map:
        n = "kristinlatt"
        
    if n in fpo_map:
        r = fpo_map[n]
        inject = f", power: {r['power']}, accuracy: {r['accuracy']}, recovery: {r['recovery']}, resilience: {r['resilience']}, versatility: {r['versatility']}"
        return full_str.replace(" }", inject + " }")
    return full_str

players_ts = re.sub(r"\{[^}]*division:\s*'FPO'[^}]*\}", fpo_replacer, players_ts)

with open("src/data/players.ts", "w") as f:
    f.write(players_ts)

print("Updated players.ts")

# Read tournaments.ts
with open("src/data/tournaments.ts", "r") as f:
    tournaments_ts = f.read()

course_map = {}
for c in course_ratings:
    norm_name = normalize(c["name"])
    course_map[norm_name] = c

# In tournaments.ts we have objects like:
# { id: '96400', pdga_id: '80932', name: '2026 Chess.com Invitational', startDate: '2026-02-19', endDate: '2026-02-22', location: 'Olympus, Brooksville, FL' }
def course_replacer(match):
    full_str = match.group(0)
    name_m = re.search(r"name:\s*'2026 ([^']+)'", full_str)
    if not name_m: name_m = re.search(r"name:\s*'([^']+)'", full_str)
    if name_m:
        name = name_m.group(1).replace("2026 ", "").replace(" (Major)", "").replace(" (Finale)", "")
        norm = normalize(name)
        # Try to find match
        matched = None
        for k in course_map:
            if k in norm or norm in k:
                matched = k
                break
        
        # Override for specific events if exact matching lacks
        if "olympus" in norm: matched = normalize("Supreme Flight Open")
        elif "parcdesfamilles" in norm: matched = normalize("Big Easy Open")
        elif "hornetsnest" in norm: matched = normalize("Queen City Classic")
        
        if matched:
            c = course_map[matched]
            inject = f", distance: {c['distance']}, technical: {c['technical']}, elevation: {c['elevation']}, climate: {c['climate']}, bias: {c['bias']}"
            return full_str.replace(" }", inject + " }")
    return full_str

tournaments_ts = re.sub(r"\{[^}]*pdga_id:[^}]*\}", course_replacer, tournaments_ts)

with open("src/data/tournaments.ts", "w") as f:
    f.write(tournaments_ts)

print("Updated tournaments.ts")
