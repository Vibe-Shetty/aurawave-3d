"""
FastAPI Server for Three.js 3D Music Visualizer & AI Mood Experience.
Inspired by Video 4 (Viral Music Web App) & Video 6 (Insane Three.js Experiences).
"""

import os
import sys

if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from pathlib import Path
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# Add workspace root to sys.path
workspace_root = Path(__file__).resolve().parent.parent.parent
if str(workspace_root) not in sys.path:
    sys.path.insert(0, str(workspace_root))

from shared.python.gemini_client import create_chat_turn, DEFAULT_MODEL

app = FastAPI(title="Three.js AI Music Experience", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

static_dir = Path(__file__).parent


class VibeRequest(BaseModel):
    genre_or_mood: str
    song_title: Optional[str] = "Untitled Track"


@app.post("/api/vibe-theme")
async def generate_vibe_theme(req: VibeRequest):
    """
    Use Gemini 3.6 Flash to analyze music vibe and generate 3D visual shader themes,
    color palettes, particle velocity multipliers, and poetic lyric concepts.
    """
    prompt = (
        f"Generate an immersive 3D audiovisual aesthetic theme for the music: "
        f"Title: '{req.song_title}', Mood/Genre: '{req.genre_or_mood}'.\n"
        f"Return a clean JSON object with the following keys:\n"
        f"- theme_name (string)\n"
        f"- primary_color (hex code string, e.g. '#00f0ff')\n"
        f"- secondary_color (hex code string, e.g. '#ff007f')\n"
        f"- background_color (hex code string, e.g. '#07090e')\n"
        f"- particle_speed (float between 0.5 and 2.5)\n"
        f"- wave_intensity (float between 1.0 and 3.0)\n"
        f"- poetic_vibe (a 2-sentence poetic description of this audio universe)\n"
        f"- viral_tagline (a catchy 5-word tagline for social sharing)"
    )

    try:
        response = create_chat_turn(
            prompt=prompt,
            model="gemini-3.6-flash",
            system_instruction="You are a creative digital art director and audio-reactive visual designer. Return ONLY valid JSON."
        )
        import json
        text = response.output_text.strip()
        if text.startswith("```json"):
            text = text[7:-3].strip()
        elif text.startswith("```"):
            text = text[3:-3].strip()
        return json.loads(text)
    except Exception as e:
        # Fallback theme if API key is not configured yet
        return {
            "theme_name": f"Cyberpunk {req.genre_or_mood.title()}",
            "primary_color": "#06b6d4",
            "secondary_color": "#a855f7",
            "background_color": "#07090e",
            "particle_speed": 1.4,
            "wave_intensity": 1.8,
            "poetic_vibe": "Neon frequencies pulse through infinite space as rhythmic waves reshape the digital horizon.",
            "viral_tagline": "Feel the Music in 3D",
            "note": f"Fallback theme loaded (Configure GEMINI_API_KEY for live AI themes: {e})"
        }


dist_dir = Path(__file__).parent / "dist"

@app.get("/")
async def serve_index():
    return FileResponse(dist_dir / "index.html")

# Serve all other static assets (JS, CSS, images, PWA manifest) from dist/
if dist_dir.exists():
    app.mount("/", StaticFiles(directory=str(dist_dir)), name="dist")

if __name__ == "__main__":
    import uvicorn
    port = 8001
    print(f"\n[AuraWave 3D] Three.js 3D AI Music Visualizer live at: http://127.0.0.1:{port}\n")
    uvicorn.run("server:app", host="127.0.0.1", port=port, reload=True)
