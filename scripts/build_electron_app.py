import os
import subprocess


output_dir = "out"
script_tag = "[OT-App frontend build] "
script_tab = "                    "

# The project_root_dir depends on the location of this file, so it cannot be
# moved without updating this line
project_root_dir = \
    os.path.dirname(                                  # going up 1 level
        os.path.dirname(os.path.realpath(__file__)))  # folder dir of this


def build_electron_app():
    print(script_tag + "Running electron-packager process.")

    ignore_list = [
        "node_modules/electron-*",
        "backend",
        "scripts",
        "tests",
        "docs",
        ".node-version",
        ".python-version",
        ".git",
        ".idea",
    ]

    ignore_regex = '(' +  '|'.join(ignore_list) + ')'

    process_args = [
        "electron-packager",
        project_root_dir,
        "OpenTrons",
        "--platform", "darwin",
        "--arch", "x64",
        "--out", "out",
        "--ignore", ignore_regex,
        "--overwrite",
        "--prune",
    ]

    electron_packager_process = subprocess.Popen(process_args)

    if electron_packager_process.returncode != 0:
        raise SystemExit('Failed to properly build electron app')


if __name__ == '__main__':
    build_electron_app()
