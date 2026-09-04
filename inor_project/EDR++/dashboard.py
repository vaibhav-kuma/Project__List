# dashboard.py

import streamlit as st
from log_collector import collect_logs
from uba_module import detect_anomalies
from mitre_mapper import map_to_mitre
from utils.geoip_helper import get_location
import pydeck as pdk
import pandas as pd
import time

st.set_page_config(page_title="EDR++ Threat Dashboard", layout="wide")

# Title
st.title("🛡️ AI-Powered EDR++ Threat Detection Dashboard")

# Collect Logs
logs = collect_logs()
st.subheader(f"📁 Total Logs: {len(logs)}")

# Detect anomalies
anomalies = detect_anomalies(logs)

# Visual Summary
st.metric("⚠️ Detected Anomalies", len(anomalies))

# Prepare DataFrame
threat_data = []
for anomaly in anomalies:
    mitre = map_to_mitre(anomaly)
    threat_data.append({
        "Log Snippet": anomaly[:100] + "...",
        "MITRE Technique": mitre
    })

if threat_data:
    df = pd.DataFrame(threat_data)

    # MITRE Count
    mitre_counts = df["MITRE Technique"].value_counts()

    st.subheader("📊 Threat Breakdown by MITRE Technique")
    st.bar_chart(mitre_counts)

    st.subheader("🧾 Detailed Anomaly Logs")
    st.dataframe(df, use_container_width=True)
else:
    st.success("✅ No anomalies detected in logs.")

# Refresh every 30 seconds (optional)
st.caption("Refreshing in real time... (manually reload page to update)")
if st.button("Refresh Logs"):
    with st.spinner("Collecting logs..."):
        time.sleep(2)  # Simulate delay
        logs = collect_logs()
        anomalies = detect_anomalies(logs)
        st.success("Logs refreshed successfully!")
        st.experimental_rerun()  # Rerun the script to update the dashboard
# GeoIP Location Mapping
st.subheader("🌍 GeoIP Location Mapping of Threats")

geo_data = []

for anomaly in anomalies:
    for word in anomaly.split():
        if word.count('.') == 3:  # crude IP match
            loc = get_location(word)
            if loc:
                geo_data.append(loc)

if geo_data:
    st.subheader("🌍 Threat IP Geolocation Map")

    geo_df = pd.DataFrame(geo_data)
    st.map(geo_df[["lat", "lon"]])
else:
    st.info("No valid IPs found in logs for geolocation.")

st.subheader("🧠 AI-Generated Response Playbook")

selected_index = st.selectbox("Select anomaly to generate response:", range(len(anomalies)))

if st.button("Generate Playbook"):
    selected_log = anomalies[selected_index]
    with st.spinner("Generating playbook via LLM..."):
        from llm_responder import generate_response_playbook
        playbook = generate_response_playbook(selected_log)
        st.code(playbook, language="markdown")
st.subheader("📜 Summary of Anomaly")