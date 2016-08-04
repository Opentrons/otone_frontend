const electron = require("electron");
const {autoUpdater} = electron;

var AUTO_UPDATE_URL =  'https://ot-app-releases.herokuapp.com';


function initAutoUpdater () {
  autoUpdater.on(
    'error',
    (err) => console.log(`Update error: ${err.message}`)
  )

  autoUpdater.on(
    'checking-for-update',
    () => console.log('Checking for update')
  )

  autoUpdater.on(
    'update-available',
    () => console.log('Update available')
  )

  autoUpdater.on(
    'update-not-available',
    () => console.log('Update not available')
  )

  autoUpdater.on(
    'update-downloaded',
    (e, notes, name, date, url) => console.log(`Update downloaded: ${name}: ${url}`)
  )

  autoUpdater.setFeedURL(AUTO_UPDATE_URL)
  autoUpdater.checkForUpdates()
}


function okButtonHandler(buttonIndex) {
    console.log('ok button app...')
}

function updateButtonHandler(buttonIndex) {
    console.log('Updating app...')
}

let updateButtons = [
    ['Ok', okButtonHandler],
    ['Update', updateButtonHandler]
];


module.exports = {
    updateButtons,
    initAutoUpdater
};


