"""Generate every art asset for the town game into public/game/.

Small sprites are authored as ASCII grids (one char = one pixel, '.' = transparent)
and compiled to PNG; larger pieces (buildings, interiors, trees) are composed from
simple shapes. Re-run any time:  python scripts/gen_assets.py
"""
import json
import os
import random
from collections import Counter

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "game")
CAT_SRC = os.path.join(ROOT, "public", "sprites", "cat")
OL = "#2b2233"  # shared outline colour
T = 16  # tile size
manifest = {}


# ---------------------------------------------------------------- helpers
def rgba(h, a=255):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


def new(w, h, c=None):
    return Image.new("RGBA", (w, h), rgba(c) if c else (0, 0, 0, 0))


def save(im, rel, **meta):
    path = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path)
    manifest[rel] = {"w": im.width, "h": im.height, **meta}


def ascii_img(text, pal, name="?"):
    rows = [r.strip() for r in text.strip().split("\n")]
    w = max(len(r) for r in rows)
    im = new(w, len(rows))
    for y, r in enumerate(rows):
        if len(r) != w:
            print(f"WARN {name}: row {y} is {len(r)} wide, expected {w}")
        for x, ch in enumerate(r):
            if ch == ".":
                continue
            if ch not in pal:
                print(f"WARN {name}: unknown char {ch!r}")
                continue
            im.putpixel((x, y), rgba(pal[ch]))
    return im


def outline(im, c=OL):
    """Add a 1px outline around the opaque silhouette (inside the canvas)."""
    src = im.copy().load()
    w, h = im.size
    col = rgba(c)
    for y in range(h):
        for x in range(w):
            if src[x, y][3]:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and src[nx, ny][3]:
                    im.putpixel((x, y), col)
                    break
    return im


def paste(dst, src, x, y):
    dst.alpha_composite(src, (int(x), int(y)))


# ---------------------------------------------------------------- player (cat)
DIRS = ["down", "down_left", "left", "up_left", "up", "up_right", "right", "down_right"]


def build_cat():
    S, N = 418, 32
    ims = [Image.open(os.path.join(CAT_SRC, f"cat_{n}.png")).convert("RGBA") for n in DIRS]
    key = (255, 0, 255)
    strip = Image.new("RGB", (S * 8, S), key)
    for i, im in enumerate(ims):
        mask = im.getchannel("A").point(lambda v: 255 if v > 128 else 0)
        strip.paste(im.convert("RGB"), (S * i, 0), mask)
    pal = strip.quantize(12, method=Image.MEDIANCUT, dither=Image.NONE).convert("RGB")
    sheet = new(N * 8, N * 2)
    s = S / N
    for i, im in enumerate(ims):
        qp = pal.crop((S * i, 0, S * i + S, S)).load()
        ap = im.getchannel("A").load()
        cell = new(N, N)
        for cy in range(N):
            for cx in range(N):
                votes, opaque, total = Counter(), 0, 0
                for y in range(int(cy * s + s * 0.2), min(S, int(cy * s + s * 0.8) + 1)):
                    for x in range(int(cx * s + s * 0.2), min(S, int(cx * s + s * 0.8) + 1)):
                        total += 1
                        if ap[x, y] > 128 and qp[x, y] != key:
                            opaque += 1
                            votes[qp[x, y]] += 1
                if total and opaque / total > 0.5:
                    cell.putpixel((cx, cy), votes.most_common(1)[0][0] + (255,))
        # anchor every direction bottom-centre so the cat doesn't jitter when turning
        bb = cell.getbbox()
        body = cell.crop(bb)
        ox, oy = (N - body.width) // 2, N - 1 - body.height
        paste(sheet, body, N * i + ox, oy)       # row 0: idle
        paste(sheet, body, N * i + ox, N + oy - 1)  # row 1: hop frame (1px up)
    save(sheet, "player/cat.png", frameW=N, frameH=N, cols=8, rows=2,
         directions=DIRS, rowNames=["idle", "hop"], anchor="bottom-centre")
    sh = new(16, 6)
    ImageDraw.Draw(sh).ellipse((0, 0, 15, 5), fill=(0, 0, 0, 70))
    save(sh, "player/shadow.png")
    return sheet


# ---------------------------------------------------------------- ground tiles
GRASS, GRASS_D, GRASS_L = "#6abe5a", "#55a64a", "#8ad06c"


def speckle(base, specks, n, seed):
    rnd = random.Random(seed)
    im = new(T, T, base)
    for c in specks:
        for _ in range(n):
            im.putpixel((rnd.randrange(T), rnd.randrange(T)), rgba(c))
    return im


def tile_grass2():
    im = speckle(GRASS, [GRASS_D, GRASS_L], 5, 2)
    for x, y in ((3, 4), (10, 9), (6, 12)):
        for dx, dy in ((0, 0), (1, 1), (2, 0)):
            im.putpixel((x + dx, y + dy), rgba(GRASS_D))
    return im


def tile_flowers():
    im = speckle(GRASS, [GRASS_D, GRASS_L], 5, 3)
    for (x, y), c in (((3, 3), "#ffffff"), ((11, 6), "#ffb3c7"), ((6, 11), "#fff07a")):
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            im.putpixel((x + dx, y + dy), rgba(c))
        im.putpixel((x, y), rgba("#f5a623"))
    return im


