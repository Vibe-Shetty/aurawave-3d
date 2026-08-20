import os
import sys
import subprocess

try:
    from PIL import Image
except ImportError:
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'Pillow'])
    from PIL import Image

sidebar_path = r"C:\Users\origi\.gemini\antigravity-ide\brain\b86a0714-d916-4ee8-8c00-8c380679d55a\installer_sidebar_1787148978641.jpg"
header_path = r"C:\Users\origi\.gemini\antigravity-ide\brain\b86a0714-d916-4ee8-8c00-8c380679d55a\installer_header_1787149100987.jpg"

output_dir = r"C:\Users\origi\.gemini\antigravity-ide\scratch\ai-workspace\prototypes\prototype-3\build"
os.makedirs(output_dir, exist_ok=True)

# Process Sidebar
if os.path.exists(sidebar_path):
    img = Image.open(sidebar_path)
    img = img.resize((164, 314), Image.Resampling.LANCZOS)
    img.save(os.path.join(output_dir, "installerSidebar.bmp"), format="BMP")
    print("Sidebar saved.")

# Process Header
if os.path.exists(header_path):
    img = Image.open(header_path)
    img = img.resize((150, 57), Image.Resampling.LANCZOS)
    img.save(os.path.join(output_dir, "installerHeader.bmp"), format="BMP")
    print("Header saved.")
