import pdfplumber
import json
import sys

courses = []
mpo_players = []
fpo_players = []

def count_stars(cell):
    if not cell: return 0
    return cell.count('⭐')

with pdfplumber.open(sys.argv[1]) as pdf:
    for page in pdf.pages:
        tables = page.extract_tables()
        for table in tables:
            if not table: continue
            
            header = [str(c).replace('\n', ' ').strip() if c else "" for c in table[0]]
            
            if "Venue" in header and "Dist" in header:
                # Course Table
                for row in table[1:]:
                    if not row or not row[0]: continue
                    courses.append({
                        "name": row[0].replace('\n', ' ').strip(),
                        "venue": row[1].replace('\n', ' ').strip() if row[1] else "",
                        "distance": count_stars(row[2]),
                        "technical": count_stars(row[3]),
                        "elevation": count_stars(row[4]),
                        "climate": count_stars(row[5]),
                        "bias": count_stars(row[6])
                    })
            elif "MPO First Name" in header or ("First Name" in header and "MPO" in header[0] if header[0] else False) or (table[0][0] and "MPO" in table[0][0]):
                # MPO Table
                for row in table[1:]:
                    if not row or not row[0]: continue
                    if row[0].startswith("Rank") or "First Name" in row[1]: continue
                    
                    try:
                        # Sometimes columns might be merged, but let's assume standard format
                        # Rank, First, Last, Power, Acc, Rec, Res, Vers
                        # Or it might be: Rank, Player, Power, Accuracy, Recovery, Resilience, Versatility
                        if len(row) >= 7:
                            mpo_players.append({
                                "rank": row[0].replace('\n', '').strip(),
                                "name": row[1].replace('\n', ' ').strip(),
                                "power": count_stars(row[2]),
                                "accuracy": count_stars(row[3]),
                                "recovery": count_stars(row[4]),
                                "resilience": count_stars(row[5]),
                                "versatility": count_stars(row[6])
                            })
                    except Exception as e:
                        pass
            elif "FPO First Name" in header or ("First Name" in header and "FPO" in header[0] if header[0] else False) or (table[0][0] and "FPO" in table[0][0]):
                # FPO Table
                for row in table[1:]:
                    if not row or not row[0]: continue
                    if row[0].startswith("Rank") or "First Name" in row[1]: continue
                    try:
                        if len(row) >= 7:
                            fpo_players.append({
                                "rank": row[0].replace('\n', '').strip(),
                                "name": row[1].replace('\n', ' ').strip(),
                                "power": count_stars(row[2]),
                                "accuracy": count_stars(row[3]),
                                "recovery": count_stars(row[4]),
                                "resilience": count_stars(row[5]),
                                "versatility": count_stars(row[6])
                            })
                    except Exception as e:
                        pass
            elif "Player" in header and "Power" in header:
                # Alternate header: Rank, Player, Power, Accuracy, Recovery, Resilience, Versatility
                is_fpo = False
                # We can guess by page or by name, but actually let's just collect them all and we'll separate by checking players.ts later
                # Or just put them in mpo for now and we'll see
                # Let's see if the page text has "FPO"
                text = page.extract_text()
                if "2026 FPO Player Ability" in text:
                    target_list = fpo_players
                elif "2026 MPO Player Ability" in text:
                    target_list = mpo_players
                else:
                    target_list = mpo_players
                    
                for row in table[1:]:
                    if not row or not row[0]: continue
                    if "Rank" in str(row[0]): continue
                    
                    try:
                        if len(row) >= 7:
                            target_list.append({
                                "rank": str(row[0]).replace('\n', '').strip(),
                                "name": str(row[1]).replace('\n', ' ').strip(),
                                "power": count_stars(row[2]),
                                "accuracy": count_stars(row[3]),
                                "recovery": count_stars(row[4]),
                                "resilience": count_stars(row[5]),
                                "versatility": count_stars(row[6])
                            })
                    except Exception as e:
                        pass

# Output to JSON
import os
os.makedirs("src/data/ratings_export", exist_ok=True)
with open("src/data/ratings_export/courses.json", "w") as f:
    json.dump(courses, f, indent=2)
with open("src/data/ratings_export/mpo.json", "w") as f:
    json.dump(mpo_players, f, indent=2)
with open("src/data/ratings_export/fpo.json", "w") as f:
    json.dump(fpo_players, f, indent=2)

print(f"Extracted {len(courses)} courses, {len(mpo_players)} MPO, {len(fpo_players)} FPO.")
