#!/usr/bin/env python3
"""Generate Project Taj's checked-in narration with the offline Kokoro model."""

from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro


PROJECT_ROOT = Path(__file__).resolve().parents[2]
SCRIPT_PATH = Path(__file__).with_name("narration-script.json")
OUTPUT_ROOT = PROJECT_ROOT / "public/assets/audio/narration"
REPORT_PATH = Path(__file__).with_name("generated-assets.json")


def encode_mp3(wav_path: Path, output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-i",
            str(wav_path),
            "-af",
            (
                "highpass=f=65,"
                "acompressor=threshold=-20dB:ratio=2:attack=12:release=140,"
                "loudnorm=I=-18:TP=-1.5:LRA=7,"
                "afade=t=in:st=0:d=0.035,"
                "areverse,afade=t=in:st=0:d=0.055,areverse"
            ),
            "-ac",
            "1",
            "-ar",
            "24000",
            "-c:a",
            "libmp3lame",
            "-q:a",
            "4",
            str(output_path),
        ],
        check=True,
    )


def generate_wav(
    engine: Kokoro,
    text: str,
    output_path: Path,
    *,
    voice: str,
    speed: float,
    language: str,
) -> None:
    samples, sample_rate = engine.create(
        text.replace("…", "..."),
        voice=voice,
        speed=speed,
        lang=language,
        trim=True,
    )
    sf.write(output_path, samples, sample_rate, subtype="PCM_24")


def duration_seconds(path: Path) -> float:
    probe = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return round(float(probe.stdout.strip()), 3)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", required=True, type=Path)
    parser.add_argument("--voices", required=True, type=Path)
    args = parser.parse_args()

    script = json.loads(SCRIPT_PATH.read_text(encoding="utf-8"))
    voice = script["voice"]
    engine = Kokoro(str(args.model), str(args.voices))
    generated: list[dict[str, object]] = []

    with tempfile.TemporaryDirectory(prefix="project-taj-narration-") as temp:
        temp_root = Path(temp)

        work: list[tuple[str, str]] = []
        work.extend(
            (f"tutorial/{key}.mp3", text)
            for key, text in script["tutorial"].items()
        )
        work.extend(
            (f"welcome/{key}.mp3", text)
            for key, text in script["welcome"].items()
        )
        for memory_id, lines in script["memories"].items():
            memory_slug = memory_id.removeprefix("production.memory.")
            work.extend(
                (f"memories/{memory_slug}/{step_id}.mp3", text)
                for step_id, text in lines.items()
            )

        for index, (relative_path, text) in enumerate(work, start=1):
            wav_path = temp_root / f"line-{index:02d}.wav"
            output_path = OUTPUT_ROOT / relative_path
            print(f"[{index:02d}/{len(work) + 1}] {relative_path}", flush=True)
            generate_wav(
                engine,
                text,
                wav_path,
                voice=voice["preset"],
                speed=voice["speed"],
                language=voice["language"],
            )
            encode_mp3(wav_path, output_path)
            generated.append(asset_record(output_path, text))

        paragraph_wavs: list[Path] = []
        for index, paragraph in enumerate(script["finalLetter"], start=1):
            paragraph_wav = temp_root / f"letter-{index:02d}.wav"
            generate_wav(
                engine,
                paragraph,
                paragraph_wav,
                voice=voice["preset"],
                speed=voice["speed"] * 0.985,
                language=voice["language"],
            )
            paragraph_wavs.append(paragraph_wav)

        letter_wav = temp_root / "final-letter.wav"
        letter_parts: list[np.ndarray] = []
        letter_sample_rate = 24000
        for paragraph_wav in paragraph_wavs:
            samples, sample_rate = sf.read(paragraph_wav, dtype="float32")
            if sample_rate != letter_sample_rate:
                raise RuntimeError(
                    f"Unexpected letter sample rate {sample_rate}; expected {letter_sample_rate}"
                )
            letter_parts.extend(
                (samples, np.zeros(round(letter_sample_rate * 0.58), dtype=np.float32))
            )
        sf.write(
            letter_wav,
            np.concatenate(letter_parts),
            letter_sample_rate,
            subtype="PCM_24",
        )
        letter_output = OUTPUT_ROOT / "finale/final-letter.mp3"
        print(f"[{len(work) + 1:02d}/{len(work) + 1}] finale/final-letter.mp3", flush=True)
        encode_mp3(letter_wav, letter_output)
        generated.append(
            asset_record(letter_output, "\n\n".join(script["finalLetter"]))
        )

    REPORT_PATH.write_text(
        json.dumps(
            {
                "engine": voice["engine"],
                "voice": voice["preset"],
                "language": voice["language"],
                "speed": voice["speed"],
                "assets": generated,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"Generated {len(generated)} mastered narration assets.")


def asset_record(path: Path, text: str) -> dict[str, object]:
    data = path.read_bytes()
    return {
        "path": str(path.relative_to(PROJECT_ROOT)),
        "bytes": len(data),
        "durationSeconds": duration_seconds(path),
        "sha256": hashlib.sha256(data).hexdigest(),
        "textSha256": hashlib.sha256(text.encode("utf-8")).hexdigest(),
    }


if __name__ == "__main__":
    main()
