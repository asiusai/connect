set -e

bun install --frozen-lockfile
bun biome ci
[ -z "$SKIP_PLAYWRIGHT_INSTALL" ] && bun playwright install
# bun run tsc # capnp-ts package fails 
bun run test run
bun cli/lines.ts
bun cli/bundle-size.ts
