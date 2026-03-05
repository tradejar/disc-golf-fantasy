#!/usr/bin/env python3
"""
Generates src/data/mock-players.ts with updated 2026 DGPT ratings.
MPO price = rating - 880 (min 1); FPO price = rating - 800 (min 1)
MPO tiers: S>=1045, A=1030-1044, B=1010-1029, C=1000-1009, D<1000
FPO tiers: S>=980,  A=955-979,  B=930-954,  C=910-929,  D<910
"""

import os

MPO_FLOOR = 880
FPO_FLOOR = 800

def mpo_tier(r):
    if r >= 1045: return 'S'
    if r >= 1030: return 'A'
    if r >= 1010: return 'B'
    if r >= 1000: return 'C'
    return 'D'

def fpo_tier(r):
    if r >= 980: return 'S'
    if r >= 955: return 'A'
    if r >= 930: return 'B'
    if r >= 910: return 'C'
    return 'D'

def mpo_price(r): return max(1, r - MPO_FLOOR)
def fpo_price(r): return max(1, r - FPO_FLOOR)

# (firstName, lastName, pdgaNumber, rating)
MPO = [
    ("Gannon", "Buhr", 75412, 1059),
    ("Calvin", "Heimburg", 45971, 1051),
    ("Isaac", "Robinson", 50670, 1048),
    ("Paul", "McBeth", 27523, 1047),
    ("Richard", "Wysocki", 38008, 1051),
    ("Anthony", "Barela", 44382, 1046),
    ("Kyle", "Klein", 85132, 1040),
    ("Ezra", "Robinson", 50671, 1039),
    ("Niklas", "Anttila", 91249, 1032),
    ("Adam", "Hammes", 57365, 1036),
    ("Ezra", "Aderhold", 121715, 1033),
    ("Sullivan", "Tipton", 78817, 1020),
    ("Aaron", "Gossage", 35449, 1039),
    ("Andrew", "Marwede", 75590, 1034),
    ("Cole", "Redalen", 79748, 1032),
    ("Simon", "Lizotte", 8332, 1036),
    ("Evan", "Smith", 101574, 1037),
    ("Chris", "Dickerson", 62467, 1037),
    ("Gavin", "Babcock", 80331, 1033),
    ("Corey", "Ellis", 44512, 1032),
    ("Bradley", "Williams", 31644, 1031),
    ("Luke", "Taylor", 102119, 1034),
    ("Casey", "White", 81739, 1031),
    ("Paul", "Krans", 132521, 1033),
    ("Eagle", "McMahon", 37817, 1040),
    ("Mason", "Ford", 72844, 1037),
    ("Andrew", "Presnell", 63765, 1030),
    ("Matthew", "Orum", 18330, 1033),
    ("Jake", "Monn", 98722, 1029),
    ("Mauri", "Villmann", 107197, 1040),
    ("Austin", "Turner", 54049, 1031),
    ("Paul", "Ulibarri", 27171, 1031),
    ("Joey", "Buckets", 122356, 1029),
    ("Silas", "Schultz", 79047, 1031),
    ("Lauri", "Lehtinen", 82297, 1042),
    ("Benjamin", "Callaway", 39015, 1022),
    ("Robert", "Burridge", 96512, 1029),
    ("Zachary", "Nash", 101197, 1030),
    ("Väinö", "Mäkelä", 59635, 1031),
    ("Jesse", "Nieminen", 58923, 1025),
    ("Alden", "Harris", 98091, 1023),
    ("Nikko", "Locastro", 11534, 1021),
    ("Kevin", "Jones", 41760, 1020),
    ("Evan", "Scott", 89394, 1026),
    ("Matt", "Bell", 48950, 1025),
    ("Raven", "Newsom", 88212, 1026),
    ("Rasmus", "Saukkoriipi", 136325, 1022),
    ("Jaden", "Rye", 153363, 1027),
    ("Nestori", "Tuhkanen", 110462, 1023),
    ("Jake", "Hebenheimer", 43762, 1018),
    ("Parker", "Welck", 39491, 1029),
    ("Jakub", "Semerád", 91925, 1022),
    ("Harry", "Chace", 131546, 1024),
    ("Andrew", "Miranda", 118426, 1014),
    ("Joona", "Heinänen", 58926, 1025),
    ("Chris", "Clemons", 50401, 1018),
    ("Linus", "Carlsson", 82098, 1017),
    ("Gregg", "Barsby", 15857, 1025),
    ("Calvin", "Lonnquist", 145206, 1015),
    ("Daniel", "Davidsson", 76456, 1037),
    ("Ty", "Love", 89959, 1023),
    ("Albert", "Tamm", 76669, 1022),
    ("Gavin", "Rathbun", 60436, 1020),
    ("James", "Proctor", 34250, 1026),
    ("Braeden", "Sides", 129963, 1021),
    ("Luke", "Humphries", 69424, 1014),
    ("Chandler", "Kramer", 139228, 1027),
    ("Noah", "Meintsma", 56555, 1023),
    ("Gavin", "Phillips", 119504, 1016),
    ("James", "Conrad", 17295, 1015),
    ("Nathan", "Queen", 68286, 1027),
    ("Hjalte", "Jensen", 129061, 1029),
    ("Zach", "Arlinghaus", 65266, 1020),
    ("AJ", "Carey", 61770, 1012),
    ("Clay", "Edwards", 91397, 1020),
    ("Silver", "Lätt", 61186, 1020),
    ("Onni", "Ruusunen", 131002, 1027),
    ("Eetu", "Tuominen", 131056, 1028),
    ("Connor", "Rock", 73695, 1021),
    ("Teemu", "Lampainen", 107567, 1023),
    ("Dennis", "Augustsson", 98130, 1023),
    ("Miio", "Hämäläinen", 201845, 1022),
    ("Connor", "O'Reilly", 99648, 1008),
    ("Garrett", "Gurthie", 13864, 1018),
    ("Carter", "Ahrens", 88279, 1024),
    ("Luke", "Samson", 59419, 1014),
    ("Lucas", "Carmichael", 151146, 1015),
    ("Eric", "Oakley", 53565, 1010),
    ("Roland", "Kõur", 108695, 1024),
    ("Colten", "Montgomery", 35876, 1002),
    ("Eli", "Swansen", 128050, 994),
    ("Matthew", "Alexander", 138103, 1010),
    ("Ryan", "Monn", 144929, 1021),
    ("Colin", "Bryant", 130709, 1034),
    ("Joel", "Freeman", 69509, 1034),
    ("Lenni", "Kemppainen", 96736, 1009),
    ("Jacob", "Blair", 52785, 1010),
    ("Cale", "Leiviska", 24341, 1035),
    ("Joni", "Peltonen", 94872, 1019),
    ("Justus", "Sarvi", 165010, 1020),
    ("Jeremy", "Koling", 33705, 1004),
    ("Peter", "Lunde", 72576, 1019),
    ("Henrik", "Haaland", 174255, 1014),
    ("Bo", "McLaughlin", 87143, 1017),
    ("Kristian", "Kuoksa", 107078, 1016),
    ("Nathan", "Sexton", 18824, 1021),
    ("Jake", "Brown", 140954, 1013),
    ("Andrew", "Fish", 58320, 1008),
    ("Henric", "Hagman", 59769, 1012),
    ("Pyry", "Joutsen", 72905, 1021),
    ("Øyvind", "Jarnes", 41884, 1021),
    ("Jared", "Stoll", 68103, 997),
    ("Tuomas", "Hyytiäinen", 65715, 1016),
    ("Fritiof", "Fagergren", 135125, 1008),
    ("Jason", "Lawson", 165807, 1004),
    ("Randy", "Dueck", 139619, 997),
    ("Trevon", "Crowe", 67172, 1007),
    ("Nicholas", "Gill", 33838, 1013),
    ("Lucas", "Oberholtzer Hess", 90439, 1021),
    ("Grady", "Shue", 68285, 1022),
    ("Pekka", "Hyvönen", 107079, 1008),
    ("Nikola", "Arkko", 199203, 1014),
    ("Severi", "Saviniemi", 91427, 1009),
    ("Morten", "Brenna", 77825, 1005),
    ("Knut", "Valen Håland", 77826, 1009),
    ("Jesse", "Longenecker", 126406, 1016),
    ("Harper", "Thompson", 60259, 1023),
    ("Elias", "Luukkonen", 106059, 1017),
    ("Holger", "Håkansson", 119626, 997),
    ("Samuel", "Hänninen", 87964, 1000),
    ("Jacob", "Courtis", 56511, 1006),
    ("Aapo", "Karhi", 82562, 1017),
    ("Eetu", "Salomäki", 117593, 1009),
    ("Thomas", "Gilbert", 85850, 1019),
    ("Daniel", "Pfaff", 98558, 997),
    ("Ville", "Ahokas", 53538, 1011),
    ("Evald", "Sandermoen Øwre", 124269, 994),
    ("Emil", "Karlsson", 190064, 993),
    ("Mathias", "Villota", 103114, 1018),
    ("Oiva", "Päivänsalo", 157441, 1012),
    ("Teemu", "Talikainen", 155087, 1004),
    ("Bohdan", "Bílek", 80134, 1012),
    ("Justin", "Rosak", 98161, 1004),
    ("Dawson", "Snelling", 45739, 1024),
    ("Evan", "Walker", 190731, 1021),
    ("Scott", "Withers", 38464, 1027),
    ("Maico", "Rimmel", 75444, 1016),
    ("Dustin", "Keegan", 35187, 1017),
    ("Luukas", "Rokkanen", 64917, 1007),
    ("Emerson", "Keith", 47472, 1030),
]

