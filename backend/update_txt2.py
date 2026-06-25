with open('data/players_new.txt', 'r', encoding='utf-8') as f:
    lines = f.read().split('\n')

header = "S No.\tPlayer Name\tExact Rating\tBASE PRICE\tRole"
new_lines = [header]

for i, line in enumerate(lines):
    if line.strip():
        # Cleaned line already has the 4 columns: Name, Rating, Price, Role (tab separated)
        new_lines.append(f"{i + 1}\t{line}")

with open('data/players.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(new_lines))

print("Updated data/players.txt")