def tile_cobble():
    im = new(T, T, "#bdb7aa")
    d = ImageDraw.Draw(im)
    for row in range(4):
        y = row * 4
        d.line((0, y + 3, 15, y + 3), fill="#8f897c")
        off = 0 if row % 2 == 0 else 4
        for x in range(off, 16, 8):
            d.line((x + 7, y, x + 7, y + 2), fill="#8f897c")
            im.putpixel(((x + 1) % 16, y), rgba("#d6d1c6"))
    return im


def tile_water(frame):
    im = new(T, T, "#4aa3df")
    for x, y, n in ((1, 3, 4), (9, 7, 5), (3, 12, 4), (12, 14, 3)):
        for i in range(n):
            im.putpixel(((x + i + frame * 4) % T, y), rgba("#8fd0f5"))
    for x, y in ((6, 5), (13, 10), (1, 9)):
        im.putpixel(((x + frame * 4) % T, y), rgba("#3a86c4"))
    return im


def build_tiles():
    tiles = [
        ("grass", speckle(GRASS, [GRASS_D, GRASS_L], 6, 1)),
        ("grass_tuft", tile_grass2()),
        ("flowers", tile_flowers()),
        ("path", speckle("#e2c58e", ["#cfae74", "#efd9a8"], 7, 4)),
        ("cobble", tile_cobble()),
        ("water_0", tile_water(0)),
        ("water_1", tile_water(1)),
    ]
    sheet = new(T * len(tiles), T)
    for i, (_, im) in enumerate(tiles):
        paste(sheet, im, i * T, 0)
    save(sheet, "tiles/town_tiles.png", tileSize=T, tiles=[n for n, _ in tiles])
    return dict(tiles)


# ---------------------------------------------------------------- props
def blob(im, cx, cy, rx, ry, base, light, dark, seed):
    rnd = random.Random(seed)
    for y in range(im.height):
        for x in range(im.width):
            dx, dy = (x - cx) / rx, (y - cy) / ry
            if dx * dx + dy * dy > 1:
                continue
            c = base
            if dx + dy > 0.55:
                c = dark
            elif (dx + 0.35) ** 2 + (dy + 0.4) ** 2 < 0.2:
                c = light
            if rnd.random() < 0.08:
                c = light if c == base else base
            im.putpixel((x, y), rgba(c))


def prop_tree():
    im = new(32, 40)
    d = ImageDraw.Draw(im)
    d.rectangle((13, 24, 18, 37), fill="#8a5a2b")
    d.rectangle((17, 24, 18, 37), fill="#6b431d")
    d.rectangle((11, 37, 20, 38), fill="#6b431d")
    blob(im, 15.5, 14, 13.5, 12.5, "#3f9a4a", "#63bd5c", "#2f7a3c", 7)
    return outline(im)


def prop_bush():
    im = new(16, 16)
    blob(im, 7.5, 9.5, 6.5, 5, "#3f9a4a", "#63bd5c", "#2f7a3c", 8)
    for x, y in ((4, 8), (10, 10), (8, 6)):
        im.putpixel((x, y), rgba("#e0483e"))
    return outline(im)


def prop_lamp():
    im = new(16, 32)
    d = ImageDraw.Draw(im)
    d.rectangle((7, 10, 8, 29), fill="#4a4a5a")
    d.rectangle((5, 29, 10, 30), fill="#4a4a5a")
    d.rectangle((4, 3, 11, 9), fill="#ffe27a")
    d.rectangle((6, 4, 9, 7), fill="#fff6c8")
    d.rectangle((3, 2, 12, 2), fill="#4a4a5a")
    d.rectangle((6, 1, 9, 1), fill="#4a4a5a")
    return outline(im)


def prop_bench():
    im = new(32, 16)
    d = ImageDraw.Draw(im)
    d.rectangle((2, 2, 29, 5), fill="#b9783f")
    d.rectangle((2, 7, 29, 10), fill="#d19555")
    d.rectangle((4, 11, 5, 14), fill="#6b431d")
    d.rectangle((26, 11, 27, 14), fill="#6b431d")
    d.line((2, 5, 29, 5), fill="#8a5528")
    return outline(im)


def prop_signpost():
    im = new(16, 24)
    d = ImageDraw.Draw(im)
    d.rectangle((7, 10, 8, 22), fill="#8a5a2b")
    d.rectangle((1, 2, 14, 10), fill="#e2c58e")
    d.line((3, 5, 12, 5), fill="#8a5a2b")
    d.line((3, 7, 9, 7), fill="#8a5a2b")
    return outline(im)


def prop_fence():
    im = new(16, 16)
    d = ImageDraw.Draw(im)
    d.rectangle((0, 6, 15, 7), fill="#f0ead8")
    d.rectangle((0, 11, 15, 12), fill="#f0ead8")
    for x in (3, 11):
        d.rectangle((x, 3, x + 1, 14), fill="#f0ead8")
        d.line((x + 1, 3, x + 1, 14), fill="#cfc7b0")
    return outline(im)


