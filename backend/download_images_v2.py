import json
import os
import requests
import time
import re
from urllib.parse import quote_plus

JSON_PATH = 'data/players.json'
IMG_DIR = '../frontend/public/players'

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
}

# Player name -> IPL/WPL team for targeted search
TEAM_MAP = {
    # Bowlers
    'Bhuvneshwar Kumar': 'SRH',
    'Khaleel Ahmed': 'DC',
    'Jofra Archer': 'MI',
    'Rashid Khan': 'GT',
    'Ravi Bishnoi': 'LKN',
    'Kuldeep Yadav (IPL)': 'DC',
    'Kate Cross': 'UP Warriorz WPL',
    'Shikha Pandey (WPL)': 'UP Warriorz WPL',
    'Harshal Patel (IPL)': 'PBKS',
    'Moen Ali': 'CSK',
    'Varun Chakaravarthy': 'KKR',
    'Lauren Bell': 'MI WPL',
    'Anrich Nortje': 'DC',
    'Mitchell McClenaghan': 'MI',
    'Tom Curran': 'DC',
    'Kagiso Rabada': 'GT',
    'Trent Boult (IPL)': 'RR',
    'Umesh Yadav': 'KKR',
    'Yuzvendra Chahal (IPL)': 'RR',
    'Deepak Chahar': 'CSK',
    'Amit Mishra': 'DC',
    'Piyush Chawla': 'MI',
    'Shreyanka Patil': 'RCB WPL',
    'Jasprit Bumrah (IPL)': 'MI',
    'Noor Ahmad': 'GT',
    'Ravichandran Ashwin': 'RR',
    'Andrew Tye': 'PBKS',
    'Pat Cummins (IPL)': 'SRH',
    'Mohit Sharma': 'GT',
    'Prasidh Krishna': 'RR',
    'Matt Henry': 'KKR',
    'Arshdeep Singh': 'PBKS',
    'Imran Tahir': 'CSK',
    'Umran Malik': 'SRH',
    'Lasith Malinga': 'MI',
    'Sayali Satghare': 'MI WPL',
    'Mohammed Shami (IPL)': 'GT',
    'Jayden Seales': 'KKR',
    'Mitchell Starc': 'KKR',
    
    # Batsmen
    'Harleen Deol': 'RCB WPL',
    'Shikhar Dhawan (IPL)': 'PBKS',
    'Ruturaj Gaikwad': 'CSK',
    'Robin Uthappa': 'CSK',
    'Ellyse Perry (WPL)': 'RCB WPL',
    'Devon Conway': 'CSK',
    'Rohit Sharma (IPL)': 'MI',
    'Faf du Plessis': 'RCB',
    'Shafali Verma': 'DC WPL',
    'Shubman Gill (IPL)': 'GT',
    'Travis Head': 'SRH',
    'Shreyas Iyer (IPL)': 'KKR',
    'Tilak Verma': 'MI',
    'Sai Sudharsan (IPL)': 'GT',
    'Meg Lanning': 'DC WPL',
    'Yashasvi Jaiswal': 'RR',
    'Abhishek Sharma': 'SRH',
    'Alex Hales': 'KKR',
    'Laura Wolvaardt': 'DC WPL',
    'Shivam Dube': 'CSK',
    'Shane Watson': 'CSK',
    'AB de Villiers (IPL)': 'RCB',
    'David Miller': 'GT',
    'Smriti Mandhana (WPL)': 'RCB WPL',
    'Gautam Gambhir': 'KKR',
    'Nitish Kumar Reddy': 'SRH',
    'Suresh Raina': 'CSK',
    'Mayank Agarwal': 'PBKS',
    'Steve Smith': 'DC',
    'Manish Pandey': 'SRH',
    'Shashank Singh': 'SRH',
    'Suryakumar Yadav (IPL)': 'MI',
    'Ambati Rayudu': 'CSK',
    'Jemimah Rodrigues': 'MI WPL',
    'Virat Kohli (IPL)': 'RCB',
    'Rinku Singh': 'KKR',
    'Tim David': 'MI',
    'David Warner (IPL)': 'DC',
    'Shimron Hetmyer': 'RR',
    'Matthew Short': 'SRH',
    'Daryl Mitchell': 'CSK',
    'Chris Gayle (IPL)': 'RCB',
    'Devdutt Padikkal': 'RR',
    'Riyan Parag': 'RR',
    'Harmanpreet Kaur': 'MI WPL',
    'Kane Williamson': 'SRH',
    'Shaun Marsh': 'PBKS',
    'Grace Harris': 'MI WPL',
    
    # All rounders
    'Georgia Wareham': 'MI WPL',
    'Sunil Narine (IPL)': 'KKR',
    'Venkatesh Iyer': 'KKR',
    'Dwayne Bravo': 'CSK',
    'Glenn Maxwell': 'RCB',
    'Sophie Devine': 'RCB WPL',
    'Vijay Shankar': 'SRH',
    'Sam Curran': 'PBKS',
    'Deepti Sharma (WPL)': 'MI WPL',
    'Will Jacks': 'RCB',
    'Hardik Pandya (IPL)': 'MI',
    'Liam Livingstone': 'PBKS',
    'Amelia Kerr': 'MI WPL',
    'Nat Sciver-Brunt (WPL)': 'MI WPL',
    'Mitchell Marsh': 'DC',
    'Mitchell Santner': 'CSK',
    'Andre Russel': 'KKR',
    'Krunal Pandya': 'LSG',
    'Ashleigh Gardner': 'GG WPL',
    'Axar Patel (IPL)': 'DC',
    'Cameron Green': 'RCB',
    'Hayley Matthews (WPL)': 'RCB WPL',
    'Marcus Stoinis': 'LSG',
    'Washington Sundar': 'SRH',
    'Ravindra Jadeja (IPL)': 'CSK',
    'Kieron Pollard (AR)': 'MI',
    'Pooja Vastrakar': 'MI WPL',
    
    # Wicketkeepers
    'Richa Ghosh': 'RCB WPL',
    'Jos Buttler (IPL)': 'RR',
    'Wriddhiman Saha': 'GT',
    'MS Dhoni (IPL)': 'CSK',
    'Kusal Mendis': 'SRH',
    'Rishabh Pant (IPL)': 'DC',
    'Alyssa Healy': 'UP Warriorz WPL',
    'Heinrich Klaasen': 'SRH',
    'Ishan Kishan': 'MI',
    'Sanju Samson (IPL)': 'RR',
    'Dinesh Karthik': 'RCB',
    'Jitesh Sharma': 'PBKS',
    'KL Rahul (IPL)': 'LSG',
    'Phil Salt': 'DC',
    'Nicolas Pooran': 'SRH',
    'Prabhsimran Singh': 'PBKS',
    'Quinton De Cock': 'LSG',
    
    # Uncapped
    'Angkrish Raghuvanshi (IPL)': 'KKR',
    'Kiran Navgire': 'UP Warriorz WPL',
    'Vaibhav Suryavanshi': 'RR',
    'Yash Dhull (IPL)': 'DC',
    'Rahul Tewatia': 'GT',
    'Sameer Rizvi (IPL)': 'CSK',
    'Priyansh Arya': 'DC',
    'Prashant Veer': 'RR',
    'Ashutosh Sharma (IPL)': 'SRH',
    'Vaibhav Arora': 'KKR',
    'R. Sai Kishore': 'GT',
    'Yash Dayal': 'RCB',
    'Vipraj Nigam (IPL)': 'LSG',
    'Anushka Sharma': 'MI WPL',
    'Kartik Sharma': 'SRH',
    'Urvil Patel (IPL)': 'GT',
    'K.L. Shrijith (IPL)': 'RCB',
    'Harvik Desai (IPL)': 'SRH',
    'Abishek Porel': 'DC',
}

