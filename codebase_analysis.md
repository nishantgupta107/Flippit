# Codebase Analysis

## File: components/Flip7Celebration.tsx

### Variables:
- `PARTICLE_COUNT` : Number of particles to spawn in the celebration animation.
- `styles` : React Native StyleSheet definitions for the component/screen.

### Functions:
- `Particle()` : Individual particle component for the Flip 7 celebration animation.
- `Flip7Celebration()` : Animation overlay for triggering a 'Flip 7' win.

## File: components/PlayerHand.tsx

### Variables:
- `FREEZE_STAGGER_MS` : Stagger delay for freeze animation.
- `FREEZE_ROTATION_DURATION_MS` : Duration of the freeze rotation animation.
- `FREEZE_ICE_DURATION_MS` : Duration of the ice overlay animation.
- `FREEZE_SHINE_DURATION_MS` : Duration of the shine effect on frozen cards.
- `FREEZE_SHAKE_DURATION_MS` : Duration of the shake effect when frozen.
- `BUST_WAVE_STEP_MS` : Step delay for the wave animation when busted.
- `BUST_CARD_TINT_DURATION_MS` : Duration of the red tint effect on busted cards.
- `BUST_SHAKE_DURATION_MS` : Duration of the shake effect when busted.
- `PlayerHand` : Component rendering the current player's hand of cards.
- `styles` : React Native StyleSheet definitions for the component/screen.

### Functions:
- `AnimatedCardWrapper()` : Wrapper for adding animations to individual cards in hand.

### Interfaces:
- `PlayerHandProps`
- `AnimatedCardWrapperProps`

## File: constants/cards.ts

### Variables:
- `DECK_COMPOSITION` : Deck composition per DEV_PLAN.md §3.1
- `TOTAL_DECK_SIZE` : Total number of cards in a complete deck

### Functions:
- `generateDeck()` : Generate the full 94-card deck
- `isActionCard()` : Check if a card is an action card
- `isNumberCard()` : Check if a card is a number card
- `isModifierCard()` : Check if a card is a modifier card (multiplier or bonus)
- `getCardTypeLabel()` : Get the display label for a card type

### Interfaces:
- `Card`

### Types:
- `CardType`

## File: constants/theme.ts

### Variables:
- `colors` : Emerald Casino Design System - Color Tokens
- `typography` : Typography tokens - all values use rem() for responsive scaling
- `spacing` : Spacing tokens - all values use rem()
- `radius` : Border radius tokens - all values use rem()
- `shadows` : Shadow styles for floating elements only
- `layout` : Layout constants using vw/vh for screen-relative sizing

## File: engine/aiPlayer.ts


### Functions:
- `getPlayer()` : Test helper to retrieve a mock player.
- `getDrawableCards()` : Helper to get the remaining cards in the deck that a player can draw.
- `getNumberValues()` : Helper to extract all valid number card values from a list of cards.
- `calculateBustProbability()` : Calculates the probability that drawing the next card will result in a bust.
- `calculateExpectedGain()` : Calculates the expected score gain from drawing an additional card.
- `chooseRandomTarget()` : Randomly selects an active opponent as a target for an action card.
- `easyBotDecide()` : Determines whether an Easy difficulty bot will hit or stay based on simple logic.
- `mediumBotDecide()` : Determines whether a Medium difficulty bot will hit or stay.
- `hardBotDecide()` : Determines whether a Hard difficulty bot will hit or stay using advanced logic.
- `getBotActionTarget()` : Determines which active player the bot should target with its action card.

### Types:
- `BotDecision`

## File: engine/deck.ts

### Variables:
- `DEFAULT_SEED` : Default seed used for deterministic deck generation.
- `NUMBER_CARD_COUNTS` : Mapping of each number value to the count of that card in the deck.
- `BONUS_CARD_COUNTS` : Mapping of each bonus multiplier to the count of that card in the deck.

