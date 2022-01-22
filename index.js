//##===----------------------------------------------------------------------===##//
//
//  Author: Nathan Phipps 12/7/20
//
//##===----------------------------------------------------------------------===##//

const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const child_process = require("child_process");
const process = require("process");
const fs = require("fs");

let w;

async function createWindow() {
	w = new BrowserWindow({
		width: 800,
		height: 600,
		webPreferences: {
			nodeIntegration: false, // is default value after Electron v5
			contextIsolation: true, // protect against prototype pollution
			enableRemoteModule: false, // turn off remote
			//allowRunningInsecureContent: false,
			preload: path.join(__dirname, "preload.js"),
		},
	});

	w.removeMenu();
	w.loadFile("index.html");
	w.webContents.openDevTools();
}

app.on("ready", createWindow);

app.on("window-all-closed", function () {
	if (process.platform !== "darwin") app.quit();
});

app.on("activate", function () {
	if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

//##===----------------------------------------------------------------------===##//

ipcMain.on("grepFolderSend", function (event, arg) {
	var pattern = arg.pattern;
	var folder = arg.folder;
	var grep = null;
	var command = null;

	function callback(error, stdout, stderr) {
		grep = String(stdout);
		w.webContents.send("grepFolderReceive", {pattern: pattern, folder: folder, grep: grep});
	}

	if (pattern !== null && pattern !== "") {
		if (process.platform === "win32") {
			command = 'findstr /s /n ' + pattern + ' "' + folder + '\\*"';
		}
		else if (process.platform === "darwin") {
			command = 'grep -rn "' + pattern + '" "' + folder + '"';
		}
	}

	if (command) child_process.exec(command, null, callback);
});

ipcMain.on("openFolderSend", function (event, arg) {
	w.webContents.send(
		"openFolderReceive",
		dialog.showOpenDialogSync(w, { properties: ["openDirectory"] })
	);
});
