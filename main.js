if (require('electron-squirrel-startup')) return;

const $ = jQuery = require('jquery')
const http       = require('http')
    , CLogger  = require('node-clogger')

const nightlife  = require('nightlife-rabbit')
    , autobahn = require('autobahn')

const electron = require('electron')
// Module to control application life.
const app = electron.app
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({width: 1200, height: 900})

  // and load the index.html of the app.
  // mainWindow.loadURL(`file://${__dirname}/index.html`)
  mainWindow.loadURL("file://" + __dirname + "/src/index.html")

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}

function startWampRouter() {
    var router = nightlife.createRouter({
        httpServer: http.createServer(),
        port: 8080,
        path: '/ws',
        autoCreateRealms: true,

        logger: new CLogger({name: 'nightlife-router'})
    });
}

function startBackend() {
  // const spawn = require("child_process").spawn;
  // const backend = spawn('python', ['./otone_backend/backend/otone_client.py'])
  //
  // backend.stdout.on('data', (data) => {
  //   console.log(`stdout: ${data}`);
  // });
  //
  // backend.stderr.on('data', (data) => {
  //   console.log(`stderr: ${data}`);
  // });

  const exec = require("child_process").exec;
  exec("python ./otone_backend/backend/otone_client.py");
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)
app.on('ready', startWampRouter)
app.on('ready', startBackend)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