### Functions:
- `normalizeSeed()` : Normalizes an arbitrary seed string or number into an integer format.
- `createSeededRandom()` : Creates a deterministic pseudo-random number generator function from a seed.
- `createBaseDeck()` : Generates the initial sorted deck of all 94 playing cards.
- `shuffleDeck()` : Randomizes the order of the deck cards (supports seeded generation).
- `buildDeck()` : Generates a fully shuffled initial deck for a game round.
- `drawCard()` : Draws the top card from the deck and returns it along with the rest of the deck.

## File: engine/gameEngine.ts


### Functions:
- `clonePlayer()` : Creates a shallow copy of a player state with specified updates.
- `activePlayers()` : Returns an array of all currently active players in the game.
- `getPlayerIndex()` : Finds the index of a player in the state by their ID.
- `assertPlayer()` : Retrieves a player by ID, throwing an error if not found.
- `updatePlayer()` : Updates a specific player's state within the game state.
- `updateWinner()` : Determines and updates the winner of the game based on total score.
- `syncPhase()` : Synchronizes and determines the current phase of the game based on state flags.
- `createRoundSeed()` : Generates a deterministic seed for a specific round.
- `recycleDeckIfNeeded()` : Reshuffles the discard pile into the deck if the deck is empty.
- `drawFromState()` : Draws a card from the deck, recycling the discard pile if necessary.
- `clearPendingAction()` : Removes any pending action from the game state.
- `discardActionCard()` : Moves a resolved action card to the discard pile.
- `applyFreezeTarget()` : Applies a freeze effect to a specific player.
- `resolveFlipThreeTarget()` : Resolves the drawing and effects of 3 cards for a target player.
- `resolveSecondChanceTarget()` : Handles passing the Second Chance shield to another player.
- `calculateRoundScore()` : Calculates a player's score for the current round.
- `applyRoundScoreToTotal()` : Adds a player's round score to their total score.
- `resolveCard()` : Processes the effect of a drawn card for a specific player.
- `resolvePendingAction()` : Resolves the current pending action based on user target selection.
- `playerStay()` : Handles a player choosing to 'stay' (bank score and end turn).
- `endRound()` : Forces the end of the round for all active players.
- `startNewRound()` : Initializes the game state for the next round.
- `initGame()` : Initializes a completely new game with the given players.
- `advanceToNextPlayer()` : Moves the turn to the next active player.
- `applyFreezeEffect()` : Applies a freeze to `targetPlayerId` without advancing the turn.
- `resolveSecondChanceEffect()` : Resolves a Second Chance pass to `targetPlayerId` without advancing the turn.
- `resolveFlipThreeForBot()` : Deals 3 cards to `targetPlayerId` and resolves each one synchronously.
- `drawForPlayer()` : Draws and resolves a single card for the current player.

## File: engine/gameLoop.ts


### Functions:
- `getNextActivePlayer()` : Determines the ID of the next player whose turn it should be.
- `isRoundOver()` : Checks if the current round has ended (all players banked/busted/frozen).
- `isGameOver()` : Checks if the game has ended (a player reached the winning score).
- `getWinner()` : Retrieves the ID of the winning player if the game is over.

## File: engine/types.ts


### Interfaces:
- `Card`
- `PlayerInput`
- `PlayerState`
- `PendingAction`
- `GameState`

### Types:
- `CardType`
- `BotDifficulty`
- `GamePhase`

## File: hooks/useAuth.ts


### Functions:
- `useAuth()` : Hook that provides auth state and actions

## File: hooks/useGameEngine.ts


### Functions:
- `useGameEngine()` : Game engine hook stub - will be implemented in Phase 2

## File: hooks/usePartyKit.ts


### Functions:
- `usePartyKit()` : PartyKit hook stub - will be implemented in Phase 4

## File: store/authStore.ts

### Variables:
- `GUEST_STORAGE_KEY` : AsyncStorage key for storing guest auth profiles.
- `useAuthStore` : Zustand auth store with persistence for guest mode

