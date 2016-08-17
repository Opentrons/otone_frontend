if (require('electron-squirrel-startup')) return;

const fs = require('fs')
const child_process = require('child_process')
const http       = require('http')
const path = require('path')

const electron = require('electron')
const {app, BrowserWindow, powerSaveBlocker} = electron

const autobahn = require('autobahn')
const $ = jQuery = require('jquery')
const nightlife  = require('nightlife-rabbit')
const winston = require('winston')

const addMenu = require('./menu').addMenu;
const initAutoUpdater = require('./update_helpers').initAutoUpdater;

let backendProcess = undefined
let powerSaverID = undefined

if (process.env.NODE_ENV == 'development'){
    require('electron-debug')({showDevTools: true});
}

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

function startWampRouter() {

    // winston seems to not create the file if it doesn't exist already
    // to avoid this, .appendFileSync() will create the file incase it's not there
    fs.appendFileSync(app.getPath('userData') + '/otone_data/router_logfile.txt', '');

    var wamp_logger = new (winston.Logger)({
        transports: [
            new (winston.transports.File)({
                level: 'verbose',
                name: 'wamp-router',
                filename: app.getPath('userData') + '/otone_data/router_logfile.txt',
                json: false,
                maxsize: 10*1024*1024,
                maxFiles: 5,
                timestamp: function(){
                  const d = new Date();
                  return d.toISOString();
                }
            })
        ]
    });

    var router = nightlife.createRouter({
        httpServer: http.createServer(),
        port: 31947,
        path: '/ws',
        autoCreateRealms: true,
        logger: wamp_logger
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

    var backendProcessName = path.basename(backendProcess.spawnfile)
    console.log(
        'Backend process successfully started with PID', backendProcess.pid,
        'and using spawnfile', backendProcessName
    )

    backendProcess.shutdown = function (){
        if (process.platform == "darwin") {
            child_process.spawnSync('pkill', ['-9', backendProcessName]);
        }
        else if (process.platform == "win32") {
            child_process.spawnSync('taskkill', ['/T', '/F',  '/IM', backendProcessName]);
        }
        console.log('Backend process successfully shutdown')
    }
}

/**
 * Starts otone_client backend executable; kills existing process if any
 */
function startBackend() {
    const userDataPath = app.getPath('userData');
    console.log('User Data Path', userDataPath)

    if (process.platform == "darwin") {
      var backend_path = app.getAppPath() + "/backend-dist/mac/otone_client";
      execFile(backend_path, [userDataPath]);
    }

    else if (process.platform == "win32") {
      var backend_path = app.getAppPath() + "\\backend-dist\\win\\otone_client.exe";
      execFile(backend_path, [userDataPath]);
    }
    else{
      console.log('\n\n\n\nunknown OS: '+process.platform+'\n\n\n\n');
    }
}

function blockPowerSaver() {
  powerSaverID = powerSaveBlocker.start('prevent-display-sleep')
}

function createContainersFolder() {
  try{
    fs.mkdirSync(app.getUserContainersPath());
  }
  catch(e) {
    //file already exists
  }
}

app.getUserContainersPath = function(){
  return path.join(app.getPath('userData'), 'containers');
}

app.getUserJSONFiles = function(){
  var filenames = fs.readdirSync(app.getUserContainersPath());

  return filenames.map(function(fileName){
    return path.join(app.getUserContainersPath(), fileName);
  });
}

app.on('ready', createWindow)
app.on('ready', startWampRouter)
app.on('ready', startBackend)
app.on('ready', addMenu)
app.on('ready', blockPowerSaver)
app.on('ready', initAutoUpdater)
app.on('ready', createContainersFolder)

app.on('window-all-closed', function () {
    app.quit()
})

app.on('quit', function(){
    process.once("uncaughtException", function (error) {
      // Ugly but convenient. If we have more than one uncaught exception
      // then re-raise. Otherwise Do nothing as that exception is caused by
      // an attempt to shutdown the backend process
      if (process.listeners("uncaughtException").length > 1) {
          throw error;
      }
    });
    backendProcess.shutdown();
    if (powerSaveBlocker.isStarted(powerSaverID)) {
      powerSaveBlocker.stop(powerSaverID);
    }
});
