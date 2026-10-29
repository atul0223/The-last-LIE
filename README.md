# THE LAST LIE: Infinite

Monorepo for _THE LAST LIE: Infinite_ — a mobile mystery game with deterministic case validation, server-authoritative scoring, and procedural generation.

## Architecture & Layout

```text
/
├── apps/               # Client applications (apps/mobile in WP-07)
├── packages/
│   ├── case-engine/    # Deterministic logic core, validator, generator, scoring
│   ├── content/        # Authored cases, templates, pools, conspiracy graph
│   └── api-contract/   # Shared API schemas and contract definitions
├── tools/
│   └── cli/            # Authoring CLI pipeline (validate, generate, render, publish)
├── docs/               # System documentation and style guides
├── SYSTEM_DESIGN.md    # Source of truth for architecture and contracts
└── PLAN.md             # Implementation work packages and acceptance criteria
```

## Prerequisites

- **Node.js**: `20.x` (see `.nvmrc`)
- **pnpm**: `9.x`

## Commands

### Dependency Management

```bash
# Install workspace dependencies
pnpm install
```

### Type Checking

```bash
# Run TypeScript type check across all packages
pnpm -r typecheck

# Or run type check from root
pnpm typecheck
```

### Linting & Formatting

```bash
# Lint all packages using ESLint
pnpm -r lint

# Or run lint from root
pnpm lint

# Format code with Prettier
pnpm format

# Check formatting without writing
pnpm format:check
```

### Testing & Coverage

```bash
# Run test suite across workspace
pnpm -r test

# Or run test suite via Vitest from root
pnpm test

# Run tests with v8 coverage report
pnpm test:coverage
```

## Agent Rules & Guidelines

All agents contributing to this codebase must adhere strictly to:

- [`AGENTS.md`](./AGENTS.md): Standing rules (scope, determinism, secrets, answer redaction, test coverage).
- [`SYSTEM_DESIGN.md`](./SYSTEM_DESIGN.md): Architecture, data contracts, and logic specifications.
- [`PLAN.md`](./PLAN.md): Work package boundaries and acceptance criteria.
