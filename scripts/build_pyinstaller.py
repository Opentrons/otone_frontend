import os
import sys
import shutil
import platform
import subprocess


spec_coll_name = "otone_client"
exec_folder_name = "backend-dist"
script_tag = "[OT-App Backend build] "
script_tab = "                    "

# The project_root_dir depends on the location of this file, so it cannot be
# moved without updating this line
project_root_dir = \
    os.path.dirname(                                  # going up 1 level
        os.path.dirname(os.path.realpath(__file__)))  # folder dir of this

# verbose_print = print if verbose else lambda *a, **k: None


def remove_directory(dir_to_remove):
    """ :param dir_to_remove: Directory to remove. """
    if os.path.exists(dir_to_remove):
        print(script_tab + "Removing directory %s" % dir_to_remove)
        shutil.rmtree(dir_to_remove)
    else:
        print(script_tab + "Directory %s was not found." % dir_to_remove)


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


def remove_pyinstaller_temps():
    """
    Removes the temporary folders created by PyInstaller (dist and build).
    """
    remove_directory(os.path.join(os.getcwd(), "dist"))
    # keep build so we can look at warnings
    #remove_directory(os.path.join(os.getcwd(), "build"))


def pyinstaller_build():
    """
    Launches a subprocess running Python PyInstaller with the spec file from the
    package folder. Captures the output streams and checks for errors.
    :return: Boolean indicating the success state of the operation.
    """
    process_args = [
        "pyinstaller",
        "{}".format(os.path.join("scripts", "pyinstaller.spec"))
    ]
    print(script_tab + "Command: %s" % process_args)

    pyinstaller_process = subprocess.Popen(process_args, shell=True)
    std_op, std_err_op = pyinstaller_process.communicate()

    if pyinstaller_process.returncode != 0:
        print(script_tab + "ERROR: PyInstaller returned with exit code: %s" %
              pyinstaller_process.returncode)
        return False

    return True


def move_executable_folder(final_exec_dir, os_type):
    """
    Moves the PyInstaller executable folder from dist to project root.
    :return: Boolean indicating the success state of the operation.

    * NOTE: On Windows, pyinstaller puts the executable in dist, whereas on Linux and
    Darwin the executable gets put into dist/[spec_coll_name]. The reason is as yet unknown.
    """
    if os_type == "win":
        original_exec_dir = os.path.join(project_root_dir, "dist")
    elif os_type == "mac":
        original_exec_dir = os.path.join(project_root_dir, "dist", spec_coll_name)
    else:
        raise SystemExit("Exit: OS data type is invalid '%s'" % os_type)

    if os.path.exists(original_exec_dir):
        print(script_tab + "Moving exec files from %s \n" % original_exec_dir +
              script_tab + "to %s" % final_exec_dir)
        shutil.move(original_exec_dir, final_exec_dir)
    else:
        print(script_tab + "ERROR: PyInstaller executable output folder '%s' " %
              original_exec_dir + "not found!")
        return False
    return True


def build_ot_python_backend_executable():
    print(script_tag + "Build procedure started.")
    print(script_tag + "Checking for OS.")
    os_type = get_os()
    print(script_tag + "Building OT-App Backend for %s." % os_type)

    print(script_tag + "Project directory is:     %s" % project_root_dir)
    print(script_tag + "Script working directory: %s" % os.getcwd())


    print(script_tag + "Removing PyInstaller old temp directories.")
    remove_pyinstaller_temps()

    print(script_tag + "Running PyInstaller process.")
    success = pyinstaller_build()

    print(script_tag + "\"dist\" directory contains the following:\n\n%s\n\n\n" % os.listdir(os.path.join(project_root_dir, "dist")))

    if not success:
        print(script_tab + "Removing PyInstaller recent temp directories.1")
        remove_pyinstaller_temps()
        raise SystemExit(script_tab + "Exiting as there was an error in the "
                                      "PyInstaller execution.")

    print(script_tag + "Removing old OT-App Backend executable directory.")
    backend_exec_path = os.path.join(exec_folder_name, get_os(), spec_coll_name)
    if os.path.isfile(backend_exec_path):
        os.remove(backend_exec_path)

    print(script_tag + "Moving executable folder to backend-dist.")
    success = move_executable_folder(backend_exec_path, os_type)
    if not success:
        print(script_tab + "Removing PyInstaller recent temp directories.2")
        remove_pyinstaller_temps()
        raise SystemExit(script_tab + "Exiting now as there was an error in "
                                      "the PyInstaller execution.")

    print(script_tag + "Removing PyInstaller recent temp directories.3")
    remove_pyinstaller_temps()

if __name__ == "__main__":
    build_ot_python_backend_executable()
