import math
import os
from PIL import Image, ImageDraw, ImageFilter

output_path = r"C:\Users\origi\.gemini\antigravity-ide\scratch\ai-workspace\prototypes\prototype-3\build\splash.gif"
os.makedirs(os.path.dirname(output_path), exist_ok=True)

frames = []
num_frames = 30
width, height = 400, 400

# Colors
bg_color = (13, 13, 26) # Dark cyberpunk blue #0d0d1a
cyan = (0, 240, 255)
magenta = (255, 0, 127)

for i in range(num_frames):
    img = Image.new('RGB', (width, height), bg_color)
    draw = ImageDraw.Draw(img)
    
    # Calculate pulsing radius
    pulse = math.sin((i / num_frames) * 2 * math.pi)
    radius = 100 + (pulse * 20)
    
    # Draw cyan outer ring
    left = (width / 2) - radius
    top = (height / 2) - radius
    right = (width / 2) + radius
    bottom = (height / 2) + radius
    draw.ellipse([left, top, right, bottom], outline=cyan, width=8)
    
    # Draw magenta inner ring, pulsing offset
    radius2 = 70 + (-pulse * 10)
    left2 = (width / 2) - radius2
    top2 = (height / 2) - radius2
    right2 = (width / 2) + radius2
    bottom2 = (height / 2) + radius2
    draw.ellipse([left2, top2, right2, bottom2], outline=magenta, width=5)
    
    # Add a glowing text in the center
    # Note: Using default font since we don't have custom TTF loaded
    draw.text((width/2 - 40, height/2 - 10), "AuraWave 3D", fill=(255, 255, 255))
    draw.text((width/2 - 30, height/2 + 10), "Installing...", fill=cyan)
    
    # Apply a slight blur for neon glow effect
    blurred = img.filter(ImageFilter.GaussianBlur(radius=1.5))
    
    # Re-draw crisp text on top of the blur
    draw2 = ImageDraw.Draw(blurred)
    draw2.text((width/2 - 40, height/2 - 10), "AuraWave 3D", fill=(255, 255, 255))
    draw2.text((width/2 - 30, height/2 + 10), "Installing...", fill=cyan)
    
    frames.append(blurred)

frames[0].save(
    output_path,
    save_all=True,
    append_images=frames[1:],
    duration=50, # 50ms per frame (20fps)
    loop=0
)

print(f"Generated animated splash screen at: {output_path}")
