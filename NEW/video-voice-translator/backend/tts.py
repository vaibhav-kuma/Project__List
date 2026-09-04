import boto3
from gtts import gTTS
from pydub import AudioSegment
import os

class GTTSConnector:
    def text_to_speech(self, text, language, output_path, voice=None, rate=1.0, pitch=None):
        # gTTS does not support voice, pitch, so we ignore them.
        # We can simulate rate changes by post-processing with pydub.
        temp_path = output_path + ".tmp.mp3"
        tts = gTTS(text=text, lang=language)
        tts.save(temp_path)

        audio = AudioSegment.from_mp3(temp_path)
        if rate != 1.0:
            audio = audio.speedup(playback_speed=rate)
        audio.export(output_path, format="mp3")
        os.remove(temp_path)

class PollyConnector:
    def __init__(self):
        self.client = boto3.client('polly')

    def text_to_speech(self, text, language, output_path, voice="Joanna", rate=1.0, pitch=0):
        # Polly supports voice, rate, pitch
        # Rate is controlled by SpeechRatePercentage (50-200, default 100)
        # Pitch is controlled by Pitch (e.g., "+10%" or "-10%")
        response = self.client.synthesize_speech(
            Text=text,
            OutputFormat='mp3',
            VoiceId=voice,
            Engine='neural',  # Use neural for better quality
            LanguageCode=language if language in ['en-US', 'es-US', etc.] else 'en-US',  # Adjust as needed
            SpeechRatePercentage=int(rate * 100),
            Pitch=f"{pitch:+d}%" if pitch != 0 else None
        )
        with open(output_path, 'wb') as file:
            file.write(response['AudioStream'].read())

def get_tts_connector(provider="gtts"):
    if provider == "gtts":
        return GTTSConnector()
    elif provider == "polly":
        return PollyConnector()
    else:
        raise ValueError(f"Unsupported TTS provider: {provider}")
