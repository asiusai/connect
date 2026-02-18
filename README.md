# Asius

Comma Connect alternative with high-res video, file management, remote streaming, and more.

Try our connect at https://connect.asius.ai

## Components

- **[Connect](https://asius.ai/connect)** - Web frontend with better UX, works with stock openpilot
- **[AsiusPilot](https://asius.ai/asiuspilot)** - Openpilot with remote streaming, joystick, params editing and bluetooth.
- **[API](https://asius.ai/api)** - Cloud backend with 1TB storage and no device blocking

## Development

### Install bun

```bash
curl -fsSL https://bun.sh/install | bash
```

### Clone, install and run

```bash
git clone https://github.com/asiusai/connect.git
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
bun run integration  # Integration tests (PROVIDER=asius)
```

Set `PROVIDER` env to `comma`, `konik` or `asius` for different configurations.
