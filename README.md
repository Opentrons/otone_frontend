## To Use

To clone and run this repository you'll need [Git](https://git-scm.com) and [Node.js](https://nodejs.org/en/download/) (which comes with [npm](http://npmjs.com)) installed on your computer. From your command line:

```bash
# Clone this repository
git clone https://github.com/opentrons/otone_frontend

# Go into the repository
cd otone_frontend

# Install dependencies and run the app
npm install && npm start
```


# Frontend Component of the OpenTrons OT.One

This is the frontend component the OpenTrons OT.One.
It's a browser user interface served from the OT.One and it uses Autobahn|JS for connection to the backend running Crossbar.io.

# The OT.One Components

The three components of the OpenTrons OT.One software are:

* [Frontend](http://github.com/OpenTrons/otone_frontend) (/home/pi/otone_frontend)
* [Backend](http://github.com/OpenTrons/otone_backend) (/home/pi/otone_backend)
* [Scripts](http://github.com/OpenTrons/otone_scripts) (/home/pi/otone_scripts)

Additionally, [SmoothiewareOT](https://github.com/Opentrons/SmoothiewareOT) is OpenTrons' version of the Smoothieware firmware running on the Smoothieboard motorcontroller board.

All three components run together and are started with the script *start.sh* in otone_scripts. The *start.sh* script is called on startup.
