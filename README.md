<p align="center">
  <img src="docs/showcase/banner.jpg" alt="Wizengamot banner" width="100%" />
</p>

<h1 align="center">Wizengamot</h1>
<p align="center"><strong>Your AI sounding board.</strong></p>
<p align="center">
  Debate ideas with a council of models, synthesize research, track competitors, visualize concepts, and produce podcasts.
</p>

> [!WARNING]
> **This project is under active development.** Features may change, break, or be incomplete. Use at your own risk and expect rough edges.

<p align="center">
  <img src="docs/showcase/showcase.gif" alt="Wizengamot feature showcase" width="900" />
</p>
<p align="center"><em>Generated from docs/showcase/manifest.json via uv run python docs/showcase/render_showcase.py.</em></p>

## Features

- Multi-model Council with 3-stage deliberation and chairman synthesis
- Synthesizer turns long sources into structured, atomic concept cards
- Monitor tracks competitors and topics with scheduled question sets
- Visualiser converts conversations or URLs into diagrams (whiteboards, cheatsheets, system maps)
- Podcast mode produces narrated summaries from internal or external sources
- Inline annotations, context stack, and follow-up threads keep insights in flow
- Keyboard-first UX, dark mode, and configurable prompts/models via OpenRouter

See [FEATURES.md](docs/FEATURES.md) for the full changelog.

## Quickstart

### Local (backend + frontend)

Prereqs: Python 3.10+, Node.js 18+, uv, and ffmpeg.

1. Clone the repo:
   ```bash
   git clone https://github.com/JayFarei/wizengamot.git
   cd wizengamot
   ```

2. Install dependencies:
   ```bash
   uv sync
   cd frontend && npm install && cd ..
   ```

3. Configure your API key:
   ```bash
   cp .env.example .env
   # Edit .env and add your OpenRouter API key
   ```

4. Run the app:
   ```bash
   ./start.sh
   ```

5. Open http://localhost:5173

Optional: run `./scripts/check-deps.sh` to validate your system.

### Docker

```bash
docker compose up -d
```

Open http://localhost:8080

Configure the API key via `.env` or the Settings UI after launch.

## Contributing

- Fork the repo and create a feature branch.
- Run `./scripts/check-deps.sh` and make sure tests pass:
  - `uv run pytest tests/`
  - `uv run pytest backend/tests/`
  - `cd frontend && npm run lint`
- For UI changes, include screenshots or clips in the PR.

## Thanks

Inspired by Andrej Karpathy's [llm-council](https://github.com/karpathy/llm-council).

## License

MIT License - see [LICENSE](LICENSE)
