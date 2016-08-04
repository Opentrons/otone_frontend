module.exports.addMenu = addMenu;
const electron = require("electron");
const {dialog, Menu, MenuItem, app} = electron;
const zipFolder = require('zip-folder');

function addMenu() {
  const template =  [{
    label: "OpenTrons",
    submenu: [
        { label: "About", selector: "orderFrontStandardAboutPanel:" },
        { type: "separator" },
        { label: "Quit", accelerator: "Command+Q", click: function() { app.quit(); }}
    ]}, {
    label: "Edit",
    submenu: [
        { label: "Undo", accelerator: "CmdOrCtrl+Z", selector: "undo:" },
        { label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:" },
        { type: "separator" },
        { label: "Cut", accelerator: "CmdOrCtrl+X", selector: "cut:" },
        { label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:" },
        { label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:" },
        { label: "Select All", accelerator: "CmdOrCtrl+A", selector: "selectAll:" }
    ]}, {
    label: 'File',
    submenu: [
      {
        label: 'Download Logs',
        click() { downloadLogs() }
      }
    ]}
  ]

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function downloadLogs() {
  selectDirectory((folder) => {
    if(folder) {
      const source = app.getPath('userData') + "/otone_data";
      const destination = folder[0] + "/otone_data.zip";

      zip(source, destination);
    };
  });
}

function zip(source, destination) {
  zipFolder(source, destination, function(err) {
    if(err) {
      dialog.showMessageBox({
        message: `Log exporting failed with error: \n\n ${err}`,
        buttons: ["OK"]
      });
    } else {
      dialog.showMessageBox({
        message: `Logs successfully exported to ${destination}`,
        buttons: ["OK"]
      });
    }
  });
}

function selectDirectory(callback) {
  dialog.showOpenDialog({
    properties: ['openDirectory']
  }, callback)
}
