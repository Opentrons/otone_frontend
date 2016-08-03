import sys
import platform
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


def get_ignore_regex(os_type):
    if os_type == "win":
        ignore_list = [
            "node_modules\\electron-prebuilt",
            "node_modules\\electron-builder",
            "backend$",
            "scripts",
            "tests",
            "docs",
            ".node-version",
            ".python-version",
            ".git",
            ".idea",
            ".*.md$",
            "releases",
            "test",
            "requirements.txt",
            "LICENSE",
        ]
        return '(' +  '|'.join(ignore_list) + ')'
    elif os_type == "mac":
        ignore_list = [
            "node_modules/electron-prebuilt",
            "node_modules/electron-builder",
            "backend$",
            "scripts",
            "tests",
            "docs",
            ".node-version",
            ".python-version",
            ".git",
            ".idea",
            ".*.md$",
            "releases",
            "test",
            "requirements.txt",
            "LICENSE",
        ]
        return '(' +  '|'.join(ignore_list) + ')'
    else:
        return []

def get_os():
    """
    Gets the OS to based on the command line argument of the platform info.
    Only possibilities are: "windows", "mac", "linux"
    """
    valid_os = ["windows", "linux", "mac"]

    print(script_tab + "Checking for command line argument indicated OS:")
    if len(sys.argv) > 1:
        if sys.argv[1] in valid_os:
            # Take the first argument and use it as the os
            print(script_tab + "Valid command line argument found: %s" %
                  sys.argv[1])
            if sys.argv[1] == "windows":
                return "win"
            else:
                return "mac"
        else:
            print(script_tab + "Invalid command line argument found: %s\n" %
                  sys.argv[1] + script_tab + "Options available: %s" % valid_os)

    print(script_tab + "Valid command line arg not found, checking system.")

    os_found = platform.system().lower()
    if os_found == "windows":
        os_found = "win"
        print(script_tab + "OS found is: %s" % os_found)
        return os_found
    elif os_found == "linux" or os_found == "darwin":
        os_found = "mac"
        print(script_tab + "OS found is: %s" % os_found)
        return os_found
    else:
        raise SystemExit("Exit: OS data found is invalid '%s'" % os_found)

def build_electron_app():
    print(script_tag + "Running electron-packager process.")

    os_type = get_os()

    if os_type == "win":
        process_args = [
            "electron-packager",
            project_root_dir,
            "OpenTrons",
            "--platform", "win32",
            "--arch", "x64",
            "--out", "out",
            "--icon", os.path.join(project_root_dir, "build-assets", "icon.ico"),
            "--ignore", get_ignore_regex(os_type),
            "--overwrite",
            "--prune",
        ]
    elif os_type == "mac":
        rocess_args = [
            "electron-packager",
            project_root_dir,
            "OpenTrons",
            "--platform", "darwin",
            "--arch", "x64",
            "--out", "out",
            "--icon", os.path.join(project_root_dir, "build-assets", "icon.ico"),
            "--ignore", get_ignore_regex(os_type),
            "--overwrite",
            "--prune",
        ]

    electron_packager_process = subprocess.Popen(process_args, shell=True)
    electron_packager_process.communicate()

    if electron_packager_process.returncode != 0:
        raise SystemExit(script_tag + 'Failed to properly build electron app')


if __name__ == '__main__':
    build_electron_app()
