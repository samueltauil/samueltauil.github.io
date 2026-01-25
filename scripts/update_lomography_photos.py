#!/usr/bin/env python3
"""
Script to fetch the latest photos from Lomography profile and update photography.md
"""

import re
import requests
from bs4 import BeautifulSoup

LOMOGRAPHY_USERNAME = "samueltauil"
LOMOGRAPHY_PROFILE_URL = f"https://www.lomography.com/homes/{LOMOGRAPHY_USERNAME}/photos?order=recent"
PHOTOGRAPHY_MD_PATH = "photography.md"
NUM_PHOTOS_TO_FETCH = 12


def fetch_recent_photo_ids():
    """Fetch the most recent photo IDs from Lomography profile."""
    response = requests.get(LOMOGRAPHY_PROFILE_URL, timeout=30)
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
    response = requests.get(photo_url, timeout=30)
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
    response = requests.get(photo_url, timeout=30)
    response.raise_for_status()
    
    soup = BeautifulSoup(response.text, 'html.parser')
    
    # Try to find the photo description
    og_title = soup.find('meta', property='og:title')
    if og_title and og_title.get('content'):
        return og_title['content']
    
    return f"Photo {photo_id}"


def generate_photo_gallery_html(photos):
    """Generate the HTML for the photo gallery."""
    html_lines = ['<div class="photo-gallery">']
    
    for photo in photos:
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
    print("Fetching recent photo IDs from Lomography...")
    photo_ids = fetch_recent_photo_ids()
    print(f"Found {len(photo_ids)} recent photos: {photo_ids}")
    
    photos = []
    for photo_id in photo_ids:
        print(f"Fetching details for photo {photo_id}...")
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
    
    if photos:
        print(f"\nGenerating gallery HTML for {len(photos)} photos...")
        gallery_html = generate_photo_gallery_html(photos)
        
        print("Updating photography.md...")
        update_photography_md(gallery_html)
        
        print("\nDone! Photos updated successfully.")
    else:
        print("\nNo photos found to update.")


if __name__ == "__main__":
    main()
