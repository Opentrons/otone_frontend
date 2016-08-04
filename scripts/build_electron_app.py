import os
import platform
import shutil
import struct
import subprocess


output_dir = "out"
script_tag = "[OT-App frontend build] "
script_tab = "                        "

# The project_root_dir depends on the location of this file, so it cannot be
# moved without updating this line
project_root_dir = \
    os.path.dirname(                                  # going up 1 level
        os.path.dirname(os.path.realpath(__file__)))  # folder dir of this


def get_arch():
    cpu_word_size = struct.calcsize('P') * 8
    if cpu_word_size == 64:
        return 'x64'
    if cpu_word_size == 32:
        return 'ia32'

def get_icon_path():
    icon_dir = os.path.join(project_root_dir, "build")

    platform_type = get_platform()
    if platform_type == 'win32':
        icon_file = os.path.join(icon_dir, 'icon.ico')
    elif platform_type == 'darwin':
        icon_file = os.path.join(icon_dir, 'icon.icns')
    else:
        raise SystemExit(script_tab + 'Cannot find app icon for OS: {}'.format(platform_type))

    return os.path.join(project_root_dir, "build-assets", icon_file)

def get_ignore_regex():
    ignore_list = [
        os.path.join("node_modules", "electron-builder"),
        os.path.join("node_modules", "electron-prebuilt"),
        "backend$",
        "backend-env",
        "scripts",
        "tests",
        "docs",
        ".node-version",
        ".python-version",
        ".idea",
        "\.md$",
        "releases",
        "test",
        "requirements.txt",
        "LICENSE",
    ]

    ignore_flags = []
    for regex in ignore_list:
        ignore_flags.extend(["--ignore="+regex])

    return ignore_flags

def get_platform():
    os_type = platform.system().lower()
    if os_type  == 'windows':
        return 'win32'
    elif os_type == 'darwin':
        return 'darwin'
    else:
        raise SystemExit(script_tab + 'Unsupported OS {}'.format(os_type))

def build_electron_app():
    print(script_tag + "Running electron-packager process.")

    os_type = get_platform()
    print(script_tag + "os_type: {}".format(os_type))
    if os_type == "darwin":
        process_args = [
            shutil.which("electron-packager"),
            project_root_dir,
            "OpenTrons",
            "--platform", get_platform(),
            "--arch", get_arch(),
            "--version=1.3.1"
            "--out", output_dir,
            "--icon", get_icon_path(),
            "--asar=true",
            "--overwrite",
            "--prune",
        ] + get_ignore_regex()
        electron_packager_process = subprocess.Popen(process_args)
        electron_packager_process.communicate()
    elif os_type == "win32":
        process_args = [
            "electron-packager",
            project_root_dir,
            "OpenTrons",
            "--platform="+get_platform(),
            "--arch="+get_arch(),
            "--version=1.3.1",
            "--out="+output_dir,
            "--icon="+get_icon_path(),
            "--asar=true",
            "--overwrite",
            "--prune",
        ] + get_ignore_regex()
        electron_packager_process = subprocess.Popen(process_args, shell=True)
        electron_packager_process.communicate()

    if electron_packager_process.returncode != 0:
        raise SystemExit(script_tag + 'Failed to properly build electron app')


if __name__ == '__main__':
    build_electron_app()
