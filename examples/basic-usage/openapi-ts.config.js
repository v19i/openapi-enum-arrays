import { defineConfig } from '@hey-api/openapi-ts'
import { enumArraysPlugin } from '@v19i/openapi-enum-arrays'

export default defineConfig({
  client: '@hey-api/client-axios',
  input: 'https://petstore3.swagger.io/api/v3/openapi.json',
  output: 'src/client',
  plugins: [
    enumArraysPlugin({
      arrayPrefix: '', // Optional prefix for generated arrays
    }),
  ],
})