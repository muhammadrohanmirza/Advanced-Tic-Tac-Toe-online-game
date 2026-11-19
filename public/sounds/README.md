# Sound Effects & Audio Assets

This project uses the **Web Audio API** (`hooks/useSound.ts`) to dynamically synthesize all sound effects and ambient neon background music procedurally in code using Web Audio oscillators, biquad filters, and envelopes.

## Features
- **Zero External File Dependencies**: No external `.mp3` or `.wav` files need to be downloaded or hosted.
- **Instant & Offline**: Sounds play with zero network latency.
- **Fully Royalty-Free**: Procedurally synthesized in the user's browser.
- **Autoplay Compliant**: AudioContext is created/resumed strictly upon user gesture.

## Supported Sound Triggers
- `placeX`: High-tech neon pulse sweep
- `placeO`: Resonant warm double-chime
- `win`: Triumphant 4-note ascending fanfare (C5, E5, G5, C6)
- `lose`: Minor descending defeat slide
- `draw`: Balanced twin chime
- `chat`: Friendly high-frequency notification ping
- `click`: Crisp tactile button click
- `ambient music`: Generative D-minor ambient cyberpunk pad loop

---

### Optional Custom Audio Files
If you ever wish to replace the procedural Web Audio synthesizer with static audio files, you can place royalty-free `.mp3` or `.wav` files in this directory with the following naming convention:
- `/sounds/place-x.mp3`
- `/sounds/place-o.mp3`
- `/sounds/win.mp3`
- `/sounds/lose.mp3`
- `/sounds/draw.mp3`
- `/sounds/chat.mp3`
- `/sounds/click.mp3`
- `/sounds/music.mp3`

Recommended free/open sources for royalty-free retro sound effects:
- [Freesound.org](https://freesound.org/) (Creative Commons 0)
- [OpenGameArt.org](https://opengameart.org/) (Public Domain / CC0)
- [Kenney.nl](https://kenney.nl/assets/digital-audio) (CC0)

