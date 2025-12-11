"""
ICN Extractor - Extract images with ICN tags from DOCX files
"""
import sys
import os
import zipfile
import re
import xml.etree.ElementTree as ET

def extract_icn_from_docx(input_dir, output_dir):
    """Extract images with ICN tags from DOCX files."""
    os.makedirs(output_dir, exist_ok=True)
    
    files_processed = 0
    total_images_extracted = 0
    
    print(f"Starting ICN extraction...", file=sys.stderr)
    
    for filename in os.listdir(input_dir):
        if not filename.lower().endswith('.docx') or filename.startswith('~'):
            continue
        
        docx_path = os.path.join(input_dir, filename)
        base_name = os.path.splitext(filename)[0]
        doc_output_dir = os.path.join(output_dir, base_name)
        
        print(f"\nProcessing: {filename}", file=sys.stderr)
        
        with zipfile.ZipFile(docx_path, 'r') as docx:
            media_files = sorted([f for f in docx.namelist() if f.startswith('word/media/')])
            if not media_files:
                print(f"  No images found", file=sys.stderr)
                continue
            
            print(f"  Found {len(media_files)} image(s)", file=sys.stderr)
            
            try:
                xml_content = docx.read("word/document.xml")
                plain_text = ""
                try:
                    root = ET.fromstring(xml_content)
                    ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
                    for t in root.findall('.//w:t', ns):
                        if t.text:
                            plain_text += t.text
                except ET.ParseError:
                    plain_text = xml_content.decode('utf-8', errors='ignore')
                
                icn_matches = re.findall(r'ICN-\s*([\w\-.]+)', plain_text)
                icn_labels = [f"ICN-{match}" for match in icn_matches]
                
                print(f"  Found {len(icn_labels)} ICN label(s) in document", file=sys.stderr)
                
                if not os.path.exists(doc_output_dir):
                    os.makedirs(doc_output_dir)
                
                for i, media_file in enumerate(media_files):
                    if i < len(icn_labels):
                        label = icn_labels[i]
                    else:
                        label = f"image_{i + 1}"
                    
                    ext = os.path.splitext(media_file)[1]
                    safe_label = re.sub(r'[<>:"/\\|?*]', '_', label)
                    out_path = os.path.join(doc_output_dir, f"{safe_label}{ext}")
                    
                    image_data = docx.read(media_file)
                    with open(out_path, "wb") as out_file:
                        out_file.write(image_data)
                    
                    total_images_extracted += 1
                    print(f"    Extracted: {safe_label}{ext}", file=sys.stderr)
                
                files_processed += 1
                print(f"  ✓ Extracted {len(media_files)} image(s) to {base_name}/", file=sys.stderr)
                
            except Exception as e:
                print(f"  ✗ Error processing {filename}: {e}", file=sys.stderr)
                continue
    
    print(f"\n=== Summary ===", file=sys.stderr)
    print(f"Files processed: {files_processed}", file=sys.stderr)
    print(f"Total images extracted: {total_images_extracted}", file=sys.stderr)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: icn_extractor.py <input_dir> <output_dir>")
        sys.exit(1)
    
    input_dir = sys.argv[1]
    output_dir = sys.argv[2]
    
    try:
        extract_icn_from_docx(input_dir, output_dir)
        print("SUCCESS")
    except Exception as e:
        print(f"ERROR: {str(e)}", file=sys.stderr)
        sys.exit(1)
