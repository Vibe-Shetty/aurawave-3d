from PIL import Image

# Open the PNG image
img = Image.open('C:/Users/origi/.gemini/antigravity-ide/scratch/ai-workspace/prototypes/prototype-3/public/pwa-512x512.png')

# Save as ICO
img.save('C:/Users/origi/.gemini/antigravity-ide/scratch/ai-workspace/prototypes/prototype-3/public/icon.ico', format='ICO', sizes=[(256, 256), (128, 128), (64, 64), (32, 32), (16, 16)])

print("Successfully converted pwa-512x512.png to icon.ico")
