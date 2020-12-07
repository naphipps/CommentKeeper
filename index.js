// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain, ipcRenderer, remote, dialog } = require('electron')
const path = require('path')
const process = require('child_process')
const fs = require('fs')

let mainWindow

function createWindow() {
	// Create the browser window.

	var myAppPath = path.join(__dirname, 'preload.js')

	console.log('MY PATH: ', myAppPath)

	mainWindow = new BrowserWindow({
		width: 800,
		height: 600,
		titleBarStyle: "hiddenInset",
		webPreferences: {
			// nodeIntegration: true,
			preload: path.join(__dirname, 'preload.js')
		}
	})

	// and load the index.html of the app.
	mainWindow.loadFile('index.html')

	// Open the DevTools.
	//mainWindow.webContents.openDevTools()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
	// On macOS it is common for applications and their menu bar
	// to stay active until the user quits explicitly with Cmd + Q
	if (process.platform !== 'darwin') app.quit()
})

app.on('activate', function () {
	// On macOS it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

ipcMain.on('grep-project-folder', (event, arg) => {

	var pattern = arg.pattern
	var folder = arg.folder
	
	try 
	{
		
		var result = process.execSync('grep -rn "' + pattern + '" "' + folder + '"')

		event.returnValue = result
	}
	catch (e)
	{
		event.returnValue = null
	}
})

ipcMain.on('open-folder-dialog', (event, arg) => {

	let paths = dialog.showOpenDialogSync(mainWindow, {
		properties: ['openDirectory']
	})

	if (paths) 
	{
		event.returnValue = paths[0]
	}
	else
	{
		event.returnValue = null
	}
})
