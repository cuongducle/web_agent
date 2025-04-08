"""
Browser Use CDP Service

This module provides a simplified CDP service implementation that uses the browser_use library directly.
It maintains the same interface as the original CDP service but delegates the actual CDP operations
to the browser_use library.
"""

import asyncio
import logging
import os
import uuid
from typing import Any, Dict, List, Optional

import requests
from browser_use.browser.browser import Browser, BrowserConfig
from pydantic import BaseModel

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("browser_use_cdp")

# Chrome DevTools Protocol endpoint
CDP_WS_ENDPOINT = os.getenv("CDP_WS_ENDPOINT", "ws://localhost:9222")
CDP_HTTP_ENDPOINT = CDP_WS_ENDPOINT.replace("ws://", "http://")


class BrowserSession(BaseModel):
    """Browser session model compatible with the original CDPSession"""

    id: str
    ws_url: str
    debugUrl: str
    dimensions: Dict[str, int] = {"width": 1280, "height": 800}
    api_timeout: int = 900000  # 15 minutes in milliseconds
    browser: Optional[Any] = None  # Store the Browser instance


class BrowserUseService:
    """Service to manage browser sessions using browser_use library directly"""

    def __init__(self, cdp_url: Optional[str] = None):
        """
        Initialize the browser_use CDP service

        Args:
            cdp_url: CDP URL for Chrome. If None, will use environment variable.
        """
        self.cdp_url = cdp_url or CDP_HTTP_ENDPOINT
        logger.info(
            f"Browser Use CDP service initialized with endpoint: {self.cdp_url}"
        )
        self.sessions: Dict[str, BrowserSession] = {}

    async def _check_chrome_availability(self) -> bool:
        """Check if Chrome is available with CDP enabled"""
        try:
            response = requests.get(f"{self.cdp_url}/json/version")
            if response.status_code != 200:
                logger.error(
                    f"Chrome not accessible: HTTP error {response.status_code}"
                )
                return False
            logger.info("Chrome is running and accessible")
            return True
        except Exception as e:
            logger.error(f"Error checking Chrome availability: {str(e)}")
            return False

    async def create_session(
        self, dimensions: Optional[Dict[str, int]] = None, api_timeout: int = 900000
    ) -> BrowserSession:
        """
        Create a new browser session

        Args:
            dimensions: Browser window dimensions
            api_timeout: Session timeout in milliseconds

        Returns:
            BrowserSession object with connection details
        """
        try:
            # Generate a unique session ID
            session_id = str(uuid.uuid4())
            logger.info(f"Creating new browser session with ID: {session_id}")

            # Get available targets
            try:
                # response = requests.get(f"{self.cdp_url}/json/list")
                # if response.status_code != 200:
                #     raise Exception(
                #         f"Failed to get targets list: HTTP error {response.status_code}"
                #     )

                # # Find an available target or create a new one
                # targets = response.json()
                # target_ws_url = None

                # # Try to find an available page
                # for target in targets:
                #     if target.get("type") == "page" and not target.get(
                #         "url"
                #     ).startswith("devtools://"):
                #         target_ws_url = target.get("webSocketDebuggerUrl")
                #         target_id = target.get("id")
                #         logger.info(f"Found existing page target: {target_id}")
                #         break

                # # If no suitable target found, create a new one
                # if not target_ws_url:
                #     logger.info("No suitable target found, creating a new one")
                #     response = requests.get(f"{self.cdp_url}/json/new")
                #     if response.status_code != 200:
                #         raise Exception(
                #             f"Failed to create new target: HTTP error {response.status_code}"
                #         )

                #     # Get the new target info
                #     new_target = response.json()
                #     target_ws_url = new_target.get("webSocketDebuggerUrl")
                #     target_id = new_target.get("id")

                #     if not target_ws_url:
                #         raise Exception("Failed to get WebSocket URL for new target")

                #     logger.info(f"Created new target: {target_id}")

                # Initialize browser_use Browser with the target
                browser = Browser(
                    config=BrowserConfig(
                        headless=False,
                        extra_chromium_args=[
                            "--remote-debugging-port=9222",
                            "--disable-extensions",
                            "--disable-gpu",
                            "--disable-dev-shm-usage",
                            "--no-sandbox",
                            "--disable-setuid-sandbox",
                            "--disable-web-security",
                            "--remote-allow-origins=*",
                            # Anti-bot detection arguments
                            "--disable-blink-features=AutomationControlled",
                            "--disable-automation",
                            "--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                            "--window-size=1920,1080",
                            "--start-maximized",
                        ],
                    ),
                )

                # Init browser and wait for it to be ready
                await browser._init()

                # debugUrl is second tab in chrome

                # Create a session object
                session = BrowserSession(
                    id=session_id,
                    ws_url=CDP_WS_ENDPOINT,
                    debugUrl="",
                    dimensions=dimensions or {"width": 1280, "height": 800},
                    api_timeout=api_timeout,
                    browser=browser,
                )

                # Store the session
                self.sessions[session_id] = session
                logger.info(f"Session created successfully: {session_id}")

                return session
            except Exception as e:
                logger.error(f"Error during session creation: {str(e)}")
                raise
        except Exception as e:
            error_msg = f"Failed to create browser session: {str(e)}"
            logger.error(error_msg)
            raise Exception(error_msg)

    async def retrieve_session(self, session_id: str) -> BrowserSession:
        """
        Retrieve an existing session. If session is not found, create a new one.

        Args:
            session_id: ID of the session to retrieve

        Returns:
            BrowserSession object
        """
        session = self.sessions.get(session_id)
        if not session:
            # If session not found, check if Chrome is still accessible
            if not await self._check_chrome_availability():
                raise Exception(
                    "Chrome is not accessible. Make sure it's running with remote debugging enabled."
                )

            logger.info(f"Session {session_id} not found, creating new session")
            # Create a new session with default settings
            session = await self.create_session()
            logger.info(f"Created new session: {session.id}")

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
            # Remove the session from our store without closing the browser
            if session_id in self.sessions:
                if session.browser:
                    # wait for 1 minute before closing the browser
                    logger.info(f"Browser closed for session {session_id}")
                del self.sessions[session_id]
                logger.info(f"Session {session_id} removed from store")

            return {
                "status": "success",
                "message": "Session released (browser kept alive)",
            }
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
browser_use_service = BrowserUseService()
