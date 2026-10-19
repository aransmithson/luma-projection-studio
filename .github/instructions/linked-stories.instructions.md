---
description: Keep linked travellers, local reactions and projector playback on one continuous loop.
applyTo: 'src/story*.ts,src/effects/linkedStories.ts,src/effects/storyArt.ts,src/stacks.ts,src/chaseRoute.ts,src/components/StackEditor.tsx,scripts/stories-workflow.mjs'
---

Use the shared playback clock and route measured in projector pixels. Derive traveller positions and tile reactions from the same normalized phase; never accumulate per-frame state. Use seeded scenery and integer cycle frequencies so Pause, Restart and the last-to-first wrap reproduce the same scene. Preserve route membership when a tile is hidden and paint wrapping copies so the traveller crosses both sides of each boundary.

Route caching uses project identity. Return a new project object after geometry, order or size changes; render checks that mutate fixtures must do the same. Keep existing liquid, chase and portal stacks compatible with version-1 projects, layers, locked shapes, holes and content transforms.

Run the timing tests and `npm run test:stories`; inspect its contact sheet and compact-editor screenshot. Use a `willReadFrequently` 2D context for repeated exact pixel comparisons so canvas backend changes do not create false mismatches. Compare all route tiles when checking motion or reversal: a traveller may be outside a particular tile at the sampled time. Native workflows use isolated profiles and run sequentially. Keep generated fixtures under test-results rather than rewriting the committed examples during tests.
