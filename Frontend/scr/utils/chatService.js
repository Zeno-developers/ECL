import { toast } from 'react-toastify';

class ChatService {
  constructor() {
    this.socket = null;
    this.messageCallbacks = new Set();
    this.connectionCallbacks = new Set();
    this.typingCallbacks = new Set();
    this.roomCallbacks = new Set();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.isConnected = false;
    this.rooms = new Set();
    this.heartbeatInterval = null;
    this.autoReconnect = true;
  }

  // Connect to WebSocket server - matches your API base URL structure
  connect(token = null) {
    // Clear any existing connection first
    this.disconnect();

    const authToken = token || localStorage.getItem('token');
    if (!authToken) {
      console.error('No authentication token available');
      toast.error('Please login to use chat');
      return;
    }

    try {
      // Match your API URL structure exactly
      // Production: wss://elchurch.site
      // Development: ws://localhost:5000
      const wsUrl = window.location.hostname === 'localhost' 
        ? 'ws://localhost:5000'  // Local development
        : `wss://${window.location.hostname}`; // Production (auto-converts to wss://)
      
      console.log(`🔌 Connecting to WebSocket: ${wsUrl}`);
      this.socket = new WebSocket(`${wsUrl}?token=${authToken}`);

      this.socket.onopen = () => {
        console.log('✅ WebSocket connected successfully');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.notifyConnectionCallbacks('connected');
        toast.success('Chat connected');
        
        // Restart heartbeat
        this.startHeartbeat();
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error, 'Raw data:', event.data);
        }
      };

      this.socket.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', event.code, event.reason);
        this.isConnected = false;
        this.rooms.clear();
        this.notifyConnectionCallbacks('disconnected');
        this.stopHeartbeat();
        
