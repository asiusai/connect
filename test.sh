set -e

bun biome ci
bun run tsc
bun run test
