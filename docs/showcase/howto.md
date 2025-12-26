# Showcase GIF How-To

This folder contains the assets and tooling for the README feature showcase GIF.

## What lives here

- `assets/` — source screenshots (PNG/JPG) used in the carousel.
- `manifest.json` — slide order + captions + rendering settings.
- `render_showcase.py` — renderer that builds the GIF from the manifest.
- `showcase.gif` — the generated output used in `README.md`.
- `banner.jpg` — README banner image (optional).

## Requirements

- Python 3.10+
- Pillow (already in `pyproject.toml`)

Run the renderer with:

```bash
uv run python docs/showcase/render_showcase.py
```

## Adding a slide

1. Drop a new screenshot into `docs/showcase/assets/`.
2. Add a slide entry in `docs/showcase/manifest.json`:

```json
{
  "image": "your-screenshot.png",
  "title": "Short title",
  "subtitle": "One sentence of supporting copy."
}
```

3. Rebuild the GIF:

```bash
uv run python docs/showcase/render_showcase.py
```

## Removing a slide

- Delete the slide entry from `manifest.json`.
- Optionally remove the image from `assets/`.
- Rebuild the GIF.

## Editing copy or order

- Update `title` and `subtitle` fields in `manifest.json`.
- Reorder slide objects to change the carousel sequence.
- Rebuild the GIF.

## Common settings (manifest.json)

- `width` — output width in pixels.
- `caption_height` — height of the caption band below each screenshot.
- `slide_duration_ms` — time each slide stays on screen.
- `transition_ms` — total time for each crossfade transition.
- `transition_steps` — number of blended frames per transition.
- `title_size`, `subtitle_size` — font sizes.
- `title_color`, `subtitle_color` — hex colors.
- `background`, `caption_background` — hex colors.

Notes:
- Smaller `width` and fewer `transition_steps` reduce GIF size.
- If a slide looks cramped, increase `caption_height` or shorten copy.

## Troubleshooting

- Missing image errors mean the filename in `manifest.json` does not match
  what is in `assets/`.
- If fonts look off, the renderer will fall back to a default system font.

