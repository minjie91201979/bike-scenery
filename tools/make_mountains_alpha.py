"""把 mountains_raw.png 的白色背景转成带羽化的透明通道"""
from PIL import Image
import math, sys

SRC = r"C:\Users\minji\Desktop\object\bike-scenery\assets\mountains_raw.png"
DST = r"C:\Users\minji\Desktop\object\bike-scenery\assets\mountains.png"

img = Image.open(SRC).convert("RGB")
w, h = img.size
px = img.load()

out = Image.new("RGBA", (w, h))
op = out.load()

# 与纯白的平均色距 -> alpha（10~35 之间平滑过渡，保留淡色远山层）
LO, HI = 12.0, 38.0
for y in range(h):
    for x in range(w):
        r, g, b = px[x, y]
        dist = ((255 - r) + (255 - g) + (255 - b)) / 3.0
        if dist <= LO:
            a = 0.0
        elif dist >= HI:
            a = 255.0
        else:
            t = (dist - LO) / (HI - LO)
            a = (t * t * (3 - 2 * t)) * 255.0
        op[x, y] = (r, g, b, int(a))

out.save(DST)
print("saved", DST, out.size)
