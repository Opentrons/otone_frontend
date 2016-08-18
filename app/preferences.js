const electron = require('electron');
const {dialog, Menu} = electron
const settings = require('electron-settings')

settings.defaults({
  "autoUpdate": false
});

settings.applyDefaultsSync()

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
