# URNote README

URNote is a Visual Studio Code extension designed for efficient note and file management. It adds a dedicated sidebar where you can set a root folder, create, edit, delete, rename, and organize files effortlessly.

## Features

![URNote Example Interface](https://github.com/yuna495/urnote/blob/master/image/sample.png?raw=true)

- **Dedicated Sidebar:**

Adds a "Notes" view to the VSCode sidebar.
Displays all files and folders under the selected root folder.

- **Root Folder Management:**

Easily set the root folder via the command palette.
Automatically reflects all contents of the root folder in the sidebar.

- **File and Folder Operations:**

Create new files and folders (if the extension is omitted, .md is added automatically).
Rename files and folders while preserving their extensions.
Delete files and folders safely.
Supports copy, cut, and paste operations.

- **Path Operations:**

Copy the path of selected files or folders to the clipboard.
Open files in the system file explorer.

- **View Refresh:**

Manually refresh the sidebar content using the refresh button at the top of the sidebar.

## Requirements

Visual Studio Code version 1.94.0 or later.
Node.js and npm (required for development).

## Extension Settings

- **How to Set the Root Folder**
-

Open the Visual Studio Code Command Palette (Ctrl+Shift+P).
Search for and execute "URNote: Select Root Folder".
In the dialog box, select the desired root folder.
The sidebar will display all files and folders under the selected folder.

- **Refreshing the Sidebar**
-

Click the refresh button at the top of the sidebar to manually update its content.

## Known Issues

## Release Notes

### 1.0.0

- Initial release of URNote.

## 1.1.0

- Add RightClickMenu"Open Markdown Preview"

---

## Working with Markdown

### Managing Notes

- **Create a New Note:**

  - Right-click on the blank area in the sidebar and select "New File."
  
  - Enter a file name. If no extension is provided, .md is automatically added.
  
- **Edit Existing Notes:**

  - Left-click on a note to open it in the editor.

- **Organize Notes:**

  - Right-click on a note to rename or delete it.
  
- **Locate Files:**

  - Right-click on a note and select "Show in Explorer" to open the file in the system file explorer.

## For more information

**Can someone please tell me how to implement the drag and drop feature!**

- [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
- [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
