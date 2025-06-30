import { SemanticNaming } from './semantic-naming'
import type { EnumInfo } from './types'

/**
 * Handles line processing, comments, and whitespace filtering
 */
class TypeScriptTokenizer {
  shouldSkipLine(line: string): boolean {
    if (!line) return true
    const commentPrefixes = ['//', '*', '/*', '/**']
    return commentPrefixes.some(prefix => line.startsWith(prefix))
  }

  cleanLine(line: string): string {
    return line.trim()
  }

  countOccurrences(text: string, character: string): number {
    return (text.match(new RegExp(`\\${character}`, 'g')) || []).length
  }
}

/**
 * Tracks nesting depth and builds context paths
 */
class ScopeTracker {
  private contextPath: string[] = []
  private nestingLevel = 0
  private isInTypeDefinition = false

  startTypeDefinition(typeName: string): void {
    this.contextPath = [typeName]
    this.nestingLevel = 0
    this.isInTypeDefinition = true
  }

  enterNestedObject(propertyName: string, braceCount: number): void {
    this.contextPath.push(propertyName)
    this.nestingLevel += braceCount
  }

  exitScope(braceCount: number): void {
    this.nestingLevel -= braceCount
    
    for (let i = 0; i < braceCount; i++) {
      if (this.contextPath.length > 1) {
        this.contextPath.pop()
      }
    }

    if (this.nestingLevel <= 0) {
      this.isInTypeDefinition = false
      this.contextPath = []
      this.nestingLevel = 0
    }
  }

  adjustNestingLevel(braceCount: number): void {
    this.nestingLevel += braceCount
  }

  getCurrentPath(): string[] {
    return [...this.contextPath]
  }

  isParsingType(): boolean {
    return this.isInTypeDefinition
  }

  hasContext(): boolean {
    return this.contextPath.length > 0
  }
}

/**
 * Identifies different property patterns in TypeScript code
 */
