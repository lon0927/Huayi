# 生成 images/opt/*.webp 四档宽度，并输出 og-cover.jpg
# 用法（在 X:\文档\huayi-clone 下）：python tools/optimize_images.py
import glob
import os

from PIL import Image, ImageOps

SRC, OUT = 'images', 'images/opt'
WIDTHS = [480, 768, 1200, 1600]
os.makedirs(OUT, exist_ok=True)

total_src = 0
total_out = 0
rows = []

for f in sorted(glob.glob(f'{SRC}/*.jpg') + glob.glob(f'{SRC}/*.png')):
    stem = os.path.splitext(os.path.basename(f))[0]
    size_src = os.path.getsize(f)
    total_src += size_src
    im = ImageOps.exif_transpose(Image.open(f)).convert('RGB')
    made = []
    for w in WIDTHS:
        if w > im.width:
            continue
        h = round(im.height * w / im.width)
        out = f'{OUT}/{stem}-{w}.webp'
        im.resize((w, h), Image.LANCZOS).save(out, 'WEBP', quality=76, method=6)
        total_out += os.path.getsize(out)
        made.append(f'{w}:{os.path.getsize(out)//1024}KB')
    rows.append((stem, size_src // 1024, ' '.join(made), f'{im.width}x{im.height}'))
    print('ok', stem, im.size, '|', ' '.join(made))

cover = ImageOps.fit(Image.open(f'{SRC}/booth-03.png').convert('RGB'), (1200, 630))
cover.save(f'{SRC}/og-cover.jpg', 'JPEG', quality=82, optimize=True)
print('og-cover.jpg', os.path.getsize(f'{SRC}/og-cover.jpg') // 1024, 'KB')
print(f'--- source total {total_src/1048576:.1f} MB -> opt total {total_out/1048576:.2f} MB')
