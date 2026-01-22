# Asius

Comma Connect alternative with high-res video, file management, remote streaming, and more.

Try it at https://comma.asius.ai

## Components

- **[Connect](https://asius.ai/connect)** - Web frontend with better UX, works with stock openpilot
- **[Forks](https://asius.ai/forks)** - Enhanced openpilot/sunnypilot with remote streaming and joystick
- **[API](https://asius.ai/api)** - Cloud backend with 1TB storage and no device blocking

## Development

### Install bun

```bash
curl -fsSL https://bun.sh/install | bash
```

### Clone, install and run

```bash
git clone https://github.com/asiusai/asiusai.git
cd asiusai
bun install
bun dev
```

### Commands

```bash
bun run dev          # Start dev server
bun run build        # Build for production
bun run fix          # Lint and format
bun run tsc          # Type check
bun run test         # Unit tests
bun run integration  # Integration tests (MODE=asius)
```

Set `MODE` env to `comma`, `konik`, `asius`, or `dev` for different configurations.
