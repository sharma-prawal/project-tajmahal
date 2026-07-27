# Project Taj narration provenance

## Voice direction

- Engine: Kokoro-82M v1.0
- Voice preset: `am_michael`
- Language: American English
- Delivery speed: 0.92× for tutorial and memories; 0.906× for the letter
- Direction: warm, restrained, reflective, and close-mic in character
- Processing: 65 Hz high-pass, light 2:1 compression, -18 LUFS integrated,
  -1.5 dBTP ceiling, short click-safe fades, mono Opus at 48 kbps

The speech was rendered offline. No player data, save data, or narrative copy
is sent to an online speech service at runtime.

## Licensing

- Kokoro-82M model and voice weights: Apache License 2.0
  - https://huggingface.co/hexgrad/Kokoro-82M
  - https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md
- `kokoro-onnx` generation wrapper: MIT License
  - https://github.com/thewh1teagle/kokoro-onnx

The model and wrapper permit commercial use. Generated narration is checked
into the project; the model itself is not shipped to players.

## Reproducibility

- Script and exact narration copy:
  `scripts/narration/narration-script.json`
- Generator:
  `scripts/narration/generate_narration.py`
- Per-file duration, byte size, text hash, and audio hash:
  `scripts/narration/generated-assets.json`
- Runtime assets:
  `public/assets/audio/narration/`

Model invocation:

```text
scripts/narration/generate_narration.py \
  --model /path/to/kokoro-v1.0.onnx \
  --voices /path/to/voices-v1.0.bin
```
