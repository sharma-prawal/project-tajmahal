# Project Taj — Phase 11 Final Experience Audit

**Audit date:** 26 July 2026  
**Final verdict:** **READY FOR HUMAN PLAYTEST**

Project Taj is feature complete and technically stable after a deliberately
small final-polish pass. The release candidate now gives every production
memory a readable visual idea, preserves the mausoleum as the culmination,
restores a clean desktop prompt/control layout, and passes the production code,
content, save/load, composition, interaction, and canonical-journey checks.

The remaining questions concern human feeling, subjective audio balance, and
physical-device behavior. Another engineering phase is not justified before
those questions are answered by people.

## 1. Final Experience Audit

### Scope control

The following locked systems were not redesigned: Journey A, canonical order,
bridge locations, memory mappings, save schema v3, max-based progression,
five-of-seven unlock, mausoleum interaction and door, final letter flow,
runtime architecture, memory ownership, triggers, camera framework, and
interaction framework.

No global lighting, vegetation, water, or camera pass was made. No dialogue,
memory copy, objective HUD, marker, minimap, cutscene, gameplay system, large
asset, or binary asset was added.

### Release-candidate answers

| Question | Finding |
|---|---|
| Is anything immersion-breaking? | No issue remained in the final seven-memory composition or mausoleum probes. |
| Does anything feel unfinished? | The former missing Umbrella prop and invisible All-Day Call cadence no longer do. |
| Does anything feel inconsistent? | Back and Umbrella now have distinct focal ideas; the desktop interaction prompt no longer covers camera controls. |
| Does anything expose implementation? | Clean RC frames suppress dev review markers. Debug tooling remains development-only. |
| Would a player notice missing polish? | No obvious missing prop or broken composition remains. The long Back → Umbrella crossing may still feel sparse; that is a human rhythm question. |
| Would another engineering phase help? | Not without human playtest evidence. |

## 2. Journey Rhythm Review

The polish changes do not move a bridge, trigger, route, stair, or progression
volume, so the established walked Journey A measurements remain valid:

| Leg | Walked | Time | Reading |
|---|---:|---:|---|
| Spawn → Mints | 70.6 m | 34.9 s | Long anticipatory opening; must be tested with first-time players. |
| Mints → Boarding Passes | 40.6 m | 19.2 s | Settles into the first relationship rhythm. |
| Boarding Passes → Little Details | 22.8 m | 10.5 s | Good short handoff. |
| Little Details → Back | 23.9 m | 10.8 s | Good short handoff into restraint. |
| Back → Umbrella | 76.4 m | 35.0 s | Longest and weakest transition; intentional breathing room or backtracking is still a human question. |
| Umbrella → Friday Night | 24.2 m | 11.2 s | Clear pivot from care into vulnerability. |
| Friday Night → All-Day Call | 47.4 m | 21.5 s | The stair climb supplies useful escalation. |
| All-Day Call → mausoleum | 14.7 m | ~7 s | Strong, immediate culmination. |
| **Total** | **320.6 m** | **188.2 s** | Median leg is approximately 24 m / 11 s. |

The best emotional sequence is now **Friday Night → stair ascent → All-Day
Call cadence → opened door**. All-Day Call's visible 3/6/9-beat accumulation
makes the final approach feel authored rather than merely adjacent to the
mausoleum.

An unguided central-axis walk still does not discover the off-axis memories.
That follows the locked no-marker structure and should be observed in a real
first-time session rather than “fixed” speculatively.

## 3. Memory-by-Memory Review

| Memory | Final reading |
|---|---|
| **Mints** | The smaller brass dish and two pale-green mints read as a specific offered object. The camera is on the clear side of the accent tree, so the trunk no longer divides the focal prop. Warm, modest, and legible. |
| **Boarding Passes & Bills** | Retained without visual redesign. The twelve-part accumulation remains the clearest expression of shared effort and chosen time. |
| **The Little Details** | The camera now prioritizes the pool-edge motif and ordinary detail. The Taj is peripheral/cropped rather than spending the best finale reveal early. |
| **Back** | Retained as the deliberately restrained west-pavilion beat. The single return gesture and short text remain its strength. |
| **The Umbrella** | A burgundy open canopy with brass shaft/hook provides an immediate silhouette and semantic anchor. Local east-pavilion framing makes it visibly different from Back. |
| **Friday Night** | The lower camera and darker warm enclosure create a readable pocket of vulnerability against the sandstone apron instead of blending into the ground. |
| **The All-Day Call** | Three, then six, then nine thin cadence bars visibly accumulate toward the mausoleum. This is now the strongest composition and the most memorable authored escalation. |

## 4. Environmental Polish Report

Only local environmental changes were justified:

