import os
import platform
import re
import subprocess
import struct
import time


script_tag = "[OT-App pack] win  "
script_tab = "                   "


# The project_root_dir depends on this file location, assumed to be two levels
# below project root, so it cannot be moved without updating this variable
project_root_dir = \
    os.path.dirname(                                  # going up 1 level
        os.path.dirname(os.path.realpath(__file__)))  # folder dir of this

electron_app_dir = os.path.join(project_root_dir, "out")


def get_build_tag():
    arch_time_stamp = "{}{}_{}".format(
        platform.system(),
        struct.calcsize('P') * 8,
        time.strftime("%Y-%m-%d_%H.%M")
    )

    print(script_tag + "Checking Appveyor environment variables for tag:")
    appveyor_tag = tag_from_ci_env_vars(
        ci_name='Appveyor',
        pull_request_var=os.getenv('APPVEYOR_PULL_NUMBER'),
        branch_var=os.getenv('APPVEYOR_REPO_BRANCH'),
        commit_var=os.getenv('APPVEYOR_REPO_COMMIT)')
    )

    if appveyor_tag:
        return "{}_{}".format(arch_time_stamp, appveyor_tag)

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


def zip_ot_app(build_tag):
    print(script_tab + "Zipping OT App. Using tag: {}".format(build_tag))

    current_app_name = os.listdir(electron_app_dir)[0]
    current_app_path = os.path.join(electron_app_dir, current_app_name)
    print(script_tab + "Zipping {} located in {}".format(
        current_app_name, current_app_path)
    )

    zip_app_dir = os.path.join(project_root_dir, 'releases')
    zip_app_path = os.path.join(zip_app_dir, "opentrons_{}".format(build_tag))

    zip_process = subprocess.Popen(
    #    ['zip', '-r', zip_app_path, current_app_path],
        'powershell.exe -nologo -noprofile -command "& { Add-Type -A \'System.IO.Compression.FileSystem\'; [IO.Compression.ZipFile]::ExtractToDirectory(\'otapp.zip\', \'OpenTrons-win32-ia32\'); }"',

        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )

    _, std_err = zip_process.communicate()
    if std_err:
        print(script_tab + "Error using zip command: {}".format(std_err))


def main():
    print(script_tag + "Zipping OT App")
    build_tag = get_build_tag()
    zip_ot_app(build_tag)

if __name__ == '__main__':
    main()