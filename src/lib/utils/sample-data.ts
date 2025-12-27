/**
 * Sample SSE stream data for testing and demonstration
 */

export interface SampleOption {
	id: string;
	name: string;
	description: string;
	data: string;
}

export const SAMPLES: SampleOption[] = [
	{
		id: 'data-only',
		name: 'Data Only',
		description: 'Minimal SSE - just data fields',
		data: `data: First message

data: Second message

data: Third message

data: Fourth message

data: Fifth message`
	},
	{
		id: 'basic',
		name: 'Basic Events',
		description: 'Simple message events with IDs',
		data: `data: Hello, world!
id: 1

data: This is the second message
id: 2

data: Third message
id: 3

event: custom
data: Custom event type
id: 4`
	},
	{
		id: 'chat',
		name: 'Chat Application',
		description: 'User connections and chat messages',
		data: `: Chat session started

event: user-connected
data: {"userId": "user123", "username": "alice"}
id: 1
retry: 3000

event: message
data: {"text": "Hello everyone!", "author": "alice", "timestamp": "2024-01-15T10:30:00Z"}
id: 2

event: user-connected
data: {"userId": "user456", "username": "bob"}
id: 3

event: message
data: {"text": "Hi Alice!", "author": "bob", "timestamp": "2024-01-15T10:30:15Z"}
id: 4

event: message
data: {"text": "How are you?", "author": "alice", "timestamp": "2024-01-15T10:30:30Z"}
id: 5

event: user-disconnected
data: {"userId": "user456", "username": "bob"}
id: 6`
	},
	{
		id: 'notifications',
		name: 'Notifications',
		description: 'Different types of system notifications',
		data: `event: notification
data: {"type": "info", "message": "System maintenance scheduled for tonight"}
id: 1

event: notification
data: {"type": "warning", "message": "High CPU usage detected"}
id: 2

event: notification
data: {"type": "success", "message": "Backup completed successfully"}
id: 3

event: notification
data: {"type": "error", "message": "Database connection failed"}
id: 4

event: notification
data: {"type": "info", "message": "New update available"}
id: 5`
	},
	{
		id: 'ecommerce',
		name: 'E-commerce Orders',
		description: 'Order status updates and tracking',
		data: `event: order-created
data: {"orderId": "ORD-1001", "total": 99.99, "status": "pending"}
id: order-1001-1

event: order-updated
data: {"orderId": "ORD-1001", "status": "processing"}
id: order-1001-2

event: order-updated
data: {"orderId": "ORD-1001", "status": "shipped", "trackingNumber": "TRK123456"}
id: order-1001-3

event: order-updated
data: {"orderId": "ORD-1001", "status": "out-for-delivery"}
id: order-1001-4

event: order-updated
data: {"orderId": "ORD-1001", "status": "delivered"}
id: order-1001-5`
	},
	{
		id: 'multiline',
		name: 'Multi-line JSON',
		description: 'Complex nested JSON payloads',
		data: `event: user-profile
data: {
data:   "userId": "123",
data:   "profile": {
data:     "name": "Alice Smith",
data:     "email": "alice@example.com",
data:     "preferences": {
data:       "theme": "dark",
data:       "notifications": true
data:     }
data:   }
data: }
id: 1

event: analytics
data: {
data:   "pageView": "/dashboard",
data:   "metrics": {
data:     "duration": 1250,
data:     "interactions": 5,
data:     "errors": []
data:   },
data:   "user": {
data:     "id": "123",
data:     "session": "sess-abc"
data:   }
data: }
id: 2`
	},
	{
		id: 'retry',
		name: 'Reconnection & Retry',
		description: 'Events with retry intervals and ID reset',
		data: `: Connection established
retry: 5000

data: Initial message with retry set
id: 1

data: Another message
id: 2

: Server asks client to retry in 10 seconds
retry: 10000
data: Retry interval updated
id: 3

: Reset the event ID
data: Event ID will be reset next
id

data: This event has no ID (lastEventId is now empty)

data: Back to normal operation
id: 4`
	},
	{
		id: 'openai',
		name: 'OpenAI Responses API',
		description: 'Real-world example: OpenAI Responses API streaming',
		data: `: OpenAI Responses API Stream Example

event: response.created
data: {"type":"response.created","response":{"id":"resp_123","object":"response","created_at":1741487325,"status":"in_progress"},"sequence_number":1}

event: response.output_item.added
data: {"type":"response.output_item.added","output_index":0,"item":{"id":"msg_123","status":"in_progress","type":"message","role":"assistant","content":[]},"sequence_number":2}

event: response.content_part.added
data: {"type":"response.content_part.added","item_id":"msg_123","output_index":0,"content_index":0,"part":{"type":"output_text","text":""},"sequence_number":3}

event: response.output_text.delta
data: {"type":"response.output_text.delta","item_id":"msg_123","output_index":0,"content_index":0,"delta":"Hello","sequence_number":4}

event: response.output_text.delta
data: {"type":"response.output_text.delta","item_id":"msg_123","output_index":0,"content_index":0,"delta":"!","sequence_number":5}

event: response.output_text.delta
data: {"type":"response.output_text.delta","item_id":"msg_123","output_index":0,"content_index":0,"delta":" How","sequence_number":6}

event: response.output_text.delta
data: {"type":"response.output_text.delta","item_id":"msg_123","output_index":0,"content_index":0,"delta":" can","sequence_number":7}

event: response.output_text.delta
data: {"type":"response.output_text.delta","item_id":"msg_123","output_index":0,"content_index":0,"delta":" I","sequence_number":8}

event: response.output_text.delta
data: {"type":"response.output_text.delta","item_id":"msg_123","output_index":0,"content_index":0,"delta":" assist","sequence_number":9}

event: response.output_text.delta
data: {"type":"response.output_text.delta","item_id":"msg_123","output_index":0,"content_index":0,"delta":" you","sequence_number":10}

event: response.output_text.delta
data: {"type":"response.output_text.delta","item_id":"msg_123","output_index":0,"content_index":0,"delta":" today","sequence_number":11}

event: response.output_text.delta
data: {"type":"response.output_text.delta","item_id":"msg_123","output_index":0,"content_index":0,"delta":"?","sequence_number":12}

event: response.output_text.done
data: {"type":"response.output_text.done","item_id":"msg_123","output_index":0,"content_index":0,"text":"Hello! How can I assist you today?","sequence_number":13}

event: response.content_part.done
data: {"type":"response.content_part.done","item_id":"msg_123","output_index":0,"content_index":0,"part":{"type":"output_text","text":"Hello! How can I assist you today?"},"sequence_number":14}

event: response.output_item.done
data: {"type":"response.output_item.done","output_index":0,"item":{"id":"msg_123","status":"completed","type":"message","role":"assistant"},"sequence_number":15}

event: response.completed
data: {"type":"response.completed","response":{"id":"resp_123","object":"response","status":"completed"},"sequence_number":16}`
	},
	{
		id: 'comprehensive',
		name: 'Comprehensive Example',
		description: 'All SSE features demonstrated',
		data: `: This is a comprehensive SSE stream example
: Demonstrating all features

event: user-connected
data: {"userId": "user123", "username": "alice"}
id: 1
retry: 3000

event: message
data: {"text": "Hello, world!", "author": "alice"}
id: 2

data: This is a message event without an event name
data: It has multiple data lines
data: which are concatenated with newlines
id: 3

event: status-update
data: {
data:   "status": "active",
data:   "connections": 42,
data:   "uptime": "24h"
data: }
id: 4

: Keepalive comment

event: notification
data: {"type": "info", "message": "System maintenance in 1 hour"}
id: 5

event: heartbeat
data: ping
id: 6

event: error
data: {"code": 500, "message": "Internal server error"}
id: 7

event: user-disconnected
data: {"userId": "user456", "username": "bob"}
id: 8

: End of sample stream`
	}
];

// For backwards compatibility
export const SAMPLE_SSE_STREAM = SAMPLES.find((s) => s.id === 'comprehensive')!.data;
export const MINIMAL_SAMPLE = SAMPLES.find((s) => s.id === 'basic')!.data;
