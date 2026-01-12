---
trigger: always_on
---

# Code Style

## Core Philosophy
- **Less code = better code** - Don't write code you don't need
- **Simple > clever** - Readable code beats "optimized" complexity
- **No premature abstraction** - Write it in one file first, refactor when actually needed
- **No useless comments** - Code should be self-explanatory. Only comment hacks, hard formulas, or non-obvious behavior

## TypeScript Rules
- Arrow functions over function declarations
- `const` over `let` (never use `var`)
- One-line conditions when possible: `if (!user) return`
- Return early to avoid nesting
- Template literals over string concatenation
- `async/await` over `.then().catch()`
- `.map()` over `.forEach()` for simple transformations
- No explicit types if TypeScript can infer them
- `type` over `interface` (always)
- Avoid object destructuring unless values are used multiple times
- Use `undefined` over `null` (only use `null` if API requires it)

## Project Structure
- No default exports
- No `index.ts` files that just re-export everything
- Organize by feature, not by type (no `components/`, `utils/`, `types/` folders)

## Naming Conventions
- `camelCase`: variables, functions, properties
- `PascalCase`: React components, types, Zod schemas, classes
- `SCREAMING_SNAKE_CASE`: global constants and config

## Performance
- **Don't optimize for 1% gains** - Readability > marginal speed improvements
- Profile before optimizing - measure actual impact
- Avoid complexity that makes code harder to understand

## Workflow
- **NEVER commit without explicit approval** - Show diff, wait for user confirmation
- Run `bun run fix` and `bun run tsc` before commiting
- `bun run dev`, `bun run build` and `bun run integration` all accept MODE env to know which setup they should use, available options are `comma`, `konik`, `asius` and `dev` (defaults to `asius`)
- database migrations are applied automatically but you have to create them in `api` folder by running `bun run db:generate`

## Infrastructure
- Server is deployed via Pulumi in `infra/index.ts`, run `dotenv pulumi up --yes` to deploy
- SSH into API server: `./infra/api-ssh.sh`
- SSH into SSH server: `./infra/ssh-ssh.sh`

## Testing
- Unit tests: `bun run test`
- Integration tests: `MODE=asius bun run integration` (tests against live asius API)
