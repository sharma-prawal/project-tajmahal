# Audio Design Document

## Direction

The visitor should hear a place breathing, not a soundtrack commenting on it.
The garden is warm and lightly inhabited; memories narrow attention; the
mausoleum removes almost everything. Silence between details is part of the
design. One slow romantic piano stream sits below the world; there is no
percussion, magical shimmer, busy city wall, or constant
bird loop placed in the foreground.

Priority scale: P0 is essential narrative/interaction feedback; P1 establishes
place and movement; P2 is supporting texture; P3 is deliberately optional.
Loudness figures are source targets before the user's master/bus controls.

| Area / event | Purpose | Emotion | Priority | Duration | Form | Space | Source loudness | Fade | Ducking |
|---|---|---:|---:|---:|---|---|---:|---|---|
| Garden bed | Make the world breathe without sounding busy | Warm, open, still | P1 | 65 s | Loop | Global stereo | −30 LUFS target | 20 ms seam; 2.4 s zone crossfade | 42% during memories; 5.5% in mausoleum |
| Low garden wind | Prevent the bed from feeling static | Soft, airy | P2 | 30 s | Loop | Global stereo | −34 LUFS | 20 ms seam; 2.4 s zone crossfade | 42% during memories; 2.5% in mausoleum |
| Fountain water | Confirm proximity to the reflecting-pool axis | Cool, grounding | P1 | 7.01 s | Loop | Distance-attenuated, mild pan | −25 LUFS source; max runtime gain 0.24 | 10 ms seam; 180 ms gain ramp | Memory scale applies |
| Leaves | Add occasional life without an obvious cycle | Intimate, natural | P2 | 1.35 s | One-shot, 22–41 s spacing | Environmental/global | −25 LUFS | 250 ms tail | Suppressed during memories and indoors |
| Distant city | Intentionally omitted; it widened and busied the scene | Quiet separation | P3 | — | Silence | — | — | — | — |
| Mausoleum room tone | Make the interior quieter, not dead | Close, reverent | P1 | 30 s | Loop | Global stereo | −38 LUFS | 20 ms seam; 2.4 s crossfade | Not ducked beyond bus setting |
| Footsteps | Make locomotion tactile and readable | Human, restrained | P1 | 0.1–0.45 s | One-shot, four variants/surface | Player-local | −23 to −24 LUFS target | 3–5 ms attack, short authored tail | Effects bus only |
| UI hover | Confirm focus without a “game UI” ping | Light, unobtrusive | P2 | <0.2 s | One-shot | Global | −27 LUFS | 3 ms attack | None |
| UI confirm / cancel | Confirm intentional action | Soft certainty | P1 | <0.4 s | One-shot | Global | −23/−25 LUFS | 3 ms attack | None |
| General interaction | Mark a physical action | Tactile, modest | P1 | <0.3 s | One-shot | Global | −24 LUFS | 3 ms attack | None |
| Chirag ignition | Make completion physical, not magical | Warm recognition | P0 | 1.23 s | One-shot | Global narrative cue | −24 LUFS | 180 ms tail | Wins over footsteps/UI |
| Memory activation | Narrow attention and acknowledge entry | Reflective | P0 | <0.5 s plus identity | One-shot | Global narrative cue | −27 LUFS | Short | Garden ambience to 42% |
| Memory completion | Release attention gently | Settled | P0 | <0.5 s | One-shot | Global narrative cue | −26 LUFS | Short | Garden restores over 800 ms |
| Mausoleum transition | Hide the mix change as a felt threshold | Inward, quiet | P1 | <0.5 s | One-shot | Global | −27/−28 LUFS | 2.4 s ambience crossfade | Outdoor bed narrows to 5.5% |
| Mausoleum door | Give the gate mass and consequence | Heavy, deliberate, physical | P0 | 4.85 s | One-shot | Global/finale | −20 LUFS target; −2.6 dBFS peak | 650 ms tail | Priority 100; may steal lower voices |
| Final letter unfold | Add one physical breath, then get out of the way | Extremely intimate | P0 | 0.75 s | One-shot | Global/finale | −26 LUFS | 200 ms tail | Existing score remains narrowed; no swell |

## Interaction sound inventory

| Interaction | Sound decision | Trigger / protection |
|---|---|---|
| Walking | Surface-specific step | Cadence from measured horizontal speed; grounded only; stops below 0.35 m/s |
| Running | Same surface family, slightly faster/brighter | Cadence bounded at 0.26–0.34 s |
| Grass | Four soft recorded variants | Lawn cells only |
| Marble | Four brighter hard-surface variants | Main/cross axes, plinth, mausoleum |
| Stone | Four darker concrete variants | Side and pool-side circulation |
| Stairs | Stone family at lower playback rate and raised gain | Authored 9 m stair run |
| Sand / sandstone apron | Four filtered granular variants | Forecourt, approach, apron |
| Wood | Four assets prepared; no current walkable wood detected | Not selected by current ground plan |
| Interaction focus/confirm | Short physical click | On runtime transition to `active`; 180 ms duplicate guard |
| Memory activation | Generic soft open plus unique identity | Once per memory id; 500 ms/1.5 s guards |
| Memory completion | Soft closure | Only when a real active memory returns to idle |
| Chirag ignition | Lighter transient plus subdued ignition | On newly completed spatial memory; monotonic diff prevents replay stacking |
| Door opening | Real door movement plus low stone impacts | `finale.mausoleum-gate`; priority 100; 5 s guard |
| UI hover | Low click | Delegated pointer-over; ignores movement within the same button; 80 ms guard |
| UI confirm | Soft confirmation | Delegated button click; 140 ms guard |
| UI cancel | Asset prepared for explicit cancel/back flows | Public manager cue |
| Ambient transition | Soft close/open | Only on mausoleum boundary crossing; 1.2 s guard |
| Final letter | Paper unfold asset and id-based hook prepared | Any future/current interaction id containing `letter` |

## Memory identities

Each identity is an entry gesture rather than a bed that repeats under the text.

| Memory | Identity | Emotional job |
|---|---|---|
| The All-Day Call | Tiny connection switch over low room air | Duration and presence, without a phone ringtone |
| “Back” | Two returning stone steps | Familiar return; literal but understated |
| Boarding Passes | Paper movement with a soft placement | Time, handling, shared effort |
| The Mints | Small plate/ceramic contact | A tiny object carrying disproportionate meaning |
| The Umbrella | Four-second distant rain wash | Care and shelter; no thunder or weather spectacle |
| The Little Details | Low water texture with one bubble detail | Conversation accumulating naturally |
| Friday Night | Very low room air with a darkened foliage movement | Vulnerability and held space, almost silence |

Internal dialogue advances remain silent. Adding a sound to every line would turn
the memories into UI sequences and erode the intended intimacy.
