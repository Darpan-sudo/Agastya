"""
Excel Renamer - Generate preview and execute file renaming based on Excel mapping
"""
import sys
import os
import json
import shutil
import pandas as pd

def generate_rename_preview(excel_path, docx_folder):
    """Generate a preview of file renames based on Excel mapping."""
    try:
        df = pd.read_excel(excel_path)
    except Exception as e:
        return {'error': f'Failed to read Excel: {str(e)}'}
    
    # Find columns (case-insensitive)
    cols_lower = [c.lower().strip() for c in df.columns]
    
    def find_col(names):
        for n in names:
            if n.lower() in cols_lower:
                return df.columns[cols_lower.index(n.lower())]
        return None
    
    doc_col = find_col(["Doc_Name", "Doc Name", "doc_name", "doc name", "DocName", "filename", "File", "FileName"])
    dmc_col = find_col(["DMC_Code", "DMC Code", "dmc_code", "dmc code", "DMC"])
    
    if not doc_col or not dmc_col:
        return {'error': 'Excel must contain Doc Name and DMC Code columns'}
    
    # Extract Excel data for display
    excel_data = []
    for _, row in df.iterrows():
        doc_name = str(row[doc_col]).strip()
        dmc_code = str(row[dmc_col]).strip()
        if doc_name and dmc_code and doc_name.lower() != 'nan' and dmc_code.lower() != 'nan':
            excel_data.append({
                'doc_name': doc_name,
                'dmc_code': dmc_code
            })
    
    # Build mapping
    df[doc_col] = df[doc_col].astype(str).str.strip()
    df[dmc_col] = df[dmc_col].astype(str).str.strip()
    
    mapping = {}
    for _, row in df.iterrows():
        doc_name = str(row[doc_col]).strip()
        dmc_code = str(row[dmc_col]).strip()
        if doc_name and dmc_code and doc_name.lower() != 'nan' and dmc_code.lower() != 'nan':
            mapping[doc_name.lower()] = dmc_code
    
    # Generate preview
    preview = []
    
    for filename in sorted(os.listdir(docx_folder)):
        if filename.lower().endswith('.docx'):
            base_name = os.path.splitext(filename)[0]
            base_name_lower = base_name.lower()
            
            if base_name_lower in mapping:
                dmc_code = mapping[base_name_lower]
                new_name = f"{dmc_code}.docx"
                new_path = os.path.join(docx_folder, new_name)
                
                preview.append({
                    'original_name': filename,
                    'new_name': new_name,
                    'dmc_code': dmc_code,
                    'exists': os.path.exists(new_path) and new_path != os.path.join(docx_folder, filename),
                    'status': '✓ ready' if not os.path.exists(new_path) or new_path == os.path.join(docx_folder, filename) else '⚠ exists',
                    'base_name': base_name
                })
            else:
                preview.append({
                    'original_name': filename,
                    'new_name': filename,
                    'dmc_code': '',
                    'exists': False,
                    'status': '⚠ no_mapping',
                    'base_name': base_name,
                    'available_matches': list(mapping.keys())[:5] if len(mapping) <= 5 else []
                })
    
    return {
        'preview': preview,
        'excel_data': excel_data
    }

def execute_rename(docx_folder, preview_data):
    """Execute the rename based on preview data."""
    renamed = 0
    errors = []
    
    for item in preview_data:
        if '✓' in item['status']:
            old_path = os.path.join(docx_folder, item['original_name'])
            new_path = os.path.join(docx_folder, item['new_name'])
            
            if old_path == new_path:
                continue
            
            # Handle conflicts
            if os.path.exists(new_path):
                base, ext = os.path.splitext(item['new_name'])
                i = 1
                while os.path.exists(os.path.join(docx_folder, f"{base}_{i}{ext}")):
                    i += 1
                new_path = os.path.join(docx_folder, f"{base}_{i}{ext}")
            
            try:
                shutil.move(old_path, new_path)
                renamed += 1
            except Exception as e:
                errors.append(f"Failed to rename {item['original_name']}: {str(e)}")
    
    return renamed, errors

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: excel_renamer.py <command> <args...>")
        sys.exit(1)
    
    command = sys.argv[1]
    
    try:
        if command == "preview":
            excel_path = sys.argv[2]
            docx_folder = sys.argv[3]
            result = generate_rename_preview(excel_path, docx_folder)
            print(json.dumps(result))
        elif command == "execute":
            docx_folder = sys.argv[2]
            preview_json = sys.argv[3]
            preview_data = json.loads(preview_json)
            renamed, errors = execute_rename(docx_folder, preview_data)
            print(json.dumps({'renamed': renamed, 'errors': errors}))
        else:
            print(json.dumps({'error': f'Unknown command: {command}'}))
            sys.exit(1)
    except Exception as e:
        print(json.dumps({'error': str(e)}), file=sys.stderr)
        sys.exit(1)
