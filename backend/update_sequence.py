import json
import re

# The new sequence
text = """Nitish Kumar Reddy
Meg Lanning
AB de Villiers
Mayank Agarwal
Smriti Mandhana
Rinku Singh
Shane Watson
Devdutt Padikkal
Shubman Gill
Shaun Marsh
Virat Kohli
Tim David
Sai Sudharsan
Laura Wolvaardt
Yashasvi Jaiswal
*Travis Head
Suryakumar Yadav
Gautam Gambhir
Faf du Plessis
Rohit Sharma
Tilak Verma
David Warner
Devon Conway
Matthew Short
Harmanpreet Kaur
Ruturaj Gaikwad
Abhishek Sharma
Chris Gayle
Shimron Hetmyer
Manish Pandey
Shivam Dube
Shafali Verma
Ambati Rayudu
Shikhar Dhawan
Grace Harris
Steve Smith
David Miller
Robin Uthappa
Daryl Mitchell
Jemimah Rodrigues
Kane Williamson
Shashank Singh
Riyan Parag
Harleen Deol
Shreyas Iyer
Ellyse Perry
Alex Hales
Suresh Raina
Sophie Devine
Mitchell Santner
Sunil Narine
Venkatesh Iyer
Washington Sundar
Andre Russel
Pooja Vastrakar
Glenn Maxwell
Mitchell Marsh
Sam Curran
Ashleigh Gardner
Ravindra Jadeja
Will Jacks
Axar Patel
Amelia Kerr
Hardik Pandya
Nat Sciver-Brunt
Krunal Pandya
Liam Livingston
Cameron Green
Hayley Matthews
Marcus Stoinis
Kieron Pollard
Vijay Shankar
Georgia Wareham
Dwayne Bravo
Deepti Sharma
Matt Henry
Lauren Bell
Trent Boult
Prasidh Krishna
Jofra Archer
Moen Ali
Varun Chakaravarthy
Pat Cummins
Mitchell McClenaghan
Mohammed Shami
Mitchell Starc
Kate Cross
Imran Tahir
Tom Curran
*Kagiso Rabada
Sayali Satghare
Lasith Malinga
Umesh Yadav
Andrew Tye
Deepak Chahar
Ravichandran Ashwin
Umran Malik
Shreyanka Patil
Bhuvneshwar Kumar
Noor Ahmad
Jayden Seales
Kuldeep Yadav
Anrich Nortje
Amit Mishra
Rashid Khan
Mohit Sharma
Ravi Bishnoi
Jasprit Bumrah
Khaleel Ahmed
Harshal Patel
Yuzvendra Chahal
Piyush Chawla
Arshdeep Singh
Shikha Pandey
Jos Buttler
Heinrich Klaasen
Kusal Mendis
Dinesh Karthik
Rishabh Pant
*Quinton De Cock
Prabhsimran Singh
*Nicolas Pooran
MS Dhoni
Jitesh Sharma
Richa Ghosh
KL Rahul
Phil Salt
Alyssa Healy
Wriddhiman Saha
Ishan Kishan
Sanju Samson
Kiran Navgire
Yash Dhull
Sameer Rizvi
Ashutosh Sharma
Vaibhav Suryavanshi
Priyansh Arya
Prashant Veer
Angkrish Raghuvanshi
Rahul Tewatia
R. Sai Kishore
Vipraj Nigam
Yash Dayal
Vaibhav Arora
K.L. Shrijith
Urvil Patel
Kartik Sharma
Harvik Desai
Abishek Porel
Anushka Sharma"""

players_list = []
for line in text.split('\n'):
    name = line.strip()
    if name:
        name = name.replace('*', '').strip() # Clean up names like *Travis Head
        players_list.append(name)

with open('data/players.json', 'r', encoding='utf-8') as f:
    players = json.load(f)

# Create a mapping for quick lookup
players_by_name = {}
for p in players:
    # Use lowercase and remove multiple spaces for matching
    clean_name = re.sub(r'\s+', ' ', p['name'].strip().lower())
    players_by_name[clean_name] = p

new_players = []
new_id = 1
missing_players = []

for name in players_list:
    clean_name = re.sub(r'\s+', ' ', name.lower())
    
    # Try direct match
    if clean_name in players_by_name:
        p = players_by_name[clean_name]
        p['id'] = new_id
        new_players.append(p)
        new_id += 1
    else:
        # Try soft match
        matched = False
        for k, v in players_by_name.items():
            if clean_name in k or k in clean_name:
                v['id'] = new_id
                new_players.append(v)
                new_id += 1
                matched = True
                break
        if not matched:
            missing_players.append(name)

if missing_players:
    print("Could not find some players:")
    for m in missing_players:
        print(m)
else:
    print(f"Successfully processed all {len(players_list)} players!")

with open('data/players.json', 'w', encoding='utf-8') as f:
    json.dump(new_players, f, indent=2)

print("Saved new sequence to data/players.json")
