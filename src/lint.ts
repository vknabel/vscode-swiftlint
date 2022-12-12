import {
  TextDocument,
  Diagnostic,
  DiagnosticSeverity,
  Range,
  Uri,
  WorkspaceFolder,
  Position,
  workspace,
  RelativePattern,
} from "vscode";
import {
  ExecException,
  ExecFileOptionsWithStringEncoding,
} from "child_process";
import Current from "./Current";
import { SwiftLintConfig } from "./SwiftLintConfig";
import { execShell } from "./execShell";
import * as path from "path";

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
  workspaceFolder: WorkspaceFolder | null;
}) {
  const input = request.document.getText();
  if (input.trim() === "") {
    return [];
  }
  const config = await SwiftLintConfig.search(
    workspaceRoot(request.workspaceFolder)
  );
  if (config == null && Current.config.onlyEnableWithConfig()) {
    return;
  }
  const configArgs = config?.arguments() || [];

  if (config && !(await config.includes(request.document.uri.fsPath))) {
    return [];
  }

  if (request.document.isUntitled) {
    return [];
  }

  const workspaceOrRoot =
    request.workspaceFolder?.uri.fsPath ?? path.normalize("/");
  const relativeDocumentPath = path.relative(
    workspaceOrRoot,
    request.document.uri.fsPath
  );
  const lintingResults = await execSwiftlint({
    uri: request.document.uri,
    files: [relativeDocumentPath],
    cwd: workspaceOrRoot,
    parameters: [...configArgs, ...request.parameters],
    options: {
      encoding: "utf8",
      input,
    },
  });
  if (lintingResults == null) {
    return [];
  }
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

export async function fixDocument(request: {
  document: TextDocument;
  parameters: string[];
  workspaceFolder: WorkspaceFolder | null;
}): Promise<void> {
  const config = await SwiftLintConfig.search(
    workspaceRoot(request.workspaceFolder)
  );
  if (config == null && Current.config.onlyEnableWithConfig()) {
    return;
  }
  const configArgs = config?.arguments() || [];

  if (config && !(await config.includes(request.document.uri.fsPath))) {
    return;
  }

  if (request.document.isUntitled) {
    return;
  }

  const workspaceOrRoot =
    request.workspaceFolder?.uri.fsPath ?? path.normalize("/");
  const relativeDocumentPath = path.relative(
    workspaceOrRoot,
    request.document.uri.fsPath
  );
  await execSwiftlint({
    uri: request.document.uri,
    files: [relativeDocumentPath],
    cwd: workspaceOrRoot,
    parameters: [...configArgs, "--fix", ...request.parameters],
    options: {
      encoding: "utf8",
    },
  });
}

export async function fixForFolder(request: {
  folder: WorkspaceFolder;
  parameters?: string[];
}): Promise<void> {
  const config = await SwiftLintConfig.search(workspaceRoot(request.folder));
  if (config == null && Current.config.onlyEnableWithConfig()) {
    return;
  }
  const configArgs = config?.arguments() || [];
  const allFiles = await detectDefaultPathArguments(request.folder);

  const includedFiles = config
    ? (await config.includes(request.folder.uri.path))
      ? []
      : await filterAsync(allFiles, (path) => config.includes(path))
    : request.parameters || [];

  await execSwiftlint({
    uri: request.folder.uri,
    parameters: [...configArgs, "--fix", ...(request.parameters || [])],
    files: includedFiles,
    cwd: workspaceRoot(request.folder),
    options: {
      encoding: "utf8",
      env: process.env,
    },
  });
}

export async function diagnosticsForFolder(request: {
  folder: WorkspaceFolder;
  parameters?: string[];
}): Promise<Map<string, Diagnostic[]>> {
  const config = await SwiftLintConfig.search(workspaceRoot(request.folder));
  if (config == null && Current.config.onlyEnableWithConfig()) {
    return new Map();
  }
  const configArgs = config?.arguments() || [];
  const allFiles = await detectDefaultPathArguments(request.folder);

  const includedFiles = config
    ? (await config.includes(request.folder.uri.path))
      ? []
      : await filterAsync(allFiles, (path) => config.includes(path))
    : request.parameters || [];

  const lintingResults = await execSwiftlint({
    uri: request.folder.uri,
    parameters: [...configArgs, ...(request.parameters || [])],
    files: includedFiles,
    cwd: workspaceRoot(request.folder),
    options: {
      encoding: "utf8",
      env: process.env,
    },
  });
  if (lintingResults == null) {
    return new Map();
  }
  let reports: Report[] = [];
  try {
    reports = JSON.parse(lintingResults) || [];
  } catch (error) {
    console.log("[Parsing linting results]", error);
  }
  const diagnostics = reports.map(reportToSimpleDiagnostic());
  const diagnosticsByFile = new Map<string, Diagnostic[]>();
  for (const { file, diagnostic } of diagnostics) {
    const previous = diagnosticsByFile.get(file) || [];
    diagnosticsByFile.set(file, [...previous, diagnostic]);
  }
  return diagnosticsByFile;
}

function workspaceRoot(workspaceFolder: WorkspaceFolder | null): string {
  return (
    (workspaceFolder && workspaceFolder.uri.fsPath) ||
    workspace.rootPath ||
    "./"
  );
}

async function detectDefaultPathArguments(
  workspaceFolder: WorkspaceFolder
): Promise<string[]> {
  const fileUris = await workspace.findFiles(
    new RelativePattern(workspaceFolder, "**/*.swift")
  );
  return fileUris.map((uri) => uri.path);
}

function reportToPreciseDiagnosticForDocument(
  document: TextDocument
): (report: Report) => Diagnostic {
  return (report) => {
    try {
      const line = document.lineAt(report.line - 1);
      let range: Range;
      if (report.character === null) {
        range = line.range;
      } else {
        const wordBegin = line.range.start.translate({
          characterDelta: report.character,
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

function reportToSimpleDiagnostic(): (report: Report) => {
  file: string;
  diagnostic: Diagnostic;
} {
  return (report) => {
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
      ),
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
  cwd: string;
  options: ExecFileOptionsWithStringEncoding & { input?: string };
}): Promise<string | null> {
  const filesEnv: NodeJS.ProcessEnv =
    request.files.length === 0
      ? {}
      : Object.assign(
          {},
          ...request.files.map(
            (fileName, index): NodeJS.ProcessEnv => ({
              [`SCRIPT_INPUT_FILE_${index}`]: fileName,
            })
          )
        );
  filesEnv["SCRIPT_INPUT_FILE_COUNT"] = `${request.files.length}`;

  const toolchainEnv = Current.config.toolchainPath()
    ? { TOOLCHAIN_DIR: Current.config.toolchainPath() }
    : {};
  const filesModeParameters =
    request.files.length !== 0 ? ["--use-script-input-files"] : [];

  return new Promise((resolve, reject) => {
    const swiftLintPath = Current.config.swiftLintPath(request.uri);
    if (swiftLintPath == null) {
      return null;
    }
    const swiftLintArgs = [
      "lint",
      ...filesModeParameters,
      "--quiet",
      "--reporter",
      "json",
      ...request.parameters,
      ...Current.config.additionalParameters(),
    ];
    console.log(
      `cd ${request.cwd} && `,
      Object.keys(filesEnv)
        .map((env) => `${env}='${filesEnv[env]}'`)
        .join(" "),
      `'${swiftLintPath}' `,
      swiftLintArgs?.map((arg) => `'${arg}'`).join(" ")
    );
    const exec = execShell(
      swiftLintPath,
      swiftLintArgs,
      {
        encoding: "utf8",
        maxBuffer: 20 * 1024 * 1024,
        ...((request.options || {}) as any),
        env: {
          ...process.env,
          ...toolchainEnv,
          ...(request.options || {}).env,
          ...filesEnv,
          SCRIPT_INPUT_FILE_COUNT: `${request.files.length}`,
        },
        cwd: request.cwd,
      },
      (error: any | ExecException | null, stdout: string | any, stderr) => {
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

async function filterAsync<T>(
  elements: T[],
  predicate: (element: T) => Promise<boolean>
): Promise<T[]> {
  const remaining = Array<T>();
  for (const element of elements) {
    const matches = await predicate(element);
    if (matches) {
      remaining.push(element);
    }
  }
  return remaining;
}
