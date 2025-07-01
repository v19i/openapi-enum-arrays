/**
 * Generates semantic names for enum arrays based purely on OpenAPI structure
 * No domain-specific assumptions - works with any OpenAPI specification
 */
export class SemanticNaming {
  /**
   * Generate a semantic name for an enum based purely on OpenAPI structure
   */
  generateName(values: string[], originalTypePath?: string): string {
    // Primary: Extract semantic meaning from OpenAPI type path
    const openApiDomain = this.extractDomainFromOpenApiPath(originalTypePath);
    const openApiType = this.extractTypeFromOpenApiPath(originalTypePath);

    if (openApiDomain && openApiType) {
      return `${openApiDomain}${this.capitalizeFirst(openApiType)}`;
    }

    if (openApiDomain) {
      return openApiDomain;
    }

    // Secondary: Use property name from path
    const propertyName = this.extractPropertyName(originalTypePath);
    if (propertyName) {
      return `${propertyName}Values`;
    }

    // Final fallback: generate from first value
    return this.generateFromValues(values);
  }

  private extractDomainFromOpenApiPath(
    originalTypePath?: string,
  ): string | null {
    if (!originalTypePath) return null;

    const openApiMatch = originalTypePath.match(
      /^(Get|Post|Put|Delete|Patch)V\d+.*?([A-Z][a-z]+(?:[A-Z][a-z]*)*)/g,
    );
    if (openApiMatch) {
      const resourceMatch = originalTypePath.match(
        /([A-Z][a-z]+(?:[A-Z][a-z]*)*)/g,
      );
      if (resourceMatch) {
        const meaningfulNames = resourceMatch.filter(
          (name) =>
            ![
              "Data",
              "Response",
              "Request",
              "Query",
              "Body",
              "Params",
            ].includes(name),
        );

        if (meaningfulNames.length > 0) {
          const domainName = meaningfulNames[meaningfulNames.length - 1];
          return domainName.charAt(0).toLowerCase() + domainName.slice(1);
        }
      }
    }

    const simpleMatch = originalTypePath.match(/^([A-Z][a-z]+)/g);
    if (simpleMatch) {
      const objectName = simpleMatch[0];
      if (!["Query", "Request", "Response", "Data"].includes(objectName)) {
        return objectName.charAt(0).toLowerCase() + objectName.slice(1);
      }
    }

    return null;
  }

  private extractTypeFromOpenApiPath(originalTypePath?: string): string | null {
    if (!originalTypePath || !originalTypePath.includes(".")) return null;
    return originalTypePath.split(".").pop() || null;
  }

  private extractPropertyName(originalTypePath?: string): string | null {
    if (!originalTypePath) return null;

    if (originalTypePath.includes(".")) {
      return originalTypePath.split(".").pop() || null;
    }

    const standaloneMatch = originalTypePath.match(/^export type (\w+)$/);
    if (standaloneMatch) {
      return standaloneMatch[1].toLowerCase();
    }

    return null;
  }

  private extractContext(originalTypePath?: string): string | null {
    if (!originalTypePath) return null;

    const openApiMatch = originalTypePath.match(
      /^(Get|Post|Put|Delete|Patch)V\d+(\w+)Data\.(.+)\.(\w+)$/,
    );
    if (openApiMatch) {
      const [_fullMatch, _method, _resource, section, _field] = openApiMatch;
      const sectionContext =
        {
          query: "query",
          body: "request",
          response: "response",
        }[section.toLowerCase()] || section.toLowerCase();
      return sectionContext;
    }

    const simpleMatch = originalTypePath.match(/^(\w+)\.(\w+)$/);
    if (simpleMatch) {
      const [_fullMatch, objectName, _fieldName] = simpleMatch;
      return this.extractContextFromObjectName(objectName);
    }

    const standaloneMatch = originalTypePath.match(/^export type (\w+)$/);
    if (standaloneMatch) {
      const [_fullMatch, typeName] = standaloneMatch;
      return typeName.toLowerCase();
    }

    return null;
  }

  private extractContextFromObjectName(objectName: string): string {
    const normalized = objectName.toLowerCase();

    if (normalized.includes("query") || normalized.includes("params")) {
      return "query";
    }
    if (normalized.includes("request") || normalized.includes("body")) {
      return "request";
    }
    if (normalized.includes("response") || normalized.includes("result")) {
      return "response";
    }

    const firstWord = objectName
      .replace(/([A-Z])/g, " $1")
      .trim()
      .split(" ")[0]
      .toLowerCase();
    return firstWord;
  }

  private generateFromValues(values: string[]): string {
    const prefix = values[0]?.toLowerCase().substring(0, 3) || "enum";
    const suffix =
      values.length > 1 ? values[1]?.toLowerCase().substring(0, 2) || "" : "";
    return `${prefix}${suffix}Values`;
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
