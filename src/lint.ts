import {
  TextDocument,
  Diagnostic,
  DiagnosticSeverity,
  Range,
  Uri,
  WorkspaceFolder,
  Position,
  workspace,
  RelativePattern
} from "vscode";
import {
  ExecException,
  execFile,
  ExecFileOptionsWithStringEncoding
} from "child_process";
import Current from "./Current";
import { resolve } from "path";
import { existsSync } from "fs";

interface Report {
  character: number | null;
  file: string;
  line: number;
  reason: string;
  rule_id: string;
  severity: string;
  type: string;
}

export async function diagnosticsForDocument(request: {
  document: TextDocument;
  parameters: string[];
}) {
  const input = request.document.getText();
  if (input.trim() === "") {
    return [];
  }
  const lintingPaths = request.parameters || [];
  if (lintingPaths.length === 0) {
    return [];
  }
  const configArgs = await detectConfigArguments(null);

  const lintingResults = await execSwiftlint({
    uri: request.document.uri,
    files: [],
    parameters: [...configArgs, ...request.parameters],
    options: {
      encoding: "utf8",
      input
    }
  });
  try {
    const reports: Report[] = JSON.parse(lintingResults) || [];
    const diagnostics = reports.map(
      reportToPreciseDiagnosticForDocument(request.document)
    );
    return diagnostics;
  } catch (error) {
    console.log("[Parsing linting results]", error);
    return [];
  }
}

export async function diagnosticsForFolder(request: {
  folder: WorkspaceFolder;
  parameters?: string[];
}) {
  const configArgs = await detectConfigArguments(request.folder);
  const pathArgs = await detectDefaultPathArguments(request.folder);

  const lintingResults = await execSwiftlint({
    uri: request.folder.uri,
    parameters: [...configArgs, ...(request.parameters || [])],
    files: pathArgs,
    options: {
      encoding: "utf8",
      env: process.env
    }
  });
  const reports: Report[] = JSON.parse(lintingResults) || [];
  const diagnostics = reports.map(reportToSimpleDiagnostic());
  const diagnosticsByFile = new Map<string, Diagnostic[]>();
  for (const { file, diagnostic } of diagnostics) {
    const previous = diagnosticsByFile.get(file) || [];
    diagnosticsByFile.set(file, [...previous, diagnostic]);
  }
  return diagnosticsByFile;
}

async function detectConfigArguments(
  workspaceFolder: WorkspaceFolder | null
): Promise<string[]> {
  const rootPath =
    (workspaceFolder && workspaceFolder.uri.fsPath) ||
    workspace.rootPath ||
    "./";
  const searchPaths = Current.config
    .lintConfigSearchPaths()
    .map(current => resolve(rootPath, current));
  const existingConfig = searchPaths.find(existsSync);
  return existingConfig ? ["--config", existingConfig] : [];
}

async function detectDefaultPathArguments(
  workspaceFolder: WorkspaceFolder
): Promise<string[]> {
  const fileUris = await workspace.findFiles(
    new RelativePattern(workspaceFolder, "**/*.swift"),
    new RelativePattern(workspaceFolder, forceExcludePathsPattern())
  );
  return fileUris.map(uri => uri.path);
}

function forceExcludePathsPattern(): string {
  return "**/{" + Current.config.forceExcludePaths().join(",") + "}/***";
}

function reportToPreciseDiagnosticForDocument(
  document: TextDocument
): (report: Report) => Diagnostic {
  return report => {
    try {
      const line = document.lineAt(report.line - 1);
      let range: Range;
      if (report.character === null) {
        range = line.range;
      } else {
        const wordBegin = line.range.start.translate({
          characterDelta: report.character
        });
        range =
          document.getWordRangeAtPosition(wordBegin) ||
          new Range(wordBegin, wordBegin.translate({ characterDelta: 1 }));
      }

      const severity = reportSeverityToDiagnosticSeverity(report.severity);
      return new Diagnostic(
        range,
        diagnosticMessageForReport(report),
        severity
      );
    } catch (error) {
      throw error;
    }
  };
}

function reportToSimpleDiagnostic(): (
  report: Report
) => { file: string; diagnostic: Diagnostic } {
  return report => {
    const startPosition = new Position(report.line - 1, report.character || 0);
    const endPosition = startPosition.translate({ characterDelta: 1 });
    const range = new Range(startPosition, endPosition);
    const severity = reportSeverityToDiagnosticSeverity(report.severity);
    return {
      file: report.file,
      diagnostic: new Diagnostic(
        range,
        diagnosticMessageForReport(report),
        severity
      )
    };
  };
}

function diagnosticMessageForReport(report: Report): string {
  return `${report.reason} (${report.rule_id})`;
}

function reportSeverityToDiagnosticSeverity(
  severity: string
): DiagnosticSeverity {
  if (severity === "Warning") {
    return DiagnosticSeverity.Warning;
  } else if (severity === "Error") {
    return DiagnosticSeverity.Error;
  } else {
    return DiagnosticSeverity.Information;
  }
}

function execSwiftlint(request: {
  uri: Uri;
  parameters: string[];
  files: string[];
  options: ExecFileOptionsWithStringEncoding & { input?: string };
}): Promise<string> {
  const filesEnv: NodeJS.ProcessEnv =
    request.files.length === 0
      ? {}
      : Object.assign(
          {},
          ...request.files.map(
            (fileName, index): NodeJS.ProcessEnv => ({
              [`SCRIPT_INPUT_FILE_${index}`]: fileName
            })
          )
        );
  const filesModeParameters =
    request.files.length !== 0 ? ["--use-script-input-files"] : [];

  return new Promise((resolve, reject) => {
    const exec = execFile(
      Current.config.swiftLintPath(request.uri),
      [
        ...filesModeParameters,
        "--quiet",
        "--reporter",
        "json",
        ...request.parameters
      ],
      {
        encoding: "utf8",
        maxBuffer: 10 * 1024 * 1024,
        ...(request.options || {}),
        env: {
          ...process.env,
          ...(request.options || {}).env,
          ...filesEnv,
          SCRIPT_INPUT_FILE_COUNT: `${request.files.length}`
        }
      },
      (error, stdout, stderr) => {
        if (error && isExecException(error) && error.code === 2) {
          return resolve(stdout);
        } else if (
          error &&
          "code" in error &&
          error["code"] === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER"
        ) {
          console.log("stderr", stderr);
          return resolve("[]");
        } else if (error) {
          console.log("stderr", stderr);
          return reject(error);
        } else {
          return resolve(stdout);
        }
      }
    );
    if (request.options.input !== undefined) {
      exec.stdin!.end(request.options.input);
    }
  });
}

function isExecException(error: Error): error is ExecException {
  return "code" in error;
}