- Umbrella received one procedural focal prop at its existing anchor.
- Mints received a smaller, more material-specific dish and mint treatment.
- Friday Night received a darker local enclosure material.
- Memory cameras were locally reframed for Mints, Little Details, Umbrella,
  and Friday Night.
- All-Day Call received visible local cadence geometry.
- The desktop interaction prompt was raised above the bottom-center camera
  controls when a fine pointer is present.

Lighting, reflections, particles, water, vegetation, and global contrast were
left unchanged. Their full capture matrices passed, and no player-visible
defect justified a global pass.

## 5. Audio Review

The current procedural Web Audio system supports the experience structurally:

- ambience begins only after user activation;
- fountain gain responds spatially;
- footsteps advance while moving and stop while stationary;
- memory playback ducks the garden bed;
- master, ambience, and effects levels respond to settings;
- mute and resume states are preserved;
- the active voice ceiling remains 12.

The automated audio capture produced four diagnostic frames and validation
JSON without errors. The emotional judgments—warmth, vulnerability, devotion,
calm, laptop/headphone balance—cannot be certified without listening on real
outputs.

### Audio Acquisition Report

**Not applicable for this phase.** No missing sound was proven by listening,
and introducing downloaded or placeholder audio would be speculative. If human
playtesting identifies a precise emotional or masking gap, acquisition should
begin from that evidence.

## 6. Accessibility Report

| Surface | Result |
|---|---|
| Desktop keyboard | Pass: movement, interaction keys, dialogue continuation, Escape, settings, and camera reset are covered by browser checks and tests. |
| Mouse | Pass: drag-look and camera buttons passed the 15-check exploration capture. |
| Touch | Pass in 390×844 / DPR 2 emulation; physical-device validation remains open. |
| Reduced Motion | Pass in targeted memory and full-profile capture paths. |
| Reload / Save-Load | Pass: corrected R6 restored production completions 1→7 across seven successive reloads. |
| Controller | Input mapping and behavior pass 2 unit tests; no physical controller was available. |
| Audio disabled | Pass: mute/resume behavior was captured and validated. |
| High DPI | Pass in DPR 2 emulation; physical high-DPI hardware remains open. |
| Ultra-wide | Pass at 2560×1080 with one canvas and no horizontal overflow. |
| Mobile profile | Pass in 390×844 emulation, including settings and 44 px dialogue targets. |
| Prompt accessibility | Pass: interaction diagnostics, high-contrast prompt, and focus/priority captures completed 10/10. |

The final desktop spacing fix is measurable: a visible interaction prompt no
longer intercepts the bottom-center camera-control buttons.

## 7. Performance Report

The polish is intentionally small:

- no new texture, audio, model, font, or other binary asset;
- no asset duplication;
- Umbrella adds two persistent local draws/geometries (canopy and merged frame);
- All-Day Call uses three merged bar groups at its maximum stage, a bounded
  **+2 transient draws** over the prior single group;
- camera and material edits add no draws;
- no observed frame disruption in headed Metal capture;
- the headed walkthrough environment reported **89–120 FPS** on an Apple M5
  Pro, explicitly not a mobile-device benchmark;
- final build sizes are:
  - CSS: 22.05 kB / 5.54 kB gzip;
  - index: 116.32 kB / 34.47 kB gzip;
  - Experience: 138.08 kB / 42.15 kB gzip;
  - React: 145.95 kB / 47.11 kB gzip;
  - Three: 975.88 kB / 268.64 kB gzip;
  - Physics: 2,081.46 kB / 768.99 kB gzip.

Against the pre-polish baseline, total relevant gzip growth is approximately
0.28 kB (CSS +0.02, index +0.02, Experience +0.24). The automated headless
render benchmark is not used as a release metric because SwiftShader produced
non-player-representative results and could not complete reliably. Physical
device FPS and heap profiling remain human/device-lab work.

## 8. Human Experience Record

| Prompt | Answer |
|---|---|
| Most memorable moment | The All-Day Call cadence accumulating into the ready mausoleum door. |
| Weakest moment | The 76.4 m Back → Umbrella cross-garden walk. |
| Most emotional transition | Friday Night → All-Day Call → mausoleum. |
| Most confusing transition | Back → Umbrella, because the destination is across the broadest empty crossing. |
| Strongest composition | All-Day Call at “a quiet choice” with nine cadence bars. |
| Weakest composition | Back, though its visual restraint supports the one-word memory. |
| Most beautiful location | The final sunset approach to the mausoleum. |
| Least memorable location | The middle of the Back → Umbrella crossing. |
| Would you change nothing? | No more engineering before human playtest. Remaining doubts are rhythm, emotion, listening, and physical-device feel. |

## 9. Implemented Improvements

### Player-facing

