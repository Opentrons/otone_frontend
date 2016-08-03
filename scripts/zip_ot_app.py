import sys
import os
import platform
import re
import subprocess
import struct
import time


script_tag = "[OT-App pack]      "
script_tab = "                   "


# The project_root_dir depends on this file location, assumed to be two levels
# below project root, so it cannot be moved without updating this variable
project_root_dir = \
    os.path.dirname(                                  # going up 1 level
        os.path.dirname(os.path.realpath(__file__)))  # folder dir of this

electron_app_dir = os.path.join(project_root_dir, "out")


def get_build_tag(os_type):
    arch_time_stamp = "{}{}_{}".format(
        platform.system(),
        struct.calcsize('P') * 8,
        time.strftime("%Y-%m-%d_%H.%M")
    )

    if os_type == "mac":
        print(script_tag + "Checking Travis-CI environment variables for tag:")
        travis_tag = tag_from_ci_env_vars(
            ci_name='Travis-CI',
            pull_request_var='TRAVIS_PULL_REQUEST',
            branch_var='TRAVIS_BRANCH',
            commit_var='TRAVIS_COMMIT'
        )

        if travis_tag:
            return "{}_{}".format(arch_time_stamp, travis_tag)
    if os_type == "win":
        print(script_tag + "Checking Appveyor-CI enironment variables for tag:")
        appveyor_tag = tag_from_ci_env_vars(
            ci_name='Appveyor-CI',
            pull_request_var='APPVEYOR_PULL_REQUEST_NUMBER',
            branch_var='APPVEYOR_REPO_BRANCH',
            commit_var='APPVEYOR_REPO_COMMIT'
        )

    return arch_time_stamp


def tag_from_ci_env_vars(ci_name, pull_request_var, branch_var, commit_var):
    pull_request = os.environ.get(pull_request_var)
    branch = os.environ.get(branch_var)
    commit = os.environ.get(commit_var)

    if pull_request and pull_request != 'false':
        try:
            pr_number = int(re.findall("\d+", pull_request)[0])
            print(script_tab + "Pull Request valid {} variable found: "
                               "{}".format(ci_name, pr_number))
            return 'pull_{}'.format(pr_number)
        except (ValueError, TypeError):
            print(script_tab + 'The pull request environmental variable {} '
                               'value {} from {} is not a valid number'.format(
                pull_request_var, pull_request, ci_name
            ))

    if branch and commit:
        print(script_tab + "\tBranch and commit valid {} variables found "
                           "{} {}".format(
            ci_name, branch, commit
        ))
        return "{}_{}".format(branch, commit[:10])

    print(script_tab + "The environmental variables for {} were deemed "
                       "invalid".format(ci_name))
    print(script_tab + "--{}: {}".format(pull_request_var, pull_request))
    print(script_tab + "--{}: {}".format(branch_var, branch))
    print(script_tab + "--{}: {}".format(commit_var, commit))

    return None


def zip_ot_app(build_tag, os_type):
    print(script_tab + "Zipping OT App on {}. Using tag: {}".format(os_type,build_tag))

    current_app_name = os.listdir(electron_app_dir)[0]
    current_app_path = os.path.join(electron_app_dir, current_app_name)
    print(script_tab + "Zipping {} located in {}".format(
        current_app_name, current_app_path)
    )

    zip_app_dir = os.path.join(project_root_dir, 'releases')
    zip_app_path = os.path.join(zip_app_dir, "opentrons_{}".format(build_tag))

    if os_type == "mac":
        zip_process = subprocess.Popen(
            ['zip', '-r', zip_app_path, current_app_path],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
    elif os_type == "win":
        zip_command = "powershell.exe -nologo -noprofile -command \"& { Add-Type -A 'System.IO.Compression.FileSystem'; [IO.Compression.ZipFile]::CreateFromDirectory('"+current_app_path+"','"+zip_app_path+"'); }\""
        zip_process = subprocess.Popen(
            zip_command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            shell=True
        )

    _, std_err = zip_process.communicate()
    if std_err:
        print(script_tab + "Error using zip command: {}".format(std_err))

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

def main():
    print(script_tag + "Zip procedure started.")
    print(script_tag + "Checking for OS.")
    os_type = get_os()
    print(script_tag + "Zipping OT App for %s." % os_type)
    build_tag = get_build_tag(os_type)
    zip_ot_app(build_tag, os_type)

if __name__ == '__main__':
    main()
