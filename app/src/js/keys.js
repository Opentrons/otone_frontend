// JSON defining all key bindings
// follows <keyboard command> : <button id>
var key_bindings = {
    // XY axis jogging
    "down": "btn-deck-down",
    "left": "btn-deck-left",
    "up": "btn-deck-up",
    "right": "btn-deck-right",
    // Z axis jogging
    // mod = Ctrl on Windows/Linux or Command on Mac
    "mod+down": "btn-deck-down-z",
    "mod+up": "btn-deck-up-z",
    // Changing XYZ axis jog step size
    "shift+1": "btn-deck-incr-100",
    "shift+2": "btn-deck-incr-50",
    "shift+3": "defaultXYZStepSizeBtn",
    "shift+4": "btn-deck-incr-10",
    "shift+5": "btn-deck-incr-5",
    "shift+6": "btn-deck-incr-2",
    "shift+7": "btn-deck-incr-1",
    "shift+8": "btn-deck-incr-05",
    "shift+9": "btn-deck-incr-91",
    "shift+0": "btn-deck-incr-135",
    // Homing
    "home home": "btn-deck-all-home",
    "x home": "btn-deck-x-home",
    "y home": "btn-deck-y-home",
    "z home": "btn-deck-z-home",
    "a home": "btn-deck-a-home",
    "b home": "btn-deck-b-home",
    // Changing pipette jog step size
    // mod = Ctrl on Windows/Linux or Command on Mac
    "shift+mod+1": "btn-pipette-incr-10",
    "shift+mod+2": "btn-pipette-incr-5",
    "shift+mod+3": "defaultABStepSizeBtn",
    "shift+mod+4": "btn-pipette-incr-1",
    "shift+mod+5": "btn-pipette-incr-05",
    "shift+mod+6": "btn-pipette-incr-01",
    // Pipette jogging
    "t a": "jogA",
    "t b": "jogB",
    "shift+mod+down": "btn-pipette-active-down",
    "shift+mod+up": "btn-pipette-active-up",
    // Change tab
    "t d": "tab-deck",
    "t p": "tab-pipette",
    "t c": "tab-config",
    // Move to slot
    "shift+a 1": "btn-deck-slot-a1",
    "shift+a 2": "btn-deck-slot-a2",
    "shift+a 3": "btn-deck-slot-a3",
    
    "shift+b 1": "btn-deck-slot-b1",
    "shift+b 2": "btn-deck-slot-b2",
    "shift+b 3": "btn-deck-slot-b3",
    
    "shift+c 1": "btn-deck-slot-c1",
    "shift+c 2": "btn-deck-slot-c2",
    "shift+c 3": "btn-deck-slot-c3",
    
    "shift+d 1": "btn-deck-slot-d1",
    "shift+d 2": "btn-deck-slot-d2",
    "shift+d 3": "btn-deck-slot-d3",
    
    "shift+e 1": "btn-deck-slot-e1",
    "shift+e 2": "btn-deck-slot-e2",
    "shift+e 3": "btn-deck-slot-e3"
};

function moveIt(buttonId) {
    document.getElementById(buttonId).click();
}

var active_pipette = 'b';
function stepActivePipette(active_pipette, step_size) {
    step(active_pipette, step_size);
}

Mousetrap.bind('i d d q d', function() {
    alert('Entering God mode!');
});

// loop through the above JSON and bind/unbind all keyboard shortcuts
function keyboardShortcuts(b) {
    // much help from: http://stackoverflow.com/a/14330595/1927178
    for (var key in key_bindings) {
        (function(key) {
            if (key_bindings.hasOwnProperty(key)) {
                if (b) {
                    Mousetrap.bind(key, function() {
                        moveIt(key_bindings[key]);
                    });
                } else {
                    Mousetrap.unbind(key);
                }
            }    
        })(key);
        
    }
}

// default the keyboard shortcuts to being off
var keys_on = false;

function toggleKeyboardShortcuts() {
    keys_on = !keys_on;
    keyboardShortcuts(keys_on);
    
    // change color of the toggle button
    if (keys_on) {
        document.getElementById('keyToggleButton').classList.remove('tron-grey');
        document.getElementById('keyToggleButton').classList.add('tron-blue');
    } else {
        document.getElementById('keyToggleButton').classList.add('tron-grey');
        document.getElementById('keyToggleButton').classList.remove('tron-blue');
    }
}

// load the default setting on page load
//window.onload = function() { keyboardShortcuts(keys_on); };
