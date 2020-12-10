import * as vscode from "vscode";
import Current from "./Current";
import { killAllChildProcesses } from "./execShell";
import { SwiftLint } from "./SwiftLintProvider";

const swiftLint = new SwiftLint();

export function activate(context: vscode.ExtensionContext) {
  if (Current.config.isEnabled() === false) {
    return;
  }

  swiftLint.activate(context);
}

export function deactivate(_context: vscode.ExtensionContext) {
  killAllChildProcesses();
}
