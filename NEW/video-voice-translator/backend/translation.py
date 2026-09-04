import translators as ts

class TranslatorConnector:
    def translate(self, segments, target_language):
        translated_segments = []
        for segment in segments:
            translated_text = ts.translate_text(segment["text"], to_language=target_language)
            translated_segments.append({
                "start": segment["start"],
                "end": segment["end"],
                "text_translated": translated_text
            })
        return translated_segments

def get_translator_connector(provider="google"):
    # The 'translators' library handles different providers, so we can keep this simple for now
    return TranslatorConnector()
