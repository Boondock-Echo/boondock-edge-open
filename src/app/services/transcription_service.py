import os
from faster_whisper import WhisperModel
from ..utils.logging_setup import error_logger, warning_logger, transcription_logger, db_logger

class TranscriptionService:
    def __init__(self, model_name="tiny"):
        self.whisper_model = None
        self.model_name = model_name
        transcription_logger.info("TranscriptionService initialized")

    def _filter_hallucinations(self, text):
        if not text or len(text.strip()) < 3:
            return "..."
        hallucinations = ["thank you", "bye", "please subscribe"]  # Shortened list
        return "..." if text.strip().lower() in hallucinations else text

    def _load_whisper_model(self):
        if self.whisper_model is None:
            try:
                transcription_logger.info(f"Attempting to load model: {self.model_name}")
                self.whisper_model = WhisperModel(
                    self.model_name,
                    device="cpu",
                    compute_type="int8",
                    cpu_threads=2  # Limit threads for Pi
                )
                transcription_logger.info(f"Local Whisper model loaded successfully: {self.model_name}")
            except Exception as e:
                error_logger.error(f"Failed to load Whisper model: {str(e)}")
                if "model.bin is incomplete" in str(e):
                    error_logger.info("Detected incomplete model file. Clearing cache and retrying...")
                    self._clear_model_cache()
                    self.whisper_model = WhisperModel(
                        self.model_name,
                        device="cpu",
                        compute_type="int8",
                        cpu_threads=2
                    )
                    transcription_logger.info(f"Model reloaded successfully after cache clear")
                else:
                    raise

    def _clear_model_cache(self):
        """Clear the Faster Whisper model cache."""
        import shutil
        cache_dir = os.path.expanduser(f"~/.cache/huggingface/hub/models--guillaumekln--faster-whisper-{self.model_name}")
        if os.path.exists(cache_dir):
            shutil.rmtree(cache_dir)
            transcription_logger.info(f"Cleared cache directory: {cache_dir}")
        else:
            warning_logger.warning(f"Cache directory not found: {cache_dir}")

    def transcribe_audio(self, filepath):
        if not os.path.exists(filepath):
            error_logger.error(f"Audio file not found: {filepath}")
            return "..."

        transcription_logger.info(f"Starting transcription for file: {filepath}")
        try:
            transcription_logger.info("Attempting local transcription...")
            result = self._transcribe_local(filepath)
            if result:
                transcription_logger.info("Local transcription successful")
                return result
        except Exception as e:
            error_logger.error(f"Local transcription failed: {str(e)}")
        error_logger.error("All transcription methods failed")
        return "..."

    def _transcribe_local(self, filepath):
        try:
            self._load_whisper_model()
            segments, _ = self.whisper_model.transcribe(filepath)
            transcription = " ".join([segment.text for segment in segments])
            transcription = self._filter_hallucinations(transcription)
            transcription_logger.info("Local transcription completed successfully")
            return transcription
        except Exception as e:
            error_logger.error(f"Error in local transcription: {str(e)}")
            raise