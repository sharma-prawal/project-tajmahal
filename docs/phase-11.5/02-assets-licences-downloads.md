# Asset Inventory, Licence Report, and Download Report

## Acquisition rule

Sound effects and ambience were limited to explicit CC0 selections. The one
continuous score added after visual review uses the Pixabay Content License,
which permits free commercial use and adaptation; provenance and the Content
ID warning are retained in `content/credits.json`. No premium fallback was
needed.

## Source and licence report

| Source asset / pack | Author | Licence | Source page | Direct acquisition | Source SHA-256 | Used for |
|---|---|---|---|---|---|---|
| Interface Sounds | Kenney | CC0 1.0 | https://kenney.nl/assets/interface-sounds | https://kenney.nl/media/pages/assets/interface-sounds/fa43c1dd4d-1677589452/kenney_interface-sounds.zip | `f2193d072726d6758a5f7871b2dcc54dcce0d5c35c6f0a62f92549b327c81232` | UI, transitions, generic memory/interaction cues |
| Impact Sounds | Kenney | CC0 1.0 | https://www.kenney.nl/assets/impact-sounds | https://www.kenney.nl/media/pages/assets/impact-sounds/87b4ddecda-1677589768/kenney_impact-sounds.zip | `029d734af1582474edf3a694d1b0cebc97c1c152f2f39fa34d4c2bafc5de77f8` | Steps, material details, door weight |
| Fantozzi’s Footsteps (Grass/Sand & Stone) | Fantozzi; submitted by qubodup | CC0 1.0 | https://lpc.opengameart.org/content/fantozzis-footsteps-grasssand-stone | https://lpc.opengameart.org/sites/default/files/Fantozzi-footsteps.7z | `415d360e0911c1c1c5355ee94023b772e6f4044f59b9b580610e7dbffd1840fd` | Grass, sand, marble families |
| Birds and Wind — Ambient | Spring Spring; PD bird contributors listed on source | CC0 1.0 | https://opengameart.org/content/birds-and-wind-ambient-birds-wind-and-synth | https://opengameart.org/sites/default/files/Birds%20and%20Wind%20-%20Ambient_1.ogg | `28f99f536a0772d80052f03bcb22c9ed8fd7c6e4db7f2e8356efcf26a8e24f01` | Music-free garden bed |
| wind1 | Luke.RUSTLTD | CC0 1.0 | https://opengameart.org/content/wind1 | https://opengameart.org/sites/default/files/wind1.wav | `a2856f794fbf77e05f8241dc4adeade7f62fa21c3c9dc49f7725b6c6218060c3` | Garden wind, filtered interior room tone |
| Random Sounds Samples — moving leaves | Augmentality; submitted by HaelDB | CC0 1.0 selected from offered CC0/OGA-BY | https://opengameart.org/content/random-sounds-samples | https://opengameart.org/sites/default/files/moving%20leaves%20stereo.ogg | `678c0da00ef1092f4be7c2d8c7b22c1c91c5fc8ca1f3f9570ce59de995c0138c` | Sparse leaves, Friday Night texture |
| 40 CC0 water / splash / slime SFX | rubberduck | CC0 1.0 | https://opengameart.org/content/40-cc0-water-splash-slime-sfx | https://opengameart.org/sites/default/files/water-splash-slime-sfx.zip | `7cd39abb49d4362a37ba18dc0e454c7dc1d08029d4e5b683149046bc237b2eba` | Fountain and memory water/rain only |
| Opening lock and door | RPG | CC0 1.0 | https://opengameart.org/content/opening-lock-and-door | https://opengameart.org/sites/default/files/door_open_1.mp3 | `f67b69fc1b2d340b01fb80a20dd6cd1e4009f48754e96f1fc7a382358c1ad98e` | Mausoleum door motion |
| Zippo click sound | dawith; submitted by qubodup | CC0 1.0 | https://opengameart.org/content/zippo-click-sound | https://opengameart.org/sites/default/files/zipclick.flac | `611249d551b3d97cf8529677213c1859fec4219115a289949519114fba1fed7a` | Chirag mechanical transient |
| Flare ignition | qubodup | CC0 1.0 | https://opengameart.org/content/flare-ignition | https://opengameart.org/sites/default/files/ignition.flac | `bd8281bcee65bc705755fd36bdf40d04fadddd474f52fd481233523e178b4ea1` | Chirag combustion tail |
| Various Paper Sound Effects — paper_sound_-_1 | Luckius | CC0 1.0 | https://opengameart.org/content/various-paper-sound-effects | https://opengameart.org/sites/default/files/paper_sound_-_1.mp3 | `f62e6cab41a9c0a8c67b5752c95e80e6adc681110d579ada982627909be1773d` | Boarding Passes and final letter |
| Contemplative — Calm Peaceful Romantic Piano Minimal Ambient | SoundGalleryByDmitryTaras | Pixabay Content License | https://pixabay.com/music/modern-classical-contemplative-calm-peaceful-romantic-piano-minimal-ambient-216313/ | https://cdn.pixabay.com/audio/2024/06/11/audio_caec8fe5d9.mp3 | `e967ad61c897246d089fbe1b4e1a2795e38a3a03e7b6083a4e3f287169a409ff` | Continuous low romantic score |

