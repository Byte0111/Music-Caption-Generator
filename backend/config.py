# OpenAI API Key Configuration
import os
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")

HOST = "0.0.0.0"
PORT = int(os.environ.get("PORT", "8001"))