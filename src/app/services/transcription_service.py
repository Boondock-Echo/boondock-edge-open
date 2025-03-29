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
        self.openai_client = None
        
        # Load API settings from settings.json
        self.api_key, self.api_health_url, self.api_transcription_url = self._load_api_settings()

        # Service status flags to track availability
        self.nodes_available = True
        self.openai_available = True
        
        # Store model name for lazy loading the local Whisper model
        self.model_name = model_name

        # Initialize connectivity check on startup to verify service availability
        self._initial_connectivity_check() 
        
    def _load_api_settings(self):
        """
        Load API settings from db/settings.json
        
        Returns:
            tuple: (api_key, api_health_url, api_transcription_url)
        """
        try:
            with open("db/settings.json", "r") as file:
                settings = json.load(file)
                api_key = settings.get("open_ai_key", None)
                api_health_url = settings.get("api_health_url", "https://api.boondockecho.com/health")
                api_transcription_url = settings.get("api_transcription_url", "https://api.boondockecho.com/transcribe/")
                return api_key, api_health_url, api_transcription_url
        except (FileNotFoundError, json.JSONDecodeError) as e:
            error_logger.error(f"Failed to load API settings from settings.json: {str(e)}")
            return None, "https://api.boondockecho.com/health", "https://api.boondockecho.com/transcribe/"
  
    # This method is redundant as it's already covered by _load_api_settings - removing it would be ideal
    def _load_api_key(self):
        """
        Load OpenAI API key from db/settings.json
        
        Returns:
            str: OpenAI API key or None if not found
        """
        try:
            with open("db/settings.json", "r") as file:
                settings = json.load(file)
                return settings.get("open_ai_key", None)
        except (FileNotFoundError, json.JSONDecodeError) as e:
            error_logger.error(f"Failed to load API key from settings.json: {str(e)}")
            return None


    def _filter_hallucinations(self, text):
        """
        Filter out common hallucinations from transcription results
        
        Args:
            text (str): Raw transcription text
            
        Returns:
            str: Filtered transcription or "..." if hallucination detected
        """
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

    def _load_openai_client(self):
        """
        Lazy load the OpenAI client only when needed
        
        Raises:
            Exception: If client initialization fails
        """
        if self.openai_client is None and self.api_key:
            try:
                from openai import OpenAI
                self.openai_client = OpenAI(api_key=self.api_key)
                transcription_logger.info("OpenAI client initialized successfully")
            except Exception as e:
                error_logger.error(f"Failed to initialize OpenAI client: {str(e)}")
                raise
        elif not self.api_key:
            error_logger.error("OpenAI API key is missing. Check db/settings.json.")


    def _initial_connectivity_check(self):
        """
        Perform initial connectivity check for remote services on startup
        to determine which services are available
        """
        if not self._check_nodes_connectivity():
            self.nodes_available = False
            transcription_logger.warning("Nodes service unavailable at startup - disabled until restart")
            
        if not self._check_openai_connectivity():
            self.openai_available = False
            transcription_logger.warning("OpenAI service unavailable at startup - disabled until restart")

    # This is a duplicate method - removing the first definition
    def _check_nodes_connectivity(self):
        """
        Check if the API service is reachable
        
        Returns:
            bool: True if service is available, False otherwise
        """
        try:
            response = requests.get(self.api_health_url, timeout=5)
            return response.status_code == 200
        except Exception as e:
            error_logger.error(f"API connectivity check failed: {str(e)}")
            return False

    def _check_openai_connectivity(self):
        """
        Check if OpenAI service is reachable and API key is valid
        
        Returns:
            bool: True if service is available, False otherwise
        """
        if not self.api_key:
            return False
            
        try:
            # Initialize client if needed
            self._load_openai_client()
            
            # Simple API call to check connectivity
            self.openai_client.models.list()
            return True
        except Exception as e:
            error_logger.error(f"OpenAI connectivity check failed: {str(e)}")
            return False

    def transcribe_audio(self, filepath, use_local=True, use_openai=False, use_nodes=False):
        """
        Transcribe audio using the specified method(s).
        Returns the transcription from the first successful method.
        Falls back to local transcription if other methods fail.
        
        Args:
            filepath (str): Path to audio file
            use_local (bool): Whether to use local Whisper model
            use_openai (bool): Whether to use OpenAI API
            use_nodes (bool): Whether to use nodes API service
            
        Returns:
            str: Transcription text or "..." if all methods fail
        """
        transcription_logger.info(f"Starting transcription for file: {filepath}")
     
        # Try nodes if enabled and not previously failed
        if use_nodes and self.nodes_available:
            try:
                transcription_logger.info("Attempting API nodes transcription...")
                result = self._transcribe_nodes(filepath)
                if result:
                    transcription_logger.info("API Nodes transcription successful")
                    return result
            except Exception as e:
                error_logger.error(f"API Node transcription failed, disabling nodes service: {str(e)}")
                self.nodes_available = False  # Disable nodes service until restart
                # Fall through to next method

        # Try OpenAI if enabled and not previously failed
        if use_openai and self.openai_available:
            try:
                transcription_logger.info("Attempting OpenAI transcription...")
                result = self._transcribe_openai(filepath)
                if result:
                    transcription_logger.info("OpenAI transcription successful")
                    return result
            except Exception as e:
                error_logger.error(f"OpenAI transcription failed, disabling OpenAI service: {str(e)}")
                self.openai_available = False  # Disable OpenAI service until restart
                # Fall through to local method

        # Always try local as last resort, even if not initially enabled
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


    def _transcribe_openai(self, filepath):
        """
        Transcribe using OpenAI's Whisper API.
        
        Args:
            filepath (str): Path to audio file
            
        Returns:
            str: Transcription text
            
        Raises:
            Exception: If transcription fails
        """
        try:
            self._load_openai_client()  # Lazy load the OpenAI client only when needed
            with open(filepath, "rb") as audio_file:
                response = self.openai_client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file
                )

                transcription = response.text
                transcription = self._filter_hallucinations(transcription)
                transcription_logger.info("OpenAI transcription completed successfully")
                return transcription
        except Exception as e:
            error_logger.error(f"Error in OpenAI transcription: {str(e)}")
            raise

    def _transcribe_nodes(self, filepath):
        """
        Transcribe audio using the FastAPI endpoint
        
        Args:
            filepath (str): Path to audio file
            
        Returns:
            str: Transcription text
            
        Raises:
            Exception: If transcription fails or API returns error
        """
        try:
            # Open the audio file
            with open(filepath, 'rb') as audio_file:
                files = {'file': ('audio.wav', audio_file, 'audio/wav')}
                
                # Make the POST request to the transcription API
                response = requests.post(self.api_transcription_url, files=files, timeout=30)

                # Check if request was successful
                if response.status_code == 200:
                    result = response.json()
                    if result.get('status') == 'success' and result.get('transcription'):
                        return self._filter_hallucinations(result['transcription'])
                    else:
                        raise Exception("Invalid response format from API")
                else:
                    raise Exception(f"API request failed with status {response.status_code}: {response.text}")

        except Exception as e:
            error_logger.error(f"API transcription failed: {str(e)}")
            raise
