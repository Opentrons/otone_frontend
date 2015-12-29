# Keyboard Shortcuts

Here's an overview of the keyboard shortcuts I'm using for my OT.One. I added a Keyboard Settings section on the Config tab. By default, the page will load with they keyboard shortcuts turned __off__, but you can toggle them on/off by clicking the `Toggle Shortcuts` button on the Config tab. The code was built largely using [Mousetrap](https://craig.is/killing/mice), a simple JavaScript library for handling keyboard events.

Quick explanation of how to interpret the key commands:
 * __a:__ Tap the `a` key
 * __a, Down:__ Tap the `a` key, then tap the `Down` arrow key
 * __Ctrl + z:__ Hold the `Ctrl` key and tap the `z` key
 * __a, Up/Down:__ Tap the `a` key, then tap either the `Up` or `Down` arrow keys
 * __Shift + [1-3]:__ Hold the `Shift` key and tap one of the number keys, `1` through `3`

### Jogging

 * __Up/Down/Left/Right:__ XY axis jogging
 * __Ctrl (Command on Mac) + Up/Down:__ Z axis jogging
 * __a, Up/Down:__ Jog the A (Center) pipette up or down
 * __b, Up/Down:__ Jog the B (Left) pipette up or down
 * __t, a:__ Activate the A (Center) pipette
 * __t, b:__ Activate the B (Left) pipette
 * __Shift + [a-e], [1-3]:__ Navigate to slot A1, A2, ..., E3

### Homing

 * __Home, Home:__ Home all axes
 * __a, Home:__ Home the A (Center) pipette
 * __b, Home:__ Home the B (Left) pipette
 * __x, Home:__ Home the X axis
 * __y, Home:__ Home the Y axis
 * __z, Home:__ Home the Z axis

### Other

 * __Shift + [0-9]:__ Change the step size of the XYZ axis jogging
 * __Shift + Ctrl (Command on Mac) + [1-6]:__ Change the step size of the pipette jogging
 * __t, d:__ Jump to the Deck tab
 * __t, p:__ Jump to the Pipette tab
 * __t, c:__ Jump to the Config tab

### Future Changes

 * The keyboard shortcuts will almost certainly be changed or added to, these were simply the first ideas that came to mind as I went through the various buttons I use often.
 * The location of the keyboard shortcuts toggle button will probably need to move somewhere.
 * It'd be nice to include an easy way to edit the default for the machine, though this would likely require changing something outside the [otone_frontend](https://github.com/Opentrons/otone_frontend) repo.
 * Add a shortcut (and related html) for showing which keyboard commands are available, like exists on Gmail.
 * My biggest concern is the similarity of control of the regular XY jogging (just using the arrow keys) and the pipette jogging (tapping a or b THEN tapping an arrow key). If I personally run into problems with this, the alternative I'm currently thinking of is to use __Shift + Ctrl + Up/Down__ for the pipette, but it would require more complicated code to be able to identify which pipette is active (making a hidden button that clicks the active pipette's buttons is probably the way to go there).