FPO = [
    ("Holyn", "Handley", 133547, 986),
    ("Missy", "Gannon", 85942, 989),
    ("Ohn", "Scoggins", 48976, 982),
    ("Silva", "Saarinen", 107335, 985),
    ("Ella", "Hansen", 144112, 970),
    ("Paige", "Pierce", 29190, 972),
    ("Kat", "Mertsch", 99455, 966),
    ("Valerie", "Mandujano", 62879, 968),
    ("Cadence", "Burge", 79233, 972),
    ("Kristin", "Lätt", 73986, 996),
    ("Eveliina", "Salonen", 64927, 982),
    ("Hanna", "Huynh", 112647, 958),
    ("Catrina", "Allen", 44184, 958),
    ("Rebecca", "Cox", 32917, 960),
    ("Anniken", "Kristiansen Steen", 109996, 963),
    ("Henna", "Blomroos", 59227, 969),
    ("Jessica", "Gurthie", 50656, 957),
    ("Lisa", "Fajkus", 32654, 953),
    ("Madison", "Walker", 59431, 949),
    ("Sofia", "Donnecke", 185534, 960),
    ("Emily", "Weatherman", 111487, 946),
    ("Hailey", "King", 81351, 975),
    ("Raven", "Klein", 138272, 945),
    ("Rebecca", "Don", 208576, 954),
    ("Alexis", "Mandujano", 62880, 952),
    ("Ali", "Smith", 147050, 947),
    ("Chantel", "Budinsky", 130342, 951),
    ("Deann", "Carey", 66842, 936),
    ("Kona Star", "Montgomery", 27832, 937),
    ("Eliezra", "Midtlyng", 198446, 941),
    ("Jennifer", "Allen", 15354, 971),
    ("Jennifer", "Smiley", 184736, 933),
    ("Dani", "Kleidon", 146137, 944),
    ("Sarah", "Hokom", 34563, 951),
    ("Anneli", "Tõugjas-Männiste", 85484, 957),
    ("Taylor", "Chocek", 189702, 940),
    ("Kaidi", "Allsalu", 84279, 950),
    ("Iida", "Lehtomäki", 216558, 958),
    ("Rachel", "Turton", 144658, 954),
    ("Keiti", "Tätte", 94085, 958),
    ("Lykke", "Lorentzen", 99441, 938),
    ("Ida Emilie", "Nesse", 181772, 948),
    ("Kelley", "Foster", 152191, 928),
    ("Sintija", "Klezberga", 229526, 928),
    ("Natalie", "Ryan", 114560, 964),
    ("Jenni", "Karppinen", 110168, 937),
    ("Erika", "Stinchcomb", 71262, 917),
    ("Macie", "Velediaz", 104187, 963),
    ("Julia", "Fors", 224238, 948),
    ("Chandler", "Reigh", 277832, 932),
    ("Sheliemae", "Lai", 215439, 947),
    ("Amanda", "Lennartsson", 155026, 925),
    ("Addison", "Woodard", 161918, 917),
    ("Holly", "Finley", 51277, 932),
    ("Alexis", "Kerman", 142354, 921),
    ("Matilda", "Ringbom", 77385, 924),
    ("Olivia", "Kindstedt", 115503, 936),
    ("Maria", "Oliva", 63257, 911),
    ("Lauren", "Butler", 65489, 927),
    ("Hannah", "Manis", 130822, 937),
    ("Lexi", "Marx", 193215, 935),
    ("Kristýna", "Jurčíková", 210972, 946),
    ("Violet", "Main", 104314, 939),
    ("Trinity", "Bryant", 168863, 908),
    ("Marie", "Kielas", 173601, 918),
    ("Ratana", "Meekham", 101949, 903),
    ("Leah", "Tsinajinnie", 139109, 919),
    ("Katka", "Boďová", 61990, 924),
    ("María Eldey", "Kristínardóttir", 140660, 924),
    ("Kristi", "Unt", 116694, 941),
    ("Emily", "Yale", 144791, 910),
    ("Heidi", "Laine", 66599, 960),
    ("Martje", "Sumowski", 222973, 919),
    ("Kaire", "Tekku", 196237, 918),
    ("Paige", "Shue", 33833, 937),
    ("Stacie", "Rawnsley", 122208, 944),
    ("Josefine", "Johansson", 185057, 925),
    ("Elizabete", "Peksena", 202571, 922),
    ("Sonja", "Laine", 96090, 904),
    ("Elina", "Rydberg", 121554, 902),
    ("Jordan", "Lynds", 176243, 945),
    ("Sofie", "Björlycke", 35321, 940),
    ("Tinja", "Väisänen", 70172, 921),
    ("Elva-Kate", "Preston", 184609, 901),
    ("Netta", "Leppäaho", 245306, 937),
    ("Emma", "Arp", 135383, 928),
    ("Jenny", "Larsson", 179873, 912),
    ("Katarina", "Staalesen Bjørkås", 66898, 898),
    ("Anni", "Mäkelä", 83540, 871),
    ("Kylie", "Kohut", 195549, 928),
    ("Hannah", "Lengel", 131583, 945),
    ("Shelbi", "Dutton", 107780, 924),
    ("Hannah", "Stefanovich", 79777, 906),
    ("Ella", "Tejler", 156259, 900),
    ("Madison", "Tomaino", 60798, 919),
    ("Casey", "Pennington", 74708, 914),
    ("Morgan", "Lynds", 176242, 937),
    ("Nina", "Guerrero", 140947, 942),
    ("Krissie", "Fountain", 73693, 922),
    ("Zoe", "AnDyke", 39504, 918),
    ("Hanna", "Jansson", 139387, 911),
    ("Lindsay", "Fish", 32925, 871),
    ("Ellie", "Bryant", 104814, 904),
    ("Thea", "Bandlitz Johansen", 204650, 863),
    ("Alecia", "Hinkson", 164788, 917),
    ("Maarja", "Soasepp", 128532, 891),
    ("Ingvild", "Hellem", 139321, 878),
    ("Maria", "Liivamägi", 107297, 881),
    ("Antonia", "Faber", 65876, 915),
    ("Nikol", "Mikuláštík", 226071, 873),
    ("Julia", "Hauch", 232722, 892),
    ("Hilde", "Goorhorst", 185583, 873),
    ("Therese", "Cuevas", 162896, 924),
    ("Danielle", "Keen", 102024, 901),
    ("Nid", "Ovathanasin", 157471, 928),
    ("Eden", "Fornoff", 162735, 933),
    ("Kajsa", "Wahl", 182450, 882),
    ("Ariel", "Walker", 154098, 933),
    ("Sai", "Ananda", 58303, 953),
    ("Alison", "Mabbutt", 81569, 918),
    ("Hailey", "Huber", 150057, 914),
    ("Grace", "Wilson", 302765, 892),
    ("Su Mei", "Yang", 133080, 877),
    ("Ingvild", "Lønvik", 118782, 897),
    ("Vanessa", "Van Dyken", 62325, 939),
    ("Emilia", "Kallio", 157245, 925),
    ("Sally", "West", 22235, 925),
    ("Kassandra", "Fog Wichmann", 186277, 889),
    ("Virginia", "Polkinghorne", 76009, 844),
    ("Vera", "Hynynen", 167003, 895),
    ("Shelby", "Cowen", 124064, 912),
    ("Jennifer", "Rice", 151072, 906),
    ("Sanne", "Dalseth", 186629, 855),
    ("Christiane", "Günther", 217233, 871),
    ("Sophie", "Rossteuscher", 227967, 900),
    ("Madelynn", "Davis", 101735, 909),
    ("Madalyn", "Payton", 235368, 902),
    ("Zuzana", "Marková", 238980, 880),
    ("Colleen", "McInnes", 78677, 928),
    ("Jelena", "Eberts", 230554, 868),
    ("Rebecka", "Hoppe", 232666, 857),
    ("Alison", "Blakeman", 48199, 876),
    ("Elaina", "Evinsky", 113514, 866),
    ("Ashley", "Moua", 213764, 924),
    ("Helēna", "Dreimane", 218260, 905),
    ("Brandie", "Myers", 47798, 890),
    ("Jannicke", "Hjemli", 97238, 874),
    ("Jessica", "Erickson", 261058, 834),
    ("Lena", "Moltu", 190173, 793),
    ("Matilde", "Dvergedal", 262524, 863),
]

