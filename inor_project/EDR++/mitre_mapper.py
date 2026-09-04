def map_to_mitre(log):
    mitre_tags = {
        "powershell": "T1059.001",
        "credential dumping": "T1003",
        "port scan": "T1046"
    }
    for keyword, technique in mitre_tags.items():
        if keyword in log.lower():
            return technique
    return "T0000 (Uncategorized)"