1. Added an unmistakable local umbrella prop.
2. Differentiated Umbrella's east-pavilion framing from Back.
3. Made the Mints prop smaller, brassier, greener, and unobstructed.
4. Reframed Little Details so it no longer consumes the finale reveal.
5. Darkened and lowered Friday Night's local enclosure composition.
6. Rebuilt All-Day Call's cadence as visible progressive 3/6/9 merged bars.
7. Raised desktop prompts above camera controls.
8. Added five focused regression assertions covering the new compositions.

### Validation-only repairs

- Save/load playtest cleanup now clears storage once per fresh context rather
  than again on every reload.
- Exploration capture waits for actual runtime release and a rendered frame.
- Interaction capture uses the marker's current authored coordinate.
- Mints capture uses its locked bridge coordinate and proven approach.
- Composition and mausoleum probes produce clean player-facing RC frames.

## 10. Deliberately Rejected Improvements

- Global lighting, vegetation, water, reflection, particle, or camera passes.
- Moving any bridge, trigger, stair, or progression volume.
- Changing canonical order, five-of-seven behavior, max semantics, or save v3.
- Rewriting memory copy or adding dialogue.
- Objectives, quest markers, minimap, strict sequencing, or cinematic cuts.
- New audio before a human listening test proves a precise need.
- Large or downloaded assets for props that can be expressed procedurally.
- Shortening or teleporting the long transitions without human rhythm evidence.
- Reintroducing the retired placeholder runtime fixture solely to satisfy an
  obsolete dev capture.

## 11. Validation Results

| Gate | Result |
|---|---|
| `pnpm lint` | Pass — zero warnings |
| `pnpm typecheck` | Pass |
| `pnpm test` | Pass — 71 files, 522 tests |
| `pnpm build` | Pass — 882 modules transformed |
| `pnpm content:lint` | Pass — 1 retained derivative, 0 errors, 1 optional-tool warning |
| Corrected reload/save profile | Pass — 7/7 reload restorations |
| Final memory composition | Pass — 7/7 completed clean |
| Mausoleum threshold | Pass — sealed, ready at 5/5, entered |
| Canonical journey capture | Pass — completed clean |
| Bridge candidates | Pass — 21 frames, clean |
| Production/relevant capture scripts | Pass — 29 script files |

All 30 capture script files were invoked. Twenty-nine production/relevant
scripts passed. The sole non-passing script,
`capture-memory-runtime.ts`, targets a retired placeholder architectural
memory that is intentionally no longer mounted; the seven production-memory
captures and runtime unit suite replace its evidence. It was not “fixed” by
shipping placeholder content.

The content warning is the skipped full conformance check for the retained Taj
source derivative because `gltf-validator` is unavailable. It is not a content
error.

## 12. Release Candidate Screenshots

The selected clean frames are in
[`artifacts/release-candidate/`](../../artifacts/release-candidate/README.md).
They include one representative frame for every memory, two All-Day Call
stages, and the mausoleum's locked, unlocked, and entered states.

## 13. Remaining Human Playtest Questions

1. Does the 70.6 m opening walk feel anticipatory or empty?
2. Does Back → Umbrella feel like breathing room or backtracking?
3. Can a first-time player discover the off-axis memories without markers?
4. Is the Friday Night → All-Day Call → mausoleum escalation emotionally clear?
5. Does Little Details now preserve enough of the final reveal?
6. Do the umbrella and mints read immediately without explanatory text?
7. Is the audio bed warm and calm on laptop speakers, headphones, and a phone?
8. Are touch look/move, DPR scaling, and controller use comfortable on hardware?
9. Does the five-of-seven opening feel earned when two memories remain unplayed?

## 14. Production Repository Cleanup

On 27 July 2026, the repository was reduced to its production surface:

- `public/` fell from 770 MB to 87 MB;
- the complete Vite build fell from 797 MB to 107 MB, an 86.6% reduction;
- 131 runtime-used public assets remain;
- rejected Taj candidates, raw TGA maps, obsolete heroine derivatives, unused
  textures/plants/trees, and the 240 MB decorative castle-floor scan were
  removed;
- generated `artifacts/review/` and `test-artifacts/` output was removed and
  git-ignored; the 13 MB curated release candidate remains;
- superseded Phase 2-10 reports and one-off processing scripts were removed;
- README, architecture, audio, and final-audit documentation now describe the
  production runtime;
- fresh desktop and mobile browser loads completed with zero failed requests
  and zero HTTP errors.

## 14. Final Release Recommendation

**READY FOR HUMAN PLAYTEST**

Do not begin another engineering phase. Run a small, observed first-time
playtest across desktop and one physical mobile device, include an audio
listening pass, and only reopen engineering for repeatable player-observed
defects. If those sessions confirm the current rhythm and controls, the same
build is a credible release candidate.

