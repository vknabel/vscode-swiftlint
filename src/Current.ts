import * as os from "os";
import * as fs from "fs";

export interface Current {
  editor: {
    openURL(url: string): Thenable<void>;
    reportIssueForError(
      error: Partial<Error & { code: number }>
    ): Thenable<void>;
    showErrorMessage<T extends string>(
      message: string,
      ...actions: T[]
    ): Thenable<T | undefined>;
    showWarningMessage<T extends string>(
      message: string,
      ...actions: T[]
    ): Thenable<T | undefined>;
  };
  commands: {
    lintWorkspace: string;
    fixWorkspace: string;
    fixDocument: string;
  };
  config: {
    isEnabled(): boolean;
    onlyEnableOnSwiftPMProjects(): boolean;
    onlyEnableWithConfig(): boolean;
    affectsConfiguration(changeEvent: vscode.ConfigurationChangeEvent): boolean;

    swiftLintPath(uri: vscode.Uri): string[] | null;
    toolchainPath(): string | undefined;
    additionalParameters(): string[];
    resetSwiftLintPath(): void;
    openSettings(): void;
    lintConfigSearchPaths(): string[];
    autoLintWorkspace(): boolean;
  };
}

import * as vscode from "vscode";
import { url } from "./UrlLiteral";
import { absolutePath } from "./AbsolutePath";
import { existsSync } from "fs";
import { join } from "path";

export function prodEnvironment(): Current {
  return {
    editor: {
      async openURL(url: string) {
        await vscode.commands.executeCommand(
          "vscode.open",
          vscode.Uri.parse(url)
        );
      },
      async reportIssueForError(error) {
        const title = `Report ${error.code || ""} ${
          error.message || ""
        }`.replace(/\\n/, " ");
        const body = encodeURIComponent(
          `\`${error.stack || JSON.stringify(error)}\nos: ${os.platform()}\``
        );
        await Current.editor.openURL(
          url`https://github.com/vknabel/vscode-swiftlint/issues/new?title=${title}&body=${body}`
        );
      },
      showErrorMessage: <T extends string>(message: string, ...actions: T[]) =>
        vscode.window.showErrorMessage(message, ...actions) as Thenable<
          T | undefined
        >,
      showWarningMessage: <T extends string>(
        message: string,
        ...actions: T[]
      ) =>
        vscode.window.showWarningMessage(message, ...actions) as Thenable<
          T | undefined
        >,
    },
    commands: {
      lintWorkspace: "swiftlint.lintWorkspace",
      fixWorkspace: "swiftlint.fixWorkspace",
      fixDocument: "swiftlint.fixDocument",
    },
    config: {
      affectsConfiguration: (changeEvent: vscode.ConfigurationChangeEvent) =>
        changeEvent.affectsConfiguration("swiftlint"),
      isEnabled: () =>
        vscode.workspace.getConfiguration().get("swiftlint.enable", true),
      onlyEnableOnSwiftPMProjects: () =>
        vscode.workspace
          .getConfiguration()
          .get("swiftlint.onlyEnableOnSwiftPMProjects", false),
      onlyEnableWithConfig: () =>
        vscode.workspace
          .getConfiguration()
          .get("swiftlint.onlyEnableWithConfig", false),

      autoLintWorkspace: () =>
        vscode.workspace
          .getConfiguration()
          .get("swiftlint.autoLintWorkspace", true),
      swiftLintPath: (uri: vscode.Uri) => {
        // Support running from Swift PM projects
        const possibleLocalPaths = [
          ".build/release/swiftlint",
          ".build/debug/swiftlint",
        ];
        for (const path of possibleLocalPaths) {
          // Grab the project root from the local workspace
          const workspace = vscode.workspace.getWorkspaceFolder(uri);
          if (workspace === null) {
            continue;
          }
          const fullPath = workspace ? join(workspace!.uri.path, path) : path;

          if (existsSync(fullPath)) {
            return [absolutePath(fullPath)];
          }
        }

        if (
          vscode.workspace
            .getConfiguration()
            .get("swiftlint.onlyEnableOnSwiftPMProjects", false)
        ) {
          return null;
        }
        // Fall back to global defaults found in settings
        return fallbackGlobalSwiftFormatPath();
      },
      toolchainPath: () => {
        const toolchainPath: string | undefined = vscode.workspace
          .getConfiguration()
          .get("swiftlint.toolchainPath");
        if (toolchainPath) {
          return toolchainPath;
        }
        if (os.platform() === "darwin") {
          return [
            "/Applications/Xcode.app/Contents/Developer/Toolchains/XcodeDefault.xctoolchain",
            "/Applications/Xcode-beta.app/Contents/Developer/Toolchains/XcodeDefault.xctoolchain",
            "~/Applications/Xcode.app/Contents/Developer/Toolchains/XcodeDefault.xctoolchain",
            "~/Applications/Xcode-beta.app/Contents/Developer/Toolchains/XcodeDefault.xctoolchain",
          ].find((tool) => fs.existsSync(tool));
        }
      },
      additionalParameters: () =>
        vscode.workspace
          .getConfiguration()
          .get("swiftlint.additionalParameters", []),
      resetSwiftLintPath: () =>
        vscode.workspace.getConfiguration().update("swiftlint.path", undefined),
      openSettings: () =>
        vscode.commands.executeCommand("workbench.action.openSettings"),
      lintConfigSearchPaths: () =>
        vscode.workspace
          .getConfiguration()
          .get("swiftlint.configSearchPaths", [])
          .map(absolutePath),
    },
  };
}

const fallbackGlobalSwiftFormatPath = (): string[] => {
  let defaultPath = ["/usr/bin/env", "swiftlint"];
  if (os.platform() === "win32") {
    defaultPath = ["swiftlint"];
  }
  const path = vscode.workspace
    .getConfiguration()
    .get<string | string[] | null>("swiftlint.path", null);
  if (typeof path === "string") {
    return [absolutePath(path)];
  } else if (Array.isArray(path) && path.length > 0) {
    return [absolutePath(path[0]), ...path.slice(1)];
  } else {
    return defaultPath;
  }
};

const Current = prodEnvironment();
export default Current as Current;
