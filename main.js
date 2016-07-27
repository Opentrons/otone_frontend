if (require('electron-squirrel-startup')) return;
const $ = jQuery = require('jquery')
const http       = require('http')
, CLogger  = require('node-clogger')
const path = require('path')
const nightlife  = require('nightlife-rabbit')
    , autobahn = require('autobahn')
const child_process = require("child_process")
const electron = require('electron')
const app = electron.app
const BrowserWindow = electron.BrowserWindow

let backendProcess = undefined
const userDataPath = app.getAppPath('userData')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow () {
  mainWindow = new BrowserWindow({width: 1200, height: 900})
  mainWindow.loadURL("file://" + __dirname + "/src/index.html")

  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
    app.quit();
  })
}

app.on('before-quit', function(){

  if (process.platform == "darwin") {
    child_process.exec('pkill -9 \"otone_client\"');
  }
  else if (process.platform == "win32") {
    child_process.exec('taskkill /T /F /IM otone_client.exe');
  }
});

function startWampRouter() {
    var router = nightlife.createRouter({
        httpServer: http.createServer(),
        port: 31947,
        path: '/ws',
        autoCreateRealms: true,
        logger: new CLogger({name: 'nightlife-router'})
    });
}

function startBackend() {
  if (process.platform == "darwin") {
    child_process.exec('pkill -9 \"otone_client\"', function(error, stdout, stderr){

      console.log('*&&*&&&&&&&&&&&&&&&&&&&&&&&', app.getAppPath(), app.getPath('userData'))
      var backend_path = app.getAppPath() + "/backend-dist/mac/otone_client";
        backendProcess = child_process.execFile(backend_path, [userDataPath], {stdio: 'ignore' }, function(error, stdout, stderr){
            console.log(stdout);
            console.log(stderr);
            if (error) {
                throw error;
            }
        });
    });
  }
  else if (process.platform == "win32") {
    child_process.exec('taskkill /T /F /IM otone_client.exe',function(error, stdout, stderr){
      var backend_path = app.getAppPath() + "\\backend-dist\\win\\otone_client.exe";
      backendProcess = child_process.spawn(backend_path, [userDataPath], {stdio: 'ignore' });
    });
  }
  else{
    console.log('\n\n\n\nunknown OS: '+process.platform+'\n\n\n\n')
  }
}

app.on('ready', createWindow)
app.on('ready', startWampRouter)
app.on('ready', startBackend)

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow()
  }
})
