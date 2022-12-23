import * as vscode from "vscode";
import Current from "./Current";

enum FormatErrorInteraction {
  configure = "Configure",
  reset = "Reset",
  howTo = "How?",
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
  function matches(...codeOrStatus: Array<number | string>) {
    return codeOrStatus.some((c) => c === error.code || c === error.status);
  }
  if (matches("EPIPE")) {
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
  } else if (matches("ENOENT", 127)) {
    const selection = await Current.editor.showErrorMessage(
      `Could not find SwiftLint: ${
        Current.config.swiftLintPath(uri)?.join(" ") ?? "null"
      }.\nEnsure it is installed and in your PATH.`,
      FormatErrorInteraction.reset,
      FormatErrorInteraction.configure,
      FormatErrorInteraction.howTo
    );
    switch (selection) {
      case FormatErrorInteraction.reset:
        Current.config.resetSwiftLintPath();
        break;
      case FormatErrorInteraction.configure:
        Current.config.openSettings();
        break;
      case FormatErrorInteraction.howTo:
        await Current.editor.openURL(
          "https://github.com/realm/SwiftLint#installation"
        );
        break;
    }
  } else if (matches("EBADF")) {
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
  } else if (matches(70)) {
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
