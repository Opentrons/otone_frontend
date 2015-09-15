# Frontend Component of the OpenTrons OT.One

This is the frontend component the OpenTrons OT.One.
It's a browser user interface served from the OT.One and it uses Autobahn|JS for connection to the backend running Crossbar.io.

# The OT.One Components

The three components of the OpenTrons OT.One software are:
* Frontend (/home/pi/otone_frontend)
* Backend (/home/pi/otone_backend)
* Scripts (/home/pi/otone_scripts)

Additionally, SmoothiewareOT is OpenTrons' version of the Smoothieware firmware running on the Smoothieboard motorcontroller board.

All three components run together and are started with the script *start.sh* in otone_scripts. The *start.sh* script is called on startup.
