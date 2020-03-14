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
  config: {
    isEnabled(): boolean;

    swiftLintPath(uri: vscode.Uri): string;
    resetSwiftLintPath(): void;
    configureSwiftLintPath(): void;
    lintConfigSearchPaths(): string[];
    forceExcludePaths(): string[];
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
        const title = `Report ${error.code || ""} ${error.message ||
          ""}`.replace(/\\n/, " ");
        const body = "`" + (error.stack || JSON.stringify(error)) + "`";
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
        >
    },
    config: {
      isEnabled: () =>
        vscode.workspace.getConfiguration().get("swiftlint.enable", true),
      swiftLintPath: (uri: vscode.Uri) => {
        // Support running from Swift PM projects
        const possibleLocalPaths = [
          ".build/release/swiftlint",
          ".build/debug/swiftlint"
        ];
        for (const path of possibleLocalPaths) {
          // Grab the project root from the local workspace
          const workspace = vscode.workspace.getWorkspaceFolder(uri);
          if (workspace === null) {
            continue;
          }
          const fullPath = workspace ? join(workspace!.uri.path, path) : path;

          if (existsSync(fullPath)) {
            return absolutePath(fullPath);
          }
        }
        // Fall back to global defaults found in settings
        return fallbackGlobalSwiftFormatPath();
      },
      resetSwiftLintPath: () =>
        vscode.workspace.getConfiguration().update("swiftlint.path", undefined),
      configureSwiftLintPath: () =>
        vscode.commands.executeCommand("workbench.action.openSettings"),
      lintConfigSearchPaths: () =>
        vscode.workspace
          .getConfiguration()
          .get("swiftlint.configSearchPaths", [".swiftlint.yml"])
          .map(absolutePath),
      forceExcludePaths: () =>
        vscode.workspace
          .getConfiguration()
          .get<string[]>("swiftlint.forceExcludePaths", [
            "tmp",
            "build",
            ".build",
            "Pods",
            "Carthage"
          ])
    }
  };
}

const fallbackGlobalSwiftFormatPath = () =>
  absolutePath(
    vscode.workspace
      .getConfiguration()
      .get("swiftlint.path", "/usr/local/bin/swiftlint")
  );

const Current = prodEnvironment();
export default Current as Current;
