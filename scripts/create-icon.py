from PIL import Image, ImageDraw

# Create a pixel art mammography machine icon
# Based on the user's shared image: pixel art style mammography machine with pink ribbon

PIXEL_SIZE = 16  # Each "pixel" in the art will be 16x16 real pixels
GRID = 32  # 32x32 pixel art grid
IMG_SIZE = GRID * PIXEL_SIZE  # 512x512 final image

# Color palette
BG = (232, 67, 147)           # Hot pink background #e84393
BG_DARK = (200, 50, 120)      # Darker pink for rounded corner effect
WHITE = (255, 255, 255)        # White
LIGHT_GRAY = (220, 220, 230)   # Light gray
MID_GRAY = (180, 180, 195)     # Medium gray
DARK_GRAY = (100, 100, 115)    # Dark gray
VERY_DARK = (60, 60, 75)       # Very dark gray/almost black
RIBBON_PINK = (255, 130, 180)  # Light pink for ribbon
RIBBON_DARK = (220, 80, 140)   # Darker pink for ribbon shading
SCREEN_GREEN = (100, 220, 160) # Green for screen
SCREEN_DARK = (40, 80, 60)     # Dark screen background
SCREEN_BG = (50, 100, 80)      # Screen background

img = Image.new('RGBA', (IMG_SIZE, IMG_SIZE), (0, 0, 0, 0))

# Create pixel art grid (32x32)
grid = [[BG for _ in range(GRID)] for _ in range(GRID)]

# Helper to set pixels
def px(x, y, color):
    if 0 <= x < GRID and 0 <= y < GRID:
        grid[y][x] = color

def hline(x1, x2, y, color):
    for x in range(x1, x2 + 1):
        px(x, y, color)

def vline(x, y1, y2, color):
    for y in range(y1, y2 + 1):
        px(x, y, color)

def rect(x1, y1, x2, y2, color):
    for y in range(y1, y2 + 1):
        for x in range(x1, x2 + 1):
            px(x, y, color)

# Round corners of background
# Fill entire background first
rect(0, 0, 31, 31, BG)

# Round corners (remove corner pixels for rounded look)
corners = [(0,0), (1,0), (0,1),
           (31,0), (30,0), (31,1),
           (0,31), (1,31), (0,30),
           (31,31), (30,31), (31,30)]
for cx, cy in corners:
    px(cx, cy, (0, 0, 0, 0))

# === MAMMOGRAPHY MACHINE ===

# Machine base/platform
rect(8, 26, 24, 27, DARK_GRAY)
rect(9, 25, 23, 26, MID_GRAY)
hline(10, 22, 28, VERY_DARK)

# Machine vertical column/support
rect(14, 10, 18, 26, MID_GRAY)
rect(15, 10, 17, 26, LIGHT_GRAY)
vline(14, 10, 26, DARK_GRAY)
vline(18, 10, 26, DARK_GRAY)

# Machine head/gantry (top part with C-arm)
# Upper arm
rect(9, 12, 14, 14, MID_GRAY)
rect(10, 12, 13, 13, LIGHT_GRAY)
hline(9, 14, 12, DARK_GRAY)
hline(9, 14, 14, DARK_GRAY)
vline(9, 12, 14, DARK_GRAY)

# Compression paddle (upper)
rect(7, 15, 13, 16, LIGHT_GRAY)
hline(7, 13, 15, DARK_GRAY)
hline(7, 13, 16, MID_GRAY)

# Breast platform (lower)
rect(7, 19, 13, 20, LIGHT_GRAY)
hline(7, 13, 19, MID_GRAY)
hline(7, 13, 20, DARK_GRAY)

# Lower arm
rect(9, 20, 14, 22, MID_GRAY)
rect(10, 20, 13, 21, LIGHT_GRAY)
vline(9, 20, 22, DARK_GRAY)
hline(9, 22, 14, DARK_GRAY)

# Monitor/Display on top
rect(12, 5, 20, 10, VERY_DARK)
rect(13, 6, 19, 9, SCREEN_BG)

# Screen content (waveform/graph)
px(14, 8, SCREEN_GREEN)
px(15, 7, SCREEN_GREEN)
px(16, 8, SCREEN_GREEN)
px(17, 7, SCREEN_GREEN)
px(18, 6, SCREEN_GREEN)

# Monitor stand
rect(15, 10, 17, 10, DARK_GRAY)

# === PINK RIBBON ===
# Place ribbon on the right side of the machine

# Ribbon - left loop
px(22, 14, RIBBON_PINK)
px(21, 15, RIBBON_PINK)
px(21, 16, RIBBON_PINK)
px(22, 17, RIBBON_PINK)
px(22, 15, RIBBON_DARK)
px(22, 16, RIBBON_DARK)

# Ribbon - center/knot
px(23, 17, RIBBON_DARK)
px(23, 18, RIBBON_PINK)

# Ribbon - right loop
px(24, 14, RIBBON_PINK)
px(25, 15, RIBBON_PINK)
px(25, 16, RIBBON_PINK)
px(24, 17, RIBBON_PINK)
px(24, 15, RIBBON_DARK)
px(24, 16, RIBBON_DARK)

# Ribbon tails
px(22, 19, RIBBON_PINK)
px(21, 20, RIBBON_PINK)
px(24, 19, RIBBON_PINK)
px(25, 20, RIBBON_PINK)

# Render the grid to the image
draw = ImageDraw.Draw(img)
for y in range(GRID):
    for x in range(GRID):
        color = grid[y][x]
        if isinstance(color, tuple) and len(color) == 4 and color[3] == 0:
            continue  # Skip transparent
        x1 = x * PIXEL_SIZE
        y1_px = y * PIXEL_SIZE
        x2 = x1 + PIXEL_SIZE - 1
        y2 = y1_px + PIXEL_SIZE - 1
        draw.rectangle([x1, y1_px, x2, y2], fill=color)

# Save
img.save('/home/user/PDP-tracker/icon-original.png')
print(f"Icon saved: {IMG_SIZE}x{IMG_SIZE}")

# Also show as small preview
small = img.resize((32, 32), Image.NEAREST)
small.save('/home/user/PDP-tracker/icon-preview.png')
print("Preview saved")
