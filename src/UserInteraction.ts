import * as vscode from "vscode";
import Current from "./Current";

enum FormatErrorInteraction {
  configure = "Configure",
  reset = "Reset",
}

enum PipeErrorInteraction {
  configure = "Configure",
  seeReport = "See Report",
}

enum UnfixedErrorInteraction {
  seeReport = "See Report",
}

enum UnknownErrorInteraction {
  reportIssue = "Report issue",
}

export async function handleFormatError(error: any, uri: vscode.Uri) {
  if (error.code === "EPIPE") {
    const selection = await Current.editor.showErrorMessage(
      `Could not start SwiftLint. Probably the toolchain is wrong.`,
      PipeErrorInteraction.seeReport,
      PipeErrorInteraction.configure
    );
    switch (selection) {
      case PipeErrorInteraction.seeReport:
        Current.editor.openURL(
          "https://github.com/vknabel/vscode-swiftlint/issues/11#issuecomment-641667855"
        );
        break;
      case PipeErrorInteraction.configure:
        Current.config.openSettings();
        break;
    }
  } else if (error.code === "ENOENT") {
    const selection = await Current.editor.showErrorMessage(
      `Could not find SwiftLint: ${
        Current.config.swiftLintPath(uri)?.join(" ") ?? "null"
      }`,
      FormatErrorInteraction.reset,
      FormatErrorInteraction.configure
    );
    switch (selection) {
      case FormatErrorInteraction.reset:
        Current.config.resetSwiftLintPath();
        break;
      case FormatErrorInteraction.configure:
        Current.config.openSettings();
        break;
    }
  } else if (error.code === "EBADF") {
    const selection = await Current.editor.showErrorMessage(
      `SwiftLint failed. EBADF #28. Do you have additional information?`,
      UnfixedErrorInteraction.seeReport
    );
    switch (selection) {
      case UnfixedErrorInteraction.seeReport:
        Current.editor.openURL(
          "https://github.com/vknabel/vscode-swiftlint/issues/31"
        );
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
