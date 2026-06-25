import json
import os
import time
import requests
from duckduckgo_search import DDGS

# Paths
JSON_PATH = 'data/players.json'
IMG_DIR = '../frontend/public/players'

if not os.path.exists(IMG_DIR):
    os.makedirs(IMG_DIR)

# Default fallback image
fallback_image = None

with open(JSON_PATH, 'r') as f:
    players = json.load(f)

ddgs = DDGS()

def download_image(url, filepath):
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            with open(filepath, 'wb') as f:
                f.write(response.content)
            return True
    except Exception as e:
        print(f"Error downloading {url}: {e}")
    return False

for i, player in enumerate(players):
    name = player['name']
    filename = player['photo'].split('/')[-1]
    filepath = os.path.join(IMG_DIR, filename)
    
    # Check if already exists
    if os.path.exists(filepath):
        print(f"[{i+1}/{len(players)}] Already have {name}")
        continue
        
    query = f"{name} cricket player IPL headshot profile photo"
    print(f"[{i+1}/{len(players)}] Searching for {name}...")
    
    try:
        results = list(ddgs.images(query, max_results=3))
        success = False
        for res in results:
            url = res['image']
            if download_image(url, filepath):
                success = True
                print(f" -> Downloaded {name}")
                break
        if not success:
            print(f" -> Failed to download {name}")
    except Exception as e:
        print(f" -> Search failed for {name}: {e}")
        
    time.sleep(1) # Be nice to the API

print("Done downloading images.")
