#!/usr/bin/env python3
"""
fetch_daily_news.py
Automated 100% International English News Fetcher & GitHub Pages updater for Actu du Jour.
Fetches 100% English RSS feeds across ALL categories (BBC World, BBC Business, TechCrunch, BBC Society/US).
Auto-translates all English articles to French via Google Translate API (dict-chrome-ex).
Allows full "Traduire en FR" / "Afficher VO (EN)" toggle on every single article across the entire app.
"""

import os
import sys
import json
import ssl
import datetime
import subprocess
import re
import html
import time
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR) if os.path.basename(SCRIPT_DIR) == "scripts" else SCRIPT_DIR
DATA_FILE = os.path.join(PROJECT_DIR, "data", "news.json")
LOG_FILE = os.path.join(PROJECT_DIR, "daily_news_cron.log")

def log(msg):
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    formatted = f"[{now}] {msg}"
    print(formatted)
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(formatted + "\n")
    except Exception as e:
        pass

def clean_text(raw_html):
    if not raw_html:
        return ""
    text = re.sub(r'<[^>]+>', '', raw_html)
    text = html.unescape(text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def translate_en_to_fr(text, timeout=6):
    if not text:
        return ""
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    time.sleep(0.3)
    try:
        clean_input = text[:500]
        url = f"https://translate.googleapis.com/translate_a/single?client=dict-chrome-ex&sl=en&tl=fr&dt=t&q={urllib.parse.quote(clean_input)}"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
        with urllib.request.urlopen(req, context=ctx, timeout=timeout) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            if data and data[0]:
                translated = ''.join([s[0] for s in data[0] if s and s[0]])
                return clean_text(translated)
            return text
    except Exception as e:
        log(f"Translation error for '{text[:30]}...': {e}")
        return text

def fetch_rss_items(feed_url, default_source, category_badge, limit=2):
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    items_out = []
    
    try:
        req = urllib.request.Request(feed_url, headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'})
        with urllib.request.urlopen(req, context=ctx, timeout=6) as resp:
            raw_data = resp.read()
            root = ET.fromstring(raw_data)
            
            channel_items = root.findall('.//item')[:limit]
            for idx, item in enumerate(channel_items):
                raw_title = item.findtext('title') or ""
                raw_desc = item.findtext('description') or item.findtext('{http://purl.org/rss/1.0/modules/content/}encoded') or ""
                
                title = clean_text(raw_title)
                desc = clean_text(raw_desc)
                
                if not title or len(title) < 10:
                    continue
                if not desc or len(desc) < 15:
                    desc = title

                time_str = "08h00"
                
                log(f"Translating EN item ({default_source}): {title[:40]}...")
                title_fr = translate_en_to_fr(title)
                summary_fr = translate_en_to_fr(desc[:400])
                
                item_obj = {
                    "isInternational": True,
                    "language": "en",
                    "title": title,
                    "titleFr": title_fr if title_fr else title,
                    "source": default_source,
                    "time": time_str,
                    "summary": desc,
                    "summaryFr": summary_fr if summary_fr else desc,
                    "impact": f"Global market & political signal via {default_source}",
                    "impactFr": f"Signal international majeur via {default_source}",
                    "badge": category_badge
                }
                items_out.append(item_obj)
    except Exception as e:
        log(f"Error fetching RSS {feed_url}: {e}")
        
    return items_out

def build_live_news_dataset():
    today = datetime.date.today()
    french_days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]
    french_months = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"]
    
    day_name = french_days[today.weekday()]
    month_name = french_months[today.month - 1]
    formatted_date = f"{day_name} {today.day} {month_name} {today.year}"

    log(f"=== Collecte des actualités 100% ANGLAISES du {formatted_date} ===")

    # Category 1: Économie & Finance (BBC Business & Reuters)
    eco_items = fetch_rss_items("https://feeds.bbci.co.uk/news/business/rss.xml", "BBC Business", "Économie", limit=2)
    for idx, item in enumerate(eco_items):
        item["id"] = f"eco-{idx+1}-{today.isoformat()}"

    # Category 2: Politique (BBC World News)
    pol_items = fetch_rss_items("https://feeds.bbci.co.uk/news/world/rss.xml", "BBC World News", "Politique", limit=2)
    for idx, item in enumerate(pol_items):
        item["id"] = f"pol-{idx+1}-{today.isoformat()}"

    # Category 3: Tech & IA (TechCrunch)
    tech_items = fetch_rss_items("https://techcrunch.com/feed/", "TechCrunch", "Global Tech", limit=2)
    if not tech_items:
        tech_items = fetch_rss_items("https://feeds.bbci.co.uk/news/technology/rss.xml", "BBC Tech", "Global Tech", limit=2)
    for idx, item in enumerate(tech_items):
        item["id"] = f"tech-{idx+1}-{today.isoformat()}"

    # Category 4: Faits Divers & Société (BBC World US & International)
    fd_items = fetch_rss_items("https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml", "BBC International", "Société", limit=2)
    if not fd_items:
        fd_items = fetch_rss_items("https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml", "BBC Culture", "Société", limit=2)
    for idx, item in enumerate(fd_items):
        item["id"] = f"fd-{idx+1}-{today.isoformat()}"

    takeaways = []
    if eco_items:
        takeaways.append(f"Économie : {eco_items[0].get('titleFr', eco_items[0]['title'])}")
    if pol_items:
        takeaways.append(f"Politique : {pol_items[0].get('titleFr', pol_items[0]['title'])}")
    if tech_items:
        takeaways.append(f"Tech & IA : {tech_items[0].get('titleFr', tech_items[0]['title'])}")

    news_payload = {
        "date": today.isoformat(),
        "formattedDate": formatted_date,
        "summary": f"Le bulletin international en anglais du {formatted_date} regroupe 100% d'actualités mondiales (BBC News, TechCrunch) avec option de traduction immédiate en français.",
        "keyTakeaways": takeaways if takeaways else [
            f"Toutes les actualités mondiales du {formatted_date} en version originale avec traduction instantanée."
        ],
        "categories": [
            {
                "id": "eco-fin",
                "name": "Économie & Finance",
                "icon": "trending-up",
                "color": "emerald",
                "items": eco_items
            },
            {
                "id": "politique",
                "name": "Politique",
                "icon": "landmark",
                "color": "blue",
                "items": pol_items
            },
            {
                "id": "tech",
                "name": "Tech & IA",
                "icon": "cpu",
                "color": "purple",
                "items": tech_items
            },
            {
                "id": "faits-divers",
                "name": "Faits Divers & Société",
                "icon": "shield-alert",
                "color": "amber",
                "items": fd_items
            }
        ]
    }

    return news_payload

def update_and_push():
    dataset = build_live_news_dataset()
    
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(dataset, f, ensure_ascii=False, indent=2)
    log("Fichier data/news.json mis à jour avec 100% d'actualités en anglais traduisibles.")

    if not os.environ.get("GITHUB_ACTIONS"):
        try:
            subprocess.run(["git", "add", "data/news.json"], cwd=PROJECT_DIR, check=True)
            commit_msg = f"Update all categories to 100% English feeds: {datetime.date.today().isoformat()}"
            subprocess.run(["git", "commit", "-m", commit_msg], cwd=PROJECT_DIR, check=False)
            subprocess.run(["git", "push", "origin", "main"], cwd=PROJECT_DIR, check=True)
            log("Actualités 100% en anglais traduisibles poussées sur GitHub.")
        except Exception as e:
            log(f"Erreur lors du push Git local: {e}")

if __name__ == "__main__":
    log("Début de la génération 100% anglais.")
    update_and_push()
    log("Fin de l'exécution.")
