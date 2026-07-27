# Integration Report, Volume Table, and Spatial Audio Table

## Runtime integration

`AudioManager` now owns one Web Audio graph and one instance of each long
stream. The old synthesized hiss, noise footsteps, and oscillator beeps have
been removed.

Signal flow:

`stream or decoded one-shot → per-voice gain/pan → role bus → master → output`

The role buses are ambience, environment, footsteps, interaction, memory, and
music. User settings drive master, ambience/music, and effects; mute ramps the
master instead of stopping/restarting content.

Implemented runtime behaviour:

- first pointer, keyboard, or touch gesture creates/resumes the context;
- long ambience and the score use singleton `HTMLAudioElement` streams with
  `preload="metadata"`;
- nearby UI/current-surface assets decode after unlock; memory/finale assets
  decode on demand;
- four surface variants rotate predictably without random bursts;
- interaction/memory/UI keys have individual replay guards;
- 12/8/5 one-shot limits apply for high/medium/low quality;
- a higher-priority cue steals the quietest-priority active voice when full;
- hidden tabs pause streams and suspend the context; visibility resumes both;
- disposal stops voices, releases media sources, clears caches, and closes the
  context;
- the decoded-buffer LRU holds at most 24/16/10 entries by quality and releases
  older cache references for garbage collection;
- no duplicate `Audio` or `AudioContext` objects are created on repeat init;
- mausoleum entry/exit crossfades the outdoor and interior layers over 2.4 s
  and narrows the score over 3.2 s without stopping it.

## Volume table

Source targets describe the processed file. Runtime values multiply through
the default settings (`master 0.72`, `ambience 0.42`, `effects 0.64`) and bus
gains, preserving headroom.

| Role | Source target / measured representative peak | Runtime role gain | Notes |
|---|---:|---:|---|
| Garden bed | −30 LUFS / −11.9 dBFS | stream 0.72 × ambience | Broadest layer, still quiet |
| Garden wind | −34 LUFS / −19.7 dBFS | stream 0.20 × ambience | Texture, not foreground wind |
| Fountain | −25 LUFS / −14.5 dBFS | max 0.24 × ambience × distance | Hard-muted at 40 m |
| Interior room tone | −38 LUFS / −24.1 dBFS | stream 0.68 × ambience indoors | Almost felt rather than heard |
| Romantic piano score | −26 LUFS / ≤ −2 dBTP | stream 0.58 × music bus 0.42 × ambience | Continuous; 0.32 stream gain at mausoleum |
| Leaves | −25 LUFS | environment bus 0.62 × ambience | One event every 22–41 s |
| Grass step | −23 LUFS / −5.8 dBFS | 0.78 × footsteps bus 0.70 × effects | Softest surface body |
| Marble step | −24 LUFS / −5.2 dBFS | 0.66 × footsteps bus × effects | Brighter, not louder |
| Stone step | −23 LUFS / −4.1 dBFS | 0.72 × footsteps bus × effects | Darker hard contact |
| Sand step | −24 LUFS / −5.1 dBFS | 0.72 × footsteps bus × effects | Granular, low-passed |
| UI hover | −27 LUFS | interaction bus 0.68 × effects | Priority 26 |
| UI confirm | −23 LUFS / −9.1 dBFS | interaction bus × effects | Priority 36 |
| Interaction confirm | −24 LUFS | interaction bus × effects | Priority 50 |
| Chirag ignition | −24 LUFS / −9.2 dBFS | interaction bus × effects | Priority 78 |
| Memory generic cues | −27/−26 LUFS | memory bus 0.72 × effects | Priority 70/72 |
| Memory identities | −28 to −36 LUFS | memory bus × effects | Priority 68 |
| Mausoleum door | −20 LUFS / −2.6 dBFS | interaction bus × effects | Priority 100; highest peak, still no clipping |
| Letter unfold | −26 LUFS / −8.3 dBFS | interaction bus × effects | Priority 95 |

### Ducking and crossfades

| State | Garden ambience bus | Garden stream | Wind stream | Interior stream | Score stream | Fountain |
|---|---:|---:|---:|---:|---:|---:|
| Normal exterior | 100% of ambience setting | 0.72 | 0.20 | 0 | 0.58 | distance gain |
| Memory active | 42% | unchanged inside ducked bus | unchanged inside ducked bus | unchanged | 0.58 on independent music bus | also multiplied by 42% |
| Mausoleum | 100% unless memory active | 0.055 | 0.025 | 0.68 | 0.32 | normally zero by distance |

Settings/mute use a 350 ms ramp, memory mix changes use 800 ms, water tracking
uses 180 ms, and the mausoleum threshold uses 2.4 s.

## Spatial audio table

| Sound | Mode | Min/reference distance | Max distance | Rolloff | Pan / position behaviour |
|---|---|---:|---:|---|---|
| Garden bed | Global stereo | — | — | None | Authored stereo; no head-locked movement |
| Wind | Global stereo | — | — | None | Intentionally broad |
| Romantic score | Global stereo | — | — | None | Continuous, non-positional, narrowed at the mausoleum threshold |
| Leaves | Environmental/global one-shot | — | — | Sparse scheduling replaces positional repetition | No more than one active event |
| Fountain | Custom listener-relative | 0 m / 8 m half-gain | 40 m hard cutoff | `1 / (1 + (d / 8)^2)` | Stereo pan clamped to ±0.35 from player X; nearest authored fountain Z wins |
| Footsteps | Player-local | — | — | None | Centred; material is more important than left/right shoe staging |
| UI | Global | — | — | None | Centred and low |
| Memory identities | Global narrative | — | — | None | Keeps text legible regardless of camera framing |
| Chirag | Global narrative | — | — | None | Completion feedback must survive camera staging |
| Mausoleum door | Global finale | — | — | None | The runtime has no listener-facing door transform in the UI bridge; mass is conveyed by spectrum/dynamics |
| Final letter | Global finale | — | — | None | Paper remains intimate and centred |

## Walking-surface map

Surface selection mirrors the visible plan rather than relying on a raycast
against the shared thin ground collider:

- grass: garden lawn cells;
- marble: main north/south axis, east/west cross-axis, platform, mausoleum;
- stone: side perimeter and pool-side walks;
- stairs: the authored central stair run, using the stone family at 0.94 rate;
- sand: forecourt, approach, and sandstone apron;
- wood: asset family retained but not selected because the current world has no
  walkable wooden surface.

## Finale integration note

The mausoleum gate is fully wired through `finale.mausoleum-gate`. The
repository currently contains a letter-plinth marker but no implemented final
letter interaction/content component. `letter-unfold.ogg` is production-ready,
and any interaction id containing `letter` is already routed to it; the cue
cannot be exercised in the present narrative runtime until that existing
non-audio gap is filled.