### Interfaces:
- `GuestProfile`
- `AuthState`

## File: store/drawAnimation.ts

### Variables:
- `DRAW_SPAWN_DELAY_MS` : Delay before a drawn card spawns.
- `DRAW_FLIP_DURATION_MS` : Duration of the card flip animation.
- `DRAW_FACE_UP_HOLD_MS` : Time to hold a card face up before moving it.
- `DRAW_TRAVEL_DURATION_MS` : Duration for a card to travel to its destination.
- `DRAW_FADE_DURATION_MS` : Duration for a card to fade out/in.
- `NON_CARD_EVENT_DELAY_MS` : Delay for non-card game events to show.
- `DRAW_EVENT_KINDS` : List of valid draw event types.

### Functions:
- `getPendingDrawAnimation()` : Gets the current pending draw animation state.
- `runPendingDrawAnimation()` : Executes the current pending draw animation.
- `waitForNonCardEvent()` : Waits before resolving non-card events for visual pacing.

### Interfaces:
- `PendingDrawAnimation`

### Types:
- `PendingDrawPhase`

## File: store/gameStore.ts

### Variables:
- `animatedEventIds` : Set tracking which card events have been animated.
- `BOT_DELAY_MS` : Delay in milliseconds before a bot takes its turn.
- `BOT_REVEAL_INTERVAL_MS` : Milliseconds between each auto-revealed card slot when a bot is involved.
- `useGameStore` : Zustand store hook managing the main game state.

### Functions:
- `isAutoRevealMode()` : Returns true when the overlay should run fully in spectator / auto mode:
- `pickAutoSubTarget()` : Picks a deterministic sub-action target for bot auto-resolution:
- `getCurrentPlayer()` : Retrieves the player object for whose turn it currently is.
- `getDisplayedActivePlayerId()` : Gets the ID of the player currently acting or targeted.
- `isHumanPendingAction()` : Checks if the current pending action requires human input.
- `getBotDecision()` : Gets a hit/stay decision for a bot player based on difficulty.
- `shouldRunBots()` : Determines if a bot should take its turn right now.
- `handleGameStateTransition()` : Handles the transition and animations between game states.
- `scheduleBotTurn()` : Schedules the next bot turn action.
- `peekFlipThreeCards()` : Non-destructively reads the next `count` cards from the deck.

### Interfaces:
- `FlipThreeSlot`
- `FlipThreeSubAction`
- `FlipThreeOverlayState`
- `GameStoreState`

### Types:
- `FlipThreeCardEffect`
- `FlipThreeSubActionType`

## File: store/settingsStore.ts

### Variables:
- `useSettingsStore` : Zustand store hook managing user settings.

### Interfaces:
- `SettingsState`

## File: utils/firebase.ts

### Variables:
- `getFirebaseConfig` : Firebase configuration from Expo constants
- `app` : Initialize Firebase app (singleton)
- `auth` : Firebase Auth instance
- `db` : Firebase Firestore instance
- `isFirebaseConfigured` : Check if Firebase is properly configured

## File: utils/scaling.ts

### Variables:
- `{ width: SCREEN_W, height: SCREEN_H }` : Current screen width and height dimensions.
- `BASE_WIDTH` : Base width for scaling calculations.
- `MAX_SCALE_WIDTH` : Maximum allowed width for scaling.
- `EFFECTIVE_WIDTH` : Calculated effective width for scaling functions.
- `MAX_SCALE_HEIGHT` : Maximum allowed height for scaling.
- `EFFECTIVE_HEIGHT` : Calculated effective height for scaling functions.
- `rem` : rem — scales with screen width, relative to 16px base font
- `vw` : vw — percentage of screen width (capped for desktop)
- `vh` : vh — percentage of screen height (capped for desktop)
- `getScreenDimensions` : Get current screen dimensions (for dynamic calculations)
- `MIN_TOUCH_TARGET` : Minimum touch target size (44px equivalent in rem units)

