function okButtonHandler(buttonIndex) {
    console.log('ok button app...')
}

function updateButtonHandler(buttonIndex) {
    console.log('Updating app...')
}

let updateButtons = [
    ['Ok', okButtonHandler],
    ['Update', updateButtonHandler]
]

module.exports = updateButtons;