import {
  TextDocument,
  DiagnosticCollection,
  languages,
  ExtensionContext,
  workspace,
  WorkspaceFolder,
  commands,
} from "vscode";
import Current from "./Current";
import { diagnosticsForDocument, diagnosticsForFolder } from "./lint";
import { handleFormatError } from "./UserInteraction";
import * as path from "path";

export class SwiftLint {
  private diagnosticCollection!: DiagnosticCollection;

  public activate(_context: ExtensionContext) {
    this.diagnosticCollection =
      languages.createDiagnosticCollection("SwiftLint");
    commands.registerCommand(Current.commands.lintWorkspace, () => {
      this.lintWorkspace();
    });
    workspace.onDidChangeConfiguration((configChange) => {
      if (Current.config.affectsConfiguration(configChange)) {
        this.lintWorkspaceIfNeeded();
      }
    });

    workspace.onDidSaveTextDocument((document) => {
      if (path.basename(document.fileName) === ".swiftlint.yml") {
        this.lintWorkspaceIfNeeded();
      } else {
        this.lintDocument(document);
      }
    });

    workspace.onDidOpenTextDocument((document) => {
      this.lintDocument(document);
    });

    this.lintWorkspaceIfNeeded();
  }

  private lintWorkspaceIfNeeded() {
    if (Current.config.autoLintWorkspace()) {
      this.lintWorkspace();
    }
  }

  public async lintDocument(document: TextDocument) {
    if (document.languageId !== "swift" || document.uri.scheme === "git") {
      return;
    }
    try {
      const workspaceFolder =
        (workspace.getWorkspaceFolder(document.uri) ||
          workspace.workspaceFolders?.[0]) ??
        null;
      const diagnostics = await diagnosticsForDocument({
        document,
        parameters: [],
        workspaceFolder,
      });
      this.diagnosticCollection.set(document.uri, diagnostics);
    } catch (error) {
      handleFormatError(error, document.uri);
    }
  }

  public async lintWorkspace() {
    const files = await workspace.findFiles("**/*.swift", "**/.build/**");
    const workspaces = new Set<WorkspaceFolder>();
    for (const uri of files) {
      const workspaceFolder = workspace.getWorkspaceFolder(uri);
      if (workspaceFolder) {
        workspaces.add(workspaceFolder);
      }
    }

    const lintWorkspaces = Array.from(workspaces.values()).map(
      async (folder) => {
        try {
          const diagnosticsByFile = await diagnosticsForFolder({ folder });
          for (const file of diagnosticsByFile.keys()) {
            this.diagnosticCollection.set(
              folder.uri.with({ path: file }),
              diagnosticsByFile.get(file)
            );
          }
        } catch (error) {
          console.log(error);
          handleFormatError(error, folder.uri);
        }
      }
    );

    await Promise.all(lintWorkspaces);
  }
}
