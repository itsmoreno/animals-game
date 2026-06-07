# 🐵 משחק החיות המעופפות / Animals Game

משחק בסגנון *Flappy Bird* בעברית: בוחרים חיה, עוזרים לה לעוף בין המכשולים ואוספים מטבעות.
לכל חיה עולם (theme) משלה ורמת קושי משלה.

A Hebrew, *Flappy Bird*–style game: pick an animal, fly between the obstacles and collect coins.
Each animal has its own themed world and difficulty level.

## 🎮 איך משחקים / How to play

- לחיצה על המסך / מקש רווח / חץ למעלה — מעיפים את החיה מעלה.
- אוספים מטבעות כדי לצבור ניקוד.
- נמנעים מפגיעה במכשולים, בקרקע ובתקרה.
- שיא הניקוד נשמר בנפרד לכל חיה (localStorage).

Click the screen / press Space / Arrow-Up to flap. Collect coins, avoid the
obstacles, the ground and the ceiling. A separate high score is kept per animal.

## 🐾 החיות / Animals

| חיה | עולם | קושי |
|-----|------|------|
| קוף | ג'ונגל | קל |
| פינגווין | קוטב | בינוני |
| אריה | סוואנה | קשה |
| ציפור | יער / לילה | קשה מאוד |

## 🚀 הרצה מקומית / Run locally

זהו אתר סטטי — אין צורך בהתקנות. פותחים את `index.html` בדפדפן, או מריצים שרת מקומי:

```bash
# Python
python -m http.server 8000
# then open http://localhost:8000
```

## 🌐 פרסום ב-GitHub Pages / Deploy

The project is a static site, so it can be hosted for free on **GitHub Pages**:

1. Push this repository to `https://github.com/itsmoreno/animals-game`.
2. In the repo: **Settings → Pages → Build and deployment**.
3. Source: **Deploy from a branch**, branch: `main`, folder: `/ (root)`.
4. The site will be live at `https://itsmoreno.github.io/animals-game/`.

## 📁 מבנה הפרויקט / Structure

```
index.html     # מבנה הדף — מסך מידע, התחברות, לובי ומסך המשחק
style.css      # עיצוב, עולמות (themes) ואנימציות
script.js      # לוגיקת המשחק
assets/        # תמונות וסאונדים
```

## 🔑 סיסמה / Password

כניסה למשחק דרך מסך ההתחברות. ניתן לשנות את הסיסמה ב-`script.js` (`GAME_PASSWORD`).
