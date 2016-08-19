const electron = require('electron');
const {dialog, Menu} = electron
const settings = require('electron-settings')

settings.on('create', pathToSettings => {
  const result = dialog.showMessageBox({
    message: `Do you want to turn on auto updating?`,
    buttons: ["Yes", "No"]
  });

  if (result == 0) {
    settings.setSync('autoUpdate', true);
  } else if (result == 1) {
    settings.setSync('autoUpdate', false);
  }
})

function getAutoUpdateToggle() {
  return settings.getSync('autoUpdate')
}

function toggleAutoUpdating() {
  settings.setSync('autoUpdate', !getAutoUpdateToggle())
}

module.exports = {
  getAutoUpdateToggle,
  toggleAutoUpdating
}
