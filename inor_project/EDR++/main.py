from log_collector import collect_logs
from uba_module import detect_anomalies
from mitre_mapper import map_to_mitre
from llm_responder import generate_response_playbook
from chatops_interface import chat_command

def run_edr():
    logs = collect_logs()
    anomalies = detect_anomalies(logs)

    for anomaly in anomalies:
        technique = map_to_mitre(anomaly)
        print(f"[ALERT] Threat Detected - Technique: {technique}")
        print("[LLM Response]")
        print(generate_response_playbook(anomaly))
        print("-" * 50)

    while True:
        user_input = input("ChatOps> ")
        print(chat_command(user_input, logs))

if __name__ == "__main__":
    run_edr()