def prop_fountain():
    im = new(48, 40)
    d = ImageDraw.Draw(im)
    d.ellipse((1, 14, 46, 38), fill="#bdb7aa")
    d.ellipse((5, 17, 42, 33), fill="#4aa3df")
    for x, y in ((10, 24), (30, 21), (34, 28), (15, 29)):
        d.line((x, y, x + 3, y), fill="#8fd0f5")
    d.rectangle((21, 8, 26, 27), fill="#d6d1c6")
    d.rectangle((25, 8, 26, 27), fill="#8f897c")
    d.ellipse((15, 3, 32, 10), fill="#bdb7aa")
    d.ellipse((18, 4, 29, 8), fill="#8fd0f5")
    return outline(im)


def build_props():
    props = {
        "tree": prop_tree(), "bush": prop_bush(), "lamp": prop_lamp(), "bench": prop_bench(),
        "signpost": prop_signpost(), "fence": prop_fence(), "fountain": prop_fountain(),
    }
    for n, im in props.items():
        save(im, f"props/{n}.png", anchor="bottom-centre")
    return props


# ---------------------------------------------------------------- item + sign icons (ASCII)
ICONS = {}


def icon(name, pal, art):
    pal = {"o": OL, "w": "#ffffff", **pal}
    ICONS[name] = ascii_img(art, pal, name)


icon("bread", {"b": "#d9903d", "L": "#f6cf8a", "d": "#b86f2a"}, """
................
................
....oooooooo....
..oobbbbbbbboo..
.obbLbbLbbLbbbo.
.obLbbLbbLbbbbo.
obbbbbbbbbbbbbbo
obbbbbbbbbbbbbbo
obddddddddddddbo
.oddddddddddddo.
.oddddddddddddo.
.oddddddddddddo.
..oooooooooooo..
................
................
................
""")
icon("croissant", {"c": "#e0a04a", "L": "#f6d28f"}, """
................
................
................
.....oooooo.....
...oocccccccoo..
..occLccLccLcco.
.occLccLccLcccco
.ocLccLccLccLcco
occcooooooooccco
occo........occo
.oo..........oo.
................
................
................
................
................
""")
icon("cupcake", {"r": "#e0483e", "p": "#ff8fb0", "b": "#d9903d", "d": "#b86f2a"}, """
................
.......rr.......
......orro......
....oowwwwoo....
...owwwwwwwwo...
..owwwpwwwwpwo..
..owwwwwwpwwwo..
..oooooooooooo..
...obdbdbdbdo...
...obdbdbdbdo...
...obdbdbdbdo...
....obdbdbdo....
....oooooooo....
................
................
................
""")
icon("pills", {"a": "#e8963a", "g": "#2fa35a"}, """
................
.....oooooo.....
....owwwwwwo....
....owwwwwwo....
....oooooooo....
...oaaaaaaaao...
...oaaaaaaaao...
...owwwwwwwwo...
...owwgwwwwwo...
...owgggwwwwo...
...owwgwwwwwo...
...owwwwwwwwo...
...oaaaaaaaao...
...oaaaaaaaao...
....oooooooo....
................
""")
icon("syrup", {"p": "#9b5fc0", "r": "#e0483e"}, """
................
......oooo......
......orro......
......orro......
.....oooooo.....
....oppppppo....
...oppppppppo...
...owwwwwwwwo...
...owwwwwwwwo...
...owwrrrrwwo...
...owwwwwwwwo...
...oppppppppo...
...oppppppppo...
...oppppppppo...
....oooooooo....
................
""")
icon("bandage", {"t": "#f0c9a0"}, """
................
................
................
..........ooo...
........oottto..
......oottttto..
.....otttwwtto..
....ottwwwwtto..
...ottwwwwtto...
..ottwwwwtto....
..otttwwttto....
..ottttttoo.....
..otttoo........
...ooo..........
................
................
""")
icon("apple", {"r": "#e0483e", "R": "#ff8f80", "l": "#4caf50"}, """
................
.........ol.....
........oll.....
....ooo.oooo....
...orrrorrrro...
..orRRrrrrrrro..
..orRrrrrrrrro..
..orrrrrrrrrro..
..orrrrrrrrrro..
..orrrrrrrrrro..
...orrrrrrrro...
...orrrrrrrro...
....orrrrrro....
.....oooooo.....
................
................
""")
icon("milk", {"b": "#4aa3df"}, """
................
.....oooooo.....
....owwwwwwo....
...owwwwwwwwo...
...oooooooooo...
...owwwwwwwwo...
...obbbbbbbbo...
...obwwbbwwbo...
...obbbbbbbbo...
...owwwwwwwwo...
...owwwwwwwwo...
...owwwwwwwwo...
...owwwwwwwwo...
...oooooooooo...
................
................
""")
icon("cheese", {"y": "#f7c93e", "h": "#d99a1e"}, """
................
................
................
.........ooo....
......oooyyo....
...oooyyyyyo....
..oyyyyyyyyyo...
..ooooooooooo...
..oyyyyyhyyyo...
..oyhyyyyyyyo...
..oyyyyyyhyyo...
..oyyyhyyyyyo...
..ooooooooooo...
................
................
................
""")
icon("coin", {"y": "#f7c93e", "Y": "#fff07a", "d": "#c98a12"}, """
................
................
.....oooooo.....
....oyyyyyyo....
...oyyYYYYyyo...
..oyyYyyyyYyyo..
..oyYyydyyyYyo..
..oyYyyddyyYyo..
..oyYyydyyyYyo..
..oyYyydyyyYyo..
..oyyYydddYyyo..
...oyyYYYYyyo...
....oyyyyyyo....
.....oooooo.....
................
................
""")
icon("banknote", {"g": "#6cc070", "G": "#3f9a4a"}, """
................
................
................
oooooooooooooooo
oggggggggggggggo
ogGggggooggggGgo
oggggoowwooggggo
oggggowwwwoggggo
oggggowwwwoggggo
oggggoowwooggggo
ogGggggooggggGgo
oggggggggggggggo
oooooooooooooooo
................
................
................
""")
icon("card", {"b": "#4a6fd0", "k": "#2b2233", "y": "#f7c93e"}, """
................
................
................
.oooooooooooooo.
obbbbbbbbbbbbbbo
obbbbbbbbbbbbbbo
okkkkkkkkkkkkkko
okkkkkkkkkkkkkko
obbbbbbbbbbbbbbo
obyyybbbbbbbbbbo
obyyybbwwwbwwwbo
obbbbbbbbbbbbbbo
.oooooooooooooo.
................
................
................
""")
icon("cart", {"b": "#4a6fd0"}, """
................
................
oo..............
.oo.............
..oooooooooooo..
..obbbbbbbbbbo..
...obbbbbbbbo...
...obbbbbbbbo...
....obbbbbbo....
....oooooooo....
....o......o....
...oooooooooo...
....oo....oo....
....oo....oo....
................
................
""")
icon("cross", {"g": "#2fa35a", "G": "#5fd08a"}, """
................
................
.....oooooo.....
.....oGgggo.....
.....oGgggo.....
..ooooGgggoooo..
..oGGGGggggggo..
..oggggggggggo..
..oggggggggggo..
..oggggggggggo..
..oooogggooooo..
.....oggggo.....
.....oggggo.....
.....oooooo.....
................
................
""")

