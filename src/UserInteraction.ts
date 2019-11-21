import * as vscode from "vscode";
import Current from "./Current";

enum FormatErrorInteraction {
  configure = "Configure",
  reset = "Reset"
}

enum UnknownErrorInteraction {
  reportIssue = "Report issue"
}

export async function handleFormatError(error: any, uri: vscode.Uri) {
  if (error.code === "ENOENT") {
    const selection = await Current.editor.showErrorMessage(
      `Could not find SwiftLint: ${Current.config.swiftLintPath(uri)}`,
      FormatErrorInteraction.reset,
      FormatErrorInteraction.configure
    );
    switch (selection) {
      case FormatErrorInteraction.reset:
        await Current.config.resetSwiftLintPath();
        break;
      case FormatErrorInteraction.configure:
        await Current.config.configureSwiftLintPath();
        break;
    }
  } else if (error.status === 70) {
    await Current.editor.showErrorMessage(
      `SwiftLint failed. ${error.stderr || ""}`
    );
  } else {
    const unknownErrorSelection = await Current.editor.showErrorMessage(
      `An unknown error occurred. ${error.message || ""}`,
      UnknownErrorInteraction.reportIssue
    );
    if (unknownErrorSelection === UnknownErrorInteraction.reportIssue) {
      await Current.editor.reportIssueForError(error);
    }
  }
}
