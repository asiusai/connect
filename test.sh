set -e

bun biome ci
bun run tsc
bun test