# UI icons
UI = {}


def ui(name, pal, art):
    UI[name] = ascii_img(art, {"o": OL, "w": "#ffffff", **pal}, name)


ui("star", {"y": "#f7c93e"}, """
................
.......oo.......
......oyyo......
......oyyo......
.....oyyyyo.....
ooooooyyyyoooooo
oyyyyyyyyyyyyyyo
.oyyyyyyyyyyyyo.
..oyyyyyyyyyyo..
...oyyyyyyyyo...
...oyyyyyyyyo...
..oyyyyooyyyyo..
..oyyyo..oyyyo..
.oyyoo....ooyyo.
.ooo........ooo.
................
""")
ui("lock", {"g": "#b9b4a8", "y": "#f7c93e"}, """
................
.....oooooo.....
....oggggggo....
...oggooooggo...
...ogo....ogo...
...ogo....ogo...
..oooooooooooo..
..oyyyyyyyyyyo..
..oyyyyooyyyyo..
..oyyyyooyyyyo..
..oyyyyooyyyyo..
..oyyyyyyyyyyo..
..oyyyyyyyyyyo..
..oooooooooooo..
................
................
""")
ui("mic", {}, """
................
......oooo......
.....owwwwo.....
.....owwwwo.....
.....owwwwo.....
.....owwwwo.....
...o.owwwwo.o...
...o.owwwwo.o...
...o..oooo..o...
....o......o....
.....oooooo.....
.......oo.......
.......oo.......
.....oooooo.....
................
................
""")
ui("exclaim", {"r": "#e0483e"}, """
................
..oooooooooooo..
.owwwwwwwwwwwwo.
.owwwwwrrwwwwwo.
.owwwwwrrwwwwwo.
.owwwwwrrwwwwwo.
.owwwwwrrwwwwwo.
.owwwwwwwwwwwwo.
.owwwwwrrwwwwwo.
.owwwwwwwwwwwwo.
..ooooowwooooo..
......owwo......
.......oo.......
................
................
................
""")
ui("arrow", {"y": "#f7c93e"}, """
................
................
....oooooooo....
....oyyyyyyo....
....oyyyyyyo....
....oyyyyyyo....
.oooooyyyyooooo.
.oyyyyyyyyyyyyo.
..oyyyyyyyyyyo..
...oyyyyyyyyo...
....oyyyyyyo....
.....oyyyyo.....
......oyyo......
.......oo.......
................
................
""")
ui("check_off", {"c": "#fff6dc"}, """
oooooooooooo
occcccccccco
occcccccccco
occcccccccco
occcccccccco
occcccccccco
occcccccccco
occcccccccco
occcccccccco
occcccccccco
occcccccccco
oooooooooooo
""")
ui("check_on", {"g": "#4caf50"}, """
oooooooooooo
ogggggggggg o
oggggggggwwo
ogggggggwwgo
oggggggwwggo
owwgggwwgggo
ogwwgwwggggo
oggwwwgggggo
ogggwggggggo
oggggggggggo
oggggggggggo
oooooooooooo
""".replace("ogggggggggg o", "oggggggggggo"))


