#!/usr/bin/env python3
"""Rebuild the checked-in sharing image and icons using ImageMagick 7."""
from pathlib import Path
from subprocess import run

public = Path(__file__).resolve().parent / "public"


def magick(*args):
    run(["magick", *args], check=True, cwd=public)


magick(
    "-size", "1200x630", "tile:prints/paper.png",
    "(", "prints/root-study.webp", "-resize", "720x480", ")",
    "-geometry", "+456+81", "-compose", "Multiply", "-composite",
    "-font", "fonts/anton-latin.woff2", "-fill", "#201f1a",
    "-pointsize", "27", "-annotate", "+39+46", "mattriley.tools",
    "-draw", "rectangle 40,64 1160,65",
    "-pointsize", "100", "-annotate", "+35+260", "UNDER",
    "-annotate", "+35+366", "PRESSURE",
    "-pointsize", "25", "-annotate", "+40+438", "A print exhibition of software tools",
    "-draw", "rectangle 40,563 1160,564",
    "-pointsize", "20", "-annotate", "+40+602", "ROOT STUDY   /   DEADWOOD",
    "-strip", "-depth", "8", "og-default.png",
)
magick("-background", "none", "-density", "256", "../src/assets/under-pressure.svg", "-resize", "180x180",
       "-strip", "-depth", "8", "apple-touch-icon.png")
magick("apple-touch-icon.png", "-define", "icon:auto-resize=48,32,16", "favicon.ico")
magick("apple-touch-icon.png", "-resize", "32x32", "-strip", "-depth", "8",
       "../src/assets/under-pressure-32.png")
