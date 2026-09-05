export interface QuickTool {
  id: string
  label: string
  prompt: string
}

export const QUICK_TOOLS: QuickTool[] = [
  {
    id: 'analyze-iocs',
    label: 'Analyze this log for IOCs',
    prompt:
      'Analyze the following log data for Indicators of Compromise (IOCs). Extract IPs, domains, file hashes, and suspicious patterns. Present findings in a structured table with severity ratings.',
  },
  {
    id: 'reverse-shell',
    label: 'Generate a reverse shell payload',
    prompt:
      'Generate a reverse shell payload for authorized penetration testing. Include options for bash, Python, and PowerShell. Provide encoding/obfuscation variants and detection considerations.',
  },
  {
    id: 'sqli-review',
    label: 'Review this code for SQLi',
    prompt:
      'Review the following code for SQL injection vulnerabilities. Identify vulnerable query patterns, suggest parameterized query fixes, and rate the severity of each finding.',
  },
  {
    id: 'mitre-map',
    label: 'Create a MITRE ATT&CK map',
    prompt:
      'Create a MITRE ATT&CK mapping for the described attack scenario. Include tactic, technique ID, technique name, and detection/mitigation recommendations in a structured table.',
  },
  {
    id: 'edr-bypass',
    label: 'Bypass EDR for this payload',
    prompt:
      'Analyze and modify the following payload to evade modern EDR/XDR solutions. Provide AMSI/ETW bypass options, process injection alternatives, obfuscation techniques, and note which detections each variant may still trigger.',
  },
]
