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

    test('handles complex nested enum types', () => {
      const content = `
export type ApiEndpointData = {
    query?: {
        tags?: Array<'tag1' | 'tag2' | 'tag3' | 'tag4'>;
        sort?: 'name' | 'popularity';
        integration?: 'service1' | 'service2';
    };
};
      `.trim()

      const result = parser.parseEnumsFromTypeFile(content)

      expect(result).toHaveLength(3)

      // Check that we got arrays with the right values, names can vary with semantic naming
      expect(result.some((e) => e.values.join(',') === 'tag1,tag2,tag3,tag4')).toBe(true)
      expect(result.some((e) => e.values.join(',') === 'name,popularity')).toBe(true)
      expect(result.some((e) => e.values.join(',') === 'service1,service2')).toBe(true)
    })


    test('handles complex OpenAPI-style paths', () => {
      const content = `
export type GetV1UsersData = {
    query?: {
        role?: 'admin' | 'user' | 'guest';
        status?: 'active' | 'suspended';
    };
};
export type PostV1UsersData = {
    body: {
        role?: 'editor' | 'viewer';
        status?: 'pending' | 'approved';
    };
};
      `.trim()

      const result = parser.parseEnumsFromTypeFile(content)

      // Should extract meaningful context from nested paths
      expect(
        result.some((e) => e.values.join(',') === 'admin,user,guest' && e.originalTypePath.includes('GetV1UsersData')),
      ).toBe(true)

      expect(
        result.some((e) => e.values.join(',') === 'editor,viewer' && e.originalTypePath.includes('PostV1UsersData')),
      ).toBe(true)
    })
  })
})
