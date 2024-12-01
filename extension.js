const vscode = require("vscode");
const path = require("path");
const fs = require("fs");

let clipboardItem = null;
let clipboardAction = null; // "copy" or "cut"

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
    if (element.contextValue === "file") {
      element.command = {
        command: "vscode.open", // VSCode 標準のコマンド
        title: "Open File",
        arguments: [element.resourceUri],
      };
      // Markdown ファイルの場合に専用の contextValue を設定
      if (element.resourceUri.path.endsWith(".md")) {
        element.contextValue = "markdownFile"; // Markdown 専用の contextValue
      }
    }
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

  // New Fileコマンド
  context.subscriptions.push(
    vscode.commands.registerCommand("urnote.newFile", (item) => {
      if (item && item.resourceUri) {
        createNewFile(item.resourceUri.fsPath, notesProvider);
      }
    })
  );

  // New Folderコマンド
  context.subscriptions.push(
    vscode.commands.registerCommand("urnote.newFolder", (item) => {
      if (item && item.resourceUri) {
        createNewFolder(item.resourceUri.fsPath, notesProvider);
      }
    })
  );

  // Markdown Preview コマンド
  context.subscriptions.push(
    vscode.commands.registerCommand("urnote.openMarkdownPreview", (item) => {
      if (item && item.resourceUri) {
        vscode.commands.executeCommand(
          "markdown.showPreview",
          item.resourceUri
        );
      } else {
        vscode.window.showErrorMessage("No valid Markdown file selected.");
      }
    })
  );

  // Show in Explorer コマンド
  context.subscriptions.push(
    vscode.commands.registerCommand("urnote.showInExplorer", (item) => {
      if (item && item.resourceUri) {
        showInExplorer(item.resourceUri.fsPath);
      }
    })
  );

  // Copy Path コマンド
  context.subscriptions.push(
    vscode.commands.registerCommand("urnote.copyPath", (item) => {
      if (item && item.resourceUri) {
        copyPath(item.resourceUri.fsPath);
      }
    })
  );

  // Copy コマンド
  context.subscriptions.push(
    vscode.commands.registerCommand("urnote.copy", (item) => {
      if (item && item.resourceUri) {
        copyItem(item);
      }
    })
  );

  // Cut コマンド
  context.subscriptions.push(
    vscode.commands.registerCommand("urnote.cut", (item) => {
      if (item && item.resourceUri) {
        cutItem(item);
      }
    })
  );

  // Paste コマンド
  context.subscriptions.push(
    vscode.commands.registerCommand("urnote.paste", (item) => {
      if (item && item.resourceUri) {
        pasteItem(item.resourceUri.fsPath, notesProvider);
      }
    })
  );

  // Rename コマンド
  context.subscriptions.push(
    vscode.commands.registerCommand("urnote.renameItem", (item) => {
      if (item && item.resourceUri) {
        renameItem(item.resourceUri.fsPath, notesProvider);
        notesProvider.refresh();
      }
    })
  );

  // Delete コマンド
  context.subscriptions.push(
    vscode.commands.registerCommand("urnote.deleteItem", (item) => {
      if (item && item.resourceUri) {
        deleteItem(item.resourceUri.fsPath, notesProvider);
        notesProvider.refresh();
      }
    })
  );
  // Refresh コマンド
  context.subscriptions.push(
    vscode.commands.registerCommand("urnote.refresh", () => {
      notesProvider.refresh(); // ビューを更新
      vscode.window.showInformationMessage("View refreshed!");
    })
  );

  // New File in Root コマンド
  context.subscriptions.push(
    vscode.commands.registerCommand("urnote.newFileInRoot", () => {
      const rootPath = vscode.workspace
        .getConfiguration("urnote")
        .get("rootFolder");
      if (rootPath) {
        createNewFileInRoot(rootPath, notesProvider);
      } else {
        vscode.window.showErrorMessage("Root folder is not set.");
      }
    })
  );

  // New Folder in Root コマンド
  context.subscriptions.push(
    vscode.commands.registerCommand("urnote.newFolderInRoot", () => {
      const rootPath = vscode.workspace
        .getConfiguration("urnote")
        .get("rootFolder");
      if (rootPath) {
        createNewFolderInRoot(rootPath, notesProvider);
      } else {
        vscode.window.showErrorMessage("Root folder is not set.");
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
function createNewFile(folderPath, notesProvider) {
  vscode.window
    .showInputBox({ prompt: "Enter the new file name" })
    .then((fileName) => {
      if (!fileName) {
        vscode.window.showErrorMessage("File name cannot be empty.");
        return;
      }
      // ファイル名に拡張子がない場合は .md を追加
      if (!path.extname(fileName)) {
        fileName += ".md";
      }

      const filePath = path.join(folderPath, fileName);
      try {
        fs.writeFileSync(filePath, ""); // 空ファイルを作成
        // vscode.window.showInformationMessage(`Created file: ${filePath}`);
        notesProvider.refresh(); // 自動更新
      } catch (err) {
        vscode.window.showErrorMessage(`Failed to create file: ${err.message}`);
      }
    });
}

// フォルダ作成コマンド
function createNewFolder(folderPath, notesProvider) {
  vscode.window
    .showInputBox({ prompt: "Enter the new folder name" })
    .then((folderName) => {
      if (!folderName) {
        vscode.window.showErrorMessage("Folder name cannot be empty.");
        return;
      }

      const newFolderPath = path.join(folderPath, folderName);
      try {
        fs.mkdirSync(newFolderPath);
        // vscode.window.showInformationMessage(
        //   `Created folder: ${newFolderPath}`
        // );
        notesProvider.refresh(); // 自動更新
      } catch (err) {
        vscode.window.showErrorMessage(
          `Failed to create folder: ${err.message}`
        );
      }
    });
}

// Show in Explorerコマンド
function showInExplorer(itemPath) {
  if (!fs.existsSync(itemPath)) {
    vscode.window.showErrorMessage("File does not exist.");
    return;
  }

  // ファイルをエクスプローラーで表示
  vscode.commands
    .executeCommand("revealFileInOS", vscode.Uri.file(itemPath))
    .then(
      () => {
        console.log("File revealed in OS.");
      },
      (err) => {
        vscode.window.showErrorMessage(`Failed to reveal file: ${err.message}`);
      }
    );
}

//Copy Pathコマンド
function copyPath(itemPath) {
  if (!fs.existsSync(itemPath)) {
    vscode.window.showErrorMessage("File does not exist.");
    return;
  }
  vscode.env.clipboard.writeText(itemPath).then(() => {
    // vscode.window.showInformationMessage("Path copied to clipboard!");
  });
}

// Copy コマンド
function copyItem(item) {
  clipboardItem = item.resourceUri.fsPath;
  clipboardAction = "copy";
  // vscode.window.showInformationMessage(`Copied: ${clipboardItem}`);
}

// Cut コマンド
function cutItem(item) {
  clipboardItem = item.resourceUri.fsPath;
  clipboardAction = "cut";
  // vscode.window.showInformationMessage(`Cut: ${clipboardItem}`);
}

// Paste コマンド
function pasteItem(targetPath, notesProvider) {
  if (!clipboardItem || !clipboardAction) {
    vscode.window.showErrorMessage("Nothing to paste.");
    return;
  }

  const target = path.join(targetPath, path.basename(clipboardItem));
  try {
    if (clipboardAction === "copy") {
      if (fs.lstatSync(clipboardItem).isDirectory()) {
        fs.cpSync(clipboardItem, target, { recursive: true });
      } else {
        fs.copyFileSync(clipboardItem, target);
      }
    } else if (clipboardAction === "cut") {
      fs.renameSync(clipboardItem, target);
      clipboardItem = null;
      clipboardAction = null;
    }
    // vscode.window.showInformationMessage(`Pasted to: ${target}`);
    notesProvider.refresh();
  } catch (err) {
    vscode.window.showErrorMessage(`Failed to paste: ${err.message}`);
  }
}

// Rename コマンド
function renameItem(itemPath, notesProvider) {
  const ext = path.extname(itemPath);
  vscode.window
    .showInputBox({
      prompt: "Enter the new name",
      value: path.basename(itemPath, ext), // 拡張子を除いた名前を初期値として表示
    })
    .then((newName) => {
      if (!newName) {
        vscode.window.showErrorMessage("Name cannot be empty.");
        return;
      }
      const newPath = path.join(path.dirname(itemPath), newName + ext);
      try {
        fs.renameSync(itemPath, newPath);
        // vscode.window.showInformationMessage(`Renamed to: ${newPath}`);
        notesProvider.refresh(); // 表示を更新
      } catch (err) {
        vscode.window.showErrorMessage(`Failed to rename: ${err.message}`);
      }
    });
}

// Delete コマンド
function deleteItem(itemPath, notesProvider) {
  const isConfirmed = vscode.window.showInformationMessage(
    `Are you sure you want to delete: ${itemPath}? This action cannot be undone.`,
    { modal: true },
    "Yes"
  );

  isConfirmed.then((choice) => {
    if (choice === "Yes") {
      try {
        const stats = fs.lstatSync(itemPath);
        if (stats.isDirectory()) {
          fs.rmdirSync(itemPath, { recursive: true });
        } else {
          fs.unlinkSync(itemPath);
        }
        // vscode.window.showInformationMessage(`Deleted: ${itemPath}`);
        notesProvider.refresh(); // 表示を更新
      } catch (err) {
        vscode.window.showErrorMessage(`Failed to delete: ${err.message}`);
      }
    }
  });
}

// Root Folderに新しいファイルを作成
function createNewFileInRoot(rootPath, notesProvider) {
  vscode.window
    .showInputBox({ prompt: "Enter the new file name" })
    .then((fileName) => {
      if (!fileName) {
        vscode.window.showErrorMessage("File name cannot be empty.");
        return;
      }
      if (!path.extname(fileName)) {
        fileName += ".md";
      }

      const filePath = path.join(rootPath, fileName);
      try {
        fs.writeFileSync(filePath, ""); // 空ファイルを作成
        //vscode.window.showInformationMessage(`Created file: ${filePath}`);
        notesProvider.refresh(); // サイドビューを更新
      } catch (err) {
        vscode.window.showErrorMessage(`Failed to create file: ${err.message}`);
      }
    });
}

// Root Folderに新しいフォルダを作成
function createNewFolderInRoot(rootPath, notesProvider) {
  vscode.window
    .showInputBox({ prompt: "Enter the new folder name" })
    .then((folderName) => {
      if (!folderName) {
        vscode.window.showErrorMessage("Folder name cannot be empty.");
        return;
      }

      const folderPath = path.join(rootPath, folderName);
      try {
        fs.mkdirSync(folderPath);
        // vscode.window.showInformationMessage(`Created folder: ${folderPath}`);
        notesProvider.refresh(); // サイドビューを更新
      } catch (err) {
        vscode.window.showErrorMessage(
          `Failed to create folder: ${err.message}`
        );
      }
    });
}
