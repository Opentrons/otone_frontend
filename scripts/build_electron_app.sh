APP_DIR=$PWD
OUTPUT_DIR="out"

echo "Running electron-packager on $APP_DIR"
electron-packager $PWD OpenTrons --platform=darwin --arch=x64 --out  --ignore=\
    "(node_modules/electron-*"\
    "|backend"\
    "|scripts"\
    "|tests"\
    "|docs"\
    "|\.node-version"\
    "|\.python-version"\
    "|\.git"\
    "|\.idea"\
    ")"
