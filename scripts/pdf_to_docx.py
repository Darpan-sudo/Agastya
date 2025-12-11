#!/usr/bin/env python3
"""
Standalone PDF to DOCX converter
Usage: python pdf_to_docx.py <input.pdf> <output.docx>
"""

import sys
from pdf2docx import Converter

def convert_pdf_to_docx(input_path, output_path):
    try:
        converter = Converter(input_path)
        converter.convert(output_path)
        converter.close()
        print(f"SUCCESS: Converted {input_path} to {output_path}")
        return 0
    except Exception as e:
        print(f"ERROR: {str(e)}", file=sys.stderr)
        return 1

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python pdf_to_docx.py <input.pdf> <output.docx>", file=sys.stderr)
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    
    sys.exit(convert_pdf_to_docx(input_file, output_file))
