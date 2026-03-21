import json
import re

with open('scripts/pdfplumber_text.txt', encoding='utf-8') as f:
    lines = f.read().splitlines()

courses = []
mode = False
i = 0

def count_stars(text): return text.count("⭐")

while i < len(lines):
    line = lines[i].strip()
    if "Tourname Venue" in line:
        mode = True
        i += 1
        continue
    if mode and "Player Ability Index" in line:
        break
        
    if mode:
        groups = re.findall(r'⭐+', line)
        if len(groups) >= 4:
            course_lines = [line]
            j = i + 1
            while j < len(lines):
                next_line = lines[j].strip()
                n_groups = re.findall(r'⭐+', next_line)
                if len(n_groups) >= 4 or "Player Ability Index" in next_line:
                    break
                course_lines.append(next_line)
                j += 1
            
            stars_text = " ".join([l for l in course_lines if "⭐" in l])
            name_text = " ".join([l for l in course_lines if "⭐" not in l])
            name = name_text.replace("  ", " ").strip()
            
            stars_text = re.sub(r'\s+', ' ', stars_text).strip()
            star_groups = stars_text.split(" ")
            
            stats = [count_stars(g) for g in star_groups if count_stars(g) > 0]
            if len(stats) >= 5:
                stats = stats[:5]
            else:
                stats = stats + [0] * (5 - len(stats))
                
            courses.append({
                "name": name,
                "distance": stats[0],
                "technical": stats[1],
                "elevation": stats[2],
                "climate": stats[3],
                "bias": stats[4]
            })
            i = j - 1 
    i += 1

with open("src/data/ratings_export_courses.json", "w") as f: json.dump(courses, f, indent=2)
print("Done Courses:", len(courses))
