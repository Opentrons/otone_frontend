#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $DIR/backend
pyisntaller otone_client_onefile.spec
ls -la dist/
cp dist/otone_client ../backend-dist/Mac
cd $DIR
npm install
npm install -g electron-packager
electron-packager ./ OpenTrons --platform=darwin --arch=x64 --out releases --ignore="(node_modules/electron-*|backend)"
ls releases/
zip -r releases/OpenTrons-darwin-x64 releases/Opentrons-darwin-x64
