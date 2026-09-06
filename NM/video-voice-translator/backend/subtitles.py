from datetime import timedelta

def format_time(seconds, separator=','):
    delta = timedelta(seconds=seconds)
    hours, remainder = divmod(delta.seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    milliseconds = delta.microseconds // 1000
    return f"{hours:02}:{minutes:02}:{seconds:02}{separator}{milliseconds:03}"

def generate_srt(segments):
    srt_content = ""
    for i, segment in enumerate(segments):
        start_time = format_time(segment["start"])
        end_time = format_time(segment["end"])
        text = segment.get("text") or segment.get("text_translated", "")
        srt_content += f"{i + 1}\n"
        srt_content += f"{start_time} --> {end_time}\n"
        srt_content += f"{text}\n\n"
    return srt_content

def generate_vtt(segments):
    vtt_content = "WEBVTT\n\n"
    for segment in segments:
        start_time = format_time(segment["start"], separator='.')
        end_time = format_time(segment["end"], separator='.')
        text = segment.get("text") or segment.get("text_translated", "")
        vtt_content += f"{start_time} --> {end_time}\n"
        vtt_content += f"{text}\n\n"
    return vtt_content
