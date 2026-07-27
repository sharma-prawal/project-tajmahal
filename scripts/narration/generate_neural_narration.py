#!/usr/bin/env python3
import asyncio
import json
import subprocess
from pathlib import Path
import edge_tts

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SCRIPT_PATH = Path(__file__).with_name("narration-script.json")
OUTPUT_ROOT = PROJECT_ROOT / "public/assets/audio/narration"
TEMP_DIR = PROJECT_ROOT / "tmp"
TEMP_DIR.mkdir(exist_ok=True)

VOICE = "en-IN-PrabhatNeural"
RATE = "-4%"

async def generate_audio(text: str, raw_mp3_path: Path, output_mp3_path: Path) -> None:
    output_mp3_path.parent.mkdir(parents=True, exist_ok=True)
    communicate = edge_tts.Communicate(text, VOICE, rate=RATE)
    await communicate.save(str(raw_mp3_path))
    
    # Process with ffmpeg for audio mastering (highpass filter, gentle compression, loudnorm, soft fades)
    subprocess.run(
        [
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
            "-i", str(raw_mp3_path),
            "-af", (
                "highpass=f=60,"
                "acompressor=threshold=-18dB:ratio=2:attack=10:release=120,"
                "loudnorm=I=-16:TP=-1.5:LRA=7,"
                "afade=t=in:st=0:d=0.04,"
                "areverse,afade=t=in:st=0:d=0.06,areverse"
            ),
            "-ac", "1", "-ar", "44100",
            "-c:a", "libmp3lame", "-q:a", "2",
            str(output_mp3_path),
        ],
        check=True,
    )

async def main_async():
    script = json.loads(SCRIPT_PATH.read_text(encoding="utf-8"))
    
    # 1. Generate welcome lines
    for key, text in script.get("welcome", {}).items():
        raw = TEMP_DIR / f"raw_welcome_{key}.mp3"
        out = OUTPUT_ROOT / f"welcome/{key}.mp3"
        print(f"Generating neural welcome/{key}.mp3...")
        await generate_audio(text, raw, out)

    # 2. Generate tutorial lines
    for key, text in script.get("tutorial", {}).items():
        raw = TEMP_DIR / f"raw_tutorial_{key}.mp3"
        out = OUTPUT_ROOT / f"tutorial/{key}.mp3"
        print(f"Generating neural tutorial/{key}.mp3...")
        await generate_audio(text, raw, out)

    # 3. Generate memories lines
    for memory_id, lines in script.get("memories", {}).items():
        slug = memory_id.replace("production.memory.", "")
        for step_id, text in lines.items():
            raw = TEMP_DIR / f"raw_mem_{slug}_{step_id}.mp3"
            out = OUTPUT_ROOT / f"memories/{slug}/{step_id}.mp3"
            print(f"Generating neural memories/{slug}/{step_id}.mp3...")
            await generate_audio(text, raw, out)

    # 4. Generate final letter
    letter_paragraphs = script.get("finalLetter", [])
    if letter_paragraphs:
        full_text = "\n\n".join(letter_paragraphs)
        raw = TEMP_DIR / "raw_final_letter.mp3"
        out = OUTPUT_ROOT / "finale/final-letter.mp3"
        print("Generating neural finale/final-letter.mp3...")
        await generate_audio(full_text, raw, out)

    print("All neural narration audio files generated successfully!")

if __name__ == "__main__":
    asyncio.run(main_async())
