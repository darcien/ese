# Server-Sent Events (SSE) Specification Reference

This document explains the Server-Sent Events specification as implemented in the SSE Stream Viewer.

## Specification Source

This viewer follows the [WHATWG Server-Sent Events specification](https://html.spec.whatwg.org/multipage/server-sent-events.html).

---

## Standard SSE Fields

### 1. `data:` (Required)

The event's payload/content.

**Behavior:**

- Can appear multiple times in a single event
- Multiple `data:` lines are concatenated with `\n` (newline)
- At least one `data:` field is required for a valid event

**Example:**

```
data: Hello, world!

data: Line 1
data: Line 2
data: Line 3
```

The second event produces: `"Line 1\nLine 2\nLine 3"`

---

### 2. `event:` (Optional)

The event type name.

**Behavior:**

- Optional field - can be omitted entirely
- When browser receives an event without `event:` field, it dispatches it as type `"message"`
- Used to differentiate event types on the client side
- Client can register different handlers for different event types

**Important Note:**

- The `"message"` default is **client-side behavior** (browser's EventSource)
- In the raw stream, omitting `event:` means no event type is specified
- This viewer shows what's actually in the stream, not browser defaults

**Example:**

```
event: notification
data: {"message": "New notification"}

data: No event type specified (browser treats as "message")
```

---

### 3. `id:` (Optional)

Event identifier used for reconnection.

**Purpose:**

- When a connection drops, the browser sends a `Last-Event-ID` HTTP header when reconnecting
- Server can use this to resume from where the client left off
- Prevents duplicate event delivery after reconnection

**Behavior:**

- Persists across events until changed or reset
- If event #1 has `id:1` and event #2 has no `id` field, event #2 still has `lastEventId=1`
- Can be reset to empty by sending `id` with no value: `id`
- Cannot contain U+0000 NULL characters

**Example:**

```
data: First event
id: 1

data: Second event
id: 2

data: Third event (still has lastEventId=2)

data: Fourth event
id

data: Fifth event (lastEventId is now empty)
```

**Reconnection Flow:**

1. Client connects to server
2. Server sends events with IDs: `id:1`, `id:2`, `id:3`
3. Connection drops after `id:3`
4. Client reconnects, sends header: `Last-Event-ID: 3`
5. Server resumes from event #4

---

### 4. `retry:` (Optional)

Reconnection delay in milliseconds.

**Behavior:**

- Sets how long the browser waits before attempting to reconnect after a connection drop
- Must be a valid integer (ASCII digits only)
- If invalid, the field is ignored

**Example:**

```
retry: 10000
data: Reconnect after 10 seconds if connection drops
```

---

## Special Syntax

### Comments

Lines starting with `:` (colon) are comments and are ignored.

**Purpose:**

- Keep connections alive (prevents proxy timeouts)
- Add notes or debugging information
- Recommended to send a comment every ~15 seconds to prevent timeouts

**Example:**

```
: This is a comment

: keepalive
data: actual event data
```

---

### Event Boundaries

Empty lines separate events.

**Example:**

```
data: First event

data: Second event

data: Third event
```

Each blank line triggers dispatch of the accumulated event.

---

### Optional Space After Colon

A single space after the colon is stripped if present.

**Example:**

```
data:No space
data: With space
```

Both produce the same value (space is not part of the data).

---

## Non-Standard Fields

Any field not listed above (`event`, `data`, `id`, `retry`) is **ignored** per the spec.

The SSE viewer previously supported a `timestamp` field, but this was removed to maintain strict spec compliance.

---

## Encoding

SSE streams **must** be encoded as UTF-8. No other encoding is supported.

---

## MIME Type

The correct MIME type for SSE streams is: `text/event-stream`

---

## SSE Viewer-Specific Features

### `sequence` (Not in spec)

The SSE viewer adds an auto-generated `sequence` number to each event.

**Differences from `id`:**

- `sequence`: Client-side counter (1, 2, 3...) for visual reference only
- `id`: Server-provided field used for reconnection

**Example:**

```
Sequence #1, ID: evt-001
Sequence #2, ID: evt-002
Sequence #3, ID: (none)  ← Still has lastEventId=evt-002
Sequence #4, ID: evt-004
```

### Event Type Display

The viewer shows what's actually in the raw stream:

- If `event:` field is present → shows the value
- If `event:` field is absent → shows `(default)` or column is hidden
- This differs from browser behavior which always uses `"message"` as default

**Auto-hide Empty Columns:**

- Event Type, ID, and Retry columns can be automatically hidden
- Checkbox toggle: "Hide empty columns" (enabled by default)
- Shows only columns with actual data for cleaner display

---

## Complete Example

```
: This is a sample SSE stream
: Comments keep the connection alive

event: user-connected
data: {"userId": "123", "username": "alice"}
id: 1
retry: 3000

event: message
data: Hello from the server!
id: 2

data: This is a default "message" event
data: It has multiple data lines
data: which are concatenated
id: 3

: keepalive comment

event: user-disconnected
data: {"userId": "123"}
id: 4

```

This stream produces 4 events:

1. Type: "user-connected", ID: 1, Retry: 3000ms
2. Type: "message", ID: 2
3. Type: "message", ID: 3 (multi-line data)
4. Type: "user-disconnected", ID: 4

---

## References

- [WHATWG SSE Specification](https://html.spec.whatwg.org/multipage/server-sent-events.html)
- [MDN: Server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [MDN: EventSource](https://developer.mozilla.org/en-US/docs/Web/API/EventSource)

---

## Common Use Cases

1. **Real-time notifications** - Push alerts to users
2. **Live updates** - Stock prices, sports scores, news feeds
3. **Progress tracking** - Long-running task updates
4. **Chat applications** - One-way message streaming
5. **Monitoring dashboards** - Server metrics, logs

---

## Comparison: SSE vs WebSocket

| Feature       | SSE                            | WebSocket                    |
| ------------- | ------------------------------ | ---------------------------- |
| Direction     | Server → Client only           | Bidirectional                |
| Protocol      | HTTP                           | WebSocket protocol           |
| Reconnection  | Automatic with `Last-Event-ID` | Manual                       |
| Event types   | Built-in support               | Manual implementation        |
| Compatibility | Better proxy/firewall support  | May be blocked               |
| Use case      | Real-time updates from server  | Real-time bidirectional chat |

Choose SSE when you only need server-to-client communication. Choose WebSocket when you need full duplex communication.
