#!/bin/env python2.7

import glob
import json
import os
import platform
import re
import shutil
import struct
import subprocess
import time


script_tag = "[OT-App frontend build] "
script_tab = "                        "

# The project_root_dir depends on the location of this file, so it cannot be
# moved without updating this line
project_root_dir = \
    os.path.dirname(                                  # going up 1 level
        os.path.dirname(os.path.realpath(__file__)))  # folder dir of this


def get_app_version():
    """
    Get the OT App version as specified in the electron package.json file
    :return: string of app version
    """

    app_json_path = os.path.join(project_root_dir, "app", "package.json")
    with open(app_json_path, 'r') as json_file:
        return json.load(json_file).get('version').encode('utf8')


def remove_directory(dir_to_remove):
    """ :param dir_to_remove: Directory to remove. """
    if os.path.exists(dir_to_remove):
        print(script_tab + "Removing directory %s" % dir_to_remove)
        shutil.rmtree(dir_to_remove)
    else:
        print(script_tab + "Directory %s was not found." % dir_to_remove)


def get_build_tag():
    """
    Gets the OS, CPU architecture (32 vs 64 bit), and current time stamp and
    appends CI branch, commit, or pull request info
    :return: string of os, arch, and time stamp and if CI info if available
    """
    arch_time_stamp = "{}{}_{}".format(
        platform.system(),
        struct.calcsize('P') * 8,
        time.strftime("%Y-%m-%d_%H.%M")
    )

    app_version = get_app_version()

    print(script_tag + "Checking Travis-CI environment variables for tag:")
    travis_tag = tag_from_ci_env_vars(
        ci_name='Travis-CI',
        pull_request_var='TRAVIS_PULL_REQUEST',
        branch_var='TRAVIS_BRANCH',
        commit_var='TRAVIS_COMMIT'
    )

    build_tag = "v{app_version}-{arch_time_stamp}".format(
        app_version=app_version,
        arch_time_stamp=arch_time_stamp
    )

    if travis_tag:
        return "{}_{}".format(build_tag, travis_tag)

    return build_tag



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

    print(script_tab + 'electron-builder process completed successfully')

def clean_build_dist(build_tag):
    """
    Simply moves application to the releases dir and properly names it.

    For Mac:
        Moves and renames zip & dmg files in <project root>/dist/mac/ to <project root>/releases

    :param build_tag:
    :return:
    """

    electron_builder_dist = os.path.join(project_root_dir, "dist", "mac")

    dmg_path = glob.glob(os.path.join(electron_builder_dist, '*.dmg'))
    zip_path = glob.glob(os.path.join(electron_builder_dist, '*.zip'))

    if len(dmg_path) != 1 or len(zip_path) != 1:
        raise SystemExit(
            script_tab + 'Error: Too few or too many .dmg or .zip files found. Aborting...'
        )

    dmg_path = dmg_path[0]
    zip_path = zip_path[0]

    print(script_tab + 'Found mac *dmg* at: {}'.format(dmg_path))
    print(script_tab + 'Found mac *zip* at: {}\n'.format(dmg_path))

    new_dmg_path = os.path.join(
        project_root_dir,
        "releases",
        "OpenTrons-{}.dmg".format(build_tag)
    )
    new_zip_path = os.path.join(
        project_root_dir,
        "releases",
        "OpenTrons-{}.zip".format(build_tag)
    )

    releases_dir = os.path.join(project_root_dir, 'releases')
    remove_directory(releases_dir)
    os.mkdir(releases_dir)

    print(script_tab + 'Moving *dmg* to: {}'.format(new_dmg_path))
    shutil.move(dmg_path, new_dmg_path)

    print(script_tab + 'Moving *zip* to: {}\n'.format(new_zip_path))
    shutil.move(zip_path, new_zip_path)

    print(script_tab + 'Builds successfully moved to {}'.format(releases_dir))


if __name__ == '__main__':
    build_electron_app()
    build_tag = get_build_tag()
    clean_build_dist(build_tag)

