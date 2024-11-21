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
    fixAll: string;
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
import * as paths from "path";
import * as glob from "glob";

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
      fixAll: "source.fixAll.swiftlint",
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
        // Grab the project root from the local workspace
        const workspace = vscode.workspace.getWorkspaceFolder(uri);
        if (workspace == null) {
          return fallbackGlobalSwiftLintPath();
        }

        // Support running from Swift PM projects
        const possibleLocalPaths = glob.sync(
          "**/.build/{release,debug}/swiftlint",
          { maxDepth: 5 }
        );
        for (const path of possibleLocalPaths) {
          const fullPath = workspace
            ? paths.resolve(workspace!.uri.path, path)
            : path;

          if (existsSync(fullPath)) {
            return [absolutePath(fullPath)];
          }
        }

        // Fall back to global defaults found in settings
        return fallbackGlobalSwiftLintPath();
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

const fallbackGlobalSwiftLintPath = (): string[] | null => {
  if (
    vscode.workspace
      .getConfiguration()
      .get("swiftlint.onlyEnableOnSwiftPMProjects", false)
  ) {
    return null;
  }

  var path = vscode.workspace
    .getConfiguration()
    .get<string | string[] | null>("swiftlint.path", null);

  if (typeof path === "string") {
    path = [path];
  }
  if (!Array.isArray(path) || path.length === 0) {
    path = [os.platform() === "win32" ? "swiftlint.exe" : "swiftlint"];
  }

  if (os.platform() !== "win32" && !path[0].includes("/")) {
    // Only a binary name, not a path. Search for it in the path (on Windows this is implicit).
    path = ["/usr/bin/env", ...path];
  }

  return path;
};

const Current = prodEnvironment();
export default Current as Current;
