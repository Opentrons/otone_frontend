import json
import os
import psutil


PID_FILENAME = 'otone_client.pid'


def write_pid_file(pid_file_path):
    current_pid = os.getpid()
    with open(pid_file_path, 'w') as pid_file:
        pid_file.write(json.dumps({'pid': current_pid}))


def get_pid_from_file(pid_file_path):
    with open(pid_file_path, 'r') as pid_file:
        return int(json.load(pid_file).get('pid'))


def check_is_running(pid_dir):
    pid_file_path = os.path.join(pid_dir, PID_FILENAME)

    current_pid = os.getpid()

    # If the file doesn't exist, write the current process ID to the file
    if not os.path.exists(pid_file_path):
        write_pid_file(pid_file_path)
        return False

    last_pid = get_pid_from_file(pid_file_path)

    if last_pid == current_pid:
        return True

    if psutil.pid_exists(last_pid):
        return True

    write_pid_file(pid_file_path)
    return False
