set -e

bun biome ci
bun run tsc
bun run build
bun run test
