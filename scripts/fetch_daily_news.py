#!/usr/bin/env python3
"""
fetch_daily_news.py
Automated REAL daily news fetcher & GitHub Pages updater for Actu du Jour (LeSiou/daily-news-app)
Fetches live RSS feeds from Le Monde, BBC, TechCrunch, France Info, Les Echos.
Auto-translates English articles to French via MyMemory API.
Runs every morning at 08h00 via GitHub Actions & Antigravity scheduler.
"""

import os
import sys
import json
import ssl
import datetime
import subprocess
import re
import html
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

def translate_en_to_fr(text, timeout=4):
    if not text:
        return ""
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    try:
        clean_input = text[:350]
        url = f"https://api.mymemory.translated.net/get?q={urllib.parse.quote(clean_input)}&langpair=en|fr"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'})
        with urllib.request.urlopen(req, context=ctx, timeout=timeout) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            translated = data.get('responseData', {}).get('translatedText', text)
            return clean_text(translated)
    except Exception as e:
        log(f"Translation warning for '{text[:30]}...': {e}")
        return text

def fetch_rss_items(feed_url, default_source, is_en=False, limit=2):
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

                pub_date = item.findtext('pubDate') or datetime.datetime.now().strftime("%Hh%M")
                time_str = "08h00"
                
                # Format EN / FR
                if is_en:
                    log(f"Translating RSS item: {title[:40]}...")
                    title_fr = translate_en_to_fr(title)
                    summary_fr = translate_en_to_fr(desc[:300])
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
                        "impactFr": f"Signal marché et géopolitique majeur transmis par {default_source}",
                        "badge": "World News"
                    }
                else:
                    item_obj = {
                        "isInternational": False,
                        "language": "fr",
                        "title": title,
                        "titleFr": title,
                        "source": default_source,
                        "time": time_str,
                        "summary": desc,
                        "summaryFr": desc,
                        "impact": f"Analyse et suivi direct par {default_source}",
                        "impactFr": f"Analyse et suivi direct par {default_source}",
                        "badge": "France"
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

    log(f"=== Début de la collecte des VRAIES actualités RSS du {formatted_date} ===")

    # Category 1: Economie & Finance
    eco_items = fetch_rss_items("https://feeds.bbci.co.uk/news/business/rss.xml", "BBC Business", is_en=True, limit=2)
    if not eco_items:
        eco_items = fetch_rss_items("https://www.lesechos.fr/rss/rss_economie.xml", "Les Echos", is_en=False, limit=2)
    for idx, item in enumerate(eco_items):
        item["id"] = f"eco-{idx+1}-{today.isoformat()}"
        item["badge"] = "Économie"

    # Category 2: Politique
    pol_items = fetch_rss_items("https://www.lemonde.fr/rss/une.xml", "Le Monde", is_en=False, limit=2)
    if not pol_items:
        pol_items = fetch_rss_items("https://feeds.bbci.co.uk/news/world/rss.xml", "BBC World", is_en=True, limit=2)
    for idx, item in enumerate(pol_items):
        item["id"] = f"pol-{idx+1}-{today.isoformat()}"
        item["badge"] = "Politique"

    # Category 3: Tech & IA
    tech_items = fetch_rss_items("https://techcrunch.com/feed/", "TechCrunch", is_en=True, limit=2)
    if not tech_items:
        tech_items = fetch_rss_items("https://feeds.bbci.co.uk/news/technology/rss.xml", "BBC Tech", is_en=True, limit=2)
    for idx, item in enumerate(tech_items):
        item["id"] = f"tech-{idx+1}-{today.isoformat()}"
        item["badge"] = "Global Tech"

    # Category 4: Faits Divers & Société
    fd_items = fetch_rss_items("https://www.francetvinfo.fr/titres.rss", "France Info", is_en=False, limit=2)
    if not fd_items:
        fd_items = fetch_rss_items("https://www.lefigaro.fr/rss/figaro_actualites.xml", "Le Figaro", is_en=False, limit=2)
    for idx, item in enumerate(fd_items):
        item["id"] = f"fd-{idx+1}-{today.isoformat()}"
        item["badge"] = "Société"

    # Generate key takeaways from top stories
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
        "summary": f"Le bulletin d'actualités en direct du {formatted_date} synthétise les derniers titres de Le Monde, BBC News, TechCrunch et France Info.",
        "keyTakeaways": takeaways if takeaways else [
            f"Découvrez les dernières actualités et analyses en direct du {formatted_date}."
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
    log("Fichier data/news.json mis à jour avec les VRAIES actualités en direct.")

    # Commit & push localement si hors GitHub Actions
    if not os.environ.get("GITHUB_ACTIONS"):
        try:
            subprocess.run(["git", "add", "data/news.json"], cwd=PROJECT_DIR, check=True)
            commit_msg = f"Live news feed update: {datetime.date.today().isoformat()}"
            subprocess.run(["git", "commit", "-m", commit_msg], cwd=PROJECT_DIR, check=False)
            subprocess.run(["git", "push", "origin", "main"], cwd=PROJECT_DIR, check=True)
            log("Actualités en direct poussées sur GitHub (lesiou.github.io/daily-news-app).")
        except Exception as e:
            log(f"Erreur lors du push Git local: {e}")

if __name__ == "__main__":
    log("Début de l'exécution du script de mise à jour des VRAIES actualités en direct.")
    update_and_push()
    log("Fin de l'exécution.")
