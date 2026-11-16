"""Question bank, archetype scoring map and matching weights (single source of truth)."""
import re

SECTIONS = [
    {"id": "everyday", "title": "Your everyday"},
    {"id": "pop", "title": "Pop culture brain"},
    {"id": "out", "title": "Out and about"},
    {"id": "work", "title": "At work"},
    {"id": "you", "title": "Very you"},
]

# Tags: C = Calm (Soft-Landing), S = Spark (Side-Quest), R = Curious (Rabbit-Hole), G = Social (Group-Chat)
# Option tuple: (label, emoji, tags, share-phrase used after "You both ..." for single-select matches)
# group: interest | lifestyle | collab ; weight scales within the group (low-weight signals < 1)
RAW = [
    ("weather", "everyday", "What kind of weather makes you happiest?", True, "lifestyle", 0.6, "feel happiest when it's {x}", [
        ("Rainy and cozy", "🌧️", "C", None), ("Sunny and breezy", "🌤️", "S", None),
        ("Cloudy and cool", "☁️", "R", None), ("A proper hot day", "🔥", "S", None)]),
    ("area", "everyday", "Which part of Mumbai are you based in?", False, "lifestyle", 0.3, None, [
        ("South Mumbai", "🌊", "", "are both based in South Mumbai"),
        ("Central Mumbai (Dadar, Parel, Matunga, Sion)", "🚉", "", "are both Central Mumbai people"),
        ("Western suburbs", "🌇", "", "are both from the Western suburbs"),
        ("Eastern suburbs", "🌄", "", "are both from the Eastern suburbs"),
        ("Thane", "🏞️", "", "are both Thane-based"), ("Navi Mumbai", "🌉", "", "are both in Navi Mumbai"),
        ("Elsewhere (write your city and area)", "📍", "", None)]),
    ("food", "everyday", "What food are you always up for?", True, "interest", 1.0, "are always up for {x}", [
        ("Italian", "🍝", "C", None), ("Street food", "🌮", "S", None), ("Japanese", "🍣", "R", None),
        ("South Indian", "🥥", "C", None), ("North Indian", "🍛", "G", None), ("Chinese", "🥡", "G", None),
        ("Thai", "🌶️", "R", None), ("Mexican", "🌯", "S", None), ("Lebanese", "🧆", "R", None)]),
    ("dessert", "everyday", "Your fav dessert", False, "interest", 0.8, None, [
        ("Ice-creams & Gelatos", "🍨", "S", "would both pick ice-cream for dessert"),
        ("Brownies & Cookies", "🍪", "C", "are both brownie & cookie people"),
        ("Cakes & Cheesecakes", "🍰", "G", "are both team cheesecake"),
        ("Waffles & Pancakes", "🧇", "C", "both love a waffle moment"),
        ("Donuts", "🍩", "S", "are both donut loyalists"),
        ("Pastries & Croissants", "🥐", "R", "both have a thing for croissants"),
        ("Puddings & Mousse", "🍮", "C", "are both pudding people")]),
    ("evening", "everyday", "Your ideal free evening looks like…", True, "lifestyle", 1.0, "love an evening that's {x}", [
        ("Home, comfort clothes, no plans", "🛋️", "C", None), ("Watch a show or film", "📺", "C", None),
        ("Go to the gym or a workout class", "🏋️", "S", None), ("Try a new restaurant", "🍽️", "S", None),
        ("Meet friends for a meal", "🥘", "G", None), ("A live comedy show or performance", "🎤", "G", None),
        ("Read, game or make something", "🎮", "R", None), ("Play a sport", "🏸", "S", None)]),
    ("hobbies", "everyday", "What do you actually enjoy doing outside work?", True, "interest", 1.0, "are into {x}", [
        ("Gym or workouts", "💪", "S", None), ("A sport", "⚽", "S", None), ("Walking", "🚶", "C", None),
        ("Yoga or dance", "🧘", "C", None), ("Reading", "📚", "R", None), ("Gaming", "🕹️", "R", None),
        ("Cooking or baking", "🧁", "C", None), ("Watching shows or films", "🍿", "C", None),
        ("Live music or comedy", "🎶", "G", None), ("Making things / a creative hobby", "✂️", "R", None),
        ("Trying restaurants", "🍜", "S", None), ("Something else (write it in)", "✏️", "", None)]),
    ("weekend", "everyday", "What would you be up for on a weekend?", True, "lifestyle", 1.0, "are up for {x} on weekends", [
        ("A slow morning", "☕", "C", None), ("Brunch or a long lunch", "🥞", "G", None),
        ("A new food spot", "📍", "S", None), ("A gig, match or show", "🎟️", "G", None),
        ("Gym, class or sport", "🏃", "S", None), ("A day trip", "🚗", "S", None),
        ("Seeing friends or family", "👯", "G", None), ("A quiet day at home", "🏠", "C", None),
        ("A hobby or side project", "🧩", "R", None)]),
    ("plan", "everyday", "When someone suggests a plan, your first thought is…", False, "lifestyle", 0.8, None, [
        ("What time and where?", "🗓️", "C", "both lock in the time and place first"),
        ("Who else is coming?", "👀", "G", "both ask who else is coming"),
        ("Could we do something new?", "✨", "S", "both want to try something new"),
        ("Can I decide closer to the day?", "🤷", "R", "both like to decide closer to the day")]),
    ("anime", "pop", "Anime: where do you stand?", False, "interest", 1.0, None, [
        ("I love it; send recommendations", "🍥", "R", "are both anime lovers"),
        ("I'm open to a good first show", "🌸", "S", "are both anime-curious"),
        ("I've seen a few and liked them", "⛩️", "C", "have both dipped into anime"),
        ("Not really my thing", "🙅", "", None)]),
    ("shows", "pop", "Which of these shows have you watched?", True, "interest", 1.2, "have both watched {x}", [
        ("Friends", "☕", "G", None), ("The Office (US)", "📎", "G", None), ("Brooklyn Nine-Nine", "🚓", "S", None),
        ("Modern Family", "🏡", "C", None), ("The Big Bang Theory", "🔬", "R", None), ("Stranger Things", "🧇", "R", None),
        ("Best of luck Nikki", "🎒", "C", None), ("Sarabhai vs Sarabhai", "🎭", "G", None), ("The Family Man", "🕵️", "R", None),
        ("Made in Heaven", "💍", "R", None), ("The Suite Life of Karan & Kabir", "🏨", "S", None), ("Shararat", "🪄", "C", None),
        ("How I met your mother", "🍸", "G", None), ("How to lose a guy in 10 days", "💔", "C", None),
        ("Game of Thrones", "🐉", "R", None), ("Vampire Diaries", "🧛", "S", None), ("Gossip Girl", "💋", "G", None),
        ("Money Heist", "🎭", "S", None), ("Gilmore Girls", "☕", "C", None)]),
    ("bollywood", "pop", "Bollywood, for you, is…", False, "interest", 1.0, None, [
        ("I love it; always have time for a Bollywood film", "🎬", "G", "both always have time for a Bollywood film"),
        ("I like the big, fun ones", "💃", "S", "both love the big, fun Bollywood ones"),
        ("I mostly watch older Bollywood", "📼", "R", "are both into older Bollywood"),
        ("I watch it now and then", "🍿", "C", "watch Bollywood now and then"),
        ("I could happily never watch Bollywood", "🙈", "", "could both happily skip Bollywood")]),
    ("rewatch", "pop", "Your comfort rewatch is…", True, "interest", 0.9, "comfort-rewatch {x}", [
        ("A sitcom", "😂", "C", None), ("A Bollywood favourite", "🎞️", "G", None),
        ("A crime or mystery show", "🔍", "R", None), ("Reality, food or travel TV", "✈️", "S", None),
        ("A fantasy or sci-fi series", "🪐", "R", None), ("A comfort film", "🧸", "C", None),
        ("An animated show", "🐭", "S", None)]),
    ("music", "pop", "What kind of music do you actually listen to?", True, "interest", 1.0, "listen to {x}", [
        ("Bollywood songs", "🎵", "G", None), ("Indie Hindi", "🎸", "R", None), ("Punjabi", "🥁", "S", None),
        ("Old Hindi classics", "📻", "C", None), ("English Songs", "🎧", "C", None), ("K-pop", "💜", "S", None)]),
    ("insta", "pop", "On Instagram, what do you actually watch?", True, "interest", 0.6, "mostly watch {x} on Instagram", [
        ("Reels", "🎞️", "S", None), ("Carousels", "🖼️", "R", None), ("Stories", "⭕", "G", None),
        ("I tap through everything", "👆", "G", None), ("I barely use Instagram", "📵", "C", None)]),
    ("creators", "pop", "Which creators do you usually follow?", False, "interest", 0.6, None, [
        ("Mostly Indian creators", "🇮🇳", "G", "both mostly follow Indian creators"),
        ("Mostly international creators", "🌍", "R", "both mostly follow international creators"),
        ("A mix of both", "🔀", "S", "follow a mix of Indian and international creators"),
        ("I don't really follow creators", "🫥", "C", None)]),
    ("save", "pop", "What makes you stop scrolling or hit save?", True, "interest", 1.0, "stop scrolling for {x}", [
        ("Restaurant or café recommendations", "☕", "S", None), ("Memes", "😹", "G", None),
        ("Celebrity or pop-culture updates", "🌟", "G", None), ("Design, ads or campaign breakdowns", "🎨", "R", None),
        ("Fashion or beauty", "💄", "S", None), ("Travel ideas", "🗺️", "S", None), ("Food videos", "🍳", "C", None),
        ("Useful explainers", "💡", "R", None), ("Pets", "🐶", "C", None)]),
    ("meme", "pop", "If you had to describe yourself as a meme, which one would you pick?", False, "interest", 0.8, None, [
        ("Jethalal's \"Hai?\" face", "😳", "R", "are both a Jethalal \"Hai?\" face"),
        ("Babu Rao's \"Utha le re baba\"", "🙏", "C", "are both Babu Rao energy"),
        ("\"Pawri ho rahi hai\"", "🥳", "G", "are both \"pawri ho rahi hai\""),
        ("\"So beautiful, so elegant\"", "💅", "S", "are both \"so beautiful, so elegant\""),
        ("Moye Moye", "🎶", "G", "both picked Moye Moye"),
        ("Distracted boyfriend", "👀", "S", "are both the distracted boyfriend"),
        ("Woman yelling at cat", "🐱", "R", "are both woman-yelling-at-cat"),
        ("Drake approves / disapproves", "🙅‍♂️", "C", "both picked Drake approves")]),
    ("hangout", "out", "Where do you usually like to hang out?", True, "lifestyle", 1.0, "like hanging out at {x}", [
        ("The newest café or restaurant in town", "☕", "S", None),
        ("By the sea: Worli Seaface or Nariman Point", "🌊", "C", None),
        ("A live comedy show", "🎤", "G", None), ("A performance or exhibition at NMACC", "🎭", "R", None),
        ("A bookshop", "📖", "R", None), ("At home", "🏠", "C", None), ("Somewhere else (write it in)", "✏️", "", None)]),
    ("catchup", "out", "Your ideal catch-up is…", False, "lifestyle", 1.0, None, [
        ("Coffee and a long conversation", "☕", "R", "both love coffee and a long conversation"),
        ("A meal with a lot of sharing", "🥟", "G", "both love a meal with lots of sharing"),
        ("A walk and an easy chat", "🚶", "C", "both like a walk and an easy chat"),
        ("An activity so there's always something to talk about", "🎳", "S", "both like catch-ups with an activity")]),
    ("newspot", "out", "A new restaurant opens. You…", False, "lifestyle", 0.8, None, [
        ("Save it and suggest a date", "📌", "G", "both save new spots and suggest a date"),
        ("Read the menu first", "📜", "C", "both read the menu first"),
        ("Check the reviews before deciding", "⭐", "R", "both check reviews before a new spot"),
        ("Go this week; I want to see for myself", "🏃", "S", "both rush to new restaurants")]),
    ("outing", "out", "Pick a team outing you would actually be excited for.", False, "lifestyle", 1.0, None, [
        ("Escape room or pub quiz", "🧠", "R", "would both pick an escape room or pub quiz"),
        ("Bowling, arcade or something silly", "🎳", "S", "would both pick bowling or the arcade"),
        ("A meal and time to talk", "🍲", "G", "would both pick a meal and time to talk"),
        ("A workshop where we make something", "🏺", "C", "would both pick a make-something workshop")]),
    ("invite", "out", "Someone invites you to try a new place or activity. You…", False, "lifestyle", 0.8, None, [
        ("Yes—when are we going?", "🙋", "S", "say yes to new plans instantly"),
        ("Tell me what to expect first", "🧐", "C", "like to know what to expect first"),
        ("Send me the link; I'm checking Google reviews", "🔗", "R", "both check Google reviews first"),
        ("I'm in if someone comes with me", "🤝", "G", "are in if someone comes along")]),
    ("brainstorm", "work", "In a brainstorm, you usually…", False, "collab", 1.0, None, [
        ("Say the first thought out loud", "💥", "S", "both say the first thought out loud in brainstorms"),
        ("Listen, then connect the dots", "🧵", "R", "both listen, then connect the dots"),
        ("Make sure everyone gets a turn", "🎙️", "G", "both make sure everyone gets a turn"),
        ("Bring us back to the brief", "🧭", "C", "both bring the room back to the brief")]),
    ("project", "work", "In a group project, you tend to bring…", False, "collab", 1.0, None, [
        ("A plan and a checklist", "✅", "C", "both bring a plan and a checklist"),
        ("Good energy and people skills", "🌈", "G", "both bring the good energy"),
        ("The question no one has asked yet", "❓", "R", "both ask the question no one has asked yet"),
        ("Momentum: I'll start the first draft", "🚀", "S", "both have first-draft energy")]),
    ("phone", "you", "Phone loyalty: iPhone or Android?", False, "lifestyle", 0.3, None, [
        ("iPhone. I have my reasons.", "🍏", "C", "are both team iPhone"),
        ("Android. Let me customise in peace.", "🤖", "R", "are both team Android"),
        ("Whichever works for me", "📱", "S", None),
        ("I have a prepared argument", "📢", "G", "both have a prepared phone argument")]),
    ("hill", "you", "Pick a tiny hill you'll happily defend.", False, "interest", 0.7, None, [
        ("Voice notes need a time limit", "🎙️", "C", "both think voice notes need a time limit"),
        ("Subtitles are always on", "💬", "R", "both keep subtitles always on"),
        ("The best seat is worth arriving early for", "💺", "S", "both arrive early for the best seat"),
        ("Sharing fries requires asking first", "🍟", "G", "both think sharing fries requires asking first")]),
    ("seat", "you", "You're in the middle seat on a flight. Which pair would you choose to sit between?", False, "interest", 0.6, None, [
        ("Jennifer Aniston and Brad Pitt", "✈️", "G", "would both sit between Jen and Brad"),
        ("Kangana Ranaut and Hrithik Roshan", "🍿", "S", "would both sit between Kangana and Hrithik"),
        ("Kareena Kapoor and Shahid Kapoor", "🚂", "C", "picked the Jab We Met seat"),
        ("Salman khan and Aishwarya Rai", "🎬", "R", "would both sit between Salman and Aishwarya"),
        ("Karan Johar and Kangana Ranaut", "☕", "S", "picked the Koffee with Karan seat"),
        ("Selena Gomez & Justin Bieber", "🎤", "G", "would both sit between Selena and Justin"),
        ("Johnny Depp & Amber Heard", "⚖️", "R", "picked the courtroom-drama seat")]),
    ("camera", "you", "What takes up the most space in your camera roll?", True, "interest", 0.8, "have camera rolls full of {x}", [
        ("Screenshots I meant to come back to", "📸", "R", None), ("Food photos", "🍕", "S", None),
        ("Friends and family", "👨‍👩‍👧", "G", None), ("Pets", "🐾", "C", None), ("Travel / places", "🏝️", "S", None),
        ("Memes", "🤣", "G", None), ("Work in progress", "🖌️", "R", None),
        ("Random photos with no explanation", "❔", "S", None)]),
]

