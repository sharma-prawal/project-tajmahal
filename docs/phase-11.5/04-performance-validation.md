# Performance Report, Validation Report, and Remaining Improvements

## Performance report

| Concern | Implementation | Result |
|---|---|---|
| Boot decoding | Long beds use media elements with metadata preload | No up-front decode of 65/30/30 s beds |
| Nearby preload | UI confirm, interaction confirm, and current surface family only | Six decoded buffers immediately after unlock in browser run |
| Memory loading | Identity and completion cues decode on first use | Mints test raised cache from 10 to 12 entries |
| Finale loading | Door/letter prime only on mausoleum zone; otherwise on demand | No finale decode at exterior boot |
| Long ambience/score | Five singleton streamed media elements | No duplicated long `Audio` objects |
| One-shots | Shared promise cache per URL | Concurrent requests coalesce |
| Cache release | LRU caps of 24/16/10 for high/medium/low | Old decoded-buffer references become GC eligible |
| Voice limit | 12/8/5 active decoded one-shots | Low-priority voice is stolen only for a higher-priority request |
| Duplicate control | Per-cue cooldowns; interaction lifecycle edge detection; monotonic chirag diff | No stacking from repeated subscribers or held input |
| Hidden tab | Pause every stream, then suspend `AudioContext` | Browser validation reached `suspended`, then `running` |
| Unmount/unload | Stop voices, disconnect media graph, clear caches, close context | Covered by unit disposal test |
| Runtime footprint | 87 files, approximately 7.5 MB compressed | Long score streams; one-shots and narration decode selectively |

## Validation report

### Automated project validation

- `pnpm typecheck`: passed.
- `pnpm build`: passed; 882 modules transformed.
- `pnpm test`: 71 files, 522 tests passed.
- `pnpm content:lint`: passed with zero errors and one warning for the optional
  `gltf-validator` tool, unrelated to audio.
- `pnpm capture:audio`: passed during audio integration. Generated review
  output is intentionally excluded from the production repository.

### Browser audio validation

The Playwright run imports the production `AudioManager` through Vite and uses a
real Chromium `AudioContext`:

| Check | Observed |
|---|---|
| Unlock | `running`, ambience active |
| Continuous score | `music: active` after the first genuine pointer gesture |
| Stream/decode state | 6 nearby decoded buffers after unlock |
| Surface traversal | Six requested grass steps produced six footstep events |
| Stop behaviour | Count remained six while stationary |
| Voice limiting | Three concurrent step voices, below high-quality limit 12 |
| Memory state | Mints identity loaded; `memoryActive: true`; two voices |
| Suspend/resume | `suspended` then `running` |
| Fountain attenuation | 0.008667 near the garden fountain; 0 at forecourt |
| Surface transition | Grass in garden; marble on forecourt axis |
| Mute | `muted: true` reached the manager |
| Browser errors | None |

### Signal integrity

- All 43 runtime OGG files and the streamed MP3 score decoded successfully in FFmpeg.
- All 43 were scanned with `volumedetect`; zero files reached or exceeded
  0 dBFS.
- Loudest representative is the deliberate door transient at −2.6 dBFS.
- Representative ambience peaks: garden −11.9, wind −19.7, fountain −14.5,
  interior −24.1 dBFS.
- Loop endpoint discontinuity after final encoding, in normalized sample
  amplitude: garden 0.000135, wind 0.000148, fountain 0.001028, interior
  0.000155. Each has an explicit 10–20 ms endpoint fade; no hard cut remains.
- One-shots use 3–5 ms attack fades where trimming could otherwise click.

### Headphones, laptop speakers, and mobile speakers

The technical mix is prepared for all three:

- no essential cue depends on sub-bass;
- hard-surface steps and paper retain mid-band definition;
- wide layers are supporting, while narrative/UI cues remain centred;
- all sources are stereo 48 kHz Vorbis and downmix without phase-critical
  cancellation;
- headroom remains after default master/bus multiplication;
- no high-frequency bird or ignition layer is allowed to dominate.

This environment can verify decoding, routing, signal levels, timing, and
state, but it cannot perform a subjective physical-speaker listening test.
That final judgement belongs in the first human playtest. It should be treated
as mix confirmation, not an unfinished engineering task.

## Journey coverage

| Journey section | Coverage |
|---|---|
| Forecourt / gate | Sand or marble steps; garden layers and low romantic score begin quietly |
| Garden exploration | Bed, wind, sparse leaves, surface steps, local water, continuous score |
| All seven memories | Generic boundary plus unique environmental identity |
| Spatial memory completion | Chirag ignition |
| Approach / stairs / plinth | Sand → stair stone → marble |
| Mausoleum threshold | Soft transition, 2.4 s ambience crossfade, 3.2 s score narrowing |
| Door | Heavy physical finale cue |
| Interior | Very low room tone; outdoor bed nearly removed |
| Final letter | Complete letter interaction plus spoken Kokoro narration, including the authored salutation |

No playable current interaction is known to be silent unintentionally. The
generated review captures are excluded from the production repository and can
be recreated with the capture scripts when another validation pass is needed.

## Remaining optional improvements

1. During the first human playtest, make one global gain pass only. Listen for
   fatigue over 15–20 minutes before changing individual files.
2. If the physical door’s world transform becomes available to the UI audio
   bridge, move it from global finale playback to a true `PannerNode` with a
   3 m reference distance and 24 m maximum.
3. Once a final-letter interaction exists, add a browser assertion for its
   id-specific cue. The asset and runtime route already exist.
4. Consider removing the unused wood family at ship freeze if no future
   walkable wood is introduced; it is only about 40 KB and currently serves as
   a ready contingency.

No premium audio purchase is recommended.
