#!/usr/bin/env python3
"""
Script to fetch the latest photos from Lomography profile and update photography.md
Ensures no duplicate photos are added to the gallery.
"""

import re
import time
try:
    import cloudscraper
    scraper = cloudscraper.create_scraper(
        browser={
            'browser': 'chrome',
            'platform': 'windows',
            'desktop': True
        }
    )
except ImportError:
    # Fallback to requests if cloudscraper not available
    import requests
    scraper = requests.Session()
    scraper.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    })

from bs4 import BeautifulSoup

LOMOGRAPHY_USERNAME = "samueltauil"
LOMOGRAPHY_PROFILE_URL = f"https://www.lomography.com/homes/{LOMOGRAPHY_USERNAME}/photos?order=recent"
PHOTOGRAPHY_MD_PATH = "photography.md"
NUM_PHOTOS_TO_FETCH = 12


def get_existing_photo_ids():
    """Extract photo IDs that are already in the photography.md file."""
    try:
        with open(PHOTOGRAPHY_MD_PATH, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Find all photo IDs already in the file
        existing_ids = re.findall(
            rf'/homes/{LOMOGRAPHY_USERNAME}/photos/(\d+)',
            content
        )
        return set(existing_ids)
    except FileNotFoundError:
        return set()


def fetch_recent_photo_ids():
    """Fetch the most recent photo IDs from Lomography profile."""
    response = scraper.get(LOMOGRAPHY_PROFILE_URL, timeout=30)
    response.raise_for_status()
    
    # Extract photo IDs from the page
    photo_ids = re.findall(
        rf'/homes/{LOMOGRAPHY_USERNAME}/photos/(\d+)',
        response.text
    )
    # Remove duplicates while preserving order
    seen = set()
    unique_ids = []
    for pid in photo_ids:
        if pid not in seen:
            seen.add(pid)
            unique_ids.append(pid)
    
    return unique_ids[:NUM_PHOTOS_TO_FETCH]


def fetch_photo_cdn_url(photo_id):
    """Fetch the CDN URL for a specific photo."""
    photo_url = f"https://www.lomography.com/homes/{LOMOGRAPHY_USERNAME}/photos/{photo_id}"
    time.sleep(1)  # Rate limiting: wait 1 second between requests
    response = scraper.get(photo_url, timeout=30)
    response.raise_for_status()
    
    soup = BeautifulSoup(response.text, 'html.parser')
    
    # Find the main image - look for img tags with cdn.assets.lomography.com
    img_tags = soup.find_all('img')
    for img in img_tags:
        src = img.get('src', '')
        if 'cdn.assets.lomography.com' in src:
            return src
    
    # Also check for meta og:image
    og_image = soup.find('meta', property='og:image')
    if og_image and og_image.get('content'):
        content = og_image['content']
        if 'cdn.assets.lomography.com' in content:
            return content
    
    return None


def fetch_photo_title(photo_id):
    """Fetch the title/description for a specific photo."""
    photo_url = f"https://www.lomography.com/homes/{LOMOGRAPHY_USERNAME}/photos/{photo_id}"
    time.sleep(0.5)  # Rate limiting
    response = scraper.get(photo_url, timeout=30)
    response.raise_for_status()
    
    soup = BeautifulSoup(response.text, 'html.parser')
    
    # Try to find the photo description
    og_title = soup.find('meta', property='og:title')
    if og_title and og_title.get('content'):
        return og_title['content']
    
    return f"Photo {photo_id}"


def generate_photo_gallery_html(photos):
    """Generate the HTML for the photo gallery. Ensures no duplicate photos."""
    html_lines = ['<div class="photo-gallery">']
    
    # Track IDs to prevent any duplicates in output
    seen_ids = set()
    
    for photo in photos:
        # Skip if we've already added this photo
        if photo['id'] in seen_ids:
            continue
        seen_ids.add(photo['id'])
        
        html_lines.append(f'  <a href="https://www.lomography.com/homes/{LOMOGRAPHY_USERNAME}/photos/{photo["id"]}" target="_blank" rel="noopener">')
        html_lines.append(f'    <img src="{photo["cdn_url"]}" alt="{photo["title"]}" loading="lazy">')
        html_lines.append('  </a>')
    
    html_lines.append('</div>')
    
    # Add the CSS styles
    html_lines.append('')
    html_lines.append('<style>')
    html_lines.append('.photo-gallery {')
    html_lines.append('  display: grid;')
    html_lines.append('  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));')
    html_lines.append('  gap: 1rem;')
    html_lines.append('  margin: 1.5rem 0;')
    html_lines.append('}')
    html_lines.append('.photo-gallery a {')
    html_lines.append('  display: block;')
    html_lines.append('  border-radius: 8px;')
    html_lines.append('  overflow: hidden;')
    html_lines.append('  transition: transform 0.2s ease, box-shadow 0.2s ease;')
    html_lines.append('  background: transparent;')
    html_lines.append('}')
    html_lines.append('.photo-gallery a:hover {')
    html_lines.append('  transform: translateY(-4px);')
    html_lines.append('  box-shadow: 0 8px 25px rgba(163, 113, 247, 0.3);')
    html_lines.append('}')
    html_lines.append('.photo-gallery img {')
    html_lines.append('  width: 100%;')
    html_lines.append('  height: auto;')
    html_lines.append('  display: block;')
    html_lines.append('  border-radius: 8px;')
    html_lines.append('}')
    html_lines.append('</style>')
    
    return '\n'.join(html_lines)


def update_photography_md(new_gallery_html):
    """Update the photography.md file with new photo gallery."""
    with open(PHOTOGRAPHY_MD_PATH, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Pattern to match the photo gallery section
    pattern = r'### Recent Photos\n\n<div class="photo-gallery">.*?</style>'
    
    replacement = f'### Recent Photos\n\n{new_gallery_html}'
    
    new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    
    with open(PHOTOGRAPHY_MD_PATH, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print(f"Updated {PHOTOGRAPHY_MD_PATH}")


def main():
    print("Reading existing photo IDs from photography.md...")
    existing_ids = get_existing_photo_ids()
    print(f"Found {len(existing_ids)} existing photos in file")
    
    print("\nFetching recent photo IDs from Lomography...")
    recent_photo_ids = fetch_recent_photo_ids()
    print(f"Found {len(recent_photo_ids)} recent photos on Lomography: {recent_photo_ids}")
    
    # Find new photos that aren't already in the file
    new_photo_ids = [pid for pid in recent_photo_ids if pid not in existing_ids]
    
    if not new_photo_ids:
        print("\nNo new photos to add. All recent photos are already in the gallery.")
        return
    
    print(f"\nFound {len(new_photo_ids)} new photos to add: {new_photo_ids}")
    
    # Fetch details for ALL photos (to rebuild the gallery with correct order)
    photos = []
    seen_ids = set()  # Extra safety: track IDs we've already processed
    
    for photo_id in recent_photo_ids:
        if photo_id in seen_ids:
            print(f"Skipping duplicate photo {photo_id}")
            continue
        seen_ids.add(photo_id)
        
        print(f"Fetching details for photo {photo_id}{'  [NEW]' if photo_id in new_photo_ids else ''}...")
        cdn_url = fetch_photo_cdn_url(photo_id)
        if cdn_url:
            title = fetch_photo_title(photo_id)
            # Clean title for alt text
            title = title.split(' - ')[0] if ' - ' in title else title
            title = title[:100]  # Limit length
            photos.append({
                'id': photo_id,
                'cdn_url': cdn_url,
                'title': title
            })
            print(f"  -> {cdn_url[:80]}...")
        else:
            print(f"  -> Could not find CDN URL, skipping")
    
    # Final deduplication check on photos list
    final_photos = []
    final_ids = set()
    for photo in photos:
        if photo['id'] not in final_ids:
            final_ids.add(photo['id'])
            final_photos.append(photo)
    
    if final_photos:
        print(f"\nGenerating gallery HTML for {len(final_photos)} unique photos...")
        gallery_html = generate_photo_gallery_html(final_photos)
        
        print("Updating photography.md...")
        update_photography_md(gallery_html)
        
        print(f"\nDone! Added {len(new_photo_ids)} new photos. Gallery now has {len(final_photos)} photos.")
    else:
        print("\nNo photos found to update.")


if __name__ == "__main__":
    main()