WRITE_IN_LABELS = {"Elsewhere (write your city and area)", "Something else (write it in)", "Somewhere else (write it in)"}
OPTION_IMAGES = {"meme_0": "/memes/jethalal.jpg", "meme_1": "/memes/baburao.jpg", "meme_2": "/memes/pawri.jpg",
                 "meme_4": "/memes/moye.jpg", "meme_5": "/memes/distracted.jpg", "meme_6": "/memes/yelling.jpg",
                 "meme_7": "/memes/drake.jpg"}
FOLLOWUPS = {"food": {"prompt": "Got a go-to lunch spot near office? (optional)", "placeholder": "e.g. that tiny dosa place", "max": 60}}


def build_questions():
    out = []
    for order, (qid, section, prompt, multi, group, weight, phrase, opts) in enumerate(RAW, start=1):
        options = []
        for i, (label, emoji, tags, share) in enumerate(opts):
            options.append({
                "id": f"{qid}_{i}", "label": label, "emoji": emoji, "tags": list(tags),
                "share": share, "write_in": label in WRITE_IN_LABELS, "image": OPTION_IMAGES.get(f"{qid}_{i}"),
            })
        out.append({
            "id": qid, "order": order, "section": section, "prompt": prompt, "multi": multi,
            "group": group, "weight": weight, "phrase": phrase, "options": options,
            "followup": FOLLOWUPS.get(qid), "active": True,
        })
    return out