## File: server/src/server.ts


### Classes & Methods:
### Class: `FlippitServer`
- `onConnect()` : PartyKit server handler for new client connections.
- `onClose()` : PartyKit server handler for disconnected clients.
- `onMessage()` : PartyKit server handler for incoming client messages.
- `onRequest()` : PartyKit server handler for HTTP requests.
- `- options` (Property)
- `- players` (Property)

## File: components/game/FlipThreeOverlay.tsx

### Variables:
- `styles` : React Native StyleSheet definitions for the component/screen.

### Functions:
- `effectLabel()` : Helper to get the display label for a Flip Three effect.
- `subActionTitle()` : Helper to get the title for a Flip Three sub-action prompt.
- `CardSlot()` : Component representing a single card slot in the Flip Three overlay.
- `TargetSelectPhase()` : Component for selecting a target during a Flip Three action.
- `RevealPhase()` : Component for revealing cards during a Flip Three action.
- `FlipThreeOverlay()` : Overlay component handling Flip Three card interactions.

### Interfaces:
- `CardSlotProps`
- `TargetSelectPhaseProps`
- `RevealPhaseProps`

## File: components/game/OpponentConciseCard.tsx

### Variables:
- `styles` : React Native StyleSheet definitions for the component/screen.

### Functions:
- `OpponentConciseCard()` : Compact component showing an opponent's status/cards.

### Interfaces:
- `OpponentConciseCardProps`

## File: components/ui/Card.tsx

### Variables:
- `styles` : React Native StyleSheet definitions for the component/screen.

### Functions:
- `Card()` : Base UI component for displaying a playing card.

### Interfaces:
- `CardProps`

## File: components/ui/Chip.tsx

### Variables:
- `styles` : React Native StyleSheet definitions for the component/screen.

### Functions:
- `Chip()` : Small UI badge/chip component.

### Interfaces:
- `ChipProps`

### Types:
- `ChipVariant`

## File: components/ui/GlassCard.tsx

### Variables:
- `styles` : React Native StyleSheet definitions for the component/screen.

### Functions:
- `GlassCard()` : Glass morphism card component

### Interfaces:
- `GlassCardProps`

## File: components/ui/index.ts

## File: components/ui/PrimaryButton.tsx

### Variables:
- `styles` : React Native StyleSheet definitions for the component/screen.

### Functions:
- `PrimaryButton()` : Primary CTA button - pill shape with gold gradient

### Interfaces:
- `PrimaryButtonProps`

## File: components/ui/ScoreHUD.tsx

### Variables:
- `styles` : React Native StyleSheet definitions for the component/screen.

### Functions:
- `ScoreHUD()` : Heads-up display component showing the current scores.

### Interfaces:
- `ScoreHUDProps`

## File: components/ui/SecondaryButton.tsx

### Variables:
- `styles` : React Native StyleSheet definitions for the component/screen.

### Functions:
- `SecondaryButton()` : Secondary CTA button - flat coral background with rounded corners

### Interfaces:
- `SecondaryButtonProps`

## File: components/ui/TertiaryButton.tsx

### Variables:
- `styles` : React Native StyleSheet definitions for the component/screen.

### Functions:
- `TertiaryButton()` : Tertiary button - ghost style, no background

### Interfaces:
- `TertiaryButtonProps`

## File: engine/__tests__/deck.test.ts

## File: engine/__tests__/gameEngine.test.ts

### Variables:
- `players` : Mock list of test player entities for the unit test context.

### Functions:
- `createState()` : Test helper to generate a mock game state.
- `getPlayer()` : Test helper to retrieve a mock player.

## File: engine/__tests__/gameLoop.test.ts

### Variables:
- `players` : Mock list of test player entities for the unit test context.

### Functions:
- `createState()` : Test helper to generate a mock game state.
