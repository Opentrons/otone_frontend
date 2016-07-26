
| Windows build       | Mac OS X build       |
|:-------------------:|:--------------------:|
 [![Windows Build status]()](https://ci.appveyor.com/project/OpenTrons/otone_frontend) | [![Mac Build Status](https://travis-ci.org/OpenTrons/otone_frontend.svg?branch=master)](https://travis-ci.org/OpenTrons/otone_frontend) |
| [Download Link][1] | [Download Link][2]  |



## To Use

To clone and run this repository you'll need [Git](https://git-scm.com) and [Node.js (v6.0.0)](https://nodejs.org/en/download/) (which comes with [npm](http://npmjs.com)) installed on your computer. From your command line:

```bash
# Clone this repository
git clone https://github.com/opentrons/otone_frontend

# Go into the repository
cd otone_frontend

# Install dependencies and run the app
npm install && npm start

# To generate Mac executables
npm run release
```


# OT.One Desktop App Frontend Component

This is the frontend component the OpenTrons OT.One.

It is an Electron app that runs with a self contained WAMP Router (Nightlife). It is to be run (or packaged) along with [otone_backend](http://github.com/OpenTrons/otone_backend)


[1]: https://google.com
[2]: https://google.com