def ui_panel():
    im = new(24, 24)
    d = ImageDraw.Draw(im)
    d.rectangle((0, 0, 23, 23), fill=OL)
    d.rectangle((2, 2, 21, 21), fill="#fff6dc")
    d.line((2, 21, 21, 21), fill="#e6d3a0")
    d.rectangle((2, 2, 21, 2), fill="#ffffff")
    for x, y in ((0, 0), (23, 0), (0, 23), (23, 23)):
        im.putpixel((x, y), (0, 0, 0, 0))
    return im


def ui_button(face, shade):
    im = new(24, 16)
    d = ImageDraw.Draw(im)
    d.rectangle((0, 0, 23, 15), fill=OL)
    d.rectangle((1, 1, 22, 14), fill=face)
    d.rectangle((1, 12, 22, 14), fill=shade)
    d.line((2, 2, 21, 2), fill="#ffffff80")
    for x, y in ((0, 0), (23, 0), (0, 15), (23, 15)):
        im.putpixel((x, y), (0, 0, 0, 0))
    return im


def build_icons_ui():
    for n, im in ICONS.items():
        save(im, f"items/{n}.png")
    for n, im in UI.items():
        save(im, f"ui/{n}.png")
    save(ui_panel(), "ui/panel.png", nineSlice=8)
    save(ui_button("#ff8a1f", "#d9621a"), "ui/button.png", nineSlice=6)
    save(ui_button("#d9621a", "#b84d12"), "ui/button_pressed.png", nineSlice=6)


# ---------------------------------------------------------------- NPCs (ASCII)
NPC_BASE = """
....................
....................
....................
....................
....................
....................
....OOOOOOOOOOOO....
...OFFFFFFFFFFFFO...
..OFFFFFFFFFFFFFFO..
..OFFFFFFFFFFFFFFO..
..OFFEFFFFFFFFEFFO..
..OFFEFFLLLLFFEFFO..
..OFFFFLLNNLLFFFFO..
..OFFFFLLLLLLFFFFO..
...OFFFFLLLLFFFFO...
....OOOOOOOOOOOO....
.....O12345678O.....
....OF12345678FO....
....OF12345678FO....
....OO12345678OO....
.....O12345678O.....
.....O12345678O.....
.....OPPOOOOPPO.....
.....OOOO..OOOO.....
"""

NPCS = {
    "baker": {  # bear in a chef's hat
        "pal": {"F": "#b9783f", "L": "#ecd0a6", "H": "#8a5528", "N": "#5a3620", "P": "#8a5528",
                "C": "#c0503a", "W": "#ffffff", "D": "#e0b040"},
        "pre": {3: "...OOOO......OOOO...", 4: "..OFHHFO....OFHHFO..", 5: "..OFHHFO....OFHHFO..",
                6: "..OFFFFO....OFFFFO..", 7: "..O..............O.."},
        "post": {0: "......OOOOOOOO......", 1: ".....OWWWWWWWWO.....", 2: ".....OWWWWWWWWO.....",
                 3: ".....OWWWWWWWWO.....", 4: "......OWWWWWWO......", 5: "......OWWWWWWO......",
                 6: "......OOOOOOOO......"},
        "body": ["CWWWWWWC", "CWWWWWWC", "WWWWWWWW", "WWWDDWWW", "WWWWWWWW", "WWWWWWWW"],
    },
    "pharmacist": {  # rabbit in a white coat
        "pal": {"F": "#f1ede4", "L": "#ffffff", "H": "#f2a7b5", "N": "#e58a9b", "P": "#d9d3c6",
                "C": "#3bb5a0", "W": "#dcebf2", "D": "#2fa35a"},
        "pre": {r: "....OFHFO..OFHFO...." for r in range(1, 7)} | {0: ".....OOO....OOO....."},
        "post": {},
        "body": ["WWWCCWWW", "WWWCCWWW", "WWWWWDWW", "WWWWDDDW", "WWWWWDWW", "WWWWWWWW"],
    },
    "cashier": {  # dog in a green apron
        "pal": {"F": "#e3b56a", "L": "#f7e4bd", "H": "#a9692f", "N": "#3a2a22", "P": "#a9692f",
                "C": "#3fa64b", "W": "#ffffff", "D": "#f5d23c"},
        "pre": {},
        "post": {7: ".OOO............OOO.", 13: ".OOO............OOO."}
                | {r: "OHHHO..........OHHHO" for r in range(8, 13)},
        "body": ["WCCCCCCW", "WCCCCCCW", "CCCCCDDC", "CCCCCCCC", "CCCCCCCC", "CCCCCCCC"],
    },
    "banker": {  # mouse in a suit and tie
        "pal": {"F": "#a9adb8", "L": "#dfe2e8", "H": "#f2a7b5", "N": "#e58a9b", "P": "#7d8190",
                "C": "#2c3e6b", "W": "#ffffff", "D": "#d43a3a"},
        "pre": {1: "..OOOO........OOOO..", 2: ".OFHHFO......OFHHFO.", 3: "OFHHHHFO....OFHHHHFO",
                4: "OFHHHHFO....OFHHHHFO", 5: ".OFHHFFO....OFFHHFO.", 6: "..OFFFFO....OFFFFO..",
                7: "...O............O..."},
        "post": {},
        "body": ["CCWDDWCC", "CCWDDWCC", "CCCDDCCC", "CCCDDCCC", "CCCCCCCC", "CCCCCCCC"],
    },
}