lines = []
lines.append("import { Player } from './mock-schema';")
lines.append("")
lines.append("export const MPO_PLAYERS: Player[] = [")

for fn, ln, pdga, rating in MPO:
    pid = f"m_{pdga}"
    tier = mpo_tier(rating)
    price = mpo_price(rating)
    ln_escaped = ln.replace("'", "\\'")
    fn_escaped = fn.replace("'", "\\'")
    lines.append(f'  {{ id: "{pid}", firstName: "{fn_escaped}", lastName: "{ln_escaped}", rating: {rating}, division: "MPO", price: {price}, tier: "{tier}", pdgaNumber: {pdga} }},')

lines.append("];")
lines.append("")
lines.append("export const FPO_PLAYERS: Player[] = [")

for fn, ln, pdga, rating in FPO:
    pid = f"f_{pdga}"
    tier = fpo_tier(rating)
    price = fpo_price(rating)
    ln_escaped = ln.replace("'", "\\'")
    fn_escaped = fn.replace("'", "\\'")
    lines.append(f'  {{ id: "{pid}", firstName: "{fn_escaped}", lastName: "{ln_escaped}", rating: {rating}, division: "FPO", price: {price}, tier: "{tier}", pdgaNumber: {pdga} }},')

lines.append("];")
lines.append("")
lines.append("export const ALL_PLAYERS: Player[] = [...MPO_PLAYERS, ...FPO_PLAYERS];")
lines.append("")

out_path = os.path.join(os.path.dirname(__file__), '..', 'src', 'data', 'mock-players.ts')
out_path = os.path.normpath(out_path)

with open(out_path, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))

print(f"Written {len(MPO)} MPO + {len(FPO)} FPO players to {out_path}")
print(f"Total lines: {len(lines)}")
