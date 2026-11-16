# Waste Disposal Game - Toronto Edition

A fun, educational game that teaches Toronto residents how to properly sort waste into the correct bins (Garbage, Recycling, Organics).

## 🎮 Play Now

Open `index.html` in your browser to play!

**[Click here to open the game](./index.html)**

Or host it online:
- Deploy to GitHub Pages, Vercel, or Netlify
- No build process needed - pure HTML/CSS/JS

## 📋 Game Features

- **10 waste items** to sort correctly
- **Score system**: +10 points for correct, -5 for wrong
- **Instant feedback** with educational explanations
- **Accuracy tracking** - see how well you know Toronto's waste rules
- **Toronto-specific rules** - based on actual City of Toronto guidelines

## 🎯 Game Mechanics

1. An item appears on screen
2. Choose which bin it belongs to: 🗑️ (Garbage) | ♻️ (Recycling) | 🌱 (Organics)
3. Get instant feedback on whether you're correct
4. Learn WHY items go in specific bins
5. Complete all 10 items and see your final score

## 📊 What You'll Learn

- **Garbage (Black Bin)**: Non-recyclables, styrofoam, greasy items
- **Recycling (Blue Bin)**: Paper, cardboard, cans, glass, clean plastics
- **Organics (Green Bin)**: Food scraps, yard waste, compostable items

## 🚀 Quick Start

### Local Development
```bash
# No installation needed!
# Just open index.html in your browser
open index.html

# Or with Python 3
python -m http.server 8000
# Visit http://localhost:8000
```

### Deploy to GitHub Pages
1. Push `index.html` and `README.md` to main branch
2. Go to Settings → Pages → Enable GitHub Pages
3. Set source to `main` branch
4. Your game is live at: `https://[username].github.io/waste_disposal_game/`

### Deploy to Vercel (Free)
```bash
npm install -g vercel
vercel
```

### Deploy to Netlify (Free)
- Drag and drop the folder to https://app.netlify.com

## 📝 Items Currently in Game

1. 🍌 Banana Peel → Green Bin
2. 🥫 Aluminum Can → Blue Bin (Recycling)
3. ☕ Styrofoam Cup → Garbage
4. 📦 Clean Pizza Box → Blue Bin
5. 🌾 Grass Clippings → Green Bin
6. 🍾 Glass Bottle → Blue Bin
7. 🛍️ Plastic Bag → Garbage
8. 🍎 Apple Core → Green Bin
9. 📰 Newspaper → Blue Bin
10. 🍕 Greasy Pizza Box → Garbage

## 🔧 Adding More Items

Edit the `items` array in `index.html` (around line 250):

```javascript
{
    id: 11,
    name: "Paper Towel",
    icon: "🧻",
    description: "Used paper towel",
    correctBin: "green",
    explanation: "Paper towels go in Green Bin for composting."
}
```

## 🎨 Customization

All styling is in the `<style>` tag. Easy to customize:

- **Colors**: Change the gradient colors
- **Fonts**: Modify font-family
- **Icons**: Replace emoji with your own images
- **Messages**: Edit the feedback text

## 📱 Responsive Design

Works great on:
- Desktop (Chrome, Firefox, Safari, Edge)
- Tablet (iPad, Android)
- Mobile (iPhone, Android phones)

## ⚡ Performance

- **Size**: ~20 KB (no dependencies)
- **Load time**: < 1 second
- **Offline**: Works completely offline after first load

## 🔗 Resources

- [Toronto Waste Wizard](https://www.toronto.ca/services-payments/recycling-organics-garbage/waste-wizard/) - Official source
- [Toronto Waste Guidelines](https://www.toronto.ca/services-payments/recycling-organics-garbage/)

## 📈 Next Steps

Future enhancements:
- [ ] Leaderboard system
- [ ] More items (50+)
- [ ] Difficulty levels
- [ ] Hazardous waste education
- [ ] Physical bin design mockups
- [ ] Signage for bins

## 📄 License

MIT - Feel free to use and modify!

## 👥 Team

[Add your team members here]

---

**Ready to demo?** Just open `index.html` in any web browser. No setup needed!
