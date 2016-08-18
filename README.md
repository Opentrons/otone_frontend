
| Windows Build       | Mac build       |
|:-------------------:|:--------------------:|
[![Windows Build status](https://ci.appveyor.com/api/projects/status/gy40n462wdsjgf60?svg=true)](https://ci.appveyor.com/project/SimplyAhmazing/otone-frontend)| [![Mac Build Status](https://travis-ci.org/OpenTrons/otone_frontend.svg?branch=master)](https://travis-ci.org/OpenTrons/otone_frontend) |


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
npm run release:osx
```

## Build Mac/Win Installers

Ensure that you have the latest python dependencies installed from the requirements.txt file and the latest node modules, installed via `npm install`

1. In a python `3.4.3` environment run `scripts/build_pyinstaller.py` to create the python backend
2. In a python 2 environement run `scripts/build_electron_app_with_builder.py`.

The app builds will be located in the `release` dir

