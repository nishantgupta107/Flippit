# Persistent Issue Log: Flippit Card Animations

## The Goal
To achieve a high-quality 3D card flip animation and perfectly timed "flight" logic (draw card → card flipping 180 degrees and placed alongside deck → waiting → card dynamically flying to a player's hand).

## The Core Technical Conflict
We are utilizing:
1. `framer-motion` for `layoutId` driven fluid DOM movement (flying across the screen coordinates).
2. Native CSS `transformStyle: 'preserve-3d'` combined with `backface-visibility: hidden` for flipping math.

**The Bug:** Stacking Context Flattening
WebKit (Safari) heavily struggles when 3D transformation logic (`preserve-3d`) is placed inside or near containers that trigger hardware accelerated 2D layering contexts. Specifically, combining `framer-motion`'s `animate={{ opacity, filter }}` with a parent wrapper holding `preserve-3d` causes the browser to flatten the z-buffer. 

As a result, `backface-visibility: hidden` fails completely. The browser dumps the front face and back face objects globally into the DOM tree one over the other, causing the F7 "back logo" to mistakenly display on top of the front face.

## The Solution Adopted
To neutralize the 3D-shattering browser glitch without sacrificing the layout animation:

1. **Manual Z-Index Toggling:**
   Instead of implicit CSS backface culling, the `Card/index.tsx` component manually flips `zIndex` properties dynamically synced with the `isFaceDown` prop. 
   - When Face Down: Back face `zIndex: 1`, Front face `zIndex: 0`.
   - When Face Up: Front face `zIndex: 1`, Back face `zIndex: 0`.
   
   This ensures that no matter how severely Safari/WebKit flattens the `preserve-3d` context, the mathematically correct layer mathematically paints on top. 

2. **Timing Layout Flow:**
   The exact workflow is bound to `src/store/gameStore.ts`:
   - State `card_drawn` → `pendingCardPlacement` populates.
   - `Game/index.tsx` visually renders it at `x: 0, y: 0` centrally overlapping the deck area.
   - The card instantly evaluates `isFaceDown={false}` causing the `<Card>` `rotateY` logic to flip it from `180` to `0` over ~400ms via spring physics.
   - The store intentionally yields roughly `1500ms` via `setTimeout`.
   - The state updates, removing `pendingCardPlacement`, and dumping it into the hand array.
   - `layoutId` gracefully animates the card over coordinates into the hand container.

## Future Recommendations
- Do not apply `filter`, `opacity`, or `backdrop-filter` directly onto the `PlayerHand` container wrappers unless specifically tested against Safari. Provide those properties natively onto the individual card elements (as doing it globally will flatten the 3D rendering again).
- The central exact placement coordinate is managed via fixed margins on the deck specifically, rather than dynamically scaling wrappers, to prevent positional jumping on resolution.


## Tester Notes

The card is drawn and placed alongside the deck. But no flip animation is appearing, instead it is just bounce animation. The card is then removed from the deck and placed into the hand array. The card is then animated with bounce animation over coordinates into the hand container.

Whereas the flipping animation should perform a 180 degree rotation over the Y axis once a card is drawn. Post delay of 1000ms the card must be animated flying in the hand area of the player.