ARCHETYPES = {
    "C": {"id": "soft_landing", "name": "The Soft-Landing Specialist",
          "tagline": "Steady plans, comfort rituals, calm communication",
          "description": "You're the human equivalent of a weighted blanket. Plans with you have a time, a place and a backup snack, and the group chat gets calmer the moment you type.",
          "traits": ["Comfort-plan curator", "Calm in the group chat", "Good listener"]},
    "S": {"id": "side_quest", "name": "The Side-Quest Starter",
          "tagline": "Trying new things, momentum, spontaneity",
          "description": "A five-minute chai break with you somehow becomes a new café, a gig and a plan for Saturday. You start things, and people are glad you did.",
          "traits": ["First-draft energy", "Up for a new thing", "Momentum maker"]},
    "R": {"id": "rabbit_hole", "name": "The Rabbit-Hole Researcher",
          "tagline": "Curiosity, detail, fandom and niche interests",
          "description": "Ask you one small question and you'll return with lore, context and three tabs you insist we read. Your camera roll is 40% screenshots for later, and that's a lifestyle.",
          "traits": ["Lore keeper", "Question asker", "Niche-interest expert"]},
    "G": {"id": "group_chat", "name": "The Group-Chat Glue",
          "tagline": "Warmth, inclusion, shared plans and conversation",
          "description": "You remember who's coming, who's vegetarian and who needs a ride. Without you, the group chat is just a list of names; with you, it's a plan.",
          "traits": ["Plan connector", "Warm energy", "Snack-aware"]},
}
BLENDED = {"id": "multitudes", "name": "You Contain Multitudes",
           "tagline": "A little bit of everything, and that's the point",
           "description": "Your answers refused to pick a lane, so we didn't force one. You're a mix, which makes you easy to click with.",
           "traits": []}

