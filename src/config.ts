import type { Plugin } from "@hey-api/openapi-ts";
import { handler } from "./plugin";
import type { Config } from "./types";

export const defaultConfig: Plugin.Config<Config> = {
  _dependencies: ["@hey-api/typescript"],
  _handler: handler,
  _handlerLegacy: () => {},
  name: "enum-arrays",
  output: "enums",
  debug: false,
  arrayPrefix: "",
};

/**
 * Type helper for `enum-arrays` plugin, returns {@link Plugin.Config} object
 */
export const defineConfig: Plugin.DefineConfig<Config> = (config) => ({
  ...defaultConfig,
  ...config,
});
