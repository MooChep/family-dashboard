"""
Jow scraper microservice.

GET  /search?q=<query>&limit=<n>  → search via jow-api, returns JSON list
POST /fetch                        → body { url }, scrapes steps from div#instructions

Graceful degradation : if scraping fails, returns { steps: [], scrapeError: true }.
Never blocks the import on a scraping error.
"""

import os
import logging
from flask import Flask, request, jsonify
import requests
from bs4 import BeautifulSoup

try:
    from jow_api import Jow
    JOW_API_AVAILABLE = True
except ImportError:
    JOW_API_AVAILABLE = False
    logging.warning("jow-api not available — search endpoint will return empty results")

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

PORT = int(os.environ.get("PORT", 8001))


def _serialize_ingredient(ing) -> dict:
    """Convert a jow-api ingredient object to a plain dict."""
    try:
        return {
            "name":       getattr(ing, "name",       None) or str(ing),
            "quantity":   getattr(ing, "quantity",    None),
            "unit":       getattr(ing, "unit",        None),
            "isOptional": getattr(ing, "isOptional",  False),
        }
    except Exception:
        return {"name": str(ing), "quantity": None, "unit": None, "isOptional": False}


def _serialize_recipe(recipe) -> dict:
    """Convert a jow-api recipe object to a plain dict."""
    ingredients = []
    raw_ing = getattr(recipe, "ingredients", None) or []
    for ing in raw_ing:
        ingredients.append(_serialize_ingredient(ing))

    return {
        "id":              getattr(recipe, "id",              None) or getattr(recipe, "_id", None),
        "name":            getattr(recipe, "name",            None),
        "url":             getattr(recipe, "url",             None),
        "imageUrl":        getattr(recipe, "imageUrl",        None),
        "description":     getattr(recipe, "description",     None),
        "preparationTime": getattr(recipe, "preparationTime", None),
        "cookingTime":     getattr(recipe, "cookingTime",     None),
        "coversCount":     getattr(recipe, "coversCount",     None),
        "ingredients":     ingredients,
    }


@app.get("/search")
def search():
    """
    Search Jow recipes by query string.
    Returns a list of recipe summaries including ingredients.
    """
    q = request.args.get("q", "").strip()
    limit = min(int(request.args.get("limit", 10)), 30)

    if not q:
        return jsonify([])

    if not JOW_API_AVAILABLE:
        logger.error("jow-api not installed")
        return jsonify({"error": "jow-api not available"}), 503

    try:
        results = Jow.search(q, limit=limit)
        return jsonify([_serialize_recipe(r) for r in results])
    except Exception as exc:
        logger.error("Search error: %s", exc)
        return jsonify({"error": str(exc)}), 500


@app.post("/fetch")
def fetch():
    """
    Fetch and parse steps from a Jow recipe page.
    Body: { "url": "https://jow.fr/recipes/..." }
    Returns: { steps: [{order, text, ingredientRefs}], scrapeError: bool }
    ingredientRefs is always [] here — resolved later in Next.js during ingredient mapping.
    """
    body = request.get_json(silent=True) or {}
    url = body.get("url", "").strip()

    if not url:
        return jsonify({"error": "url is required"}), 400

    try:
        resp = requests.get(
            url,
            timeout=10,
            headers={"User-Agent": "Mozilla/5.0 (compatible; FamilyDashboard/1.0)"},
        )
        resp.raise_for_status()
    except Exception as exc:
        logger.warning("Failed to fetch %s: %s", url, exc)
        return jsonify({"steps": [], "scrapeError": True})

    try:
        soup = BeautifulSoup(resp.text, "html.parser")
        steps = _parse_steps(soup)
        return jsonify({"steps": steps, "scrapeError": False})
    except Exception as exc:
        logger.warning("Failed to parse steps from %s: %s", url, exc)
        return jsonify({"steps": [], "scrapeError": True})


def _parse_steps(soup: BeautifulSoup) -> list[dict]:
    """
    Extract ordered steps from div#instructions div[id^='step'].
    Uses stable id-based selectors — avoids fragile styled-components class names.
    """
    instructions = soup.find("div", id="instructions")
    if not instructions:
        return []

    steps = []
    for div in instructions.find_all("div", id=lambda v: v and v.startswith("step")):
        # Remove the "Étape N" heading if present
        heading = div.find(["h2", "h3", "strong", "span"], string=lambda s: s and s.strip().startswith("Étape"))
        if heading:
            heading.decompose()

        text = div.get_text(separator=" ", strip=True)

        # Extract order from the id attribute (e.g. "step3" → 3)
        step_id = div.get("id", "")
        try:
            order = int("".join(filter(str.isdigit, step_id)))
        except ValueError:
            order = len(steps) + 1

        if text:
            steps.append({
                "order":          order,
                "text":           text,
                "ingredientRefs": [],  # resolved later in Next.js
            })

    steps.sort(key=lambda s: s["order"])
    return steps


@app.get("/health")
def health():
    return jsonify({"status": "ok", "jowApi": JOW_API_AVAILABLE})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT)