Commercial use is permitted by CC0. Kenney’s support page also explicitly
states that its asset-page files may be used commercially and need no
attribution: https://kenney.nl/support.

## Download report

All twelve selections downloaded successfully on 2026-07-26. The raw working
copies were verified by SHA-256 before processing. Runtime outputs were:

- decoded or extracted from ZIP/7z/FLAC/WAV/MP3/OGG;
- trimmed where appropriate;
- high/low-pass filtered to remove unusable extremes;
- loudness-normalized by role;
- given short endpoint fades;
- converted to 48 kHz OGG Vorbis;
- checked for non-zero output and browser decode/playback.

The score remains MP3 because this FFmpeg build has no Vorbis encoder; it was
re-encoded at 48 kHz/192 kbps after a three-second head/tail crossfade produced
a seamless 137.07-second loop. No premium alternative was required.
The processed runtime score hash is
`15545b55b598a859afe9e5fe7bd454b8c5355a9ac93acdc6af2a7d0b05523ceb`.

## Complete runtime asset inventory

The runtime root is `public/assets/audio/` (87 files, approximately 7.5 MB).

| Folder | Files | Count | Runtime role |
|---|---|---:|---|
| `ambience/` | `garden-bed.ogg`, `garden-wind.ogg`, `fountain-loop.ogg`, `interior-roomtone.ogg`, `leaves-rustle.ogg` | 5 | Streamed beds and sparse environmental detail |
| `ui/` | `hover.ogg`, `confirm.ogg`, `cancel.ogg` | 3 | Interface feedback |
| `footsteps/grass/` | `step-1.ogg` … `step-4.ogg` | 4 | Lawn |
| `footsteps/marble/` | `step-1.ogg` … `step-4.ogg` | 4 | Main axes, platform, mausoleum |
| `footsteps/stone/` | `step-1.ogg` … `step-4.ogg` | 4 | Side and pool-side paths; stairs reuse with lower rate |
| `footsteps/sand/` | `step-1.ogg` … `step-4.ogg` | 4 | Forecourt and sandstone apron |
| `footsteps/wood/` | `step-1.ogg` … `step-4.ogg` | 4 | Prepared but not selected by the current world plan |
| `memories/` | `activate.ogg`, `complete.ogg`, `all-day-call.ogg`, `back.ogg`, `boarding-passes.ogg`, `mints.ogg`, `umbrella.ogg`, `little-details.ogg`, `friday-night.ogg` | 9 | Generic boundary plus seven unique identities |
| `interactions/` | `focus-confirm.ogg`, `chirag-ignite.ogg` | 2 | Physical interaction and completion |
| `finale/` | `mausoleum-door-open.ogg`, `letter-unfold.ogg` | 2 | Finale |
| `transitions/` | `soft-open.ogg`, `soft-close.ogg` | 2 | Interior/exterior threshold |
| `music/` | `contemplative-romantic-piano.mp3` | 1 | Streamed continuous romantic score |
| `narration/` | tutorial, memory, and finale dialogue | 43 | Streamed spoken narrative, including the final letter |

The canonical runtime mapping is in `src/core/audio/audioAssets.ts`; canonical
source provenance is in `content/credits.json`.
