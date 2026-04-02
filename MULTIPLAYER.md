# Multiplayer Architecture Strategy

This document outlines the approach for adding local (LAN) and online multiplayer to Flippit, based on the `Room Code` model.

## Core Principles

1.  **Host/Client Model:** Because the game state logic (`src/engine/game.ts`) is composed of pure functions and managed via a central Zustand store, we will use a Host/Client network topology.
    *   **Host:** The player who creates the room. Their device runs the authoritative engine logic, manages the AI (if any), and stores the "true" state in their Zustand store.
    *   **Clients:** Players who join via a room code. Their devices act as "dumb terminals." They render the game state received from the Host and send action requests (e.g., `HIT`, `STAY`) to the Host.

2.  **No Dedicated Server Logic:** We trust the Host client. This simplifies development drastically. We do not need to rewrite the game engine in a backend language or deploy it to edge workers.

3.  **Unified Network Interface:** We will create an abstraction layer (e.g., `useNetworkGame`) that the UI components interact with, hiding whether the connection is local WebRTC or online PartyKit.

## Implementation Details

### 1. Game Engine & Store Adaptations (Completed)

*   **Multi-Human Engine:** Actions like `humanHit` and `humanStay` now require a `playerId` to know exactly *who* is performing the action, moving away from the assumption of "one human, many AIs".
*   **Decoupled AI:** `scheduleAIIfNeeded` in the Zustand store now checks `get().isHost`. Only the host computes AI turns.
*   **State Sync Hook:** Added `syncGameState(state)` to the Zustand store, allowing clients to blindly accept state updates from the network.

### 2. Networking Layers

#### Local Multiplayer (LAN via WebRTC)
*   **Technology:** PeerJS (a wrapper around WebRTC).
*   **Signaling:** We will need a lightweight signaling server (PeerJS provides a free cloud one, or we can host a tiny Node server) purely for devices to exchange connection info using short Room Codes.
*   **Flow:**
    *   Host connects to signaling server, gets an ID, creates a short "Room Code" mapped to that ID.
    *   Client enters Room Code, signaling server connects Client directly to Host via WebRTC.
    *   Host and Client communicate directly with extremely low latency. No game data goes to an external server.

#### Online Multiplayer (PartyKit)
*   **Technology:** PartyKit (Edge WebSockets).
*   **Role:** PartyKit will act as a real-time message relay (a "dumb router").
*   **Flow:**
    *   Host creates a room, connects to a PartyKit room `wss://our-partykit-server/party/room-code`.
    *   Host sends a message to PartyKit: `{ type: "CLAIM_HOST", playerId: "host-id" }`.
    *   Client connects to the same WebSocket.
    *   Client sends action: `{ type: "ACTION", action: "HIT", playerId: "client-id" }`.
    *   PartyKit broadcasts this message.
    *   Host receives it, runs `gameStore.getState().hit("client-id")`, and broadcasts the new state back through PartyKit.

### 3. Required Next Steps (Future PRs)

1.  **Lobby UI:** Create a "Multiplayer Menu" to select Local vs Online, Create Room, or Join Room.
2.  **Network Provider:** Implement a React Context or custom hook that manages the active connection (PeerJS or PartyKit) and listens for messages.
3.  **UI Refactoring:** Update React components to use the `playerId` when dispatching actions instead of relying on the default parameter.
4.  **Animation Synchronization:** The host needs to broadcast *events* alongside the state so that client devices know to trigger draw animations, rather than just snapping the cards onto the screen immediately.
