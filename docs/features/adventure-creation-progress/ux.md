# UX Spec: Adventure Creation Progress

## Input Product Artifact

- `docs/features/adventure-creation-progress/feature_brief.md`

## Product Vision Implications

RPGizer should make the wait from confirmed Interview to generated Adventure feel playable, trustworthy, and motivating. The RPG layer must serve clarity: the User should understand that their Adventure is being prepared, that progress is happening, and that they will land on the Adventure Detail Page when ready. The experience should feel like a warm Game Master guiding the User through a forge ritual, not like a generic loading spinner or technical job monitor.

## Business Domain Model Grounding

This surface belongs to **Adventure Creation**. The User has completed the Interview and chosen to forge the Adventure. The screen should use user-facing language tied to Adventure, Roadmap, Quests, Skills, Inventory, XP, rewards, and the Game Master. It must not expose backend terms, raw event names, prompt/provider details, IDs, logs, or implementation diagnostics. The Adventure Detail Page is only the success destination; its content is out of scope.

## UX Intent

Create an “awesome but clear” RPG-native progress experience called **The Forge Road**: a side-scrolling illustrated journey where a small cloaked traveler moves from left to right across five creation stations. Each station maps to a real generation stage, but the visible wording stays polished and end-user friendly.

The design should feel old-school RPG inspired without full pixel art. Use illustrated fantasy UI, layered backgrounds, warm lighting, soft gradients, parchment/metal details, subtle particle/ember motion, and crisp iconography. Avoid blocky pixel-art styling so RPGizer keeps its own visual identity.

## Affected Surfaces

- Adventure Creation Progress page after **Forge My Adventure**.
- Success redirect moment into the Adventure Detail Page.
- Success toast on the Adventure Detail Page.
- Failure/stall state on the progress page.

## Phone-First User Flow

1. User clicks **Forge My Adventure** from the confirmed Interview state.
2. User lands on the Adventure Creation Progress page.
3. Page shows the current stage, the Forge Road scene, and a compact full-stage list.
4. As real generation stages complete, the traveler advances to the next station and completed stages receive checkmarks.
5. On success, the final gate/portal activates and the app automatically redirects to the Adventure Detail Page.
6. The Adventure Detail Page shows a success toast: **Adventure forged.**
7. If generation fails or stalls, the scene pauses at the current station and shows recovery actions.

## Information Architecture

Primary hierarchy:

1. Current status headline.
2. The Forge Road visual progress scene.
3. Current stage label and short reassurance copy.
4. Full five-stage list with completed/current/future states.
5. Recovery actions only when needed.

Do not add secondary navigation, dashboards, debug details, elapsed-time counters, percentages, logs, or unrelated tips.

## Content Rules

- All visible copy is for the target User, not developers or maintainers.
- Use truthful RPG-facing labels backed by real events.
- Use the fewest plain words that preserve clarity and anticipation.
- Do not show fake percentages.
- Do not show backend stage names like “generate interview artifact” or “link entities.”
- Do not expose raw errors. Keep failure copy safe and recoverable.

Recommended stage labels:

1. **Gathering your quest lore**
2. **Building your adventure roadmap**
3. **Connecting quests, skills, and inventory**
4. **Balancing XP and rewards**
5. **Opening your adventure**

Recommended supporting copy by state:

- Initial/current: **The Game Master is forging your Adventure. This can take a moment.**
- Success toast: **Adventure forged.**
- Failure headline: **The forge needs another spark.**
- Failure body: **Your interview is safe. Try again, or return to adjust your answers.**

## Phone Layout

Phone uses one focused vertical page. The cinematic road remains horizontal, but the viewport centers the current station. Previous and next stations may peek at the sides to suggest travel. The full stage list sits below the scene so the User always understands the endpoint.

Phone structure:

- Top brand/header line: `RPGizer`
- Compact status eyebrow: `Forging Adventure`
- Headline: current stage label
- Short body copy
- Wide illustrated Forge Road viewport
- Stage list with five rows
- Failure actions only in failure/stall state

## Tablet Layout

