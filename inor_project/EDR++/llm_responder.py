import openai
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Secure API Key Load
openai.api_key = os.getenv("OPENAI_API_KEY")

def generate_response_playbook(anomaly_log, model="gpt-4"):
    prompt = f"""
    Analyze the following suspicious log entry and create a detailed, step-by-step incident response playbook:
    
    Log: {anomaly_log}
    """
    response = openai.ChatCompletion.create(
        model=model,
        messages=[{"role": "user", "content": prompt}]
    )
    return response['choices'][0]['message']['content']
def chat_command(command, logs, model="gpt-4"):
    if "status" in command:
        return f"Total Logs: {len(logs)}"
    elif "threats" in command:
        threats = [log for log in logs if "threat" in log.lower()]
        if threats:
            return "\n".join(threats)
        else:
            return "No threats detected."
    else:
        prompt = f"User Command: {command}\nLogs: {logs}\nGenerate a response:"
        response = openai.ChatCompletion.create(
            model=model,
            messages=[{"role": "user", "content": prompt}]
        )
        return response['choices'][0]['message']['content']