import * as YAML from "yaml";
import { promisify } from "util";
import { readFile, existsSync } from "fs";
import Current from "./Current";
import { resolve, dirname, normalize } from "path";
import * as glob from "glob";
import * as minimatch from "minimatch";

export interface SwiftLintConfigData {
  included?: RelativeGlobPath[];
  excluded?: RelativeGlobPath[];
}

export type RelativeGlobPath = string;

export class SwiftLintConfig {
  static async search(rootPath: string): Promise<SwiftLintConfig | null> {
    const searchPaths = Current.config
      .lintConfigSearchPaths()
      .map((current) => resolve(rootPath, current));
    const existingConfig = searchPaths.find(existsSync);
    return existingConfig ? await SwiftLintConfig.load(existingConfig) : null;
  }

  static async load(configPath: string): Promise<SwiftLintConfig> {
    const configData = await promisify(readFile)(configPath, {
      encoding: "utf8",
    });
    const config: SwiftLintConfigData = YAML.parse(configData);
    return new SwiftLintConfig(configPath, config);
  }

  constructor(
    private readonly path: string,
    private readonly config: SwiftLintConfigData
  ) {}

  public arguments(): string[] {
    return ["--config", this.path];
  }

  public async includes(documentPath: string): Promise<boolean> {
    const basePath = dirname(this.path);
    const normalizedDocumentPath = normalize(resolve(basePath, documentPath));

    if (this.config.excluded && Array.isArray(this.config.excluded)) {
      const matched = await this.hasMatch({
        basePath,
        documentPath: normalizedDocumentPath,
        relativeGlobs: this.config.excluded,
      });
      if (matched) {
        return false;
      }
    }
    if (
      this.config.included &&
      Array.isArray(this.config.included) &&
      this.config.included.length > 0
    ) {
      return this.hasMatch({
        basePath,
        documentPath: normalizedDocumentPath,
        relativeGlobs: this.config.included,
      });
    } else {
      return true;
    }
  }

  private async hasMatch(options: {
    basePath: string;
    documentPath: string;
    relativeGlobs: string[];
  }): Promise<boolean> {
    const { basePath, documentPath, relativeGlobs } = options;
    for (const relativePattern of relativeGlobs) {
      const absolutePattern = relativePattern.includes("*")
        ? resolve(basePath, relativePattern)
        : resolve(basePath, relativePattern, "**/*.swift");
      const matched = minimatch.match([documentPath], absolutePattern);
      if (matched.length > 0) {
        return true;
      }
    }
    return false;
  }
}