# IPL team full names for search
TEAM_FULL = {
    'MI': 'Mumbai Indians',
    'CSK': 'Chennai Super Kings',
    'RCB': 'Royal Challengers Bangalore',
    'KKR': 'Kolkata Knight Riders',
    'DC': 'Delhi Capitals',
    'RR': 'Rajasthan Royals',
    'SRH': 'Sunrisers Hyderabad',
    'PBKS': 'Punjab Kings',
    'GT': 'Gujarat Titans',
    'LSG': 'Lucknow Super Giants',
    'MI WPL': 'Mumbai Indians WPL',
    'RCB WPL': 'Royal Challengers Bangalore WPL',
    'DC WPL': 'Delhi Capitals WPL',
    'UP Warriorz WPL': 'UP Warriorz',
    'GG WPL': 'Gujarat Giants WPL',
}

def clean_player_name(name):
    """Remove (IPL), (WPL), (AR), * etc from player name"""
    return re.sub(r'\s*\(.*?\)\s*', '', name).replace('*', '').strip()

def get_filename(name):
    """Convert player name to filename"""
    clean = clean_player_name(name)
    return clean.lower().replace(' ', '-').replace('.', '') + '.jpg'

def search_bing_for_image(query):
    """Search Bing Images and return the first image URL"""
    search_url = f"https://www.bing.com/images/search?q={quote_plus(query)}&first=1&tsc=ImageHoverTitle"
    try:
        resp = requests.get(search_url, headers=HEADERS, timeout=15)
        # Extract image URLs from murl pattern in Bing HTML
        matches = re.findall(r'murl&quot;:&quot;(https?://[^&]+?)&quot;', resp.text)
        if matches:
            return matches[0]
    except Exception as e:
        print(f"  Bing search error: {e}")
    return None

def download_image(url, filepath):
    """Download an image from URL to filepath"""
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15, stream=True)
        if resp.status_code == 200 and len(resp.content) > 5000:
            with open(filepath, 'wb') as f:
                f.write(resp.content)
            return True
    except Exception as e:
        print(f"  Download error: {e}")
    return False

if not os.path.exists(IMG_DIR):
    os.makedirs(IMG_DIR)

with open(JSON_PATH, 'r') as f:
    players = json.load(f)

for i, player in enumerate(players):
    name = player['name']
    filename = player['photo'].split('/')[-1]
    filepath = os.path.join(IMG_DIR, filename)
    
    clean_name = clean_player_name(name)
    team_code = TEAM_MAP.get(name, '')
    team_full = TEAM_FULL.get(team_code, team_code)
    
    is_wpl = 'WPL' in team_code
    
    print(f"[{i+1}/{len(players)}] {clean_name} ({team_code})...")
    
    # Try multiple search queries, best first
    queries = []
    if is_wpl:
        queries.append(f"{clean_name} WPL cricket player PNG headshot")
        queries.append(f"{clean_name} cricket player headshot portrait")
    else:
        queries.append(f"{clean_name} IPL {team_full} PNG headshot portrait")
        queries.append(f"{clean_name} IPL 2024 cricket player PNG")
        queries.append(f"{clean_name} cricket player IPL headshot")
    
    downloaded = False
    for query in queries:
        img_url = search_bing_for_image(query)
        if img_url:
            print(f"  -> Found: {img_url[:80]}...")
            if download_image(img_url, filepath):
                print(f"  -> Saved!")
                downloaded = True
                break
        time.sleep(1)  # Rate limit
    
    if not downloaded:
        print(f"  -> FAILED for {clean_name}")
    
    time.sleep(1.5)  # Rate limit between players

print("\n✅ Done downloading all player images!")
