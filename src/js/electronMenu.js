const {remote} = require('electron');
const {Menu, MenuItem} = remote;
const mainProcess = remote.require('./main');
const path = require('path');
const zipFolder = require('zip-folder');

const template = [
  {
    label: 'File',
    submenu: [
      {
        label: 'Download Logs',
        click() { downloadLogs() }
      }
    ]
  }
]

const menu = Menu.buildFromTemplate(template)
Menu.setApplicationMenu(menu)

function downloadLogs() {
  mainProcess.selectDirectory((folder) => {
    const source = path.join(__dirname, "../otone_data");
    const destination = folder[0] + "/otone_data.zip";

    zipFolder(source, destination, function(err) {
      if(err) {
        alert(`Log exporting failed with error: \n\n ${err}`, err);
      } else {
        alert(`Logs successfully exported to ${destination}`);
      }
    });
  })
}
