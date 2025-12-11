"""
ICN Validator - Validate ADOC image references against actual image files
"""
import sys
import os
import re
import json

def validate_adoc_images(adoc_dir, images_dir):
    """Validate ADOC image references against actual image files."""
    IMAGE_PATTERN = re.compile(r'image:?:?(.+?)\\[', re.IGNORECASE)
    results = []
    
    for adoc_file in os.listdir(adoc_dir):
        if not adoc_file.endswith('.adoc'):
            continue
        
        adoc_path = os.path.join(adoc_dir, adoc_file)
        dmc_name = os.path.splitext(adoc_file)[0]
        image_folder_path = os.path.join(images_dir, dmc_name)
        
        # Extract referenced images from ADOC
        referenced_images = set()
        try:
            with open(adoc_path, 'r', encoding='utf-8') as f:
                content = f.read()
                matches = IMAGE_PATTERN.findall(content)
                for match in matches:
                    referenced_images.add(match.strip())
        except Exception as e:
            results.append({
                'file': adoc_file,
                'error': str(e),
                'missing': [],
                'unused': []
            })
            continue
        
        # List existing images
        existing_images = set()
        if os.path.isdir(image_folder_path):
            for root, _, files in os.walk(image_folder_path):
                for file in files:
                    if not file.startswith('.'):
                        relative_path = os.path.join(root, file)
                        relative_path = os.path.relpath(relative_path, image_folder_path)
                        existing_images.add(relative_path.replace(os.path.sep, '/'))
        
        # Perform checks
        missing_images = list(referenced_images - existing_images)
        unused_images = list(existing_images - referenced_images)
        
        results.append({
            'file': adoc_file,
            'missing': missing_images,
            'unused': unused_images,
            'status': 'ok' if not missing_images and not unused_images else 'warning'
        })
    
    return results

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: icn_validator.py <adoc_dir> <images_dir>")
        sys.exit(1)
    
    adoc_dir = sys.argv[1]
    images_dir = sys.argv[2]
    
    try:
        results = validate_adoc_images(adoc_dir, images_dir)
        print(json.dumps(results))
    except Exception as e:
        print(f"ERROR: {str(e)}", file=sys.stderr)
        sys.exit(1)
