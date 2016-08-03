module.exports.addMenu = addMenu;
const electron = require("electron");
const {dialog, Menu, MenuItem, app} = electron;
const zipFolder = require('zip-folder');

function addMenu() {
  const template =  [
    {
      label: 'Opentrons',
      submenu: [
        {
          label: 'Download Logs',
          click() { downloadLogs() }
        }
      ]
    }
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
    const iconPath = `${app.getAppPath()}/build-assets/icon.png`;
    if(err) {
      dialog.showMessageBox({
        message: `Log exporting failed with error: \n\n ${err}`,
        buttons: ["OK"],
        icon: iconPath
      });
    } else {
      dialog.showMessageBox({
        message: `Logs successfully exported to ${destination}`,
        buttons: ["OK"],
        icon: iconPath
      });
    }
  });
}

function selectDirectory(callback) {
  dialog.showOpenDialog({
    properties: ['openDirectory']
  }, callback)
}