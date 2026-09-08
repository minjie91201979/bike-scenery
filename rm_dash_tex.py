from pathlib import Path
p = Path(r"C:\Users\musou\Desktop\object\bike-scenery\src\engine\World.ts")
t = p.read_text(encoding="utf-8")
start = t.find("\n/** 中心虚线贴图")
if start < 0:
    start = t.find("\nfunction makeDashTexture")
assert start > 0, "makeDashTexture not found"
# find end of function: next \n}\n after function start
fn = t.find("function makeDashTexture", start)
end = t.find("\n}", fn)
assert end > 0
end = end + 3  # include }\n
t2 = t[:start] + "\n" + t[end:]
p.write_text(t2, encoding="utf-8")
print("removed makeDashTexture", start, end)
