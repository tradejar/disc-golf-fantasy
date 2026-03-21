import re

with open("src/data/tournaments.ts", "r") as f:
    content = f.read()

# Fix `id: 'X'` missing comma -> `id: 'X',`
content = re.sub(r"(id:\s*'\d+')\s*\n", r"\1,\n", content)

with open("src/data/tournaments.ts", "w") as f:
    f.write(content)

print("Fixed missing commas after id fields in tournaments.ts")
