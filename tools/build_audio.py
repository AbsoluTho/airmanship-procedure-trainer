"""Regenerate the simulator WAVs. Run: python tools/build_audio.py [espeak-ng executable]."""
import io
import math
from pathlib import Path
import struct
import subprocess
import sys
import wave

OUT = Path(__file__).resolve().parents[1] / 'audio'
RATE = 22050
CALLOUTS = {
    '2500': 'Twenty five hundred', '1000': 'One thousand', '500': 'Five hundred',
    '400': 'Four hundred', '300': 'Three hundred', '200': 'Two hundred',
    '100': 'One hundred', '50': 'Fifty', '40': 'Forty', '30': 'Thirty',
    '20': 'Twenty', '10': 'Ten', '5': 'Five', '100-above': 'Hundred above',
    'minimums': 'Minimums', 'retard': 'Retard',
}


def chime(name, notes):
    samples = bytearray()
    for hz, duration in notes:
        length = round(duration * RATE)
        for i in range(length):
            t = i / RATE
            fade = min(1, t / 0.012, (length - 1 - i) / (RATE * 0.045))
            tone = math.sin(2 * math.pi * hz * t) if hz else 0
            samples.extend(struct.pack('<h', round(12500 * tone * fade)))
    with wave.open(str(OUT / (name + '.wav')), 'wb') as wav:
        wav.setparams((1, 2, RATE, 0, 'NONE', 'not compressed'))
        wav.writeframes(samples)


def main():
    espeak = sys.argv[1] if len(sys.argv) > 1 else 'espeak-ng'
    voice_dir = Path(espeak).resolve().parent
    local_data = (voice_dir / 'espeak-ng-data').is_dir()
    if local_data:
        espeak = str(Path(espeak).resolve())
    OUT.mkdir(exist_ok=True)
    for name, phrase in CALLOUTS.items():
        data_path = ['--path=.'] if local_data else []
        audio = subprocess.check_output([
            espeak, *data_path, '-v', 'en-us', '-s', '185', '-p', '40', '-a', '95',
            '-z', '--stdout', phrase,
        ], cwd=voice_dir if local_data else None)
        # The streamed WAV header cannot know its length. Write a seekable WAV for the browser.
        with wave.open(io.BytesIO(audio), 'rb') as source:
            with wave.open(str(OUT / (name + '.wav')), 'wb') as wav:
                wav.setparams(source.getparams())
                wav.writeframes(source.readframes(source.getnframes()))
    chime('cabin-call', [(650, 0.22), (0, 0.09), (500, 0.28)])
    chime('ap-disconnect', [(810, 0.12), (650, 0.13), (0, 0.13)] * 3)
    chime('master-warning', [(910, 0.17), (0, 0.1)] * 4)


if __name__ == '__main__':
    main()
