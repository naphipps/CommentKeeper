//##===----------------------------------------------------------------------===##//
//
//  Author: Nathan Phipps 12/7/20
//
//##===----------------------------------------------------------------------===##//
//https://stackoverflow.com/questions/44391448/electron-require-is-not-defined

const { contextBridge, ipcRenderer } = require("electron");
const fs = require("fs");
const process = require("process");

contextBridge.exposeInMainWorld("ipc", {
	send: function (channel, data) {
		let whitelist = ["openFolderSend", "grepFolderSend"];
		if (whitelist.includes(channel)) {
			ipcRenderer.send(channel, data);
		}
	},
	receive: function (channel, func) {
		let whitelist = ["openFolderReceive", "grepFolderReceive"];
		if (whitelist.includes(channel)) {
			// strip event as it includes `sender`
			ipcRenderer.on(channel, (event, ...args) => func(...args));
		}
	},
});

contextBridge.exposeInMainWorld("fs", {
	existsSync: function (path) {
		return fs.existsSync(path);
	}
});

contextBridge.exposeInMainWorld("process", {
	platform: function() {
		return process.platform;
	}
});