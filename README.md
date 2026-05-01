# 🌡️ Urban Heat Island Analyser

Interactive thermal mapping & cooling model simulation for urban climate analysis.  

🔗 **Live Demo:** https://soul2209.github.io/UHI-revamped/

---

## 🤔 What is it?

The Urban Heat Island (UHI) Analyser is an interactive web tool that simulates how cities trap heat compared to rural areas — and models how different green cooling strategies can reduce urban temperatures.

It is built as an educational and analytical tool for understanding how urban planning decisions directly affect city-wide temperature distribution.

---

## ⚙️ Features

- 🗺️ **Interactive City Map** — Click on zones (Downtown, Industrial, Parks, Lakes, Residential, etc.) to inspect their thermal properties  
- 🌈 **Live Temperature Color Mapping** — Zones dynamically change color from cool blue → hot red based on real-time calculations  
- 📊 **6 Cooling Models** — Compare Linear, Exponential, Logarithmic, Power Law, Threshold, and Quadratic cooling strategies  
- 📈 **Cooling Model Curves Chart** — Visual SVG chart plotting all 6 models simultaneously with the active one highlighted  
- ⚖️ **Before / After Comparison Table** — View temperature differences across zones sorted by UHI intensity  
- 🎛️ **Adjustable Parameters** — Tune rural reference temperature, max UHI intensity, cooling coefficient, green cover, and urbanization factor  
- 🔄 **Animated Transitions** — Smooth animations on value changes and model switching  
- 📋 **Analysis Summary** — Average temperatures, UHI intensity, total cooling, and reference stats  

---

## 🌬️ Cooling Models

| Model        | Formula                              | Description |
|-------------|--------------------------------------|------------|
| Linear      | ΔT = c × g + f                       | Proportional cooling with green cover |
| Exponential | ΔT = c × (1 - e^(-3g)) + f           | Rapid initial gains, diminishing returns |
| Logarithmic | ΔT = c × ln(1 + 5g) + f              | Strong early effect, plateaus at high cover |
| Power Law   | ΔT = c × g^0.5 + f                   | Sub-linear relationship |
| Threshold   | ΔT = (conditional function)          | Minimal effect until critical threshold |
| Quadratic   | ΔT = c × g × (2 - g) + f             | Accelerating effect at higher cover |

---

## 🛠️ Tech Stack

### 🌐 Frontend
- HTML5 — structure of the web page  
- CSS3 — styling and layout  
- JavaScript (Vanilla JS) — logic, calculations, interactivity  

### 🎨 UI & Libraries
- Bootstrap (v5) — responsive layout & components  
- Chart.js — graphs for cooling model comparison  
- Google Fonts — custom typography (Syne, DM Sans)  

---

## 💭 How It Works

Each city zone has:

- **Urbanization Factor** — how built-up the area is (0–1)  
- **Green Cover** — vegetation percentage (0–1)  
- **Albedo** — surface reflectivity  

The base UHI intensity is calculated as:
ΔT = T_max × f_urban × (1 − g_cover) × (1 − α × 0.3)


Where:
- `T_max` = maximum reference temperature  
- `f_urban` = urbanization factor  
- `g_cover` = green cover fraction  
- `α` = albedo (reflectivity)  

The selected cooling model then adjusts the post-intervention temperature based on green cover and the cooling coefficient.

---

## 🚀 Deployment

- GitHub Pages — hosting the live website  

---

## 🧰 Tools

- Git — version control  
- GitHub — repository hosting  
