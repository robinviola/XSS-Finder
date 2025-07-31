# Cyber HUD Widget (Minimal Black & White Optimized V2)

![Cyber HUD Preview](https://i.ibb.co/cSJjg2nN/Sans-titre-1.png)

## 🛡️ Overview

A Tampermonkey userscript that automatically analyzes the current web page's security features and displays a minimalist, real-time HUD on screen.

### ✅ What It Does:

- Checks if the page is served over HTTP (insecure).
- Detects the presence of password fields.
- Simulates XSS injection in input fields (non-destructive test).
- Monitors outgoing network requests and flags suspicious domains.
- Provides a re-analysis button for dynamic pages.

## 📦 Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) in your browser.
2. Create a new script and paste the contents of `cyber-hud-widget.js` into it.
3. Save and reload any web page to see the widget in action.

## ✨ Features

- Clean, monochrome interface
- Live reanalysis of the current DOM
- Instant feedback on potential vulnerabilities
- Zero dependencies

## 🔧 Tech Details

- Written in plain JavaScript
- No external libraries required
- Fully client-side and safe to use on any website

## 👨‍💻 Author

Created by [robinviola](https://github.com/robinviola)

---

**Note**: This widget is designed for educational and demonstration purposes.
