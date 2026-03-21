import json
import re

with open('scripts/pdfplumber_text.txt', encoding='utf-8') as f:
    lines = f.read().splitlines()

mpo = []
fpo = []
courses = []

mode = None
c_buffer = []

def count_stars(text):
    return text.count("⭐")

i = 0
while i < len(lines):
    line = lines[i].strip()
    
    if "Tourname Venue" in line:
        mode = "courses"
        i += 1
        continue
    elif "2026 MPO Player Ability" in line:
        mode = "mpo"
        i += 1
        continue
    elif "2026 FPO Player Ability" in line:
        mode = "fpo"
        i += 1
        continue
        
    if mode == "courses":
        # courses block: 
        # Line 1: Stars
        # Line 2: Name part 1
        # Line 3 (optional): Stars
        # Line 4 (optional): Name part 2
        # It's complex, let's just collect all stars until we hit another star block?
        # A course spans from the first ⭐ block to the next one.
        pass
        
    if mode in ["mpo", "fpo"]:
        # Find Rank Name
        # e.g. "1 Gannon" or "8 Kyle Klein"
        m = re.match(r'^(\d+)\s+([A-Za-z\.\-\']+)\s*(.*)$', line)
        if m:
            rank = int(m.group(1))
            first = m.group(2)
            rest = m.group(3)
            
            # The stars for this player are on i-1.
            stars1_line = lines[i-1]
            
            # Look ahead for more stars or the rest of the name
            stars2_line = ""
            last_name = rest
            if not last_name:
                for j in range(1, 4):
                    if i+j >= len(lines): break
                    next_l = lines[i+j].strip()
                    if next_l.startswith(str(rank+1) + " "): break
                    if "⭐" in next_l:
                        stars2_line += next_l
                    elif next_l and not next_l.isdigit():
                        last_name += " " + next_l
            
            name = f"{first} {last_name}".strip().replace("  ", " ")
            
            # Count stars by column
            # In pdfplumber text, stars are separated by spaces.
            # E.g. "⭐⭐⭐⭐ ⭐⭐⭐⭐ ⭐⭐⭐⭐ ⭐⭐⭐⭐ ⭐⭐⭐⭐"
            # "⭐ ⭐ ⭐ ⭐ ⭐"
            # We can merge stars1_line and stars2_line, split by spaces, and we'll get groups. BUT some columns might be missing if 0 stars?
            # Ratings are 1-5, so there's always at least 1 star!
            
            all_stars_text = stars1_line + " " + stars2_line
            # collapse multiple spaces
            all_stars_text = re.sub(r'\s+', ' ', all_stars_text).strip()
            # Split by space
            star_groups = all_stars_text.split(" ")
            
            col_stars = [count_stars(g) for g in star_groups if count_stars(g) > 0]
            
            # We expect exactly 5 columns: Power, Accuracy, Recovery, Resilience, Versatility
            if len(col_stars) >= 5:
                stats = col_stars[:5]
            else:
                stats = col_stars + [0] * (5 - len(col_stars))
                
            player = {
                "rank": rank,
                "name": name,
                "power": stats[0],
                "accuracy": stats[1],
                "recovery": stats[2],
                "resilience": stats[3],
                "versatility": stats[4]
            }
            if mode == "mpo": mpo.append(player)
            elif mode == "fpo": fpo.append(player)
            
    i += 1

with open("src/data/ratings_export_mpo.json", "w") as f: json.dump(mpo, f, indent=2)
with open("src/data/ratings_export_fpo.json", "w") as f: json.dump(fpo, f, indent=2)
print(f"Done! MPO: {len(mpo)}, FPO: {len(fpo)}")