def build_npcs():
    out = {}
    base = [r.strip() for r in NPC_BASE.strip().split("\n")]
    for name, spec in NPCS.items():
        grid = [["."] * 20 for _ in range(24)]

        def stamp(rows):
            for y, row in rows.items():
                if len(row) != 20:
                    print(f"WARN npc {name}: overlay row {y} is {len(row)} wide")
                for x, ch in enumerate(row[:20]):
                    if ch != ".":
                        grid[y][x] = ch

        stamp(spec["pre"])
        stamp(dict(enumerate(base)))
        stamp(spec["post"])
        for y in range(24):
            for x in range(20):
                if grid[y][x].isdigit():
                    grid[y][x] = spec["body"][y - 16][int(grid[y][x]) - 1]
        pal = {"O": OL, "E": OL, **spec["pal"]}
        sprite = ascii_img("\n".join("".join(r) for r in grid), pal, name)
        frame = new(32, 32)  # same frame + baseline as the cat
        paste(frame, sprite, 6, 32 - 1 - 24)
        save(frame, f"npcs/{name}.png", anchor="bottom-centre")
        portrait = new(24, 24, "#ffe9c2")
        paste(portrait, sprite.crop((0, 0, 20, 20)), 2, 4)
        d = ImageDraw.Draw(portrait)
        d.rectangle((0, 0, 23, 23), outline=OL)
        save(portrait, f"npcs/{name}_portrait.png")
        out[name] = frame
    return out


