import type { EnumInfo } from "./types";

export interface GeneratorOptions {
  arrayPrefix?: string;
}

export class CodeGenerator {
  generateEnumArrays(
    enums: EnumInfo[],
    options: GeneratorOptions = {},
  ): string {
    const { arrayPrefix = "" } = options;

    const deduplicatedEnums = this.deduplicateEnums(enums);
    const header = this.generateHeader();
    const arrays = this.generateArrayConstants(deduplicatedEnums, arrayPrefix);

    return [header, arrays].filter(Boolean).join("\n\n");
  }

  private deduplicateEnums(enums: EnumInfo[]): EnumInfo[] {
    const enumMap = new Map<string, EnumInfo>();
    const nameGroups = new Map<string, EnumInfo[]>();

    for (const enumInfo of enums) {
      if (!nameGroups.has(enumInfo.name)) {
        nameGroups.set(enumInfo.name, []);
      }
      nameGroups.get(enumInfo.name)!.push(enumInfo);
    }

    const processedEnums: EnumInfo[] = [];

    for (const [_name, enumsWithSameName] of nameGroups) {
      if (enumsWithSameName.length === 1) {
        processedEnums.push(enumsWithSameName[0]);
      } else {
        for (const enumInfo of enumsWithSameName) {
          const contextualName = this.generateContextualName(enumInfo);
          processedEnums.push({
            ...enumInfo,
            name: contextualName,
          });
        }
      }
    }

    const valueGroups = new Map<string, EnumInfo[]>();

    for (const enumInfo of processedEnums) {
      const sortedValues = [...enumInfo.values].sort().join("|");
      if (!valueGroups.has(sortedValues)) {
        valueGroups.set(sortedValues, []);
      }
      valueGroups.get(sortedValues)!.push(enumInfo);
    }

    for (const [valuesKey, enumsWithSameValues] of valueGroups) {
      if (enumsWithSameValues.length === 1) {
        const enumInfo = enumsWithSameValues[0];
        const uniqueKey = `${enumInfo.name}:${valuesKey}`;
        enumMap.set(uniqueKey, enumInfo);
      } else {
        const bestEnum = this.chooseBestEnumForMerging(enumsWithSameValues);
        const uniqueKey = `${bestEnum.name}:${valuesKey}`;

        console.log(
          `Plugin: Merged ${enumsWithSameValues.length} duplicate enum arrays into ${bestEnum.name}`,
        );
        enumMap.set(uniqueKey, bestEnum);
      }
    }

    return Array.from(enumMap.values());
  }

  private chooseBestEnumForMerging(enums: EnumInfo[]): EnumInfo {
    const genericTerms = [
      "data",
      "response",
      "request",
      "query",
      "body",
      "params",
    ];

    const scored = enums.map((enumInfo) => {
      let score = 0;
      const lowerName = enumInfo.name.toLowerCase();

      score += 50 - enumInfo.name.length;

      if (genericTerms.some((term) => lowerName.includes(term))) {
        score -= 20;
      }

      if (
        lowerName.includes("request") ||
        lowerName.includes("response") ||
        lowerName.includes("query")
      ) {
        score += 10;
      }

      return { enumInfo, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0].enumInfo;
  }

  private generateFullPathName(enumInfo: EnumInfo): string {
    if (!enumInfo.originalTypePath) {
      return enumInfo.name;
    }

    const cleaned = enumInfo.originalTypePath
      .replace(/[^a-zA-Z0-9.]/g, "")
      .split(".")
      .map((part, index) => {
        if (index === 0) {
          return part.charAt(0).toLowerCase() + part.slice(1);
        }
        return part.charAt(0).toUpperCase() + part.slice(1);
      })
      .join("");

    return cleaned || enumInfo.name;
  }

  private generateContextualName(enumInfo: EnumInfo): string {
    const context = this.extractContextForConflict(enumInfo.originalTypePath);
    const fieldName = this.extractFieldName(enumInfo.originalTypePath);

    if (context && fieldName) {
      return `${context}${this.capitalizeFirst(fieldName)}`;
    }

    if (context) {
      return `${context}${this.capitalizeFirst(enumInfo.name)}`;
    }

    return enumInfo.name;
  }

  private extractContextForConflict(originalTypePath: string): string | null {
    if (originalTypePath.includes(".query.")) {
      return "query";
    }
    if (originalTypePath.includes(".body.")) {
      return "request";
    }
    if (originalTypePath.includes("ResponseData.")) {
      return "response";
    }

    if (
      originalTypePath.startsWith("Get") &&
      originalTypePath.includes("Data.")
    ) {
      return "query";
    }
    if (
      (originalTypePath.startsWith("Post") ||
        originalTypePath.startsWith("Put")) &&
      originalTypePath.includes("Data.")
    ) {
      return "request";
    }

    if (originalTypePath.includes("query")) {
      return "query";
    }
    if (
      originalTypePath.includes("body") ||
      originalTypePath.includes("Request")
    ) {
      return "request";
    }
    if (originalTypePath.includes("Response")) {
      return "response";
    }

    const match = originalTypePath.match(/^(\w+)\./);
    if (match) {
      const objectName = match[1].toLowerCase();
      if (objectName.includes("query")) return "query";
      if (
        objectName.includes("request") ||
        objectName.includes("post") ||
        objectName.includes("put")
      )
        return "request";
      if (objectName.includes("response") || objectName.includes("get"))
        return "response";
    }

    return null;
  }

  private extractFieldName(originalTypePath: string): string | null {
    const parts = originalTypePath.split(".");
    return parts[parts.length - 1] || null;
  }

  private generateHeader(): string {
    return "// This file is auto-generated by openapi-enum-arrays";
  }

  private generateArrayConstants(
    enums: EnumInfo[],
    arrayPrefix: string,
  ): string {
    return enums
      .map((enumInfo) => {
        const semanticName = this.toArrayName(enumInfo.name);
        const arrayName = arrayPrefix + semanticName;
        const values = enumInfo.values
          .sort()
          .map((v) => `'${v}'`)
          .join(", ");
        return `export const ${arrayName} = [${values}] as const`;
      })
      .join("\n");
  }

  private toArrayName(typeName: string): string {
    // Convert to camelCase and add appropriate suffix
    const camelCase = typeName.charAt(0).toLowerCase() + typeName.slice(1);

    // Add pluralization based on semantic meaning
    if (camelCase.endsWith("Status")) {
      return camelCase.replace("Status", "Statuses");
    }
    if (camelCase.endsWith("Type")) {
      return camelCase.replace("Type", "Types");
    }
    if (camelCase.endsWith("Model")) {
      return camelCase.replace("Model", "Models");
    }
    if (camelCase.endsWith("Role")) {
      return camelCase.replace("Role", "Roles");
    }
    if (camelCase.endsWith("Source")) {
      return camelCase.replace("Source", "Sources");
    }
    if (camelCase.endsWith("Mode")) {
      return camelCase.replace("Mode", "Modes");
    }

    // Default fallback - add 'Values' suffix
    return `${camelCase}Values`;
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
