"""
Jow scraper microservice.

GET  /search?q=<query>&limit=<n>  → search via jow-api, returns JSON list
POST /fetch                        → body { url }, scrapes steps from div#instructions
GET  /health                       → status check

Graceful degradation : if scraping fails, returns { steps: [], scrapeError: true }.
"""

import os
import logging
from flask import Flask, request, jsonify
import requests
from bs4 import BeautifulSoup
from jow_api import Jow

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

PORT = int(os.environ.get("PORT", 8001))
JOW_IMAGE_BASE = "https://static.jow.fr/"


def _serialize_recipe(r: dict) -> dict:
    """Sérialise un dict recette brut de l'API Jow vers le format attendu par Next.js."""
    image_url = r.get("imageUrl") or r.get("editorialPictureUrl")
    full_image_url = (JOW_IMAGE_BASE + image_url) if image_url else None

    ingredients = []
    for c in r.get("constituents", []):
        try:
            ingredients.append({
                "name":       c["ingredient"]["name"],
                "quantity":   c["ingredient"].get("quantityPerCover"),
                "unit":       Jow.get_ingredient_unit(c),
                "isOptional": c.get("isOptional", False),
            })
        except Exception as e:
            logger.warning("Skipping ingredient: %s", e)

    return {
        "id":              Jow.get_id(r),
        "name":            Jow.get_name(r),
        "url":             Jow.get_url(r),
        "imageUrl":        full_image_url,
        "description":     r.get("description"),
        "preparationTime": r.get("preparationTime"),
        "cookingTime":     r.get("cookingTime"),
        "coversCount":     r.get("roundedCoversCount"),
        "ingredients":     ingredients,
    }


@app.get("/search")
def search():
    q     = request.args.get("q", "").strip()
    limit = min(int(request.args.get("limit", 10)), 30)

    if not q:
        return jsonify([])

    try:
        data    = Jow.api_call(q, limit=limit)
        content = data.get("content", [])
        return jsonify([_serialize_recipe(r) for r in content])
    except Exception as exc:
        logger.error("Search error: %s", exc)
        return jsonify({"error": str(exc)}), 500


@app.post("/fetch")
def fetch():
    body = request.get_json(silent=True) or {}
    url  = body.get("url", "").strip()

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
        soup  = BeautifulSoup(resp.text, "html.parser")
        steps = _parse_steps(soup)
        return jsonify({"steps": steps, "scrapeError": False})
    except Exception as exc:
        logger.warning("Failed to parse steps from %s: %s", url, exc)
        return jsonify({"steps": [], "scrapeError": True})


def _parse_steps(soup: BeautifulSoup) -> list:
    instructions = soup.find("div", id="instructions")
    if not instructions:
        return []

    steps = []
    for div in instructions.find_all("div", id=lambda v: v and v.startswith("step")):
        heading = div.find(["h2", "h3", "strong"], string=lambda s: s and s.strip().startswith("Étape"))
        if heading:
            heading.decompose()

        text = div.get_text(separator=" ", strip=True)
        step_id = div.get("id", "")
        try:
            order = int("".join(filter(str.isdigit, step_id)))
        except ValueError:
            order = len(steps) + 1

        if text:
            steps.append({"order": order, "text": text, "ingredientRefs": []})

    steps.sort(key=lambda s: s["order"])
    return steps


@app.get("/health")
def health():
    return jsonify({"status": "ok", "jowApi": True})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT)
