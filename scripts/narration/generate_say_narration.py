#!/usr/bin/env python3
import json
import subprocess
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SCRIPT_PATH = Path(__file__).with_name("narration-script.json")
OUTPUT_ROOT = PROJECT_ROOT / "public/assets/audio/narration"
TEMP_DIR = PROJECT_ROOT / "tmp"
TEMP_DIR.mkdir(exist_ok=True)

VOICE = "Rishi"

def encode_mp3(wav_path: Path, output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
            "-i", str(wav_path),
            "-af", (
                "highpass=f=65,"
                "acompressor=threshold=-20dB:ratio=2:attack=12:release=140,"
                "loudnorm=I=-18:TP=-1.5:LRA=7,"
                "afade=t=in:st=0:d=0.035,"
                "areverse,afade=t=in:st=0:d=0.055,areverse"
            ),
            "-ac", "1", "-ar", "24000",
            "-c:a", "libmp3lame", "-q:a", "4",
            str(output_path),
        ],
        check=True,
    )

def say_to_aiff(text: str, aiff_path: Path) -> None:
    subprocess.run(["say", "-v", VOICE, text, "-o", str(aiff_path)], check=True)

def main():
    script = json.loads(SCRIPT_PATH.read_text(encoding="utf-8"))
    
    # 1. Generate welcome lines
    for key, text in script.get("welcome", {}).items():
        aiff = TEMP_DIR / f"welcome_{key}.aiff"
        mp3 = OUTPUT_ROOT / f"welcome/{key}.mp3"
        print(f"Generating welcome/{key}.mp3...")
        say_to_aiff(text, aiff)
        encode_mp3(aiff, mp3)

    # 2. Generate tutorial lines
    for key, text in script.get("tutorial", {}).items():
        aiff = TEMP_DIR / f"tutorial_{key}.aiff"
        mp3 = OUTPUT_ROOT / f"tutorial/{key}.mp3"
        print(f"Generating tutorial/{key}.mp3...")
        say_to_aiff(text, aiff)
        encode_mp3(aiff, mp3)

    # 3. Generate memories lines
    for memory_id, lines in script.get("memories", {}).items():
        slug = memory_id.replace("production.memory.", "")
        for step_id, text in lines.items():
            aiff = TEMP_DIR / f"mem_{slug}_{step_id}.aiff"
            mp3 = OUTPUT_ROOT / f"memories/{slug}/{step_id}.mp3"
            print(f"Generating memories/{slug}/{step_id}.mp3...")
            say_to_aiff(text, aiff)
            encode_mp3(aiff, mp3)

    # 4. Generate finale/final-letter.mp3
    print("Generating finale/final-letter.mp3...")
    letter_paragraphs = script["finalLetter"]
    paragraph_aiffs = []
    for idx, para in enumerate(letter_paragraphs, start=1):
        para_aiff = TEMP_DIR / f"letter_para_{idx:02d}.aiff"
        say_to_aiff(para, para_aiff)
        paragraph_aiffs.append(para_aiff)
    
    silence_aiff = TEMP_DIR / "silence.aiff"
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "anullsrc=r=22050:cl=mono", "-t", "0.6", str(silence_aiff)], check=True)
    
    concat_list = TEMP_DIR / "concat.txt"
    with open(concat_list, "w") as f:
        for aiff in paragraph_aiffs:
            f.write(f"file '{aiff.absolute()}'\n")
            f.write(f"file '{silence_aiff.absolute()}'\n")
            
    combined_aiff = TEMP_DIR / "final_letter_combined.aiff"
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(concat_list), "-c", "copy", str(combined_aiff)], check=True)
    
    final_letter_mp3 = OUTPUT_ROOT / "finale/final-letter.mp3"
    encode_mp3(combined_aiff, final_letter_mp3)
    print("All narration audio files generated successfully!")

if __name__ == "__main__":
    main()
