def chat_command(command, logs):
    if "status" in command:
        return f"Total Logs: {len(logs)}"
    elif "threats" in command:
        return "\n".join([log for log in logs if "threat" in log.lower()])
    else:
        return "Unknown command."
