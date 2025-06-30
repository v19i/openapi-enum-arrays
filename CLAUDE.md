# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a @hey-api/openapi-ts plugin that generates typed enum arrays with intelligent conflict resolution. The plugin eliminates numbered fallbacks (like `userStatus2Values`) and reduces generated code through smart merging of duplicate enums.

## Development Environment Setup

Make sure you have Node.js 22+ (current LTS). You can use `nvm` or `fnm` to manage Node.js versions.

```bash
# Install dependencies
npm install

# Build the plugin
npm run build

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Formatting and Linting
npm run lint           # Run linter
npm run format         # Format code
npm run typecheck      # Type checking only
```

## Technology Stack

- **Runtime**: Node.js 22+ (LTS)
- **Language**: TypeScript 5.x
- **Testing**: Vitest 3.x
- **Linting**: ESLint 9.x with TypeScript ESLint 8.x
- **Formatting**: Prettier 3.x
- **Target Platform**: @hey-api/openapi-ts plugin ecosystem

## Project Structure

```
src/
├── index.ts           # Main plugin export
├── plugin.ts          # Plugin implementation for @hey-api
├── generator.ts       # Core enum array generation logic
├── semantic-naming.ts # Generic naming strategy
├── parser.ts          # OpenAPI parsing utilities
├── config.ts          # Configuration types
└── types.ts           # Type definitions

tests/
├── generator.test.ts  # Core generation logic tests
└── parser.test.ts     # Parser utility tests

examples/
└── basic-usage/       # Working integration examples
```

## Software Design Choices

- **Intelligent Conflict Resolution**: Use a two-pass algorithm - first handle name conflicts with context-aware naming, then merge identical value arrays
- **Generic Naming Strategy**: Extract context from OpenAPI paths without domain-specific assumptions
- **TDD Approach**: Write failing tests first, then implement features to prevent regressions
- **Self-Documenting Code**: Use underscore-prefixed variables (`_unused`) for intentionally unused destructured values rather than removing them completely
- **Type Safety**: Create proper types for accessing private methods in tests instead of using `any`
- **Backwards Compatibility**: Consider the cost of breaking changes in the plugin API

## Naming Conventions

- **File naming**: Use kebab-case for file names (e.g., `semantic-naming.ts`, `generator.test.ts`)
- **Variable naming**: Use camelCase for variables and functions
- **Type naming**: Use PascalCase for types and interfaces
- **Unused variables**: Use underscore prefix (`_fullMatch`, `_method`) to indicate intentionally unused but available data

## Coding Style

- **Comments and Documentation**
  - **Avoid low-value comments** that simply restate what the code does
  - Code should be **self-documenting** through descriptive variable and method names
  - Only add comments when they provide genuine insight or context that isn't obvious from the code
  - Remove redundant comments like "Handle closing braces" or "Check for type definition"

- **Naming and Structure**
  - Use **descriptive names** for variables, methods, and classes
  - Prefer composition and single-responsibility principles
  - Focus on making code readable without relying on comments

- **Business References**
  - Keep code **generic and reusable** - avoid references to specific companies or APIs
  - Use generic examples in tests (e.g., "resource", "company", "service" instead of specific names)
  - Ensure code is suitable for open-source contribution

- **Import Style**: Use separate `import` and `import type` declarations

  ```typescript
  // Good ✅
  import { CodeGenerator } from "./generator";
  import type { EnumInfo } from "./types";

  // Bad ❌
  import { type EnumInfo, CodeGenerator } from "./module";
  ```

- **Destructuring**: Keep unused variables with underscore prefix for documentation

  ```typescript
  // Good ✅ - shows complete structure
  const [_fullMatch, _method, _resource, section, _field] = openApiMatch;

  // Bad ❌ - hides available data
  const [, , , section] = openApiMatch;
  ```

- **Early Return**: Prefer return/escape early to minimize nesting

## Testing Philosophy

- **Test user behavior, not implementation** - Focus on what the plugin generates, not how it generates it
- **Use descriptive test names** - Follow pattern: "[action] when [scenario] then [expected outcome]"
- **TDD for complex features** - Write failing tests first, especially for conflict resolution
- **Avoid brittle tests** - Don't test exact array lengths or implementation details
- **Mock external dependencies** properly at module level
- **Clear separation of concerns** - Don't test generator logic in parser tests or vice versa
- **Remove useless tests** - If a test doesn't add value or tests the wrong component, remove it entirely
- **Test the right layer** - Parser tests should test parsing, generator tests should test generation logic

### Testing Private Methods

When testing private methods, create proper types instead of using `any`:

```typescript
// Good ✅
type CodeGeneratorWithPrivates = CodeGenerator & {
  extractContextForConflict(path: string): string | null;
};
const generator = new CodeGenerator() as CodeGeneratorWithPrivates;

// Bad ❌
const generator = new CodeGenerator() as any;
```

## Plugin Architecture

This plugin follows the @hey-api/openapi-ts plugin pattern:

1. **Plugin Registration**: Export plugin function that integrates with @hey-api
2. **OpenAPI Parsing**: Extract enum information from OpenAPI types
3. **Conflict Resolution**: Apply intelligent naming and merging strategies
4. **Code Generation**: Output clean TypeScript enum arrays

## Key Algorithms

### Two-Pass Deduplication

1. **Pass 1**: Handle name conflicts (same name, different values) with contextual naming
2. **Pass 2**: Merge enums with identical values to eliminate redundancy

### Context Extraction

Extract meaningful context from OpenAPI paths:

- `GetV1ResourcesData.query.type` → `queryTypes`
- `PostV1ResourcesData.body.type` → `requestTypes`
- `ResponseData.type` → `responseTypes`

## Workflow Process

- Use semantic versioning starting from 0.1.0 for initial releases
- Breaking changes are allowed in 0.x versions
- All changes should be tested with real OpenAPI specifications
- Run full test suite before releasing

## Development Commands

```bash
# Development workflow
npm run dev            # Build in watch mode
npm run clean          # Clean build artifacts

# Quality assurance
npm run typecheck      # TypeScript checking
npm run lint           # Code linting
npm run format         # Code formatting

# Release preparation
npm run prepublishOnly # Runs build + test before publishing
```

## Important Notes

- This plugin is designed to work with **any OpenAPI specification**, not specific to any domain
- Focus on **generic patterns** rather than hardcoded assumptions
- **Maintain compatibility** with @hey-api/openapi-ts plugin API
- **Version dependencies carefully** - core peer dependency should be conservative, dev dependencies can be current
