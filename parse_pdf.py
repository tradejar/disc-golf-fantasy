import pdfplumber
import sys

with pdfplumber.open(sys.argv[1]) as pdf:
    for i, page in enumerate(pdf.pages):
        text = page.extract_text()
        print(text)
