import json
import re
import difflib

# Load parsed players
with open("src/data/ratings_export_mpo.json") as f:
    mpo = json.load(f)
with open("src/data/ratings_export_fpo.json") as f:
    fpo = json.load(f)

# Normalize functions
def norm(txt):
    return re.sub(r'[^a-zA-Z]', '', txt).lower()

mpo_names = {norm(x["name"]): x for x in mpo}
fpo_names = {norm(x["name"]): x for x in fpo}

with open("src/data/mock-players.ts", "r") as f:
    ts_data = f.read()

# Clean up existing ratings
ts_data = re.sub(r',\s*power:\s*\d+[^}]*', '', ts_data)

injected_count = 0

def replacer(match, pool_names):
    global injected_count
    full_str = match.group(0)
    
    first_match = re.search(r'firstName:\s*[\'"]([^\'"]+)[\'"]', full_str)
    last_match = re.search(r'lastName:\s*[\'"]([^\'"]+)[\'"]', full_str)
    if not first_match or not last_match:
        return full_str
    
    first = first_match.group(1)
    last = last_match.group(1)
    
    target = norm(first + last)
    
    # Try exact match
    if target in pool_names:
        matched_key = target
    else:
        # Try fuzzy match
        matches = difflib.get_close_matches(target, pool_names.keys(), n=1, cutoff=0.7)
        if matches:
            matched_key = matches[0]
        else:
            return full_str
            
    r = pool_names[matched_key]
    inject = f", power: {r['power']}, accuracy: {r['accuracy']}, recovery: {r['recovery']}, resilience: {r['resilience']}, versatility: {r['versatility']}"
    injected_count += 1
    # Handle optional space before the closing bracket
    return re.sub(r'\s*\}$', inject + r' }', full_str)

# MPO
def mpo_replacer(m): return replacer(m, mpo_names)
ts_data = re.sub(r"\{[^}]*division:\s*\"MPO\"[^}]*\}", mpo_replacer, ts_data)

# FPO
def fpo_replacer(m): return replacer(m, fpo_names)
ts_data = re.sub(r"\{[^}]*division:\s*\"FPO\"[^}]*\}", fpo_replacer, ts_data)

with open("src/data/mock-players.ts", "w") as f:
    f.write(ts_data)

print(f"Player Ratings injected! Total matched: {injected_count}")
