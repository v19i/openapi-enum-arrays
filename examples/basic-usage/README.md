# Basic Usage Example

This example demonstrates how to use the `@v19i/openapi-enum-arrays` plugin with the Petstore OpenAPI specification.

## Setup

1. Install dependencies:
```bash
npm install @hey-api/openapi-ts @v19i/openapi-enum-arrays
```

2. Run the code generation:
```bash
npx openapi-ts
```

3. Check the generated `src/client/enums.gen.ts` file for the enum arrays.

## Expected Output

The plugin will generate clean enum arrays with intelligent conflict resolution, such as:

```typescript
export const petStatuses = ['available', 'pending', 'sold'] as const
export const orderStatuses = ['placed', 'approved', 'delivered'] as const
```

Instead of numbered fallbacks and duplicates that you might see without the plugin.