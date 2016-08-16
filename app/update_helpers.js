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
  console.log('Setting AUTO UPDATE URL to ' + AUTO_UPDATE_URL)

  /* 
  /  If platform is Windows, use S3 file server instead of update server.
  /  
  /  Updater will...
  /   1. check for updates specified in the RESOURCES file and download corresponding
  /      update files ([app_name]-[x].[x].[x]-full.nupkg)
  /   2. trigger a prompt (see above, autoUpdater.on('update-downloaded',... ) asking
  /      whether to restart to apply updates 
  /
  / Example RESOURCES file contents (SHA1 hash, filename, size):
  /
  /    E3F67244E4166A65310C816221A12685C83F8E6F MyApp-1.0.0-full.nupkg 600725
  /    0D777EA94C612E8BF1EA7379164CAEFBA6E24463 MyApp-1.0.1-delta.nupkg 6030
  /    85F4D657F8424DD437D1B33CC4511EA7AD86B1A7 MyApp-1.0.1-full.nupkg 600752
  /
  /
  / After a build, the RELEASES file in the release bucket must be updated with content 
  / from the new RELEASES file and the new .nupkg file must be renamed and moved to the
  / release bucket
  /
  / LINK:
  / https://github.com/Squirrel/Squirrel.Windows/blob/master/docs/getting-started/5-updating.md
  /
  */  
  if (process.platform === 'win32') {
    AUTO_UPDATE_URL = 'https://s3-us-west-2.amazonaws.com/ot-app-win-releases/'
  }
  autoUpdater.setFeedURL(AUTO_UPDATE_URL)
  autoUpdater.checkForUpdates()
}

module.exports = {
    initAutoUpdater
};


