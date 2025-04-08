import asyncio
import logging
import os
import uuid
from typing import Any, AsyncIterator, List, Mapping, Optional

import requests
from dotenv import load_dotenv
from langchain.schema import AIMessage
from langchain_core.messages import BaseMessage, ToolCall, ToolMessage
from pydantic import ValidationError

from browser_use import Agent, Browser, BrowserConfig, Controller
from browser_use.agent.views import (
    ActionResult,
    AgentError,
    AgentHistory,
    AgentHistoryList,
    AgentOutput,
    AgentStepInfo,
)
from browser_use.browser.context import BrowserContext, BrowserSession
from browser_use.browser.views import BrowserState

from ...models import ModelConfig, ModelProvider
from ...providers import create_llm
from ...services.browser_use_cdp import browser_use_service
from ...utils.types import AgentSettings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv(".env.local")
os.environ["ANONYMIZED_TELEMETRY"] = "false"

# Chrome DevTools Protocol endpoint
CDP_WS_ENDPOINT = os.getenv("CDP_WS_ENDPOINT", "ws://localhost:9222")


async def browser_use_agent(
    model_config: ModelConfig,
    agent_settings: AgentSettings,
    history: List[Mapping[str, Any]],
    session_id: str,
    cancel_event: Optional[asyncio.Event] = None,
) -> AsyncIterator[str]:
    logger.info("🚀 Starting browser_use_agent with session_id: %s", session_id)
    logger.info("🔧 Model config: %s", model_config)
    logger.info("⚙️ Agent settings: %s", agent_settings)

    llm, use_vision = create_llm(model_config)
    logger.info("🤖 Created LLM instance")

    controller = Controller(exclude_actions=["open_tab", "switch_tab"])
    browser = None
    queue = asyncio.Queue()

    def yield_data(
        browser_state: "BrowserState", agent_output: "AgentOutput", step_number: int
    ):
        """Callback function for each step"""
        if step_number > 2:
            asyncio.get_event_loop().call_soon_threadsafe(
                queue.put_nowait,
                AIMessage(
                    content=f"*Previous Goal*:\n{agent_output.current_state.evaluation_previous_goal}"
                ),
            )
            asyncio.get_event_loop().call_soon_threadsafe(
                queue.put_nowait, {"stop": True}
            )
        # format memory
        asyncio.get_event_loop().call_soon_threadsafe(
            queue.put_nowait,
            AIMessage(content=f"*Memory*:\n{agent_output.current_state.memory}"),
        )
        asyncio.get_event_loop().call_soon_threadsafe(queue.put_nowait, {"stop": True})
        # Format Next Goal
        asyncio.get_event_loop().call_soon_threadsafe(
            queue.put_nowait,
            AIMessage(content=f"*Next Goal*:\n{agent_output.current_state.next_goal}"),
        )
        asyncio.get_event_loop().call_soon_threadsafe(queue.put_nowait, {"stop": True})
        # format Tool calls (from actions)
        tool_calls = []
        tool_outputs = []
        for action_model in agent_output.action:
            for key, value in action_model.model_dump().items():
                if value:
                    if key == "done":
                        asyncio.get_event_loop().call_soon_threadsafe(
                            queue.put_nowait, AIMessage(content=value["text"])
                        )
                        asyncio.get_event_loop().call_soon_threadsafe(
                            queue.put_nowait, {"stop": True}
                        )
                    else:
                        id = uuid.uuid4()
                        value = {k: v for k, v in value.items() if v is not None}
                        tool_calls.append(
                            {"name": key, "args": value, "id": f"tool_call_{id}"}
                        )
                        tool_outputs.append(
                            ToolMessage(content="", tool_call_id=f"tool_call_{id}")
                        )

        asyncio.get_event_loop().call_soon_threadsafe(
            queue.put_nowait, AIMessage(content="", tool_calls=tool_calls)
        )
        for tool_output in tool_outputs:
            asyncio.get_event_loop().call_soon_threadsafe(queue.put_nowait, tool_output)

    def yield_done(history: "AgentHistoryList"):
        asyncio.get_event_loop().call_soon_threadsafe(queue.put_nowait, "END")

    # Retrieve session using browser_use_service
    session = await browser_use_service.retrieve_session(session_id)
    logger.info("✅ Retrieved session with ID: %s", session_id)

    try:
        # Use the browser instance from the session if available
        if session.browser:
            browser = session.browser
            logger.info("✅ Using existing browser instance from session")
        else:
            # Create a new browser instance if not available in the session
            browser = Browser(BrowserConfig(cdp_url=session.ws_url))
            logger.info(
                "✅ Created new browser instance with CDP URL: %s", session.ws_url
            )

        # Let the browser-use library create the browser context
        # This is important as it ensures proper initialization
        browser_context = BrowserContext(
            browser=browser, config=browser.config.new_context_config
        )
        agent = Agent(
            llm=llm,
            task=history[-1]["content"],
            controller=controller,
            browser=browser,
            browser_context=browser_context,  # Pass the created browser context
            generate_gif=False,
            use_vision=use_vision,
            register_new_step_callback=yield_data,
            register_done_callback=yield_done,
        )

        response = requests.get("http://localhost:9222/json/list")
        if response.status_code != 200:
            raise Exception(
                f"Failed to get targets list: HTTP error {response.status_code}"
            )

        # Find an available target or create a new one

        steps = agent_settings.steps or 5

        agent_task = asyncio.create_task(agent.run(steps))
        logger.info("▶️ Started agent task with %d steps", steps)

        # Wait for a new tab to be opened (maximum 10 seconds)
        max_retries = 10  # 20 retries * 0.5 seconds = 10 seconds
        retry_count = 0
        initial_target_count = len(response.json())

        while retry_count < max_retries:
            new_response = requests.get("http://localhost:9222/json/list")
            if new_response.status_code != 200:
                raise Exception(
                    f"Failed to get targets list: HTTP error {new_response.status_code}"
                )

            targets = new_response.json()
            if len(targets) > initial_target_count:
                # New tab detected, use the latest tab's debugUrl
                # for target in targets:
                session.debugUrl = f"http://localhost:9222/devtools/inspector.html?ws={targets[0]['webSocketDebuggerUrl'].split('ws://')[1]}"
                logger.info("🌐 Debug URL: %s", session.debugUrl)
                break
            await asyncio.sleep(0.5)  # Wait for 500ms before next check
            retry_count += 1

        if retry_count >= max_retries:
            logger.warning(
                "⚠️ Timeout waiting for new tab, using the last available target"
            )
            # Fallback to using the last available target
            targets = new_response.json()
            session.debugUrl = f"http://localhost:9222/devtools/inspector.html?ws={targets[-1]['webSocketDebuggerUrl'].split('ws://')[1]}"

        # Yield the debugUrl as part of the response stream
        asyncio.get_event_loop().call_soon_threadsafe(
            queue.put_nowait, AIMessage(content=f"*Debug URL*:\n{session.debugUrl}")
        )

        asyncio.get_event_loop().call_soon_threadsafe(queue.put_nowait, {"stop": True})

        # try:
        while True:
            if cancel_event and cancel_event.is_set():
                agent.stop()
                agent_task.cancel()
                break
            if agent._too_many_failures():
                break
            # Wait for data from the queue
            data = await queue.get()
            if data == "END":  # You'll need to send this when done
                break
            yield data
            # Remove browser closing code from here
            pass
    except Exception as e:
        logger.error(f"Error in browser_use_agent: {str(e)}", exc_info=True)
        yield f"Error: {str(e)}"


if __name__ == "__main__":
    model_config = ModelConfig(
        provider=ModelProvider.GEMINI,
        api_key=os.getenv("GOOGLE_API_KEY"),
        model_name="gemini-2-flash",
        temperature=0.0,
        max_tokens=1000,
        top_p=1.0,
        frequency_penalty=0.0,
        presence_penalty=0.0,
    )
    agent_settings = AgentSettings(steps=25)
    history = [{"role": "user", "content": "What is the capital of the moon?"}]

    async def main():
        """Wrapper coroutine to consume the async generator."""
        async for response in browser_use_agent(
            model_config,
            agent_settings,
            history,
            "98ac4a67-ee19-49ac-bb96-04a3c399e5b4",
        ):
            if isinstance(response, dict) and response.get("stop"):
                continue
            elif isinstance(response, (AIMessage, ToolMessage)):
                print(f"Response: {response}")
            else:
                print(f"Output: {response}")

    asyncio.run(main())