class PropertyDetector {
  extractTypeDefinitionName(line: string): string | null {
    const typeDefinitionMatch = line.match(/^export type\s+(\w+)\s*=\s*\{?/)
    return typeDefinitionMatch ? typeDefinitionMatch[1] : null
  }

  extractNestedObjectProperty(line: string): string | null {
    const nestedObjectMatch = line.match(/(\w+)\??\s*:\s*\{/)
    return nestedObjectMatch ? nestedObjectMatch[1] : null
  }

  extractUnionTypeProperty(line: string): { propertyName: string; typeDefinition: string } | null {
    const unionPropertyMatch = line.match(/(\w+)\??\s*:\s*(.+?)(?:[;,]|$)/)
    if (unionPropertyMatch) {
      return {
        propertyName: unionPropertyMatch[1],
        typeDefinition: unionPropertyMatch[2].trim()
      }
    }
    return null
  }

  hasObjectOpeningBrace(line: string): boolean {
    const colonIndex = line.indexOf(':')
    if (colonIndex === -1) return false
    
    const afterColon = line.substring(colonIndex + 1)
    const braceIndex = afterColon.indexOf('{')
    const firstQuoteIndex = Math.min(
      afterColon.indexOf("'") === -1 ? Infinity : afterColon.indexOf("'"),
      afterColon.indexOf('"') === -1 ? Infinity : afterColon.indexOf('"'),
      afterColon.indexOf('`') === -1 ? Infinity : afterColon.indexOf('`')
    )
    
    return braceIndex !== -1 && braceIndex < firstQuoteIndex
  }
}

/**
 * Extracts union type values from type definitions
 */
class UnionExtractor {
  extractEnumValues(typeDefinition: string): string[] {
    const values: Set<string> = new Set()

    const arrayMatch = typeDefinition.match(/Array<([^>]+)>/)
    if (arrayMatch) {
      const innerType = arrayMatch[1]
      const arrayValues = this.extractEnumValues(innerType)
      arrayValues.forEach((v) => values.add(v))
      return Array.from(values)
    }

    if (typeDefinition.includes('|')) {
      const parts = typeDefinition.split('|').map((part) => part.trim())
      for (const part of parts) {
        const valueMatch = part.match(/^(['"`])(.+?)\1$/)
        if (valueMatch) {
          values.add(valueMatch[2])
        }
      }
    }

    return Array.from(values)
  }
}

/**
 * Extracts enum information from TypeScript type definitions
 */
export class EnumParser {
  private readonly unionTypeRegex = /(['"`])[^'"`]*\1(\s*\|\s*(['"`])[^'"`]*\3)+/g
  private readonly typeDefRegex = /^export type\s+(\w+)\s*=\s*(.+);?$/gm
  private readonly propertyTypeRegex = /(\w+)\??\s*:\s*([^;,}]+)/g
  private readonly semanticNaming = new SemanticNaming()
  
  // Component instances
  private readonly tokenizer = new TypeScriptTokenizer()
  private readonly propertyDetector = new PropertyDetector()
  private readonly unionExtractor = new UnionExtractor()

  parseEnumsFromTypeFile(content: string): EnumInfo[] {
    const enums: EnumInfo[] = []

    // Parse standalone type definitions
    enums.push(...this.parseStandaloneTypes(content))

    // Parse inline property types within interfaces/types
    enums.push(...this.extractEnumsFromNestedTypeProperties(content))

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

  private extractEnumsFromNestedTypeProperties(content: string): EnumInfo[] {
    const foundEnums: EnumInfo[] = []
    const sourceLines = content.split('\n')
    const scopeTracker = new ScopeTracker()

    for (const rawLine of sourceLines) {
      const cleanLine = this.tokenizer.cleanLine(rawLine)

      if (this.tokenizer.shouldSkipLine(cleanLine)) {
        continue
      }

      const typeDefinitionName = this.propertyDetector.extractTypeDefinitionName(cleanLine)
      if (typeDefinitionName) {
        scopeTracker.startTypeDefinition(typeDefinitionName)
        if (cleanLine.includes('{')) {
          scopeTracker.adjustNestingLevel(1)
        }
        continue
      }

      if (!scopeTracker.isParsingType()) {
        continue
      }

      const openingBraceCount = this.tokenizer.countOccurrences(cleanLine, '{')
      const closingBraceCount = this.tokenizer.countOccurrences(cleanLine, '}')
      
      const nestedObjectPropertyName = this.propertyDetector.extractNestedObjectProperty(cleanLine)
      if (nestedObjectPropertyName) {
        scopeTracker.enterNestedObject(nestedObjectPropertyName, openingBraceCount)
        continue
      }

      const unionTypeProperty = this.propertyDetector.extractUnionTypeProperty(cleanLine)
      if (unionTypeProperty && scopeTracker.hasContext()) {
        const { propertyName, typeDefinition } = unionTypeProperty
        
        const hasObjectBrace = this.propertyDetector.hasObjectOpeningBrace(cleanLine)
        if (hasObjectBrace) {
          scopeTracker.enterNestedObject(propertyName, openingBraceCount)
          continue
        }

        const cleanTypeDefinition = typeDefinition.replace(/[;,]$/, '').trim()
        const enumValues = this.unionExtractor.extractEnumValues(cleanTypeDefinition)

        if (enumValues.length > 0) {
          const currentPath = scopeTracker.getCurrentPath()
          const fullPropertyPath = [...currentPath, propertyName].join('.')
          const enumName = this.semanticNaming.generateName(enumValues, fullPropertyPath)

          foundEnums.push({
            name: enumName,
            values: enumValues,
            originalTypePath: fullPropertyPath,
          })
        }
      }

      if (closingBraceCount > 0) {
        scopeTracker.exitScope(closingBraceCount)
      }

      if (openingBraceCount > 0 && !unionTypeProperty && !nestedObjectPropertyName && !typeDefinitionName) {
        scopeTracker.adjustNestingLevel(openingBraceCount)
      }
    }

    return foundEnums
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
