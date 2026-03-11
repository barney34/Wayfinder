"""
WebSocket Connection Manager for Real-Time Customer Data Sync
Manages WebSocket connections and broadcasts updates to clients viewing the same customer.
"""

from typing import Dict, List
from fastapi import WebSocket
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections for real-time customer data synchronization"""
    
    def __init__(self):
        # Map of customer_id -> list of active WebSocket connections
        self.active_connections: Dict[str, List[WebSocket]] = {}
    
    async def connect(self, customer_id: str, websocket: WebSocket):
        """Register a new WebSocket connection for a customer"""
        await websocket.accept()
        
        if customer_id not in self.active_connections:
            self.active_connections[customer_id] = []
        
        self.active_connections[customer_id].append(websocket)
        logger.info(f"WebSocket connected for customer {customer_id}. Total connections: {len(self.active_connections[customer_id])}")
    
    def disconnect(self, customer_id: str, websocket: WebSocket):
        """Remove a WebSocket connection for a customer"""
        if customer_id in self.active_connections:
            if websocket in self.active_connections[customer_id]:
                self.active_connections[customer_id].remove(websocket)
                logger.info(f"WebSocket disconnected for customer {customer_id}. Remaining connections: {len(self.active_connections[customer_id])}")
            
            # Clean up empty customer entries
            if not self.active_connections[customer_id]:
                del self.active_connections[customer_id]
                logger.info(f"No more connections for customer {customer_id}, cleaned up")
    
    async def broadcast(self, customer_id: str, message: dict):
        """Broadcast a message to all WebSocket connections for a customer"""
        if customer_id not in self.active_connections:
            logger.debug(f"No active connections for customer {customer_id}, skipping broadcast")
            return
        
        # Get list of connections to broadcast to
        connections = self.active_connections[customer_id].copy()
        logger.info(f"Broadcasting to {len(connections)} connection(s) for customer {customer_id}")
        
        # Track failed connections to remove
        failed_connections = []
        
        for connection in connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Failed to send message to WebSocket: {e}")
                failed_connections.append(connection)
        
        # Remove failed connections
        for failed in failed_connections:
            self.disconnect(customer_id, failed)
    
    def get_connection_count(self, customer_id: str) -> int:
        """Get the number of active connections for a customer"""
        return len(self.active_connections.get(customer_id, []))
    
    def get_total_connections(self) -> int:
        """Get total number of active connections across all customers"""
        return sum(len(conns) for conns in self.active_connections.values())


# Global connection manager instance
manager = ConnectionManager()
