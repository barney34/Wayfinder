"""LLM service using the official Google Genai SDK.

Provides a single async helper so routes stay decoupled from the SDK
and the model can be swapped via the GEMINI_MODEL environment variable.
"""

import logging
import os
from typing import Optional

from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")

_client: Optional[genai.Client] = None


def _get_client(api_key: str) -> genai.Client:
    """Return the module-level Gemini client, creating it once on first call."""
    global _client
    if _client is None:
        _client = genai.Client(api_key=api_key)
    return _client


async def send_message(
    prompt: str,
    system_message: str,
    api_key: str,
    model: Optional[str] = None,
) -> str:
    """Send a prompt to Gemini and return the text response.

    Args:
        prompt: The user prompt text.
        system_message: System-level instruction for the model.
        api_key: Google AI API key.
        model: Model name override; defaults to GEMINI_MODEL env var.

    Returns:
        The model's text response as a string.

    Raises:
        Exception: Propagates any SDK or network errors to the caller.
    """
    client = _get_client(api_key)
    model_name = model or GEMINI_MODEL
    logger.info(f"Gemini request: model={model_name}, prompt_len={len(prompt)}")
    try:
        response = await client.aio.models.generate_content(
            model=model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_message,
            ),
        )
        logger.info(f"Gemini response OK: {len(response.text)} chars")
        return response.text
    except Exception as e:
        logger.error(f"Gemini API error: {type(e).__name__}: {e}")
        raise
