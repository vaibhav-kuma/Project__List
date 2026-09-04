import os
import glob

def collect_logs(log_directory="data/logs/"):
    logs = []
    for filepath in glob.glob(os.path.join(log_directory, "*.log")):
        with open(filepath, "r") as file:
            logs.append(file.read())
    return logs
def save_logs(logs, output_file="collected_logs.txt"):
    with open(output_file, "w") as file:
        for log in logs:
            file.write(log + "\n\n")
    print(f"Logs saved to {output_file}")