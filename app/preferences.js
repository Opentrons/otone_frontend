const storage = require('electron-json-storage');

let autoUpdateToggle;

function getAutoUpdateToggle() {
  storage.get('preferences', function(error, data) {
    if (data) {
      autoUpdateToggle = !!data.autoUpdate
    } else if (error) {
      dialog.showMessageBox({
        message: `Error toggling auto-update: \n\n${error}`,
        buttons: ["OK"]
      });
    }
  });
  return autoUpdateToggle
}

function toggleAutoUpdating() {
  storage.set('preferences', {autoUpdate: !!!getAutoUpdateToggle() }, function(error) {
    if (error) {
      dialog.showMessageBox({
        message: `Error toggling auto-update: \n\n${error}`,
        buttons: ["OK"]
      });
    }
  });
  console.log(getAutoUpdateToggle())
}

module.exports = {
  getAutoUpdateToggle,
  toggleAutoUpdating
}
