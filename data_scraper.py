import os
import time
import random
import requests
from pathlib import Path
from duckduckgo_search import DDGS

BASE_DIR = Path("Dataset_VeggieScale_DDG")
IMAGES_TO_ADD = 100

SEARCH_CONFIG = {
    "banana": [
        "ripe yellow banana fruit",
        "fresh banana bunch",
        "organic bananas market",
        "single banana white background",
        "banana fruit close up"
    ],
    "red_apple": [
        "red delicious apple fresh",
        "shiny red apple fruit",
        "gala apple close up",
        "red apple market pile",
        "whole red apple isolated"
    ],
    "orange": [
        "navel orange fresh",
        "valencia orange fruit",
        "orange citrus texture",
        "whole orange fruit",
        "pile of oranges"
    ]
}


def get_headers():
    return {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }


def download_file(url, folder, index):
    try:
        response = requests.get(url, headers=get_headers(), timeout=10)
        if response.status_code == 200:
            ext = url.split('.')[-1].split('?')[0]
            if ext.lower() not in ['jpg', 'jpeg', 'png']:
                ext = 'jpg'

            filename = f"new_ddg_{int(time.time())}_{index}.{ext}"
            with open(folder / filename, 'wb') as f:
                f.write(response.content)
            return True
    except:
        pass
    return False


def run_stealth_scraper():
    BASE_DIR.mkdir(exist_ok=True)

    for class_name, keywords in SEARCH_CONFIG.items():
        folder = BASE_DIR / class_name
        folder.mkdir(exist_ok=True)

        initial_count = len(list(folder.glob('*')))
        target_count = initial_count + IMAGES_TO_ADD

        print(f"{class_name}: Current {initial_count}. Target {target_count}")

        added_session = 0

        try:
            with DDGS() as ddgs:
                for keyword in keywords:
                    if initial_count + added_session >= target_count:
                        break

                    print(f"Searching: {keyword}")

                    try:
                        results = ddgs.images(
                            keywords=keyword,
                            max_results=30,
                            safesearch="off",
                        )

                        for res in results:
                            if initial_count + added_session >= target_count:
                                break

                            url = res.get('image')
                            if url:
                                if download_file(url, folder, added_session):
                                    added_session += 1
                                    print(f"Saved: {initial_count + added_session}/{target_count}")

                        sleep_time = random.uniform(15, 25)
                        print(f"Sleeping {sleep_time:.1f}s...")
                        time.sleep(sleep_time)

                    except Exception as e:
                        print(f"Error on keyword: {e}")
                        time.sleep(60)
                        continue

        except Exception as e:
            print(f"Critical Error: {e}")

    print("Done.")


if __name__ == "__main__":
    run_stealth_scraper()