const vscode = require("vscode");
const path = require("path");
const fs = require("fs");

class NotesProvider {
  constructor(rootPath) {
    this.rootPath = rootPath || null;
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element) {
    return element;
  }

  getChildren(element) {
    if (!this.rootPath) {
      return Promise.resolve([]);
    }

    // ルートフォルダの場合
    if (!element) {
      return this._getItems(this.rootPath);
    }

    // 子要素の場合
    return this._getItems(element.resourceUri.fsPath);
  }

  _getItems(dirPath) {
    try {
      const items = fs.readdirSync(dirPath).map((file) => {
        const filePath = path.join(dirPath, file);
        const isDirectory = fs.lstatSync(filePath).isDirectory();

        const treeItem = new vscode.TreeItem(
          file,
          isDirectory
            ? vscode.TreeItemCollapsibleState.Collapsed
            : vscode.TreeItemCollapsibleState.None
        );
        treeItem.resourceUri = vscode.Uri.file(filePath);
        treeItem.contextValue = isDirectory ? "folder" : "file";

        // アイコンを設定
        treeItem.iconPath = isDirectory
          ? new vscode.ThemeIcon("folder") // フォルダ用アイコン
          : new vscode.ThemeIcon("file"); // ファイル用アイコン

        return treeItem;
      });

      // フォルダを上に、ファイルを下に並び替え
      return Promise.resolve(
        items.sort((a, b) => {
          if (a.contextValue === "folder" && b.contextValue === "file")
            return -1;
          if (a.contextValue === "file" && b.contextValue === "folder")
            return 1;
          return a.label.localeCompare(b.label);
        })
      );
    } catch (err) {
      vscode.window.showErrorMessage(`Error reading directory: ${err.message}`);
      return Promise.resolve([]);
    }
  }
}

function activate(context) {
  let rootPath =
    vscode.workspace.getConfiguration("urnote").get("rootFolder") || null;
  const notesProvider = new NotesProvider(rootPath);

  vscode.window.registerTreeDataProvider("urnoteExplorer", notesProvider);

  context.subscriptions.push(
    vscode.commands.registerCommand("urnote.selectRootFolder", async () => {
      const selectedFolder = await vscode.window.showOpenDialog({
        canSelectFolders: true,
        canSelectFiles: false,
        canSelectMany: false,
        openLabel: "Select Folder",
      });

      if (selectedFolder && selectedFolder[0]) {
        rootPath = selectedFolder[0].fsPath;

        vscode.workspace
          .getConfiguration("urnote")
          .update("rootFolder", rootPath, vscode.ConfigurationTarget.Global);

        vscode.window.showInformationMessage(`Root folder set to: ${rootPath}`);
        notesProvider.rootPath = rootPath;
        notesProvider.refresh();
      }
    })
  );

  if (!rootPath) {
    vscode.window.showWarningMessage(
      'No root folder set. Please use "URNote: Select Root Folder" to set one.'
    );
  }
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