        if (event.code !== 1000 && this.autoReconnect) {
          this.attemptReconnect();
        }
      };

      this.socket.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        this.notifyConnectionCallbacks('error');
        if (this.reconnectAttempts === 0) {
          toast.error('Chat connection error');
        }
      };

    } catch (error) {
      console.error('❌ WebSocket connection error:', error);
      toast.error('Failed to connect to chat');
    }
  }

  // Attempt to reconnect with exponential backoff
  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.autoReconnect) {
      this.reconnectAttempts++;
      const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);
      
      console.log(`🔄 Attempting to reconnect in ${delay}ms... (Attempt ${this.reconnectAttempts})`);
      
      setTimeout(() => {
        if (!this.isConnected && this.autoReconnect) {
          const token = localStorage.getItem('token');
          if (token) {
            this.connect(token);
          }
        }
      }, delay);
    } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      toast.error('Chat connection lost. Please refresh the page.');
    }
  }

  // Disconnect from WebSocket
  disconnect() {
    this.autoReconnect = false;
    
    if (this.socket) {
      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.close(1000, 'User initiated disconnect');
      }
      this.socket = null;
    }
    
    this.isConnected = false;
    this.rooms.clear();
    this.reconnectAttempts = 0;
    this.stopHeartbeat();
  }

  // Enhanced message handling that matches your API response structure
  handleMessage(data) {
    console.log('📨 WebSocket message received:', data);

    try {
      switch (data.type) {
        // Message events - match your API message structure
        case 'new_message':
        case 'message_sent':
        case 'message_received':
          this.notifyMessageCallbacks({
            type: 'message',
            message: data.data || data.message,
            roomId: data.roomId,
            timestamp: data.timestamp || new Date().toISOString()
          });
          break;
        
        // Message status updates
        case 'message_delivered':
          this.notifyMessageCallbacks({
            type: 'message_delivered',
            messageId: data.messageId,
            tempId: data.tempId,
            timestamp: data.timestamp
          });
          break;
        
        case 'message_failed':
          this.notifyMessageCallbacks({
            type: 'message_failed',
            tempId: data.tempId,
            reason: data.reason,
            timestamp: data.timestamp
          });
          toast.error(`Message failed: ${data.reason}`);
          break;
        
        case 'message_reacted':
          this.notifyMessageCallbacks({
            type: 'message_reacted',
            messageId: data.messageId,
            reaction: data.reaction,
            user: data.user,
            timestamp: data.timestamp
          });
          break;

        // Typing indicators
        case 'user_typing':
        case 'typing':
          this.notifyTypingCallbacks({
            type: 'typing',
            roomId: data.roomId,
            userId: data.userId,
            userName: data.userName,
            isTyping: data.isTyping,
            timestamp: data.timestamp
          });
          break;

        // Room events - match your chatAPI structure
        case 'user_joined':
        case 'user_leave':
          this.notifyRoomCallbacks({
            type: 'user_joined_left',
            roomId: data.roomId,
            user: data.user,
            action: data.type === 'user_joined' ? 'joined' : 'left',
            timestamp: data.timestamp
          });
          break;

        case 'room_joined':
          if (data.roomId) {
            this.rooms.add(data.roomId);
          }
          this.notifyRoomCallbacks({
            type: 'room_joined',
            roomId: data.roomId,
            room: data.room,
            message: data.message,
            timestamp: data.timestamp
          });
          if (data.message) {
            toast.success(data.message);
          }
          break;

        case 'room_left':
          if (data.roomId) {
            this.rooms.delete(data.roomId);
          }
          this.notifyRoomCallbacks({
            type: 'room_left',
            roomId: data.roomId,
            message: data.message,
            timestamp: data.timestamp
          });
          if (data.message) {
            toast.info(data.message);
          }
          break;

        // Connection events
        case 'connected':
          this.notifyConnectionCallbacks('connected');
          break;

        case 'ping':
          this.sendPong();
          break;

        case 'error':
          console.error('❌ WebSocket error:', data.message);
          toast.error(data.message || 'Chat error occurred');
          break;

        // Presence events
        case 'user_online':
        case 'user_offline':
          this.notifyRoomCallbacks({
            type: 'presence',
            userId: data.userId,
            status: data.type === 'user_online' ? 'online' : 'offline',
            timestamp: data.timestamp
          });
          break;

        default:
          console.log('🔍 Unknown WebSocket message type:', data.type);
          this.notifyMessageCallbacks(data);
      }
    } catch (error) {
      console.error('❌ Error handling WebSocket message:', error, 'Data:', data);
    }
  }

  // Send message - matches your API expected format
  sendMessage(roomId, message, messageType = 'text', repliedTo = null, tempId = null) {
    if (!roomId || !message || typeof message !== 'string') {
      console.error('❌ Invalid message parameters');
      toast.error('Invalid message');
      return false;
    }

    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      toast.error('Message cannot be empty');
      return false;
    }

    if (!this.isConnected || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      toast.error('Not connected to chat');
      return false;
    }

    try {
      // Match exactly what your backend expects for send_message
      const messageData = {
        type: 'send_message',
        roomId: roomId,
        data: {
          content: trimmedMessage,  // Matches your message structure
          messageType: messageType,
          repliedTo: repliedTo
        },
        timestamp: new Date().toISOString()
      };

      // Add tempId for optimistic updates
      if (tempId) {
        messageData.tempId = tempId;
      }

      this.socket.send(JSON.stringify(messageData));
      console.log('📤 Message sent to room:', roomId, '- TempId:', tempId);
      return true;
    } catch (error) {
      console.error('❌ Error sending message:', error);
      toast.error('Failed to send message');
      return false;
    }
  }

  // Join room - matches your chatAPI.joinRoom structure
  joinRoom(roomId) {
    if (!roomId) {
      console.error('❌ Room ID is required');
      return false;
    }

    if (!this.isConnected || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ WebSocket not connected, cannot join room');
      return false;
    }

    try {
      this.socket.send(JSON.stringify({
        type: 'join_room',
        roomId: roomId,
        timestamp: new Date().toISOString()
      }));
      
      this.rooms.add(roomId);
      console.log(`✅ Joined room: ${roomId}`);
      return true;
    } catch (error) {
      console.error('❌ Error joining room:', error);
      toast.error('Failed to join room');
      return false;
    }
  }

  // Leave room - matches your chatAPI.leaveRoom structure
  leaveRoom(roomId) {
    if (!roomId) {
      console.error('❌ Room ID is required');
      return false;
    }

    if (!this.isConnected || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ WebSocket not connected, cannot leave room');
      return false;
    }

    try {
      this.socket.send(JSON.stringify({
        type: 'leave_room',
        roomId: roomId,
        timestamp: new Date().toISOString()
      }));
      
      this.rooms.delete(roomId);
      console.log(`🚪 Left room: ${roomId}`);
      return true;
    } catch (error) {
      console.error('❌ Error leaving room:', error);
      toast.error('Failed to leave room');
      return false;
    }
  }

  // Send typing indicator - matches your API structure
  sendTyping(roomId, isTyping) {
    if (!roomId) {
      console.error('❌ Room ID is required for typing indicator');
      return false;
    }

    if (!this.isConnected || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      this.socket.send(JSON.stringify({
        type: 'typing',
        roomId: roomId,
        data: { 
          isTyping: Boolean(isTyping) 
        },
        timestamp: new Date().toISOString()
      }));
      return true;
    } catch (error) {
      console.error('❌ Error sending typing indicator:', error);
      return false;
    }
  }

  // React to message - matches your chatAPI.reactToMessage structure
  reactToMessage(messageId, emoji) {
    if (!messageId || !emoji) {
      console.error('❌ Message ID and emoji are required');
      toast.error('Invalid reaction');
      return false;
    }

    if (!this.isConnected || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      toast.error('Not connected to chat');
      return false;
    }

    try {
      this.socket.send(JSON.stringify({
        type: 'react_message',
        data: { 
          messageId: messageId, 
          emoji: emoji 
        },
        timestamp: new Date().toISOString()
      }));
      return true;
    } catch (error) {
      console.error('❌ Error reacting to message:', error);
      toast.error('Failed to react to message');
      return false;
    }
  }

  // Mark as read - matches your chatAPI.markAsRead structure
  markAsRead(roomId) {
    if (!roomId) {
      console.error('❌ Room ID is required');
      return false;
    }

    if (!this.isConnected || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      this.socket.send(JSON.stringify({
        type: 'mark_read',
        roomId: roomId,
        timestamp: new Date().toISOString()
      }));
      return true;
    } catch (error) {
      console.error('❌ Error marking messages as read:', error);
      return false;
    }
  }

  // Send pong response
  sendPong() {
    if (this.isConnected && this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify({
          type: 'pong',
          timestamp: new Date().toISOString()
        }));
      } catch (error) {
        console.error('❌ Error sending pong:', error);
      }
    }
  }

  // Presence management - matches your API structure
  setUserPresence(status) {
    if (!this.isConnected || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      this.socket.send(JSON.stringify({
        type: 'presence',
        data: { 
          status: status,
          lastSeen: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      }));
      return true;
    } catch (error) {
      console.error('❌ Error setting presence:', error);
      return false;
    }
  }

  // File validation - matches your fileAPI.validateFile structure
  validateFile(file, options = {}) {
    const {
      maxSize = 10 * 1024 * 1024, // 10MB default
      allowedTypes = [],
      allowedVideoTypes = ['video/mp4', 'video/mov', 'video/avi', 'video/webm'],
      allowedAudioTypes = ['audio/mpeg', 'audio/wav', 'audio/m4a', 'audio/aac'],
      allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    } = options;

    // Check file size
    if (file.size > maxSize) {
      throw new Error(`File size must be less than ${maxSize / 1024 / 1024}MB`);
    }

    // Check file type
    const allAllowedTypes = [...allowedTypes, ...allowedVideoTypes, ...allowedAudioTypes, ...allowedImageTypes];
    if (allAllowedTypes.length > 0 && !allAllowedTypes.includes(file.type)) {
      throw new Error('File type not allowed');
    }

    return true;
  }

  // Heartbeat management
  startHeartbeat(interval = 30000) {
    this.stopHeartbeat();
    
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected && this.socket && this.socket.readyState === WebSocket.OPEN) {
        try {
          this.socket.send(JSON.stringify({
            type: 'ping',
            timestamp: new Date().toISOString()
          }));
        } catch (error) {
          console.error('❌ Error sending heartbeat:', error);
        }
      }
    }, interval);
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Callback management (unchanged but included for completeness)
  onMessage(callback) {
    this.messageCallbacks.add(callback);
    return () => this.messageCallbacks.delete(callback);
  }

  onConnection(callback) {
    this.connectionCallbacks.add(callback);
    return () => this.connectionCallbacks.delete(callback);
  }

  onTyping(callback) {
    this.typingCallbacks.add(callback);
    return () => this.typingCallbacks.delete(callback);
  }

  onRoomUpdate(callback) {
    this.roomCallbacks.add(callback);
    return () => this.roomCallbacks.delete(callback);
  }

  // Notification methods
  notifyMessageCallbacks(data) {
    this.messageCallbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in message callback:', error);
      }
    });
  }

  notifyConnectionCallbacks(status) {
    this.connectionCallbacks.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('Error in connection callback:', error);
      }
    });
  }

  notifyTypingCallbacks(data) {
    this.typingCallbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in typing callback:', error);
      }
    });
  }

  notifyRoomCallbacks(data) {
    this.roomCallbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in room callback:', error);
      }
    });
  }

  // Utility methods
  getConnectionStatus() {
    if (!this.socket) return 'disconnected';
    
    switch (this.socket.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN: return 'connected';
      case WebSocket.CLOSING: return 'closing';
      case WebSocket.CLOSED: return 'disconnected';
      default: return 'unknown';
    }
  }

  getJoinedRooms() {
    return Array.from(this.rooms);
  }

  isInRoom(roomId) {
    return this.rooms.has(roomId);
  }

  getConnectionInfo() {
    return {
      isConnected: this.isConnected,
      readyState: this.socket ? this.socket.readyState : null,
      joinedRooms: this.getJoinedRooms(),
      reconnectAttempts: this.reconnectAttempts
    };
  }

  // Enable auto-reconnect
  enableAutoReconnect() {
    this.autoReconnect = true;
  }

  // Disable auto-reconnect
  disableAutoReconnect() {
    this.autoReconnect = false;
  }

  // Debug method
  debug() {
    console.group('ChatService Debug Info');
    console.log('Connection Status:', this.getConnectionStatus());
    console.log('Is Connected:', this.isConnected);
    console.log('Reconnect Attempts:', this.reconnectAttempts);
    console.log('Joined Rooms:', this.getJoinedRooms());
    console.log('WebSocket State:', this.socket ? this.socket.readyState : 'No socket');
    console.log('Callbacks Registered:');
    console.log('  - Message:', this.messageCallbacks.size);
    console.log('  - Connection:', this.connectionCallbacks.size);
    console.log('  - Typing:', this.typingCallbacks.size);
    console.log('  - Room:', this.roomCallbacks.size);
    console.groupEnd();
  }
}

// Create singleton instance
const chatService = new ChatService();

// Auto-connect when token is available (matches your initialization pattern)
const initializeChat = () => {
  const token = localStorage.getItem('token');
  if (token) {
    setTimeout(() => {
      console.log('Auto-initializing chat service...');
      chatService.connect(token);
    }, 2000);
  }
};

// Initialize when module loads
initializeChat();

// Export both default and named exports to match your API pattern
export default chatService;
export { chatService as webSocketService };