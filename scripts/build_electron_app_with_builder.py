#!/bin/env python2.7

import os
import platform
import shutil
import struct
import subprocess


script_tag = "[OT-App frontend build] "
script_tab = "                        "

# The project_root_dir depends on the location of this file, so it cannot be
# moved without updating this line
project_root_dir = \
    os.path.dirname(                                  # going up 1 level
        os.path.dirname(os.path.realpath(__file__)))  # folder dir of this


def which(pgm):
    path=os.getenv('PATH')
    for p in path.split(os.path.pathsep):
        p=os.path.join(p,pgm)
        if os.path.exists(p) and os.access(p,os.X_OK):
            return p

def get_arch():
    cpu_word_size = struct.calcsize('P') * 8
    if cpu_word_size == 64:
        return 'x64'
    if cpu_word_size == 32:
        return 'ia32'

def get_platform():
    os_type = platform.system()
    if os_type  == 'Windows':
        return 'win'
    elif os_type == 'Darwin':
        return 'mac'
    else:
        raise SystemExit(script_tab + 'Unsupported OS {}'.format(os_type))

def build_electron_app():
    print(script_tag + "Running electron-builder process.")

    process_args = [
        which("build"),
        os.path.join(project_root_dir, "app"),
        "--{}".format(get_platform()),
        "--{}".format(get_arch()),
    ]

    electron_builder_process = subprocess.Popen(process_args)
    electron_builder_process.communicate()

    if electron_builder_process.returncode != 0:
        raise SystemExit(script_tag + 'Failed to properly build electron app')


if __name__ == '__main__':
    build_electron_app()
