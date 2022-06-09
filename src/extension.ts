import { exec } from "child_process";
import * as vscode from "vscode";
import Current from "./Current";
import { killAllChildProcesses } from "./execShell";
import { SwiftLint } from "./SwiftLintProvider";
import * as path from "path";
import { promisify } from "util";

const swiftLint = new SwiftLint();

export function activate(context: vscode.ExtensionContext) {
  if (Current.config.isEnabled() === false) {
    return;
  }

  buildSwiftlintIfNeeded().then(() => {
    swiftLint.activate(context);
  });
}

export function deactivate(_context: vscode.ExtensionContext) {
  killAllChildProcesses();
}

async function buildSwiftlintIfNeeded() {
  const manifests = await vscode.workspace.findFiles(
    "**/Package.swift",
    "**/.build/**",
    2
  );
  if (manifests.length == 0) {
    return;
  }
  const buildOperations = manifests.map((manifest) => {
    const manifestPath = manifest.fsPath;
    const manifestDir = path.dirname(manifestPath);
    return promisify(exec)("swift build --target swiftlint -c release", {
      cwd: manifestDir,
    });
  });
  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Window,
        title: "swift build --target swiftlint -c release",
      },
      async () => {
        await Promise.all(buildOperations);
      }
    );
  } catch (error) {
    console.log(error);
  }
}
