import { describe, expect, test } from 'vitest'
import { EnumParser } from '../src/parser'

describe('EnumParser', () => {
  const parser = new EnumParser()

  describe('parseEnumsFromTypeFile', () => {
    test('extracts standalone enum type definitions', () => {
      const content = `
export type Status = 'active' | 'inactive' | 'pending';
export type Color = 'red' | 'blue' | 'green';
export type NonEnum = string | number;
      `.trim()

      const result = parser.parseEnumsFromTypeFile(content)

      expect(result).toHaveLength(2)

      // Test that we extract the right values (names may vary with semantic logic)
      expect(result.some((e) => e.values.join(',') === 'active,inactive,pending')).toBe(true)
      expect(result.some((e) => e.values.join(',') === 'red,blue,green')).toBe(true)

      // Test that original paths are preserved
      expect(result.some((e) => e.originalTypePath === 'export type Status')).toBe(true)
      expect(result.some((e) => e.originalTypePath === 'export type Color')).toBe(true)
    })

    test('extracts enum values from inline property types', () => {
      const content = `
export type ApiData = {
  status: 'success' | 'error' | 'loading';
  priority?: 'high' | 'medium' | 'low';
  nonEnum: string;
};
      `.trim()

      const result = parser.parseEnumsFromTypeFile(content)

      expect(result).toHaveLength(2)

      // Test values and paths regardless of generated names
      expect(
        result.some((e) => e.values.join(',') === 'success,error,loading' && e.originalTypePath === 'ApiData.status'),
      ).toBe(true)

      expect(
        result.some((e) => e.values.join(',') === 'high,medium,low' && e.originalTypePath === 'ApiData.priority'),
      ).toBe(true)
    })

    test('handles Array<union> patterns', () => {
      const content = `
export type Config = {
  tags: Array<'tag1' | 'tag2' | 'tag3'>;
};
      `.trim()

      const result = parser.parseEnumsFromTypeFile(content)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        name: expect.any(String),
        values: ['tag1', 'tag2', 'tag3'],
        originalTypePath: 'Config.tags',
      })
    })

    test('ignores non-enum types', () => {
      const content = `
export type Mixed = string | number;
export type Union = boolean | null;
export type Interface = { name: string };
      `.trim()

      const result = parser.parseEnumsFromTypeFile(content)

      expect(result).toHaveLength(0)
    })

    test('handles different quote types in enum values', () => {
      const content = `
export type MixedQuotes = "double" | 'single' | \`backtick\`;
      `.trim()

      const result = parser.parseEnumsFromTypeFile(content)

      expect(result).toHaveLength(1)
      expect(result[0].values).toEqual(['double', 'single', 'backtick'])
    })

    test('handles various nesting levels and array patterns', () => {
      const content = `
export type NestedTestData = {
    // 1-level: direct property
    mode?: 'dev' | 'prod';
    
    // 2-level: nested query parameters  
    query?: {
        tags?: Array<'tag1' | 'tag2' | 'tag3'>;
        sort?: 'name' | 'popularity';
        status?: 'active' | 'inactive';
    };
    
    // 3-level: deeply nested
    config?: {
        database?: {
            type?: 'mysql' | 'postgres' | 'sqlite';
        };
    };
};
      `.trim()

      const result = parser.parseEnumsFromTypeFile(content)

      expect(result.length).toBe(5)
      
      // Test all nesting patterns in one comprehensive test
      expect(result.some((e) => e.values.join(',') === 'dev,prod' && e.originalTypePath === 'NestedTestData.mode')).toBe(true)
      expect(result.some((e) => e.values.join(',') === 'tag1,tag2,tag3' && e.originalTypePath === 'NestedTestData.query.tags')).toBe(true)
      expect(result.some((e) => e.values.join(',') === 'name,popularity' && e.originalTypePath === 'NestedTestData.query.sort')).toBe(true)
      expect(result.some((e) => e.values.join(',') === 'active,inactive' && e.originalTypePath === 'NestedTestData.query.status')).toBe(true)
      expect(result.some((e) => e.values.join(',') === 'mysql,postgres,sqlite' && e.originalTypePath === 'NestedTestData.config.database.type')).toBe(true)
    })

    test('handles real-world API structure with JSDoc comments', () => {
      const content = `
export type GetApiResourcesData = {
    body?: never;
    headers?: {
        'X-API-Version'?: string;
    };
    path: {
        resourceId: string;
    };
    query?: {
        /**
         * Sort results by field
         */
        sortBy?: 'name' | 'createdAt' | 'updatedAt';
        /**
         * The order of the sort.
         */
        sortOrder?: 'asc' | 'desc';
        /**
         * Filter by status
         */
        status?: 'active' | 'inactive' | 'pending';
    };
    url: '/api/resources/{resourceId}';
};
      `.trim()

      const result = parser.parseEnumsFromTypeFile(content)

      expect(result.length).toBe(3)
      
      expect(result.some((e) => e.values.join(',') === 'name,createdAt,updatedAt' && e.originalTypePath === 'GetApiResourcesData.query.sortBy')).toBe(true)
      expect(result.some((e) => e.values.join(',') === 'asc,desc' && e.originalTypePath === 'GetApiResourcesData.query.sortOrder')).toBe(true)
      expect(result.some((e) => e.values.join(',') === 'active,inactive,pending' && e.originalTypePath === 'GetApiResourcesData.query.status')).toBe(true)
    })

    test('handles JSDoc annotations like @deprecated', () => {
      const content = `
export type ApiWithAnnotations = {
    query?: {
        /**
         * Page index to return
         * @deprecated Use page instead
         */
        pageIndex?: number;
        /**
         * Sort order
         * @param order The direction
         */
        sortOrder?: 'asc' | 'desc';
        /**
         * Filter status
         * @example 'active'
         */
        status?: 'active' | 'inactive';
    };
};
      `.trim()

      const result = parser.parseEnumsFromTypeFile(content)

      expect(result.length).toBe(2)
      
      // Should extract enums even with JSDoc annotations present
      expect(result.some((e) => e.values.join(',') === 'asc,desc' && e.originalTypePath === 'ApiWithAnnotations.query.sortOrder')).toBe(true)
      expect(result.some((e) => e.values.join(',') === 'active,inactive' && e.originalTypePath === 'ApiWithAnnotations.query.status')).toBe(true)
    })

    test('handles URL templates with braces that should not be treated as nested objects', () => {
      const content = `
export type RealWorldApiData = {
    query?: {
        sortBy?: 'name' | 'date' | 'priority';
        sortOrder?: 'asc' | 'desc';
    };
    url: '/api/resources/{resourceId}/items/{itemId}';
};
      `.trim()

      const result = parser.parseEnumsFromTypeFile(content)

      expect(result.length).toBe(2)
      
      // Should extract enums from query even when URL contains braces
      expect(result.some((e) => e.values.join(',') === 'name,date,priority' && e.originalTypePath === 'RealWorldApiData.query.sortBy')).toBe(true)
      expect(result.some((e) => e.values.join(',') === 'asc,desc' && e.originalTypePath === 'RealWorldApiData.query.sortOrder')).toBe(true)
    })

  })
})
