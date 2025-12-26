#!/usr/bin/env python3
"""Render a captioned carousel GIF from docs/showcase/manifest.json.

Usage:
  uv run python docs/showcase/render_showcase.py

Requires: Pillow (PIL).
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Tuple

from PIL import Image, ImageDraw, ImageFont

ROOT_DIR = Path(__file__).resolve().parents[2]
MANIFEST_PATH = Path(__file__).resolve().parent / "manifest.json"

REGULAR_FONT_CANDIDATES = [
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/System/Library/Fonts/Supplemental/Helvetica.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
]
BOLD_FONT_CANDIDATES = [
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/System/Library/Fonts/Supplemental/Helvetica Bold.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
]

DEFAULTS: Dict[str, Any] = {
    "width": 1200,
    "caption_height": 220,
    "slide_duration_ms": 1400,
    "transition_ms": 0,
    "transition_steps": 0,
    "background": "#F5F6FA",
    "caption_background": "#F5F6FA",
    "title_color": "#1E2330",
    "subtitle_color": "#5E6572",
    "title_size": 40,
    "subtitle_size": 24,
    "padding_x": 80,
    "title_line_spacing": 6,
    "subtitle_line_spacing": 4,
    "subtitle_gap": 12,
}


def _resolve_font_path(candidates: List[str]) -> str | None:
    for candidate in candidates:
        path = Path(candidate)
        if path.exists():
            return str(path)
    return None


def _load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    font_path = _resolve_font_path(BOLD_FONT_CANDIDATES if bold else REGULAR_FONT_CANDIDATES)
    if font_path:
        return ImageFont.truetype(font_path, size)
    return ImageFont.load_default()


def _text_width(text: str, font: ImageFont.ImageFont) -> float:
    try:
        return font.getlength(text)
    except AttributeError:
        return font.getsize(text)[0]


def _line_height(font: ImageFont.ImageFont) -> int:
    try:
        ascent, descent = font.getmetrics()
        return ascent + descent
    except AttributeError:
        return font.getsize("Ag")[1]


def _wrap_text(text: str, font: ImageFont.ImageFont, max_width: int) -> List[str]:
    words = text.split()
    if not words:
        return []
    lines: List[str] = []
    current = words[0]
    for word in words[1:]:
        candidate = f"{current} {word}"
        if _text_width(candidate, font) <= max_width:
            current = candidate
        else:
            lines.append(current)
            current = word
    lines.append(current)
    return lines


def _draw_lines(
    draw: ImageDraw.ImageDraw,
    lines: List[str],
    font: ImageFont.ImageFont,
    color: str,
    width: int,
    y_start: int,
    line_spacing: int,
) -> int:
    y = y_start
    line_h = _line_height(font)
    for index, line in enumerate(lines):
        x = int((width - _text_width(line, font)) / 2)
        draw.text((x, y), line, font=font, fill=color)
        y += line_h
        if index < len(lines) - 1:
            y += line_spacing
    return y


def _compose_slide(
    slide: Dict[str, Any],
    assets_dir: Path,
    config: Dict[str, Any],
    title_font: ImageFont.ImageFont,
    subtitle_font: ImageFont.ImageFont,
) -> Image.Image:
    image_path = assets_dir / slide["image"]
    if not image_path.exists():
        raise FileNotFoundError(f"Missing asset: {image_path}")

    with Image.open(image_path) as original:
        image = original.convert("RGB")

    target_width = int(config["width"])
    scale = target_width / image.width
    target_height = int(round(image.height * scale))
    image = image.resize((target_width, target_height), Image.LANCZOS)

    caption_height = int(config["caption_height"])
    canvas_height = target_height + caption_height
    canvas = Image.new("RGB", (target_width, canvas_height), config["background"])
    canvas.paste(image, (0, 0))

    draw = ImageDraw.Draw(canvas)
    if config.get("caption_background") and config["caption_background"] != config["background"]:
        draw.rectangle(
            (0, target_height, target_width, canvas_height),
            fill=config["caption_background"],
        )

    padding_x = int(config["padding_x"])
    max_text_width = target_width - (padding_x * 2)

    title_lines = _wrap_text(slide.get("title", ""), title_font, max_text_width)
    subtitle_lines = _wrap_text(slide.get("subtitle", ""), subtitle_font, max_text_width)

    title_line_h = _line_height(title_font)
    subtitle_line_h = _line_height(subtitle_font)

    title_block_h = (
        len(title_lines) * title_line_h
        + max(0, len(title_lines) - 1) * int(config["title_line_spacing"])
    )
    subtitle_block_h = (
        len(subtitle_lines) * subtitle_line_h
        + max(0, len(subtitle_lines) - 1) * int(config["subtitle_line_spacing"])
    )

    subtitle_gap = int(config["subtitle_gap"]) if subtitle_lines else 0
    total_text_h = title_block_h + subtitle_gap + subtitle_block_h

    y_start = target_height + int((caption_height - total_text_h) / 2)

    y_next = _draw_lines(
        draw,
        title_lines,
        title_font,
        config["title_color"],
        target_width,
        y_start,
        int(config["title_line_spacing"]),
    )

    if subtitle_lines:
        y_next += subtitle_gap
        _draw_lines(
            draw,
            subtitle_lines,
            subtitle_font,
            config["subtitle_color"],
            target_width,
            y_next,
            int(config["subtitle_line_spacing"]),
        )

    return canvas


def _build_frames(
    slides: List[Dict[str, Any]],
    assets_dir: Path,
    config: Dict[str, Any],
) -> Tuple[List[Image.Image], List[int]]:
    title_font = _load_font(int(config["title_size"]), bold=True)
    subtitle_font = _load_font(int(config["subtitle_size"]))

    slide_frames = [
        _compose_slide(slide, assets_dir, config, title_font, subtitle_font)
        for slide in slides
    ]

    frames: List[Image.Image] = []
    durations: List[int] = []

    slide_duration = int(config["slide_duration_ms"])
    transition_ms = int(config.get("transition_ms", 0))
    transition_steps = int(config.get("transition_steps", 0))

    step_duration = 0
    if transition_ms > 0 and transition_steps > 0:
        step_duration = max(1, int(transition_ms / transition_steps))

    for index, frame in enumerate(slide_frames):
        frames.append(frame)
        durations.append(slide_duration)

        if step_duration and index < len(slide_frames) - 1:
            next_frame = slide_frames[index + 1]
            for step in range(1, transition_steps + 1):
                alpha = step / (transition_steps + 1)
                frames.append(Image.blend(frame, next_frame, alpha))
                durations.append(step_duration)

    return frames, durations


def main() -> None:
    if not MANIFEST_PATH.exists():
        raise FileNotFoundError(f"Missing manifest: {MANIFEST_PATH}")

    with MANIFEST_PATH.open("r", encoding="utf-8") as handle:
        manifest = json.load(handle)

    config = {**DEFAULTS, **manifest}

    assets_dir = Path(config.get("assets_dir", MANIFEST_PATH.parent / "assets"))
    if not assets_dir.is_absolute():
        assets_dir = ROOT_DIR / assets_dir

    output_path = Path(config.get("output", MANIFEST_PATH.parent / "showcase.gif"))
    if not output_path.is_absolute():
        output_path = ROOT_DIR / output_path
    output_path.parent.mkdir(parents=True, exist_ok=True)

    slides = config.get("slides", [])
    if not slides:
        raise ValueError("Manifest contains no slides.")

    frames, durations = _build_frames(slides, assets_dir, config)

    frames[0].save(
        output_path,
        save_all=True,
        append_images=frames[1:],
        duration=durations,
        loop=0,
        optimize=True,
        disposal=2,
    )

    print(f"Wrote GIF: {output_path}")


if __name__ == "__main__":
    main()
