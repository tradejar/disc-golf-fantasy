import re

with open("src/data/tournaments.ts", "r") as f:
    content = f.read()

# Fix `13,,` -> `13,`
content = re.sub(r',,', ',', content)
# Fix `// 9am ET,` -> `// 9am ET`
content = re.sub(r'(//[^,]+),$', r'\1', content, flags=re.MULTILINE)

with open("src/data/tournaments.ts", "w") as f:
    f.write(content)

print("Fixed double comma syntax errors in tournaments.ts")
