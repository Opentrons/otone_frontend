const electron = require("electron");
const {app, dialog, autoUpdater} = electron;

var UPDATE_SERVER_URL =  'http://ot-app-releases.herokuapp.com';


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
   function(e, releaseNotes, releaseName, date, url) {
       console.log(`Update downloaded: ${releaseName}: ${url}`)
       console.log(`Update Info: ${releaseNotes}`)

       var index = dialog.showMessageBox({
           type: 'info',
           buttons: ['Restart','Later'],
           title: "OT App", // TODO: Make this a config
           message: 'The new version has been downloaded. Please restart the application to apply the updates.',
           detail: releaseName + "\n\n" + releaseNotes
       });

       if (index === 1) {
           return;
       }

       autoUpdater.quitAndInstall();
   }
  )

  var AUTO_UPDATE_URL = UPDATE_SERVER_URL + '?version=' + app.getVersion()
  console.log('process.platform = ' + process.platform)
  if (process.platform === 'win32') {
#    AUTO_UPDATE_URL = 'https://s3.amazonaws.com/ot-windows-test/win'
     AUTO_UPDATE_URL = 'https://ot-app-releases.herokuapp.com'
  }
  console.log('Setting AUTO UPDATE URL to ' + AUTO_UPDATE_URL)
  autoUpdater.setFeedURL(AUTO_UPDATE_URL)
  autoUpdater.checkForUpdates()
}

module.exports = {
    initAutoUpdater
};


