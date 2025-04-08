from typing import Dict, List, Optional

from pydantic import BaseModel

from api.plugins import WebAgentType

from .models import ModelProvider
from .utils.prompt import ClientMessage
from .utils.types import AgentSettings, ModelSettings


class SessionRequest(BaseModel):
    agent_type: WebAgentType
    api_key: Optional[str] = None
    dimensions: Optional[Dict[str, int]] = {"width": 1280, "height": 800}
    api_timeout: Optional[int] = 900000  # 15 minutes in milliseconds


class ChatRequest(BaseModel):
    session_id: str
    agent_type: WebAgentType
    provider: ModelProvider = ModelProvider.ANTHROPIC
    messages: List[ClientMessage]
    api_key: str = ""
    agent_settings: AgentSettings
    model_settings: ModelSettings