# ---------------------------------------------------------------- buildings
def building(w, h, roof, roof_d, wall, wall_d, door, awning=None, sign=None,
             columns=False, door_x=None, windows=None):
    im = new(w, h)
    d = ImageDraw.Draw(im)
    rh = int(h * 0.4)
    d.rectangle((4, rh - 2, w - 5, h - 1), fill=wall)
    d.rectangle((4, h - 4, w - 5, h - 1), fill=wall_d)
    d.polygon([(8, 1), (w - 9, 1), (w - 1, rh), (0, rh)], fill=roof)
    for y in range(6, rh, 5):
        xl = 8 - 8 * (y - 1) / (rh - 1)
        d.line((xl, y, w - 1 - xl, y), fill=roof_d)
    d.rectangle((0, rh, w - 1, rh + 2), fill=roof_d)
    if awning:
        for i, x in enumerate(range(6, w - 6, 6)):
            c = awning[i % 2]
            d.rectangle((x, rh + 3, min(x + 5, w - 7), rh + 8), fill=c)
            d.rectangle((x + 1, rh + 9, min(x + 4, w - 7), rh + 9), fill=c)
    dw, dh = 18, 26
    dx = (w - dw) // 2 if door_x is None else door_x
    if windows is None:
        windows = [10, w - 10 - 18]
    wy = rh + 14
    if columns:
        for x in (9, 24, w - 29, w - 14):
            d.rectangle((x, rh + 3, x + 5, h - 1), fill="#f4f1ea")
            d.line((x + 5, rh + 3, x + 5, h - 1), fill="#b9b4a8")
            d.line((x, rh + 3, x, h - 1), fill=OL)
            d.rectangle((x - 1, h - 3, x + 6, h - 1), fill="#d6d1c6")
    else:
        for x in windows:
            d.rectangle((x - 1, wy - 1, x + 18, wy + 16), fill=OL)
            d.rectangle((x, wy, x + 17, wy + 15), fill="#ffffff")
            d.rectangle((x + 2, wy + 2, x + 15, wy + 13), fill="#8fd3f0")
            d.line((x + 4, wy + 9, x + 9, wy + 4), fill="#d9f2fc")
            d.line((x + 8, wy + 2, x + 8, wy + 13), fill="#ffffff")
            d.rectangle((x - 2, wy + 17, x + 19, wy + 18), fill=wall_d)
    d.rectangle((dx - 1, h - dh - 1, dx + dw, h - 1), fill=OL)
    d.rectangle((dx, h - dh, dx + dw - 1, h - 1), fill=door)
    d.rectangle((dx + 3, h - dh + 3, dx + dw - 4, h - dh + 11), fill="#8fd3f0")
    d.line((dx + 5, h - dh + 9, dx + 9, h - dh + 5), fill="#d9f2fc")
    d.rectangle((dx + dw - 5, h - 13, dx + dw - 4, h - 12), fill="#f7c93e")
    d.rectangle((dx - 3, h - 2, dx + dw + 2, h - 1), fill="#8f897c")
    if sign is not None:
        sx = w // 2 - 12
        d.rectangle((sx - 1, 4, sx + 24, 25), fill=OL)
        d.rectangle((sx, 5, sx + 23, 24), fill="#fff6dc")
        paste(im, sign, sx + 4, 7)
    outline(im)
    return im, {"door": {"x": dx + dw // 2, "y": h}}


def build_buildings():
    out = {}
    specs = {
        "bakery": dict(roof="#c9683a", roof_d="#a04e28", wall="#fbe6bf", wall_d="#e0c48f",
                       door="#8a5a2b", awning=("#e0483e", "#ffffff"), sign=ICONS["bread"]),
        "pharmacy": dict(roof="#3f9a6a", roof_d="#2f7a52", wall="#f4f6f1", wall_d="#cfd8cc",
                         door="#2f7a52", awning=("#2fa35a", "#ffffff"), sign=ICONS["cross"]),
        "supermarket": dict(roof="#4a7fd0", roof_d="#345fa6", wall="#fdf3c8", wall_d="#e3d28e",
                            door="#345fa6", awning=("#f7c93e", "#4a7fd0"), sign=ICONS["cart"]),
        "bank": dict(roof="#8d93a5", roof_d="#6a7084", wall="#e9e6de", wall_d="#c4c0b4",
                     door="#5a4326", sign=ICONS["coin"], columns=True),
    }
    for n, s in specs.items():
        im, meta = building(96, 80, **s)
        save(im, f"buildings/{n}.png", anchor="bottom-centre", **meta)
        out[n] = im
    houses = {
        "house_red": dict(roof="#d0564a", roof_d="#a63d34", wall="#fff1d6", wall_d="#e3cfa6", door="#8a5a2b"),
        "house_blue": dict(roof="#5b8fd6", roof_d="#3f6fb0", wall="#f6f1e6", wall_d="#d6cdb8", door="#3f6fb0"),
    }
    for n, s in houses.items():
        im, meta = building(64, 64, door_x=36, windows=[9], **s)
        save(im, f"buildings/{n}.png", anchor="bottom-centre", decorative=True, **meta)
        out[n] = im
    return out


# ---------------------------------------------------------------- interiors
IW, IH = 240, 160


def interior(wall, wall_l, floor_a, floor_b, counter, counter_d, items, carpet=None, planks=False):
    bg = new(IW, IH)
    d = ImageDraw.Draw(bg)
    d.rectangle((0, 0, IW - 1, 47), fill=wall)
    for x in range(4, IW, 8):
        d.line((x, 0, x, 43), fill=wall_l)
    d.rectangle((0, 44, IW - 1, 47), fill="#6b431d")
    for ty in range(3, 10):
        for tx in range(15):
            x, y = tx * T, ty * T
            if planks:
                d.rectangle((x, y, x + 15, y + 15), fill=floor_a)
                d.line((x, y + 7, x + 15, y + 7), fill=floor_b)
                d.line((x, y + 15, x + 15, y + 15), fill=floor_b)
                sx = x + (5 if ty % 2 else 12)
                d.line((sx, y, sx, y + 6), fill=floor_b)
                d.line((sx - 4 if sx > x + 4 else sx + 4, y + 8, sx - 4 if sx > x + 4 else sx + 4, y + 14), fill=floor_b)
            else:
                d.rectangle((x, y, x + 15, y + 15), fill=floor_a if (tx + ty) % 2 else floor_b)
    if carpet:
        d.rectangle((104, 98, 135, IH - 1), fill=carpet[0])
        d.rectangle((104, 98, 105, IH - 1), fill=carpet[1])
        d.rectangle((134, 98, 135, IH - 1), fill=carpet[1])
    for ux in (8, 92, 176):  # three shelf units on the back wall
        d.rectangle((ux - 1, 3, ux + 56, 42), fill=OL)
        d.rectangle((ux, 4, ux + 55, 41), fill="#8a5a2b")
        for row in range(2):
            sy = 6 + row * 18
            d.rectangle((ux + 3, sy, ux + 52, sy + 15), fill="#5e3b1c")
            for i in range(3):
                paste(bg, items[(i + row + ux // 80) % len(items)], ux + 4 + i * 16, sy)
            d = ImageDraw.Draw(bg)
            d.rectangle((ux + 3, sy + 16, ux + 52, sy + 16), fill="#b9783f")
    for px in (4, 220):  # pot plants in the back corners
        d.rectangle((px + 3, 60, px + 12, 68), fill="#c9683a")
        d.rectangle((px + 2, 58, px + 13, 60), fill="#a04e28")
        blob(bg, px + 7.5, 50, 7, 8, "#3f9a4a", "#63bd5c", "#2f7a3c", px)
        d = ImageDraw.Draw(bg)
        d.rectangle((px + 2, 57, px + 13, 57), fill=OL)
    d.rectangle((103, 151, 136, IH - 1), fill=OL)
    d.rectangle((104, 152, 135, IH - 1), fill="#b5443a")
    d.rectangle((108, 155, 131, 156), fill="#d96a5c")

    fg = new(IW, IH)  # counter, drawn over the NPC so they stand behind it
    d = ImageDraw.Draw(fg)
    d.rectangle((47, 69, 192, 98), fill=OL)
    d.rectangle((48, 70, 191, 79), fill="#f3e2bd")
    d.line((48, 79, 191, 79), fill="#cdb884")
    d.rectangle((48, 80, 191, 97), fill=counter)
    for x in range(48, 192, 24):
        d.rectangle((x + 3, 83, x + 20, 94), outline=counter_d)
    d.rectangle((159, 57, 178, 72), fill=OL)  # till
    d.rectangle((160, 58, 177, 71), fill="#8d93a5")
    d.rectangle((162, 60, 175, 64), fill="#a6e3a1")
    d.rectangle((162, 67, 175, 69), fill="#6a7084")
    paste(fg, items[0], 56, 58)
    paste(fg, items[1], 76, 58)
    return bg, fg


def build_interiors():
    I = ICONS
    specs = {
        "bakery": dict(wall="#f6d9a8", wall_l="#fbe6bf", floor_a="#d9a066", floor_b="#b97f48",
                       counter="#c9683a", counter_d="#a04e28", planks=True,
                       items=[I["bread"], I["croissant"], I["cupcake"]]),
        "pharmacy": dict(wall="#d5efe4", wall_l="#e9f8f1", floor_a="#f4f6f1", floor_b="#bfe3d2",
                         counter="#3f9a6a", counter_d="#2f7a52",
                         items=[I["pills"], I["syrup"], I["bandage"]]),
        "supermarket": dict(wall="#fdf3c8", wall_l="#fffbe6", floor_a="#e6ebf2", floor_b="#c9d3e3",
                            counter="#4a7fd0", counter_d="#345fa6",
                            items=[I["apple"], I["milk"], I["cheese"]]),
        "bank": dict(wall="#d9d3c6", wall_l="#e9e6de", floor_a="#efe6d2", floor_b="#e0d3b6",
                     counter="#6b4a2b", counter_d="#4a321c", carpet=("#b5443a", "#f7c93e"),
                     items=[I["coin"], I["banknote"], I["card"]]),
    }
    out = {}
    spots = dict(npcFeet={"x": 120, "y": 76}, talkSpot={"x": 120, "y": 118},
                 entry={"x": 120, "y": 150}, exit={"x": 104, "y": 152, "w": 32, "h": 8})
    for n, s in specs.items():
        bg, fg = interior(**s)
        save(bg, f"interiors/{n}_bg.png", **spots)
        save(fg, f"interiors/{n}_fg.png", layer="draw above NPC")
        out[n] = (bg, fg)
    return out


# ---------------------------------------------------------------- preview sheet
def preview(cat, tiles, props, npcs, buildings, interiors):
    W, H = 400, 240
    town = new(W, H)
    rnd = random.Random(5)
    for ty in range(H // T):
        for tx in range(W // T):
            r = rnd.random()
            t = "grass" if r < 0.7 else "grass_tuft" if r < 0.9 else "flowers"
            if ty in (7, 8) or tx in (12, 13):
                t = "path"
            if 10 <= tx <= 15 and 6 <= ty <= 9:
                t = "cobble"
            if tx >= 22 and ty >= 12:
                t = "water_0"
            paste(town, tiles[t], tx * T, ty * T)
    paste(town, buildings["bakery"], 16, 28)
    paste(town, buildings["pharmacy"], 280, 28)
    paste(town, buildings["supermarket"], 16, 150)
    paste(town, buildings["bank"], 232, 150)
    paste(town, buildings["house_red"], 130, 44)
    paste(town, props["fountain"], 184, 96)
    for x, y in ((120, 150), (150, 190), (370, 120), (2, 104)):
        paste(town, props["tree"], x, y)
    paste(town, props["lamp"], 170, 80)
    paste(town, props["bench"], 236, 104)
    paste(town, props["signpost"], 120, 100)
    paste(town, props["bush"], 220, 60)
    for i in range(4):
        paste(town, props["fence"], 320 + i * 16, 160)
    for i in range(8):
        paste(town, cat.crop((i * 32, 0, i * 32 + 32, 32)), 130 + i * 30, 118 if i % 2 else 126)

    rows = []
    for n, npc in zip(interiors, ("baker", "pharmacist", "cashier", "banker")):
        bg, fg = interiors[n]
        room = bg.copy()
        paste(room, npcs[npc], 104, 76 - 31)
        room.alpha_composite(fg)
        paste(room, cat.crop((4 * 32, 0, 5 * 32, 32)), 104, 118 - 31)
        rows.append(room)
    strip = new(W, 40, "#3a3350")
    x = 4
    for im in list(ICONS.values()) + list(UI.values()):
        paste(strip, im, x, 12)
        x += im.width + 4
    sheet = new(max(W, IW * 2), H + 40 + IH * 2, "#3a3350")
    paste(sheet, town, 0, 0)
    paste(sheet, strip, 0, H)
    for i, room in enumerate(rows):
        paste(sheet, room, (i % 2) * IW, H + 40 + (i // 2) * IH)
    sheet = sheet.resize((sheet.width * 2, sheet.height * 2), Image.NEAREST)
    sheet.save(os.path.join(OUT, "_preview.png"))


if __name__ == "__main__":
    cat = build_cat()
    tiles = build_tiles()
    props = build_props()
    build_icons_ui()
    npcs = build_npcs()
    buildings = build_buildings()
    interiors = build_interiors()
    preview(cat, tiles, props, npcs, buildings, interiors)
    with open(os.path.join(OUT, "manifest.json"), "w") as f:
        json.dump(manifest, f, indent=1)
    print(f"wrote {len(manifest)} assets to public/game/")
