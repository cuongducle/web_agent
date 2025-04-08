import asyncio
import json
import logging
import os
import uuid
from typing import Any, Dict, List, Optional, Tuple

import requests
import websockets
from pydantic import BaseModel

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("cdp_service")


class CDPSession(BaseModel):
    id: str
    ws_url: str
    debugUrl: str
    session_viewer_url: str
    dimensions: Dict[str, int] = {"width": 1280, "height": 800}
    api_timeout: int = 900000  # 15 minutes in milliseconds


class CDPService:
    """Service to manage Chrome DevTools Protocol sessions directly"""

    def __init__(self, chrome_ws_endpoint: Optional[str] = None):
        """
        Initialize the CDP service

        Args:
            chrome_ws_endpoint: WebSocket endpoint for Chrome. If None, will use environment variable.
        """
        self.chrome_ws_endpoint = chrome_ws_endpoint or os.getenv(
            "CDP_WS_ENDPOINT", "ws://localhost:9222"
        )
        # Convert ws:// to http:// for HTTP requests
        self.chrome_http_endpoint = self.chrome_ws_endpoint.replace("ws://", "http://")
        logger.info(f"CDP service initialized with endpoint: {self.chrome_ws_endpoint}")
        self.sessions: Dict[str, CDPSession] = {}
        self.max_retries = 3
        self.retry_delay = 1  # seconds

    async def _fetch_browser_ws_url(self) -> str:
        """Fetch the browser WebSocket URL from Chrome DevTools Protocol using HTTP"""
        retries = 0
        last_error = None

        while retries < self.max_retries:
            try:
                logger.info(
                    f"Attempting to connect to Chrome DevTools Protocol at {self.chrome_http_endpoint}/json/version (attempt {retries+1}/{self.max_retries})"
                )
                # Connect to Chrome DevTools Protocol JSON endpoint using HTTP
                response = requests.get(f"{self.chrome_http_endpoint}/json/version")
                if response.status_code != 200:
                    raise Exception(f"HTTP error: {response.status_code}")

                version_info = response.json()
                ws_url = version_info.get("webSocketDebuggerUrl")
                if not ws_url:
                    raise Exception("No webSocketDebuggerUrl found in response")

                logger.info(
                    f"Successfully connected to Chrome DevTools Protocol. WebSocket URL: {ws_url}"
                )
                return ws_url
            except Exception as e:
                last_error = e
                logger.error(f"Failed to connect to Chrome DevTools Protocol: {str(e)}")
                retries += 1
                if retries < self.max_retries:
                    # Wait before retrying
                    logger.info(f"Retrying in {self.retry_delay} seconds...")
                    await asyncio.sleep(self.retry_delay)
                    continue

                # Provide a more helpful error message
                chrome_not_running_msg = (
                    f"Failed to connect to Chrome DevTools Protocol at {self.chrome_http_endpoint}. "
                    "Make sure Chrome is running with remote debugging enabled using: "
                    "\n\nOn macOS/Linux:\n"
                    "/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome "
                    "--remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug"
                    "\n\nOn Windows:\n"
                    '"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" '
                    "--remote-debugging-port=9222 --user-data-dir=C:\\tmp\\chrome-debug"
                )
                logger.error(chrome_not_running_msg)
                raise Exception(chrome_not_running_msg) from last_error

        # This should never be reached due to the raise in the loop, but just in case
        raise Exception(
            f"Failed to connect to Chrome DevTools Protocol: {str(last_error)}"
        )

    async def create_session(
        self, dimensions: Optional[Dict[str, int]] = None, api_timeout: int = 900000
    ) -> CDPSession:
        """
        Create a new browser session

        Args:
            dimensions: Browser window dimensions
            api_timeout: Session timeout in milliseconds

        Returns:
            CDPSession object with connection details
        """
        try:
            # Generate a unique session ID
            session_id = str(uuid.uuid4())
            logger.info(f"Creating new CDP session with ID: {session_id}")

            # Get browser WebSocket URL
            try:
                browser_ws_url = await self._fetch_browser_ws_url()
                logger.info(f"Got browser WebSocket URL: {browser_ws_url}")
            except Exception as e:
                logger.error(f"Failed to get browser WebSocket URL: {str(e)}")
                raise

            # Create a new browser context
            try:
                logger.info(f"Connecting to browser WebSocket: {browser_ws_url}")
                async with websockets.connect(browser_ws_url) as ws:
                    # Create a new browser context
                    logger.info("Creating new browser context")
                    await ws.send(
                        json.dumps(
                            {
                                "id": 1,
                                "method": "Target.createBrowserContext",
                                "params": {},
                            }
                        )
                    )

                    response = json.loads(await ws.recv())
                    logger.info(f"Browser context creation response: {response}")
                    browser_context_id = response.get("result", {}).get(
                        "browserContextId"
                    )

                    if not browser_context_id:
                        error_msg = f"Failed to create browser context: {response}"
                        logger.error(error_msg)
                        raise Exception(error_msg)

                    # Create a new page in the browser context
                    logger.info(
                        f"Creating new target in browser context: {browser_context_id}"
                    )
                    await ws.send(
                        json.dumps(
                            {
                                "id": 2,
                                "method": "Target.createTarget",
                                "params": {
                                    "url": "about:blank",
                                    "browserContextId": browser_context_id,
                                    "width": (
                                        dimensions.get("width", 1280)
                                        if dimensions
                                        else 1280
                                    ),
                                    "height": (
                                        dimensions.get("height", 800)
                                        if dimensions
                                        else 800
                                    ),
                                },
                            }
                        )
                    )

                    response = json.loads(await ws.recv())
                    logger.info(f"Target creation response: {response}")
                    target_id = response.get("result", {}).get("targetId")

                    if not target_id:
                        error_msg = f"Failed to create target: {response}"
                        logger.error(error_msg)
                        raise Exception(error_msg)

                    # Get the target info
                    logger.info(f"Getting target info for target ID: {target_id}")
                    await ws.send(
                        json.dumps(
                            {
                                "id": 3,
                                "method": "Target.getTargetInfo",
                                "params": {"targetId": target_id},
                            }
                        )
                    )

                    response = json.loads(await ws.recv())
                    logger.info(f"Target info response: {response}")
                    target_info = response.get("result", {}).get("targetInfo", {})

                    # Get the WebSocket debugger URL for this target
                    logger.info("Getting targets list")
                    await ws.send(
                        json.dumps(
                            {"id": 4, "method": "Target.getTargets", "params": {}}
                        )
                    )

                    response = json.loads(await ws.recv())
                    logger.info(f"Targets list response: {response}")
                    targets = response.get("result", {}).get("targetInfos", [])

                    target_ws_url = None
                    for target in targets:
                        if target.get("targetId") == target_id:
                            target_ws_url = target.get("webSocketDebuggerUrl")
                            break

                    if not target_ws_url:
                        # Fallback: try to get the WebSocket URL from /json/list endpoint
                        logger.info(
                            "Target WebSocket URL not found in targets list, trying /json/list endpoint"
                        )
                        try:
                            # Use HTTP instead of WebSocket for the /json/list endpoint
                            response = requests.get(
                                f"{self.chrome_http_endpoint}/json/list"
                            )
                            if response.status_code != 200:
                                raise Exception(f"HTTP error: {response.status_code}")

                            targets_list = response.json()
                            logger.info(f"JSON list response: {targets_list}")
                            for target in targets_list:
                                if target.get("id") == target_id:
                                    target_ws_url = target.get("webSocketDebuggerUrl")
                                    break
                        except Exception as e:
                            logger.error(
                                f"Failed to get WebSocket URL from /json/list: {str(e)}"
                            )
                            raise

                    if not target_ws_url:
                        error_msg = "Failed to get WebSocket URL for target"
                        logger.error(error_msg)
                        raise Exception(error_msg)

                    # Create a session object
                    logger.info(
                        f"Creating session object with WebSocket URL: {target_ws_url}"
                    )
                    session = CDPSession(
                        id=session_id,
                        ws_url=target_ws_url,
                        debugUrl=f"{self.chrome_http_endpoint}/devtools/inspector.html?ws={target_ws_url.split('ws://')[1]}",
                        session_viewer_url=f"{self.chrome_http_endpoint}/devtools/inspector.html?ws={target_ws_url.split('ws://')[1]}",
                        dimensions=dimensions or {"width": 1280, "height": 800},
                        api_timeout=api_timeout,
                    )

                    # Store the session
                    self.sessions[session_id] = session
                    logger.info(f"Session created successfully: {session}")

                    return session
            except Exception as e:
                logger.error(f"Error during session creation: {str(e)}")
                raise

        except Exception as e:
            error_msg = f"Failed to create CDP session: {str(e)}"
            logger.error(error_msg)
            raise Exception(error_msg)

    async def retrieve_session(self, session_id: str) -> CDPSession:
        """
        Retrieve an existing session

        Args:
            session_id: ID of the session to retrieve

        Returns:
            CDPSession object
        """
        session = self.sessions.get(session_id)
        if not session:
            error_msg = f"Session {session_id} not found"
            logger.error(error_msg)
            raise Exception(error_msg)
        logger.info(f"Retrieved session: {session_id}")
        return session

    async def release_session(self, session_id: str) -> Dict[str, str]:
        """
        Release a session

        Args:
            session_id: ID of the session to release

        Returns:
            Status message
        """
        session = self.sessions.get(session_id)
        if not session:
            logger.info(f"Session {session_id} already released")
            return {"status": "success", "message": "Session already released"}

        try:
            # Extract target ID from WebSocket URL
            ws_parts = session.ws_url.split("/")
            target_id = ws_parts[-1]
            logger.info(f"Releasing session {session_id} with target ID: {target_id}")

            # Connect to browser WebSocket
            browser_ws_url = await self._fetch_browser_ws_url()
            logger.info(f"Connected to browser WebSocket: {browser_ws_url}")

            async with websockets.connect(browser_ws_url) as ws:
                # Close the target
                logger.info(f"Closing target: {target_id}")
                await ws.send(
                    json.dumps(
                        {
                            "id": 1,
                            "method": "Target.closeTarget",
                            "params": {"targetId": target_id},
                        }
                    )
                )

                response = await ws.recv()
                logger.info(f"Target close response: {response}")

                # Remove the session from our store
                del self.sessions[session_id]
                logger.info(f"Session {session_id} removed from store")

                return {"status": "success", "message": "Session released"}

        except Exception as e:
            logger.error(f"Error releasing session {session_id}: {str(e)}")
            # If we can't connect to the browser, just remove the session from our store
            if session_id in self.sessions:
                del self.sessions[session_id]
                logger.info(f"Session {session_id} removed from store after error")
            return {
                "status": "success",
                "message": f"Session released (with error: {str(e)})",
            }


# Create a singleton instance
cdp_service = CDPService()
