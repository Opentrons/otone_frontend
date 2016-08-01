const electron = require('electron');
const {app, dialog, BrowserWindow, Menu} = require('electron');


function setupMenu() {
  var application_menu = [{
    label: 'Help',
    submenu: [{
      label: 'Update',
      click: () => {
        dialog.showMessageBox({
          message: 'Check for updates',
          buttons: ['Update', 'ok']
        })
      }
    }]
  }];

  if (process.platform == 'darwin') {
    const name = app.getName();
    application_menu.unshift({
      label: name,
      submenu: [
        {
        label: 'About ' + name,
        role: 'about'
      },
      {
        type: 'separator'
      },
      {
        label: 'Services',
        role: 'services',
        submenu: []
      },
      {
        type: 'separator'
      },
      {
        label: 'Hide ' + name,
        accelerator: 'Command+H',
        role: 'hide'
      },
      {
        label: 'Hide Others',
        accelerator: 'Command+Shift+H',
        role: 'hideothers'
      },
      {
        label: 'Show All',
        role: 'unhide'
      },
      {
        type: 'separator'
      },
      {
        label: 'Quit',
        accelerator: 'Command+Q',
        click: () => { app.quit(); }
      },
      ]
    });
  }

  menu = Menu.buildFromTemplate(application_menu);
  Menu.setApplicationMenu(menu);
}

module.exports = setupMenu;
