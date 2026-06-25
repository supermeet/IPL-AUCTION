import json
import os
import shutil
from icrawler.builtin import BingImageCrawler

JSON_PATH = 'data/players.json'
IMG_DIR = '../frontend/public/players'
TEMP_DIR = 'temp_images'

if not os.path.exists(IMG_DIR):
    os.makedirs(IMG_DIR)

with open(JSON_PATH, 'r') as f:
    players = json.load(f)

for i, player in enumerate(players):
    name = player['name']
    filename = player['photo'].split('/')[-1]
    filepath = os.path.join(IMG_DIR, filename)
    
    if os.path.exists(filepath):
        print(f"[{i+1}/{len(players)}] Already have {name}")
        continue
    
    print(f"[{i+1}/{len(players)}] Fetching image for {name}...")
    
    # Re-create temp dir for this run
    if os.path.exists(TEMP_DIR):
        shutil.rmtree(TEMP_DIR)
    os.makedirs(TEMP_DIR)
    
    try:
        # Search query matching user's exact criteria
        query = f"{name} IPL profile headshot"
        
        bing_crawler = BingImageCrawler(storage={'root_dir': TEMP_DIR})
        bing_crawler.crawl(keyword=query, max_num=1)
        
        # Look for the downloaded image in TEMP_DIR
        downloaded_files = os.listdir(TEMP_DIR)
        if downloaded_files:
            file_ext = downloaded_files[0].split('.')[-1]
            if file_ext.lower() not in ['jpg', 'jpeg', 'png', 'webp']:
                file_ext = 'jpg'
            
            # Move and rename to standard filename
            src = os.path.join(TEMP_DIR, downloaded_files[0])
            shutil.move(src, filepath)
            print(f" -> Successfully saved as {filename}")
        else:
            print(f" -> No image found for {name}.")
            
    except Exception as e:
        print(f" -> Error downloading {name}: {e}")

# Cleanup temp
if os.path.exists(TEMP_DIR):
    shutil.rmtree(TEMP_DIR)

print("\nFinished fetching all images!")
