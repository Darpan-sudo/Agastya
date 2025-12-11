# Saxon XSLT Setup

This folder contains the files needed for XML to HTML conversion using Saxon XSLT processor.

## Required Files

1. **saxon9he.jar** - Saxon Home Edition XSLT processor
2. **demo3-1.xsl** - S1000D to HTML stylesheet (included)

## How to Get Saxon HE

1. Download Saxon HE from: https://sourceforge.net/projects/saxon/files/Saxon-HE/
2. Look for `SaxonHE[version]J.zip` (e.g., `SaxonHE12-5J.zip`)
3. Extract the ZIP file
4. Copy `saxon-he-[version].jar` to this folder and rename it to `saxon9he.jar`

Alternatively, download directly:
- Saxon 9: https://sourceforge.net/projects/saxon/files/Saxon-HE/9.9/SaxonHE9-9-1-8J.zip/download

## Java Requirement

Make sure Java is installed and available in your system PATH:
```bash
java -version
```

If Java is not installed:
- Windows: Download from https://adoptium.net/ or https://www.oracle.com/java/
- macOS: `brew install openjdk`
- Linux: `sudo apt install default-jdk`

## Testing

After placing the saxon9he.jar file here, you can test from command line:
```bash
java -jar saxon9he.jar -s:input.xml -xsl:demo3-1.xsl -o:output.html
```
