"""
TVK Logo - Remove White Background + Circle Border Ring
Saves output to <category>/processed/ folders.
"""

import os
import numpy as np
from PIL import Image
from collections import deque

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_SUBDIR = "processed"
CATEGORIES = ["agriculture","civic","education","employement",
               "health","law and order","ration","revenue"]


def flood_fill_from_edges(white_mask, h, w):
    """BFS flood fill from all 4 image edges into white pixels."""
    visited = np.zeros((h, w), dtype=bool)
    queue = deque()
    for x in range(w):
        for y in [0, h-1]:
            if white_mask[y, x] and not visited[y, x]:
                visited[y, x] = True
                queue.append((y, x))
    for y in range(h):
        for x in [0, w-1]:
            if white_mask[y, x] and not visited[y, x]:
                visited[y, x] = True
                queue.append((y, x))
    while queue:
        y, x = queue.popleft()
        for dy, dx in [(-1,0),(1,0),(0,-1),(0,1)]:
            ny, nx = y+dy, x+dx
            if 0 <= ny < h and 0 <= nx < w and not visited[ny,nx] and white_mask[ny,nx]:
                visited[ny,nx] = True
                queue.append((ny,nx))
    return visited


def detect_border_thickness(data, bg_mask, cx, cy, outer_radius):
    """
    Scan radially inward from outer_radius to find where border ring ends.
    Returns estimated border thickness in pixels.
    """
    h, w = data.shape[:2]
    thicknesses = []

    for i in range(72):
        angle = 2 * np.pi * i / 72
        cos_a, sin_a = np.cos(angle), np.sin(angle)
        border_color = None
        thickness = 0

        for delta in range(1, outer_radius // 3):
            r = outer_radius - delta
            px = int(cx + r * cos_a)
            py = int(cy + r * sin_a)
            if not (0 <= px < w and 0 <= py < h):
                continue
            if bg_mask[py, px]:
                continue
            pixel = data[py, px, :3].astype(float)
            if border_color is None:
                border_color = pixel
                thickness = delta
            else:
                diff = np.abs(pixel - border_color).mean()
                if diff > 55:
                    thickness = delta
                    break
                border_color = border_color * 0.7 + pixel * 0.3

        if thickness > 3:
            thicknesses.append(thickness)

    if not thicknesses:
        return 30
    return int(np.percentile(thicknesses, 40))


def process_image(input_path, output_path, white_threshold=238):
    img = Image.open(input_path).convert("RGBA")
    data = np.array(img)
    h, w = data.shape[:2]
    r, g, b, a = data[:,:,0], data[:,:,1], data[:,:,2], data[:,:,3]

    # Step 1: flood-fill outer white background -> transparent
    white_mask = (r >= white_threshold) & (g >= white_threshold) & (b >= white_threshold) & (a > 10)
    bg_mask = flood_fill_from_edges(white_mask, h, w)

    # Step 2: find circle center & outer radius
    non_bg = ~bg_mask & (a > 10)
    rows_any = np.any(non_bg, axis=1)
    cols_any = np.any(non_bg, axis=0)
    if not rows_any.any() or not cols_any.any():
        img.save(output_path)
        return
    row_min, row_max = np.where(rows_any)[0][[0,-1]]
    col_min, col_max = np.where(cols_any)[0][[0,-1]]
    cx = int((col_min + col_max) / 2)
    cy = int((row_min + row_max) / 2)
    outer_radius = int(max(col_max - col_min, row_max - row_min) / 2)

    # Step 3: detect border ring thickness
    border_t = detect_border_thickness(data, bg_mask, cx, cy, outer_radius)
    inner_radius = outer_radius - border_t
    print(f"  outer_r={outer_radius}, border={border_t}, inner_r={inner_radius}")

    # Step 4: distance map
    Y, X = np.ogrid[:h, :w]
    dist = np.sqrt((X - cx)**2 + (Y - cy)**2)

    # Step 5: build output - transparent outside outer circle AND inside border ring
    new_data = data.copy()
    new_data[bg_mask, 3] = 0                  # outer white -> transparent
    new_data[dist > inner_radius, 3] = 0      # border ring -> transparent

    # Step 6: also remove white "frame" ring just inside the border
    # (thin white separator between border and content - common in these logos)
    # Flood fill white pixels adjacent to newly transparent ring area, limited to near the edge
    ring_transparent = dist > inner_radius
    near_edge = (dist > inner_radius - border_t * 1.2) & (dist <= inner_radius)
    white_near_edge = white_mask & near_edge

    if white_near_edge.any():
        visited2 = np.zeros((h, w), dtype=bool)
        queue2 = deque()
        for (py, px) in np.argwhere(white_near_edge):
            for dy, dx in [(-1,0),(1,0),(0,-1),(0,1)]:
                ny, nx = py+dy, px+dx
                if 0 <= ny < h and 0 <= nx < w and ring_transparent[ny, nx]:
                    if not visited2[py, px]:
                        visited2[py, px] = True
                        queue2.append((py, px))
                    break
        while queue2:
            py, px = queue2.popleft()
            new_data[py, px, 3] = 0
            for dy, dx in [(-1,0),(1,0),(0,-1),(0,1)]:
                ny, nx = py+dy, px+dx
                if 0 <= ny < h and 0 <= nx < w and not visited2[ny,nx] and white_near_edge[ny,nx]:
                    visited2[ny,nx] = True
                    queue2.append((ny,nx))

    # Step 7: Convert to white background instead of transparent
    # Create white background
    white_bg = np.ones((h, w, 3), dtype=np.uint8) * 255
    
    # Blend the image onto white background using alpha channel
    alpha = new_data[:, :, 3:4] / 255.0
    rgb = new_data[:, :, :3]
    final_rgb = (rgb * alpha + white_bg * (1 - alpha)).astype(np.uint8)
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    Image.fromarray(final_rgb, "RGB").save(output_path, "PNG")
    print(f"  [OK] {output_path}")


def process_all():
    total = success = 0
    for category in CATEGORIES:
        cat_dir = os.path.join(BASE_DIR, category)
        if not os.path.isdir(cat_dir):
            continue
        out_dir = os.path.join(cat_dir, OUTPUT_SUBDIR)
        os.makedirs(out_dir, exist_ok=True)
        print(f"\n[{category}]")
        for fname in os.listdir(cat_dir):
            if not fname.lower().endswith(".png"):
                continue
            total += 1
            print(f"  {fname}")
            try:
                process_image(
                    os.path.join(cat_dir, fname),
                    os.path.join(out_dir, fname)
                )
                success += 1
            except Exception as e:
                print(f"  [FAILED] {e}")
    print(f"\n{'='*50}")
    print(f"[DONE] {success}/{total} processed.")

if __name__ == "__main__":
    process_all()