GROUP_WEIGHTS = {"interest": 0.5, "lifestyle": 0.3, "collab": 0.2}
ARCHETYPE_GROUP_FACTOR = {"interest": 1.0, "lifestyle": 1.0, "collab": 0.5}


def compute_archetype(questions, answers):
    scores = {"C": 0.0, "S": 0.0, "R": 0.0, "G": 0.0}
    for q in questions:
        sel = set((answers.get(q["id"]) or {}).get("selected") or [])
        if not sel:
            continue
        factor = ARCHETYPE_GROUP_FACTOR[q["group"]] / max(1, len(sel)) ** 0.5
        for o in q["options"]:
            if o["id"] in sel:
                for t in o["tags"]:
                    scores[t] += factor
    ranked = sorted(scores.items(), key=lambda kv: (-kv[1], "CSRG".index(kv[0])))
    top, second = ranked[0], ranked[1]
    if top[1] == 0:
        return {**BLENDED, "blend": [], "scores": scores, "blended": True}
    if abs(top[1] - second[1]) < 0.05:
        a, b = ARCHETYPES[top[0]], ARCHETYPES[second[0]]
        return {**BLENDED, "traits": [a["traits"][0], b["traits"][0], a["traits"][2]],
                "blend": [a["name"], b["name"]], "scores": scores, "blended": True}
    return {**ARCHETYPES[top[0]], "blend": [], "scores": scores, "blended": False}


