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
  console.log(`before toggle: ${getAutoUpdateToggle()}`)
  settings.setSync('autoUpdate', !getAutoUpdateToggle())
  console.log(`after toggle: ${getAutoUpdateToggle()}`)
}

module.exports = {
  getAutoUpdateToggle,
  toggleAutoUpdating
}
