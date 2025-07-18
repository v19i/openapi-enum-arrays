import { describe, expect, test } from "vitest";
import { CodeGenerator } from "../src/generator";
import type { EnumInfo } from "../src/types";

// Type for accessing private methods in tests
type CodeGeneratorWithPrivates = CodeGenerator & {
  extractContextForConflict(path: string): string | null;
};

describe("CodeGenerator", () => {
  const generator = new CodeGenerator();

  describe("generateEnumArrays", () => {
    test("generates array constants for enum types", () => {
      const enums: EnumInfo[] = [
        {
          name: "Status",
          values: ["active", "inactive", "pending"],
          originalTypePath: "export type Status",
        },
        {
          name: "Color",
          values: ["red", "blue", "green"],
          originalTypePath: "export type Color",
        },
      ];

      const result = generator.generateEnumArrays(enums);

      expect(result).toContain(
        `export const statusValues = ['active', 'inactive', 'pending'] as const`,
      );
      expect(result).toContain(
        `export const colorValues = ['blue', 'green', 'red'] as const`,
      );
    });

    test("converts type names to proper semantic array names", () => {
      const enums: EnumInfo[] = [
        {
          name: "OrderStatus",
          values: ["PENDING", "COMPLETED"],
          originalTypePath: "export type OrderStatus",
        },
      ];

      const result = generator.generateEnumArrays(enums);

      expect(result).toContain(
        `export const orderStatuses = ['COMPLETED', 'PENDING'] as const`,
      );
    });

    test("handles custom array prefix", () => {
      const enums: EnumInfo[] = [
        {
          name: "Status",
          values: ["active", "inactive"],
          originalTypePath: "export type Status",
        },
      ];

      const result = generator.generateEnumArrays(enums, {
        arrayPrefix: "ENUM_",
      });

      expect(result).toContain(
        `export const ENUM_statusValues = ['active', 'inactive'] as const`,
      );
    });

    test("generates header comment with generation info", () => {
      const enums: EnumInfo[] = [];

      const result = generator.generateEnumArrays(enums);

      expect(result).toContain(
        "// This file is auto-generated by openapi-enum-arrays",
      );
    });

    test("keeps distinct enums separate even with same semantic name", () => {
      const enums: EnumInfo[] = [
        {
          name: "userType",
          values: ["admin", "editor", "viewer"],
          originalTypePath: "query.type",
        },
        {
          name: "userType",
          values: ["basic", "premium", "enterprise"],
          originalTypePath: "account.type",
        },
      ];

      const result = generator.generateEnumArrays(enums);

      // Should generate two separate arrays with conflict resolution
      expect(result).toContain(
        `export const queryTypes = ['admin', 'editor', 'viewer'] as const`,
      );
      expect(result).toContain(
        `export const userTypes = ['basic', 'enterprise', 'premium'] as const`,
      );

      // Should have two separate arrays, not merged
      const typeArrays = result.match(/Types = \[/g);
      expect(typeArrays).toHaveLength(2);
    });

    test("merges truly identical enums", () => {
      const enums: EnumInfo[] = [
        {
          name: "Status",
          values: ["active", "inactive"],
          originalTypePath: "export type Status",
        },
        {
          name: "Status",
          values: ["active", "inactive"],
          originalTypePath: "property: status",
        },
      ];

      const result = generator.generateEnumArrays(enums);

      // Should only have one array for truly identical enums
      const statusMatches = result.match(/export const statusValues/g);
      expect(statusMatches).toHaveLength(1);
      expect(result).toContain(`['active', 'inactive']`);
    });

    test("merges identical arrays with same values regardless of context", () => {
      const enums: EnumInfo[] = [
        {
          name: "userRole",
          values: ["admin", "user", "guest"],
          originalTypePath: "ResponseData.userRole",
        },
        {
          name: "userRole",
          values: ["admin", "user", "guest"],
          originalTypePath: "RequestData.userRole",
        },
        {
          name: "userRole",
          values: ["admin", "user", "guest"],
          originalTypePath: "AnotherContext.userRole",
        },
        {
          name: "userRole",
          values: ["admin", "user", "guest"],
          originalTypePath: "YetAnotherContext.userRole",
        },
      ];

      const result = generator.generateEnumArrays(enums);

      // Should merge identical arrays - maybe 1 generic + 1-2 context-specific max
      const userRoleMatches = result.match(/userRole.*=/g);
      expect(userRoleMatches!.length).toBeLessThanOrEqual(2); // Not 4+ numbered variants

      // Should not have numbered fallbacks like userRole2Values, userRole3Values
      expect(result).not.toContain("userRole2Values");
      expect(result).not.toContain("userRole3Values");
      expect(result).not.toContain("userRole4Values");
    });

    test("uses meaningful context over numbering for conflicts", () => {
      const enums: EnumInfo[] = [
        {
          name: "type",
          values: ["optionA", "optionB", "optionC"],
          originalTypePath: "GetV1ResourcesData.query.type",
        },
        {
          name: "type",
          values: ["methodX", "methodY"],
          originalTypePath: "PostV1ResourcesData.body.type",
        },
        {
          name: "type",
          values: ["resultOne", "resultTwo"],
          originalTypePath: "ResponseData.type",
        },
      ];

      const result = generator.generateEnumArrays(enums);

      // Should use meaningful context-based names
      expect(result).toContain("queryTypes");
      expect(result).toContain("requestTypes");
      expect(result).toContain("responseTypes");

      // Should NOT use numbered fallbacks
      expect(result).not.toContain("type2Values");
      expect(result).not.toContain("type3Values");
    });

    test("avoids excessive numbering with better conflict resolution", () => {
      const enums: EnumInfo[] = [
        {
          name: "format",
          values: ["formatA", "formatB"],
          originalTypePath: "GetV1ItemsData.query.format",
        },
        {
          name: "format",
          values: ["formatA", "formatB"],
          originalTypePath: "PostV1ItemsData.body.format",
        },
        {
          name: "format",
          values: ["formatA", "formatB"],
          originalTypePath: "PutV1ItemsData.body.format",
        },
        {
          name: "format",
          values: ["formatA", "formatB"],
          originalTypePath: "ResponseData.format",
        },
      ];

      const result = generator.generateEnumArrays(enums);

      // Should merge identical arrays into 1, not create 4 separate ones
      const arrayMatches = result.match(/export const \w+ = \[/g);
      expect(arrayMatches?.length || 0).toBe(1);

      // Should have a meaningful contextual name, not just "format"
      expect(result).toMatch(/export const \w*[Ff]ormat\w* = \[/);

      // Should prefer context over numbering
      const numberedMatches = result.match(/format\d+/g);
      expect(numberedMatches).toBeNull(); // No format2, format3, format4
    });
  });

  describe("extractContextForConflict", () => {
    test("extracts query context from GetV1ResourcesData.query.type", () => {
      const generator = new CodeGenerator() as CodeGeneratorWithPrivates;
      const result = generator.extractContextForConflict(
        "GetV1ResourcesData.query.type",
      );
      expect(result).toBe("query");
    });

    test("extracts request context from PostV1ResourcesData.body.type", () => {
      const generator = new CodeGenerator() as CodeGeneratorWithPrivates;
      const result = generator.extractContextForConflict(
        "PostV1ResourcesData.body.type",
      );
      expect(result).toBe("request");
    });

    test("extracts response context from ResponseData.type", () => {
      const generator = new CodeGenerator() as CodeGeneratorWithPrivates;
      const result = generator.extractContextForConflict("ResponseData.type");
      expect(result).toBe("response");
    });

    test("extracts query context from simple query.type pattern", () => {
      const generator = new CodeGenerator() as CodeGeneratorWithPrivates;
      const result = generator.extractContextForConflict("query.type");
      expect(result).toBe("query");
    });

    test("extracts request context from account.type pattern", () => {
      const generator = new CodeGenerator() as CodeGeneratorWithPrivates;
      const result = generator.extractContextForConflict("account.type");
      expect(result).toBe(null); // Should be null for generic object names
    });
  });
});
