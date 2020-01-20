import {
  TextDocument,
  Diagnostic,
  DiagnosticSeverity,
  Range,
  Uri,
  WorkspaceFolder,
  Position
} from "vscode";
import {
  ExecException,
  execFile,
  ExecFileOptionsWithStringEncoding
} from "child_process";
import Current from "./Current";

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
  parameters?: string[];
}) {
  const input = request.document.getText();
  if (input.trim() === "") {
    return [];
  }
  const lintingResults = await execSwiftlint(
    request.document.uri,
    request.parameters || [],
    {
      encoding: "utf8",
      input
    }
  );
  const reports: Report[] = JSON.parse(lintingResults) || [];
  const diagnostics = reports.map(
    reportToPreciseDiagnosticForDocument(request.document)
  );
  return diagnostics;
}

export async function diagnosticsForFolder(request: {
  folder: WorkspaceFolder;
  parameters?: string[];
}) {
  const lintingResults = await execSwiftlint(
    request.folder.uri,
    ["--path", request.folder.uri.path, ...(request.parameters || [])],
    {
      encoding: "utf8",
      env: process.env
    }
  );
  const reports: Report[] = JSON.parse(lintingResults) || [];
  const diagnostics = reports.map(reportToSimpleDiagnostic());
  const diagnosticsByFile = new Map<string, Diagnostic[]>();
  for (const { file, diagnostic } of diagnostics) {
    const previous = diagnosticsByFile.get(file) || [];
    diagnosticsByFile.set(file, [...previous, diagnostic]);
  }
  return diagnosticsByFile;
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
      return new Diagnostic(range, report.reason, severity);
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
      diagnostic: new Diagnostic(range, report.reason, severity)
    };
  };
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

function execSwiftlint(
  uri: Uri,
  parameters: string[],
  options: ExecFileOptionsWithStringEncoding & { input?: string }
): Promise<string> {
  return new Promise((resolve, reject) => {
    const exec = execFile(
      Current.config.swiftLintPath(uri),
      ["--quiet", "--reporter", "json", ...parameters],
      {
        encoding: "utf8",
        env: process.env,
        maxBuffer: 1024 * 500,
        ...(options || {})
      },
      (error, stdout, stderr) => {
        if (error && isExecException(error) && error.code === 2) {
          return resolve(stdout);
        } else if (error) {
          console.log("stderr", stderr);
          return reject(error);
        } else {
          return resolve(stdout);
        }
      }
    );
    if (options.input !== undefined) {
      exec.stdin!.end(options.input);
    }
  });
}

function isExecException(error: Error): error is ExecException {
  return "code" in error;
}
