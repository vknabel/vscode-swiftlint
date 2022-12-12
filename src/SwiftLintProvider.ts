import {
  TextDocument,
  DiagnosticCollection,
  CodeAction,
  languages,
  ExtensionContext,
  workspace,
  WorkspaceFolder,
  commands,
  Uri,
  CodeActionKind,
  window,
} from "vscode";
import Current from "./Current";
import {
  diagnosticsForDocument,
  diagnosticsForFolder,
  fixDocument,
  fixForFolder,
} from "./lint";
import { handleFormatError } from "./UserInteraction";
import * as path from "path";
import { match } from "minimatch";

export class SwiftLint {
  private latestDocumentVersion = new Map<Uri, number>();
  private diagnosticCollection!: DiagnosticCollection;

  public activate(_context: ExtensionContext) {
    this.diagnosticCollection =
      languages.createDiagnosticCollection("SwiftLint");

    languages.registerCodeActionsProvider("swift", {
      provideCodeActions: async (
        document,
        range,
        context,
        token
      ): Promise<CodeAction[]> => {
        if (context.diagnostics.length === 0) {
          return [];
        }
        await this.lintDocument(document);
        const diagnostics =
          this.diagnosticCollection.get(document.uri) || context.diagnostics;
        const action = new CodeAction(
          "Fix all autocorrect issues",
          CodeActionKind.SourceFixAll
        );
        action.diagnostics = [...diagnostics].filter(
          (diagnostic) => diagnostic.range.intersection(range) !== undefined
        );
        action.command = {
          title: "Fix all autocorrect issues",
          command: Current.commands.fixDocument,
          arguments: [document.uri],
        };
        return [action];
      },
    });

    commands.registerCommand(Current.commands.lintWorkspace, () => {
      this.lintWorkspace();
    });
    commands.registerCommand(Current.commands.fixWorkspace, () => {
      this.fixWorkspace().then(() => this.lintWorkspace());
    });
    commands.registerCommand(Current.commands.fixDocument, (...args) =>
      setTimeout(() => performfixDocument(...args), 1)
    );
    const performfixDocument = async (...args: any[]) => {
      let docs: TextDocument[];
      if (args.length === 0 && window.activeTextEditor) {
        docs = [window.activeTextEditor.document];
      } else {
        docs = [];
        for (let arg of args) {
          const textDocument = await workspace.openTextDocument(arg);
          docs.push(textDocument);
        }
      }
      for (const doc of docs) {
        if (doc.isDirty) {
          await doc.save();
        }
        await this.fixDocument(doc);
        setTimeout(() => {
          const updatedDoc = workspace.textDocuments.find(
            (textDoc) => textDoc.uri === doc.uri
          );
          this.lintDocument(updatedDoc ?? doc);
        }, 100);
      }
    };

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

    workspace.onDidDeleteFiles((fileDeleteEvent) => {
      for (const uri of fileDeleteEvent.files) {
        this.diagnosticCollection.delete(uri);
      }
    });

    this.lintWorkspaceIfNeeded();
  }

  private lintWorkspaceIfNeeded() {
    if (Current.config.autoLintWorkspace()) {
      this.lintWorkspace();
    }
  }

  public async fixDocument(document: TextDocument) {
    if (document.languageId !== "swift" || document.uri.scheme === "git") {
      return;
    }
    const workspaceFolder =
      (workspace.getWorkspaceFolder(document.uri) ||
        workspace.workspaceFolders?.[0]) ??
      null;
    await fixDocument({ document, workspaceFolder, parameters: [] });
  }

  public async lintDocument(document: TextDocument) {
    if (document.languageId !== "swift" || document.uri.scheme === "git") {
      return;
    }
    const lintedVersion =
      this.latestDocumentVersion.get(document.uri) ?? Number.MIN_SAFE_INTEGER;
    if (lintedVersion >= document.version) {
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
      this.latestDocumentVersion.set(document.uri, document.version);
    } catch (error) {
      handleFormatError(error, document.uri);
    }
  }

  public async fixWorkspace() {
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
          await fixForFolder({ folder });
        } catch (error) {
          console.log(error);
          handleFormatError(error, folder.uri);
        }
      }
    );

    await Promise.all(lintWorkspaces);
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
