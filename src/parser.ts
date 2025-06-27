import { SemanticNaming } from './semantic-naming'
import type { EnumInfo } from './types'

/**
 * Extracts enum information from TypeScript type definitions
 */
export class EnumParser {
  private readonly unionTypeRegex = /(['"`])[^'"`]*\1(\s*\|\s*(['"`])[^'"`]*\3)+/g
  private readonly typeDefRegex = /^export type\s+(\w+)\s*=\s*(.+);?$/gm
  private readonly propertyTypeRegex = /(\w+)\??\s*:\s*([^;,}]+)/g
  private readonly semanticNaming = new SemanticNaming()

  parseEnumsFromTypeFile(content: string): EnumInfo[] {
    const enums: EnumInfo[] = []

    // Parse standalone type definitions
    enums.push(...this.parseStandaloneTypes(content))

    // Parse inline property types within interfaces/types
    enums.push(...this.parseInlinePropertyTypes(content))

    return enums
  }

  private parseStandaloneTypes(content: string): EnumInfo[] {
    const enums: EnumInfo[] = []
    let match: RegExpExecArray | null = this.typeDefRegex.exec(content)

    while (match !== null) {
      const [, typeName, typeDefinition] = match
      // Clean up the type definition by removing trailing semicolon
      const cleanTypeDefinition = typeDefinition.replace(/;$/, '').trim()
      const enumValues = this.extractEnumValues(cleanTypeDefinition)

      if (enumValues.length > 0) {
        // Use semantic naming for standalone types too
        const originalTypePath = `export type ${typeName}`
        const semanticName = this.semanticNaming.generateName(enumValues, originalTypePath)

        enums.push({
          name: semanticName,
          values: enumValues,
          originalTypePath,
        })
      }

      match = this.typeDefRegex.exec(content)
    }

    return enums
  }

  private parseInlinePropertyTypes(content: string): EnumInfo[] {
    const enums: EnumInfo[] = []
    const lines = content.split('\n')
    let currentTypeName: string | null = null

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      // Check for type definition start
      const typeDefMatch = line.match(/^export type\s+(\w+)\s*=/)
      if (typeDefMatch) {
        currentTypeName = typeDefMatch[1]
        continue
      }

      // Look for property definitions with union types
      const propertyMatch = line.match(/(\w+)\??\s*:\s*(.+)/)
      if (propertyMatch && currentTypeName) {
        const [, propertyName, typeDefinition] = propertyMatch
        // Clean up the type definition by removing trailing semicolon and commas
        const cleanTypeDefinition = typeDefinition.replace(/[;,]$/, '').trim()
        const enumValues = this.extractEnumValues(cleanTypeDefinition)

        if (enumValues.length > 0) {
          // Generate semantic name based on enum content and context
          const originalTypePath = `${currentTypeName}.${propertyName}`
          const typeName = this.semanticNaming.generateName(enumValues, originalTypePath)

          enums.push({
            name: typeName,
            values: enumValues,
            originalTypePath,
          })
        }
      }

      // Reset context when we reach end of type definition
      if (line === '}' || line === '};') {
        currentTypeName = null
      }
    }

    return enums
  }

  private extractEnumValues(typeDefinition: string): string[] {
    const values: Set<string> = new Set()

    // Handle Array<'value1' | 'value2'> patterns first
    const arrayMatch = typeDefinition.match(/Array<([^>]+)>/)
    if (arrayMatch) {
      const innerType = arrayMatch[1]
      const arrayValues = this.extractEnumValues(innerType)
      arrayValues.forEach((v) => values.add(v))
      return Array.from(values)
    }

    // Handle union types with string literals
    if (typeDefinition.includes('|')) {
      const parts = typeDefinition.split('|').map((part) => part.trim())
      for (const part of parts) {
        // Match single quotes, double quotes, or backticks
        const valueMatch = part.match(/^(['"`])(.+?)\1$/)
        if (valueMatch) {
          values.add(valueMatch[2])
        }
      }
    }

    return Array.from(values)
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }
}
