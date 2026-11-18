#!/usr/bin/env python3
"""Generate narration audio + manifest.json per lecture.
  python3 gen_voice.py w03 [w04 ...] --engine eleven|kokoro [--budget 60000] [--force]
ElevenLabs key is read from ~/.config/secretary_secrets/elevenlabs_key (never in the repo).
Kokoro needs the venv: ~/kamangir-voice-lab/.venv/bin/python gen_voice.py ... --engine kokoro
Manifest format read by the player: {"scene.step": {"f": "scene_step.mp3", "t": [sentence start seconds], "d": seconds}}"""
import sys, os, re, json, base64, subprocess, argparse, urllib.request, wave
HERE = os.path.dirname(os.path.abspath(__file__)); SITE = os.path.abspath(os.path.join(HERE, '..', '..'))
VOICE_ID = 'Xb7hH8MSUJpSbSDYk0k2'      # Alice - Clear, Engaging Educator (British female)
KOKORO_VOICE = 'bf_emma'                 # British female, matches Alice's accent
LEDGER = os.path.join(HERE, 'ledger.json')

def speakify(s):
    s = s.replace('A*', 'A star').replace('A\\*', 'A star')
    for a, b in [(r'\be\.g\.', 'for example'), (r'\bi\.e\.', 'that is'), (r'\bvs\.?', 'versus'), (r'\betc\.', 'and so on'), (r'k-means', 'k means'), (r'Q-learning', 'Q learning'), (r'\bw/', 'with'), (r'&', ' and '), (r'%', ' percent'), (r'\s*->\s*', ' to '), (r'\s*=\s*', ' equals '), (r'[*_`^]', ''), (r'\bBFS\b', 'B F S'), (r'\bDFS\b', 'D F S'), (r'\bUCS\b', 'U C S')]:
        s = re.sub(a, b, s)
    return re.sub(r'\s+', ' ', s).strip()

def extract(lec):
    kind = 'labs' if lec.startswith('lab') else 'lectures'
    r = subprocess.run(['node', os.path.join(HERE, 'extract_narration.js'), os.path.join(SITE, kind, lec + '.js')], capture_output=True, text=True, check=True)
    return json.loads(r.stdout)[0]['items']

def eleven(text, key):
    body = json.dumps({'text': text, 'model_id': 'eleven_multilingual_v2', 'voice_settings': {'stability': 0.55, 'similarity_boost': 0.8, 'style': 0.15, 'use_speaker_boost': True}}).encode()
    req = urllib.request.Request(f'https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}/with-timestamps?output_format=mp3_44100_128', body, {'xi-api-key': key, 'Content-Type': 'application/json'})
    d = json.load(urllib.request.urlopen(req, timeout=180))
    return base64.b64decode(d['audio_base64']), d['alignment']

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('lecs', nargs='+'); ap.add_argument('--engine', required=True, choices=['eleven', 'kokoro']); ap.add_argument('--budget', type=int, default=10**9); ap.add_argument('--force', action='store_true')
    a = ap.parse_args(); ledger = json.load(open(LEDGER)) if os.path.exists(LEDGER) else {'eleven_chars': 0, 'done': {}}
    key = open(os.path.expanduser('~/.config/secretary_secrets/elevenlabs_key')).read().strip() if a.engine == 'eleven' else None
    if a.engine == 'kokoro':
        import numpy as np
        from kokoro_onnx import Kokoro
        K = Kokoro(os.path.expanduser('~/kamangir-voice-lab/kokoro/kokoro-v1.0.onnx'), os.path.expanduser('~/kamangir-voice-lab/kokoro/voices-v1.0.bin'))
    for lec in a.lecs:
        items = extract(lec); outdir = os.path.join(SITE, 'audio', lec); os.makedirs(outdir, exist_ok=True)
        mpath = os.path.join(outdir, 'manifest.json'); man = json.load(open(mpath)) if os.path.exists(mpath) else {}
        need = sum(len(' '.join(speakify(x) for x in it['sentences'])) for it in items if a.force or it['key'] not in man)
        if a.engine == 'eleven' and ledger['eleven_chars'] + need > a.budget:
            print(f'{lec}: needs {need} chars, would exceed budget ({ledger["eleven_chars"]}+{need}>{a.budget}); skipped'); continue
        for it in items:
            if it['key'] in man and not a.force: continue
            sents = [speakify(x) for x in it['sentences']]; text = ' '.join(sents); fn = it['key'].replace('.', '_') + '.mp3'; path = os.path.join(outdir, fn)
            starts = []; pos = 0
            for s in sents: starts.append(text.index(s, pos)); pos = starts[-1] + len(s)
            if a.engine == 'eleven':
                mp3, al = eleven(text, key); open(path, 'wb').write(mp3); ledger['eleven_chars'] += len(text)
                cs, ce = al['character_start_times_seconds'], al['character_end_times_seconds']
                t = [round(cs[min(i, len(cs) - 1)], 3) for i in starts]; d = round(ce[-1] + 0.35, 3)
            else:
                chunks = []; t = []; cur = 0.0; sr = 24000
                for s in sents:
                    smp, sr = K.create(s, voice=KOKORO_VOICE, speed=0.97, lang='en-us'); t.append(round(cur, 3)); chunks.append(smp); gap = np.zeros(int(sr * 0.28), dtype=np.float32); chunks.append(gap); cur += (len(smp) + len(gap)) / sr
                wav = np.concatenate(chunks); wp = path[:-4] + '.wav'
                with wave.open(wp, 'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((np.clip(wav, -1, 1) * 32767).astype('<i2').tobytes())
                subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wp, '-codec:a', 'libmp3lame', '-b:a', '96k', path], check=True); os.remove(wp); d = round(cur + 0.2, 3)
            man[it['key']] = {'f': fn, 't': t, 'd': d, 'engine': a.engine}
            json.dump(man, open(mpath, 'w'), indent=1); json.dump(ledger, open(LEDGER, 'w'), indent=1)
            print(f'{lec} {it["key"]}: {len(text)} chars, {d}s')
        ledger['done'][lec] = a.engine; json.dump(ledger, open(LEDGER, 'w'), indent=1)
    print('eleven chars used by this project:', ledger['eleven_chars'])
if __name__ == '__main__': main()
