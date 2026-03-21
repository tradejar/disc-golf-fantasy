import json
import re

# Load parsed courses
with open("src/data/ratings_export_courses.json") as f:
    courses = json.load(f)

# Hardcoded map of tournament ID to the mangled PDF name
id_to_pdf_name = {
    "96401": "Supreme Olympus Flight Open",
    "96402": "Big Easy Parc des Open Familles",
    "96403": "Queen Hornets City Nest Classic",
    "96404": "Champion New s Cup London (Major) Tech",
    "96405": "Jonesboro Disc Side Open of Heaven",
    "96406": "KC Wide Bad Rock Open Gold",
    "96407": "Waco Brazos East Annual Charity",
    "96408": "The Open Sprinkle/Ha at Austin rvey",
    "96409": "OTB Open Swenson Park",
    "96410": "Northwest Milo/Glend Champ oveer",
    "96411": "Swedish Ymergårde Open n",
    "96412": "Ale Open Ale White",
    "96413": "Heinola Kippasuo Open Pro",
    "96414": "Ledgeston Northwood e Open Black", # Ledgestone 
    "96415": "Discmania Pickard Challenge Park", # Discmania
    "96416": "Preserve Black Bear Champion ship", # Preserve
    "96417": "LWS Open Idlewild at Idlewild",
    "96418": "Green Brewster/F Mountain ox Run Champ",
    "96419": "MVP Open Maple Hill x OTB",
    "96421": "Powerball Ivy Hill Cup (Finale)",
    "97339": "European Tallinn Open Grounds (Major)",
    "97341": "USWDGC Brighton (Major) Resort",
    "97344": "Pro Toboggan/ Worlds Locust (Major)",
    "97346": "USDGC Winthrop (Major) Gold"
}

# Create a lookup by PDF name
stats_by_name = {c["name"]: c for c in courses}

with open("src/data/tournaments.ts", "r") as f:
    ts_data = f.read()

# First, clean up any existing injected ratings so we can start fresh
ts_data = re.sub(r',\s*distance:\s*\d+[^}]*', '', ts_data)
ts_data = re.sub(r'distance:\s*\d+[^}]*', '', ts_data)

def replacer(match):
    full_str = match.group(0)
    id_m = re.search(r"id:\s*'(\d+)'", full_str)
    if not id_m: return full_str
    
    t_id = id_m.group(1)
    if t_id in id_to_pdf_name:
        pdf_name = id_to_pdf_name[t_id]
        if pdf_name in stats_by_name:
            c = stats_by_name[pdf_name]
            
            # Since we cleaned existing ratings, we just inject at the end of the object
            inject = f", distance: {c['distance']}, technical: {c['technical']}, elevation: {c['elevation']}, climate: {c['climate']}, bias: {c['bias']}"
            return full_str.replace(" }", inject + " }").replace("\n    }", inject + "\n    }")
    return full_str

# Match object bodies like { id: '96401', ... }
new_ts_data = re.sub(r"\{\s*id:\s*'\d+'[^}]+\}", replacer, ts_data)

with open("src/data/tournaments.ts", "w") as f:
    f.write(new_ts_data)

print("Course Ratings injected perfectly!")
