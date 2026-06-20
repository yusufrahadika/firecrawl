#!/usr/bin/env python3
"""Emit invisible_playwright launch settings for the Node service.

The TypeScript service owns the Playwright browser lifecycle. This helper only
asks invisible_playwright for the patched Firefox executable path and generated
stealth prefs, then prints JSON that Node can pass to firefox.launch().
"""
from __future__ import annotations

import json
import os

from invisible_playwright import ensure_binary, get_default_stealth_prefs


def _env_bool(name: str, default: bool) -> bool:
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def main() -> None:
    seed = os.environ.get("INVISIBLE_PLAYWRIGHT_SEED")
    locale = os.environ.get("INVISIBLE_PLAYWRIGHT_LOCALE", "en-US")
    timezone = os.environ.get("INVISIBLE_PLAYWRIGHT_TIMEZONE", "")
    humanize_value = os.environ.get("INVISIBLE_PLAYWRIGHT_HUMANIZE")

    humanize: bool | float
    if humanize_value is None:
        humanize = True
    elif humanize_value.strip().lower() in {"0", "false", "no", "off"}:
        humanize = False
    else:
        try:
            humanize = float(humanize_value)
        except ValueError:
            humanize = True

    payload = {
        "executablePath": str(ensure_binary()),
        "firefoxUserPrefs": get_default_stealth_prefs(
            seed=int(seed) if seed else None,
            locale=locale,
            timezone=timezone,
            humanize=humanize,
            virtual_display=_env_bool("INVISIBLE_PLAYWRIGHT_VIRTUAL_DISPLAY", True),
        ),
    }
    print(json.dumps(payload))


if __name__ == "__main__":
    main()
