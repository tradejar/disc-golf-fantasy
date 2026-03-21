import re

with open("src/data/tournaments.ts", "r") as f:
    content = f.read()

# Replace \n   , distance:   with  ,\n        distance:
content = re.sub(r'\n\s*,\s*distance:', r',\n        distance:', content)

with open("src/data/tournaments.ts", "w") as f:
    f.write(content)

print("Fixed syntax errors in tournaments.ts")
