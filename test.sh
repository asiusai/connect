set -e

bun install

bun biome ci
[ -z "$SKIP_PLAYWRIGHT_INSTALL" ] && bun playwright install
# bun run tsc
# bun run test run
bun scripts/lines.ts
bun scripts/bundle-size.ts
