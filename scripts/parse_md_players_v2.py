import re
import difflib

def normalize(name):
    # Remove spaces and lower
    return name.replace(" ", "").lower()

def count_stars(s):
    return s.count('⭐')

md_path = "Quantitative and Qualitative 2026 Disc Golf Pro Tour Circuit.md"
ts_path = "src/data/mock-players.ts"

with open(md_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

mpo_ratings = {}
fpo_ratings = {}

current_table = None

for line in lines:
    if "MPO Player Ability Index" in line:
        current_table = "MPO"
        continue
    if "FPO Player Ability Index" in line:
        current_table = "FPO"
        continue
    
    if current_table and line.startswith("|") and "Rank" not in line and "---" not in line and ":" not in line:
        parts = [p.strip() for p in line.split("|")]
        if len(parts) >= 8: # | rank | name | p | a | r | r | v |
            name = parts[2]
            if name:
                ratings = {
                    "power": count_stars(parts[3]),
                    "accuracy": count_stars(parts[4]),
                    "recovery": count_stars(parts[5]),
                    "resilience": count_stars(parts[6]),
                    "versatility": count_stars(parts[7]),
                }
                if current_table == "MPO":
                    mpo_ratings[normalize(name)] = ratings
                else:
                    fpo_ratings[normalize(name)] = ratings

print(f"Parsed {len(mpo_ratings)} MPO and {len(fpo_ratings)} FPO ratings from MD.")

with open(ts_path, "r", encoding="utf-8") as f:
    ts_data = f.read()

injected_count = 0

def replacer(match, rating_dict):
    global injected_count
    full_str = match.group(0)
    
    first_match = re.search(r'firstName:\s*[\'"]([^\'"]+)[\'"]', full_str)
    last_match = re.search(r'lastName:\s*[\'"]([^\'"]+)[\'"]', full_str)
    if not first_match or not last_match:
        return full_str
    
    first = first_match.group(1)
    last = last_match.group(1)
    
    target = normalize(first + last)
    
    closest = difflib.get_close_matches(target, rating_dict.keys(), n=1, cutoff=0.8)
    
    if closest:
        r = rating_dict[closest[0]]
        inject = f", power: {r['power']}, accuracy: {r['accuracy']}, recovery: {r['recovery']}, resilience: {r['resilience']}, versatility: {r['versatility']}"
        
        # Remove old ratings if they exist
        clean_str = re.sub(r',\s*power:\s*\d+', '', full_str)
        clean_str = re.sub(r',\s*accuracy:\s*\d+', '', clean_str)
        clean_str = re.sub(r',\s*recovery:\s*\d+', '', clean_str)
        clean_str = re.sub(r',\s*resilience:\s*\d+', '', clean_str)
        clean_str = re.sub(r',\s*versatility:\s*\d+', '', clean_str)
        
        # Inject new right before closing brace
        if clean_str.endswith(" }"):
            res = clean_str[:-2] + inject + " }"
        else:
            res = clean_str[:-1] + inject + " }"
            
        injected_count += 1
        return res
    
    return full_str

def mpo_replacer(m): return replacer(m, mpo_ratings)
ts_data = re.sub(r"\{[^}]*division:\s*\"MPO\"[^}]*\}", mpo_replacer, ts_data)

def fpo_replacer(m): return replacer(m, fpo_ratings)
ts_data = re.sub(r"\{[^}]*division:\s*\"FPO\"[^}]*\}", fpo_replacer, ts_data)

with open(ts_path, "w", encoding="utf-8") as f:
    f.write(ts_data)

print(f"Injected {injected_count} ratings into mock-players.ts!")
