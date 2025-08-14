#!/usr/bin/env python3
"""
Server-Sent Events handler for real-time training progress
"""

from fastapi import Request
from fastapi.responses import StreamingResponse
import asyncio
import json
from typing import AsyncGenerator
import logging

logger = logging.getLogger(__name__)

class SSEManager:
    """Manages SSE connections for training progress"""
    
    def __init__(self):
        self.active_connections = []
        self.training_progress = {
            'status': 'idle',
            'epoch': 0,
            'total_epochs': 0,
            'accuracy': 0,
            'loss': 1.0,
            'message': 'Ready to train'
        }
        
    async def connect(self, request: Request) -> AsyncGenerator:
        """Create SSE connection"""
        client_id = id(request)
        self.active_connections.append(client_id)
        logger.info(f"Client {client_id} connected for SSE")
        
        try:
            # Send initial status
            yield f"data: {json.dumps(self.training_progress)}\n\n"
            
            # Keep connection alive and send updates
            while True:
                if await request.is_disconnected():
                    break
                    
                # Send heartbeat every 30 seconds
                await asyncio.sleep(30)
                yield f": heartbeat\n\n"
                
        except asyncio.CancelledError:
            pass
        finally:
            self.active_connections.remove(client_id)
            logger.info(f"Client {client_id} disconnected from SSE")
            
    async def broadcast_progress(self, progress: dict):
        """Broadcast progress to all connected clients"""
        self.training_progress = progress
        message = f"data: {json.dumps(progress)}\n\n"
        
        # Send to all connected clients
        for connection in self.active_connections:
            try:
                # In real implementation, would send to actual connection
                logger.info(f"Broadcasting to {connection}: {progress['message']}")
            except Exception as e:
                logger.error(f"Failed to send to {connection}: {e}")
                
    def get_current_progress(self) -> dict:
        """Get current training progress"""
        return self.training_progress

# Global SSE manager instance
sse_manager = SSEManager()

async def training_progress_stream(request: Request):
    """SSE endpoint for training progress"""
    async def event_generator():
        """Generate SSE events"""
        try:
            # Send initial connection message
            yield f"data: {json.dumps({'type': 'connected', 'message': 'Connected to training progress stream'})}\n\n"
            
            last_progress = None
            while True:
                # Check if client disconnected
                if await request.is_disconnected():
                    break
                
                # Get current progress
                current_progress = sse_manager.get_current_progress()
                
                # Send update if progress changed
                if current_progress != last_progress:
                    yield f"data: {json.dumps(current_progress)}\n\n"
                    last_progress = current_progress.copy()
                
                # Wait before next check
                await asyncio.sleep(0.5)
                
        except asyncio.CancelledError:
            logger.info("SSE stream cancelled")
        except Exception as e:
            logger.error(f"SSE stream error: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Disable Nginx buffering
        }
    )