def _join(items):
    return " & ".join(items[:2])


def compare(questions, a_answers, b_answers):
    """Returns (score 0..1, components, commonality phrases ordered by strength)."""
    totals = {g: [0.0, 0.0] for g in GROUP_WEIGHTS}
    commons = []
    for q in questions:
        a = set((a_answers.get(q["id"]) or {}).get("selected") or [])
        b = set((b_answers.get(q["id"]) or {}).get("selected") or [])
        if not a or not b:
            continue
        shared = a & b
        sim = len(shared) / len(a | b)
        totals[q["group"]][0] += sim * q["weight"]
        totals[q["group"]][1] += q["weight"]
        if not shared:
            continue
        opts = [o for o in q["options"] if o["id"] in shared and not o["write_in"]]
        if q["multi"] and q["phrase"] and opts:
            text = q["phrase"].replace("{x}", _join([o["label"] for o in opts]))
            commons.append((sim * q["weight"] * GROUP_WEIGHTS[q["group"]], text))
        elif not q["multi"] and opts and opts[0]["share"]:
            commons.append((0.5 * q["weight"] * GROUP_WEIGHTS[q["group"]], opts[0]["share"]))
    commons = [(w, re.sub(r"^both ", "", re.sub(r"^(are|have|would|could) both ", r"\1 ", t))) for w, t in commons]
    comps = {g: (v[0] / v[1] if v[1] else 0.0) for g, v in totals.items()}
    score = sum(comps[g] * w for g, w in GROUP_WEIGHTS.items())
    commons.sort(key=lambda c: -c[0])
    return score, comps, [c[1] for c in commons]
