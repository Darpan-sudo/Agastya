"""
Auto ICN - Automatically move ICN codes from captions to image attributes in AsciiDoc files
"""
import sys
import re
import os
import json


def process_adoc_file(filepath):
    """
    Processes a single AsciiDoc file to move an ICN from a caption into the
    corresponding image's attribute block as 'icn=...'.
    """
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            lines = f.readlines()
    except Exception as e:
        return {"file": os.path.basename(filepath), "status": "error", "message": str(e)}

    modified_lines = list(lines)
    changes_made = 0

    for i, line in enumerate(lines):
        if line.strip().startswith("image::"):
            search_window = 5
            for j in range(i + 1, min(i + 1 + search_window, len(lines))):
                icn_match = re.search(r"(ICN-[A-Z0-9-]{24,})", lines[j])
                if icn_match:
                    icn_string = icn_match.group(1)

                    original_image_line = lines[i]
                    image_match = re.match(
                        r"^(image::)(.*?)(?:\[(.*?)\])?\s*$", original_image_line
                    )
                    if not image_match:
                        continue

                    path = image_match.group(2)
                    existing_attrs = image_match.group(3) or ""

                    new_icn_attr = f"icn={icn_string}"
                    new_attrs = (
                        f"{new_icn_attr},{existing_attrs}"
                        if existing_attrs
                        else new_icn_attr
                    )

                    modified_lines[i] = f"image::{path}[{new_attrs}]\n"

                    original_caption_line = lines[j]
                    modified_lines[j] = original_caption_line.replace(icn_string, "")

                    changes_made += 1
                    break

    if changes_made == 0:
        return {"file": os.path.basename(filepath), "status": "no_changes", "changes": 0}

    try:
        with open(filepath, "w", encoding="utf-8") as f:
            f.writelines(modified_lines)
        return {"file": os.path.basename(filepath), "status": "success", "changes": changes_made}
    except Exception as e:
        return {"file": os.path.basename(filepath), "status": "error", "message": str(e)}


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No folder path provided"}))
        sys.exit(1)

    folder_path = sys.argv[1]

    if not os.path.isdir(folder_path):
        print(json.dumps({"error": f"Invalid directory: {folder_path}"}))
        sys.exit(1)

    results = []
    total_files = 0
    total_changes = 0

    for root, dirs, files in os.walk(folder_path):
        for filename in files:
            if filename.endswith(".adoc"):
                total_files += 1
                full_path = os.path.join(root, filename)
                result = process_adoc_file(full_path)
                results.append(result)
                if result["status"] == "success":
                    total_changes += result["changes"]

    output = {
        "success": True,
        "filesProcessed": total_files,
        "totalChanges": total_changes,
        "results": results
    }
    
    print(json.dumps(output))
