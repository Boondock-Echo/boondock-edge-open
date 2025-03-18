# app/services/audio_handler.py
import os
import socket
import wave
import threading
import time
import select
import errno
from datetime import datetime
from queue import Queue
import sqlite3
import numpy as np
import json
from ..utils.logging_setup import error_logger, warning_logger, transcription_logger, db_logger
import requests


class TranscriptionService:
    """
    Service for handling audio transcription with multiple fallback options:
    - Remote API nodes service
    - OpenAI Whisper API
    - Local Whisper model
    """
    def __init__(self, model_name="small"):
        # Initialize model and client as None for lazy loading
        self.whisper_model = None
        self.model_name = model_name


    def _filter_hallucinations(self, text):
        if not text or len(text.strip()) < 3:
            return "..."
            
        hallucinations = [
            "thank you.",
            "thank you",
            "thank you. thank you",
            "thank you. thank you.",
            "thank you. thank you. thank you.",
            "thank you. bye.",
            "thank you. bye-bye.",
            "you",
            "bye",
            "bye.",
            "bye-bye",
            "bye-bye.",
            "bye. bye.",
            "Please see the complete disclaimer at https://sites.google.com/",
            "... ... ... ... ... ... ... ... ... ...",
            "thanks for watching",
            "thanks for watching.",
            "Tahnks for watching!",
            "thank you very much.",
            "thank you very much",
            "transcription by castingwords",
            "copyright © 2020, new thinking allowed foundation",
            "subs by www.zeoranger.co.uk",
            "thank you for watching!",
            "thank you for watching.",
            "thanks for watching!!!",
            "we'll be right back.",
            "if you have any questions or other problems, please post them in the comments. how to be a patron http://www.patreon.com thank you for watching!",
            "if you like this video, please give me a thumb up and subscribe to my channel. thank you so much for watching this video.",
            "if you have any questions or other problems, please post them in the comments.",
            "thank you so much for watching this video.",
            "請不吝點贊訂閱轉發打賞支持明鏡與點點欄目",
            "toronto 2015 volunteers, presented by chevrolet",
            "transcribed by https://otter.ai",
            "www.globalonenessproject.org",
            "go to beadaholique.com for all of your beading supply needs!",
            "thank you. thank you. bye.",
            "© transcript emily beynon",
            "please subscribe",
            "like and subscribe",
            "click the link below",
            "see you next time",
            "have a great day",
            "stay tuned",
            "coming up next",
            "don't forget to like",
            "please like and subscribe",
            "subscribe now",
            "hit that subscribe button",
            "thanks for listening",
            "see you in the next video",
            "until next time",
            "to be continued",
            "end of transcription",
            "video ends",
            "music fades out",
            "intro music",
            "outro music",
            "[music playing]",
            "[silence]",
            "uh uh uh",
            "um um um",
            "background noise"
        ]

        lowerText = text.strip().lower()
        return "..." if lowerText in hallucinations else text    

    def _load_whisper_model(self):
        """
        Lazy load the Whisper model only when needed to conserve memory
        
        Raises:
            Exception: If model loading fails
        """
        if self.whisper_model is None:
            try:
                from faster_whisper import WhisperModel
                self.whisper_model = WhisperModel(self.model_name, device="cpu", compute_type="int8")
                transcription_logger.info(f"Local Whisper model loaded successfully: {self.model_name}")
            except Exception as e:
                error_logger.error(f"Failed to load Whisper model: {str(e)}")
                raise


    def transcribe_audio(self, filepath):
       
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
        """
        Transcribe using local Whisper model.
        
        Args:
            filepath (str): Path to audio file
            
        Returns:
            str: Transcription text
            
        Raises:
            Exception: If transcription fails
        """
        try:
            self._load_whisper_model()  # Lazy load the model only when needed
            segments, _ = self.whisper_model.transcribe(filepath)
            transcription = " ".join([segment.text for segment in segments])
            transcription = self._filter_hallucinations(transcription)
            transcription_logger.info("Local transcription completed successfully")
            return transcription
        except Exception as e:
            error_logger.error(f"Error in local transcription: {str(e)}")
            raise
