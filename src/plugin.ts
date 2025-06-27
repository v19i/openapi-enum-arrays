import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Plugin } from '@hey-api/openapi-ts'
import { CodeGenerator } from './generator'
import { EnumParser } from './parser'
import type { Config } from './types'

export const handler: Plugin.Handler<Config> = ({ context, plugin }) => {
  const { includePatterns, excludePatterns, arrayPrefix = '', debug = false } = plugin

  // Check if we can access the output directory
  if (!context?.config?.output?.path) {
    console.warn('Plugin: output path not available, skipping enum generation')
    return
  }

  // Read the generated types file
  const typesFilePath = join(context.config.output.path, 'types.gen.ts')

  if (!existsSync(typesFilePath)) {
    console.warn(`Plugin: types file not found at ${typesFilePath}`)
    return
  }

  try {
    const typesContent = readFileSync(typesFilePath, 'utf-8')

    // Parse enums from the types file
    const parser = new EnumParser()
    let enums = parser.parseEnumsFromTypeFile(typesContent)

    if (debug) {
      console.log(`🐛 Plugin: Found ${enums.length} enum types before filtering:`)
      enums.forEach((enumInfo, index) => {
        console.log(
          `  ${index + 1}. ${enumInfo.name} (${enumInfo.values.length} values) - ${enumInfo.originalTypePath}`,
        )
      })
    }

    // Apply filters
    const originalCount = enums.length
    if (includePatterns) {
      enums = enums.filter((enumInfo) => includePatterns.some((pattern) => enumInfo.name.includes(pattern)))
      if (debug) {
        console.log(`🐛 Plugin: After include patterns: ${enums.length}/${originalCount} enums`)
      }
    }

    if (excludePatterns) {
      const beforeExclude = enums.length
      enums = enums.filter((enumInfo) => !excludePatterns.some((pattern) => enumInfo.name.includes(pattern)))
      if (debug) {
        console.log(`🐛 Plugin: After exclude patterns: ${enums.length}/${beforeExclude} enums`)
      }
    }

    // Generate the enum arrays file
    const generator = new CodeGenerator()
    const generatedCode = generator.generateEnumArrays(enums, { arrayPrefix })

    // Write the output file
    const outputPath = join(context.config.output.path, `${plugin.output}.ts`)
    writeFileSync(outputPath, generatedCode)

    const message = `Plugin: Generated ${enums.length} enum arrays at ${outputPath}`
    console.log(message)

    if (debug) {
      console.log('🐛 Plugin: Generated enum names:')
      for (const enumInfo of enums) {
        console.log(`  - ${enumInfo.name} = [${enumInfo.values.map((v) => `'${v}'`).join(', ')}] as const`)
      }
    }
  } catch (error) {
    console.error('Plugin: Error generating enum arrays:', error)
    if (debug) {
      console.error('🐛 Plugin: Stack trace:', error)
    }
  }
}