Tablet keeps the visual scene dominant and allows more of the road to be visible at once. The stage list can remain beneath the scene in a two-column grid or compact vertical list depending on available height. The current-stage text stays above the scene to avoid splitting attention.

## Desktop Layout

Desktop should feel cinematic. The full road can span most of the width. Use a centered max-width composition with the current-stage copy above and a compact horizontal or two-row stage tracker below. Avoid filling side space with extra cards.

## Binding Mockups

### Phone — active progress

```text
┌─────────────────────────────┐
│ RPGizer                     │
├─────────────────────────────┤
│ FORGING ADVENTURE           │
│                             │
│ Building your adventure     │
│ roadmap                     │
│ The Game Master is forging  │
│ your Adventure. This can    │
│ take a moment.              │
│                             │
│ ┌─────────────────────────┐ │
│ │  dusk sky / mountains   │ │
│ │                         │ │
│ │    [map table glow]     │ │
│ │        🧙 cloaked       │ │
│ │         traveler        │ │
│ │                         │ │
│ │  campfire ✓  map ●      │ │
│ │       forge ○  gate ○   │ │
│ └─────────────────────────┘ │
│                             │
│ ✓ Gathering your quest lore │
│ ● Building your roadmap     │
│ ○ Connecting quests, skills │
│ ○ Balancing XP and rewards  │
│ ○ Opening your adventure    │
└─────────────────────────────┘
```

### Phone — failure/stall

```text
┌─────────────────────────────┐
│ RPGizer                     │
├─────────────────────────────┤
│ FORGE PAUSED                │
│                             │
│ The forge needs another     │
│ spark.                      │
│ Your interview is safe.     │
│ Try again, or return to     │
│ adjust your answers.        │
│                             │
│ ┌─────────────────────────┐ │
│ │ dimmed Forge Road       │ │
│ │ traveler stopped at     │ │
│ │ current station         │ │
│ └─────────────────────────┘ │
│                             │
│ [ Try again ]               │
│ [ Back to interview ]       │
└─────────────────────────────┘
```

### Tablet

```text
┌──────────────────────────────────────────────┐
│ RPGizer                                      │
├──────────────────────────────────────────────┤
│ FORGING ADVENTURE                            │
│ Connecting quests, skills, and inventory     │
│ The Game Master is forging your Adventure.   │
│                                              │
│ ┌──────────────────────────────────────────┐ │
│ │ campfire ✓ → map ✓ → threads ● → forge ○ │ │
│ │        cloaked traveler at thread loom   │ │
│ │                 gate ○                   │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ ✓ Quest lore      ✓ Roadmap                  │
│ ● Connections     ○ XP and rewards           │
│ ○ Opening adventure                           │
└──────────────────────────────────────────────┘
```

### Desktop

```text
┌────────────────────────────────────────────────────────────────────┐
│ RPGizer                                                            │
├────────────────────────────────────────────────────────────────────┤
│                         FORGING ADVENTURE                          │
│                 Balancing XP and rewards                           │
│       The Game Master is forging your Adventure. This can take      │
│       a moment.                                                    │
│                                                                    │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ moonlit road                                                   │ │
│ │ campfire ✓ ── map ✓ ── glowing threads ✓ ── blacksmith forge ● │ │
│ │                                      cloaked traveler           │ │
│ │                                             ── portal gate ○    │ │
│ └────────────────────────────────────────────────────────────────┘ │
│                                                                    │
│ ✓ Gathering lore  ✓ Building roadmap  ✓ Connecting pieces          │
│ ● Balancing XP    ○ Opening adventure                              │
└────────────────────────────────────────────────────────────────────┘
```

## Visual Direction

### Core concept: The Forge Road

A small cloaked traveler moves through a left-to-right fantasy road. The traveler is intentionally generic: a silhouette or hooded figure with a pack, not a personalized player character. This supports the “User is the hero” feeling without implying a persistent cross-adventure character profile.

### Stage station ideas

- **Campfire / scrolls**: warm firelight, parchment, small floating lore sparks.
- **Cartographer table**: glowing map lines and quest markers.
- **Thread loom / constellation board**: glowing lines connect quest, skill, and inventory icons.
- **Blacksmith forge**: hammer, anvil, controlled sparks, XP gem/rune glow.
- **Portal / castle gate**: doorway brightens, path opens, redirect begins.

