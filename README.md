# @v19i/openapi-enum-arrays

A @hey-api/openapi-ts plugin that generates typed enum arrays with intelligent conflict resolution.

## Features

- 🎯 **Zero numbered fallbacks** - No more `accountType2Values`, `accountType3Values`
- 🧠 **Intelligent merging** - Automatically merges duplicate enum arrays
- 🔄 **Context-aware naming** - Generates meaningful names like `queryTypes`, `requestTypes`
- 📦 **Universal compatibility** - Works with any OpenAPI specification
- 🚀 **Significant reduction** - Up to 78% reduction in generated code

## Installation

```bash
npm install @v19i/openapi-enum-arrays
```

## Usage

Add the plugin to your `openapi-ts.config.js`:

```javascript
import { defineConfig } from '@hey-api/openapi-ts'
import { enumArraysPlugin } from '@v19i/openapi-enum-arrays'

export default defineConfig({
  client: '@hey-api/client-axios',
  input: 'path/to/openapi.json',
  output: 'src/client',
  plugins: [
    enumArraysPlugin({
      arrayPrefix: '', // Optional prefix for generated arrays
    }),
  ],
})
```

## Generated Output

### Before
```typescript
// Multiple duplicate enums with numbered fallbacks
export const getUsersResponseTypes = ['json', 'xml', 'csv'] as const
export const postUsersDataBodyTypes = ['json', 'xml', 'csv'] as const
export const putUsersDataBodyTypes = ['json', 'xml', 'csv'] as const
export const userStatus2Values = ['active', 'inactive', 'pending'] as const
export const userStatus3Values = ['active', 'inactive', 'pending'] as const
export const userStatus4Values = ['active', 'inactive', 'pending'] as const
// ... 50+ more arrays
```

### After
```typescript
// Clean, merged enums with contextual naming
export const responseTypes = ['json', 'xml', 'csv'] as const
export const userStatuses = ['active', 'inactive', 'pending'] as const
export const queryFormats = ['compact', 'detailed', 'summary'] as const
export const requestMethods = ['GET', 'POST', 'PUT', 'DELETE'] as const
// ... only 12 arrays total
```

## Configuration

```typescript
interface PluginOptions {
  arrayPrefix?: string // Prefix for generated array names (default: '')
}
```

## How It Works

1. **Name Conflict Resolution**: Handles enums with same names but different values using OpenAPI path context
2. **Value-Based Merging**: Merges enums with identical values to eliminate redundancy  
3. **Context-Aware Naming**: Extracts meaningful context from OpenAPI paths (`query`, `request`, `response`)
4. **Intelligent Fallbacks**: Uses full path names when context extraction fails

## Examples

See the `examples/` directory for working implementations with different OpenAPI specifications.

## Contributing

Contributions welcome! Please read our contributing guidelines and submit pull requests to our GitHub repository.

## License

MIT © v19i