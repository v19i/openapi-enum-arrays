export interface Config {
  /**
   * Plugin name. Must be unique.
   */
  name: "enum-arrays";
  /**
   * Output file name for the generated enum arrays (without extension)
   * @default 'enums'
   */
  output?: string;

  /**
   * Whether to include only specific enum patterns
   * @default undefined (includes all enums)
   */
  includePatterns?: string[];

  /**
   * Whether to exclude specific enum patterns
   * @default undefined (excludes none)
   */
  excludePatterns?: string[];

  /**
   * Prefix for generated array constants
   * @default ''
   */
  arrayPrefix?: string;

  /**
   * Whether to generate TypeScript enum objects along with arrays
   * @default false
   */
  generateEnumObjects?: boolean;

  /**
   * Enable debug logging for enum generation
   * @default false
   */
  debug?: boolean;
}

export interface EnumInfo {
  name: string;
  values: string[];
  originalTypePath: string;
}