### Style

- Illustrated fantasy, not blocky pixel art.
- Dark background with amber, emerald, violet, and warm firelight accents.
- Subtle old-school RPG cues: road, stations, runes, parchment labels, icon badges.
- Use depth through layered silhouettes, gradients, parallax-like background bands, and soft shadows.
- Avoid realistic character detail; keep the traveler small and iconic.

## Motion Model

Default motion:

- Traveler advances only when real stage progress advances.
- Current station has a gentle loop: fire flicker, map glow, thread pulse, hammer spark, portal shimmer.
- Completed stations settle into a checkmark/rune glow.
- Future stations remain dim but visible.
- Do not animate a fake continuous percentage bar.

Reduced-motion mode:

- Freeze the traveler at the current station.
- Remove travel transitions, parallax, pulsing, and particle loops.
- Communicate changes with text, checkmarks, color, and focus-safe highlights.

Motion safety:

- No flashing.
- No rapid sparks.
- No essential information conveyed by motion alone.

## Breakpoint-Specific Component Strategy

- **Compact**: current station centered, adjacent stations peeking; vertical stage list below.
- **Medium**: show three or more stations at once; stage list can become a compact grid.
- **Expanded**: show the full road as a cinematic hero scene; stage tracker remains compact and supportive.

The stage list is required at every breakpoint for clarity, accessibility, and reduced-motion support.

## Interaction States

### Starting

- Eyebrow: **Forging Adventure**
- Headline: first active stage.
- Campfire station active.
- Stage list shows first stage current; later stages dim.

### In progress

- Current stage headline updates.
- Completed stages show checkmarks.
- Current stage shows active marker.
- Future stages remain visible and dim.

### Reconnecting / temporarily quiet

If transport reconnects while generation is not terminal:

- Keep the latest known stage visible.
- Show calm helper copy: **Still forging…**
- Do not show a scary error unless generation actually fails or stalls beyond the product-defined threshold.

### Success

- Final gate/portal activates briefly.
- App redirects automatically to the Adventure Detail Page.
- Success toast on destination: **Adventure forged.**

### Failure / stall

- Same scene remains, dimmed and paused at the current station.
- Headline: **The forge needs another spark.**
- Body: **Your interview is safe. Try again, or return to adjust your answers.**
- Primary action: **Try again**
- Secondary action: **Back to interview**

## Accessibility Requirements

- The current stage must be announced politely to assistive technologies.
- The stage list must be text-based, not image-only.
- Completed/current/future state must not rely on color alone; use checkmarks, labels, and active text.
- Primary and secondary actions must be keyboard reachable with visible focus states.
- Touch targets should be at least 44px high.
- Reduced-motion preferences must be respected.
- Text must remain readable over illustrated backgrounds; use overlays or panels when needed.
- Decorative scene elements should not clutter the screen reader experience.

## Anti-Bloat Review

Keep:

- Current status.
- Forge Road visual.
- Full stage list.
- Failure recovery actions.
- Success toast.

Remove / avoid:

- Percentages unless honestly measurable.
- Raw backend event names.
- Logs, IDs, request status, provider names, prompt details, diagnostics.
- Tips unrelated to the current wait.
- Multiple CTAs during normal progress.
- Overly clever copy that makes status less clear.

## Risks / Tradeoffs

- A cinematic scene can become decorative bloat if it does not clearly communicate progress; the text stage list prevents that.
- A visible traveler may imply avatar functionality; keeping it as a generic cloaked traveler avoids this.
- Too much pixel styling could make RPGizer feel derivative; use illustrated fantasy with old-school structure instead.
- Motion can delight but must not create accessibility problems or imply false progress.
- Auto-redirect means the success state is brief; the toast on the destination carries the confirmation.

## UI Authority Rule

The Binding Mockups and Visual Direction are authoritative for downstream design and implementation. Implementations should preserve the Forge Road concept, stage sequence, current-stage hierarchy, text stage list, failure recovery model, reduced-motion behavior, and non-pixel illustrated fantasy direction unless this UX spec is revised.
