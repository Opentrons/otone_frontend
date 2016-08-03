if (require('electron-squirrel-startup')) return;
const $ = jQuery = require('jquery')
const http       = require('http')
, CLogger  = require('node-clogger')
const path = require('path')
const nightlife  = require('nightlife-rabbit')
    , autobahn = require('autobahn')
const child_process = require('child_process')
const electron = require('electron')
const {app} = electron
const BrowserWindow = electron.BrowserWindow
const addMenu = require('./menu').addMenu;

let backendProcess = undefined

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow () {
  mainWindow = new BrowserWindow({width: 1200, height: 900})
  mainWindow.loadURL("file://" + __dirname + "/src/index.html")

  mainWindow.on('closed', function () {
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

/**
 * Starts an executable in a separate process
 * @param {param} filePath - path to an executable
 * @param {Array} extraArgs - Array of arguments to pass during invocation of file
 */
function execFile(filePath, extraArgs) {
    backendProcess = child_process.execFile(filePath, extraArgs, {stdio: 'ignore' }, function(error, stdout, stderr){
        console.log(stdout);
        console.log(stderr);
        if (error) {
            throw error;
        }
    });
}

/**
 * Starts otone_client backend executable; kills existing process if any
 */
function startBackend() {
    const userDataPath = app.getPath('userData');

    global.userDataPath = userDataPath;

    if (process.platform == "darwin") {
        child_process.exec('pkill -9 \"otone_client\"', function(){
            var backend_path = app.getAppPath() + "/backend-dist/mac/otone_client";
            execFile(backend_path, [userDataPath]);
        });
    }

    else if (process.platform == "win32") {
        child_process.exec('taskkill /T /F /IM otone_client.exe', function(){
            var backend_path = app.getAppPath() + "\\backend-dist\\win\\otone_client.exe";
            execFile(backend_path, [userDataPath]);
        });
    }
    else{
        console.log('\n\n\n\nunknown OS: '+process.platform+'\n\n\n\n');
    }
}

app.on('ready', createWindow)
app.on('ready', startWampRouter)
app.on('ready', startBackend)
app.on('ready', addMenu)
