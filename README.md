# BCS 407 Artificial Intelligence: self-explaining course

Narrated, animated lectures (15 weeks) and labs (12), with random exercises that show their answers, and interactive playgrounds (A*, alpha-beta pruning, k-means, gradient descent, a small neural network, attention, reinforcement learning, and more).

Open `index.html` (served over http, for example `python3 -m http.server`). The first page shows the learning outcomes and the weekly plan; every lecture and lab is one click away.

- `lectures/`, `labs/`: one file per page (scenes, narration text, exercises)
- `assets/`: engine, SVG kit, styles, widgets
- `audio/`: narration (mp3) and per-sentence timing (`manifest.json`) so the animation follows the voice
- `tools/`: checker and voice generator (needs an ElevenLabs key kept outside the repo)

Python cells run in the browser with Pyodide (numpy only). No student data is stored here.
