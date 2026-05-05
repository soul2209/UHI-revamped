// ── ZONE DEFINITIONS ─────────────────────────────────────────────────────────
const zones = [
  { label: "Residential NW", icon: "🏠", urban: 0.5, green: 0.4 },
  { label: "Central Park",   icon: "🌳", urban: 0.2, green: 0.9 },
  { label: "Commercial",     icon: "🏢", urban: 0.7, green: 0.3 },
  { label: "Industrial",     icon: "🏭", urban: 0.9, green: 0.2 },
  { label: "Residential SE", icon: "🏠", urban: 0.5, green: 0.5 },
  { label: "Urban Lake",     icon: "💧", urban: 0.3, green: 0.8 },
  { label: "Suburban Edge",  icon: "🌾", urban: 0.4, green: 0.7 }
];

const modelColors = ["#3b82f6","#06b6d4","#ef4444","#f59e0b","#ec4899","#a78bfa"];
const modelNames  = ["Linear","Exponential","Logarithmic","Power","Threshold","Quadratic"];
const modelDash   = [[], [6,3], [3,4], [10,3], [4,2,1,2], [8,2,2,2]];

let chart;

// ── COLOUR HELPERS ────────────────────────────────────────────────────────────
// FIX #3 & #9: fg is always a hex value — never rgba — so the old
// fg.replace("1)","0.4)") approach silently did nothing.
// Now we return structured objects so callers can use the right value.

function getZoneColors(temp, label) {
  // FIX #7: unified threshold — both SVG and card now use >32 for "hot"
  const isHot  = label === "Industrial" || temp > 32;
  const isWarm = !isHot && temp > 28;

  if (isHot)  return { bg: "rgba(239,68,68,0.25)",   border: "rgba(239,68,68,0.4)",   fg: "#fca5a5", svgFill: "rgba(239,68,68,0.45)",   label: "Hot"  };
  if (isWarm) return { bg: "rgba(245,158,11,0.25)",  border: "rgba(245,158,11,0.4)",  fg: "#fcd34d", svgFill: "rgba(245,158,11,0.45)",  label: "Warm" };
  return        { bg: "rgba(34,211,238,0.2)",         border: "rgba(34,211,238,0.35)", fg: "#67e8f9", svgFill: "rgba(34,211,238,0.25)",  label: "Cool" };
}

// Keep individual helpers for backward compat inside calculate()
function getZoneBg(temp, label)        { return getZoneColors(temp, label).bg; }
function getZoneFg(temp, label)        { return getZoneColors(temp, label).fg; }
function getZoneHeatLabel(temp, label) { return getZoneColors(temp, label).label; }

// ── SLIDER LABELS ─────────────────────────────────────────────────────────────
function updateLabels() {
  document.getElementById("urbanVal").innerText = Math.round(parseFloat(document.getElementById("urban").value) * 100) + "%";
  document.getElementById("greenVal").innerText = Math.round(parseFloat(document.getElementById("green").value) * 100) + "%";
}

function updateTmax() {
  document.getElementById("tmaxVal").innerText = document.getElementById("tmax").value + "°C";
}

function showModelInfo() {
  const descriptions = {
    "Linear":      "Cooling increases proportionally with green cover",
    "Exponential": "Fast initial cooling that gradually slows down",
    "Logarithmic": "Strong early effect, then plateaus at higher cover",
    "Power":       "Gradual and diminishing returns over time",
    "Threshold":   "No cooling below 40% green — then kicks in sharply",
    "Quadratic":   "Accelerating cooling at higher green cover levels"
  };
  document.getElementById("modelInfo").innerText = descriptions[document.getElementById("model").value];
}

// ── COOLING MODEL FUNCTIONS ───────────────────────────────────────────────────
function coolingLinear(g)      { return g; }
function coolingExponential(g) { return 1 - Math.exp(-3 * g); }
function coolingLogarithmic(g) { return Math.log(1 + 5 * g) / Math.log(6); }
function coolingPower(g)       { return Math.sqrt(g); }
function coolingThreshold(g)   { return g > 0.4 ? (g - 0.4) / 0.6 : 0; }
function coolingQuadratic(g)   { return g * (2 - g); }

const modelFunctions = {
  "Linear":      coolingLinear,
  "Exponential": coolingExponential,
  "Logarithmic": coolingLogarithmic,
  "Power":       coolingPower,
  "Threshold":   coolingThreshold,
  "Quadratic":   coolingQuadratic
};

// ── ZONE GRID ─────────────────────────────────────────────────────────────────
function buildZoneGrid() {
  const grid = document.getElementById("zoneGrid");
  let html = "";
  zones.forEach(function(zone, index) {
    html += `
      <div class="col">
        <div class="zone-box" id="zone${index}" style="background:rgba(255,255,255,0.04); border:1px solid var(--border);">
          <div class="zone-icon">${zone.icon}</div>
          <div class="zone-name" id="zname${index}" style="color:var(--muted);">${zone.label}</div>
          <div class="zone-temp" id="ztemp${index}" style="color:var(--text);">--°C</div>
          <div class="zone-label" id="zlabel${index}" style="color:var(--muted);">--</div>
        </div>
      </div>`;
  });
  html += `
    <div class="col">
      <div class="uhi-tile d-flex flex-column justify-content-center" style="height:100%;">
        <div style="font-size:10px; text-transform:uppercase; letter-spacing:0.07em; color:var(--muted); margin-bottom:4px;">UHI Intensity</div>
        <div id="uhiGrid" style="font-size:24px; font-weight:800; font-family:'Syne',sans-serif; color:var(--accent);">--°C</div>
        <div style="font-size:10px; color:var(--muted); margin-top:4px;">max − min</div>
      </div>
    </div>`;
  grid.innerHTML = html;
}

// ── MAIN CALCULATE ────────────────────────────────────────────────────────────
function calculate() {
  const Tmax          = parseFloat(document.getElementById("tmax").value);
  const fn            = modelFunctions[document.getElementById("model").value];
  const T_ambient     = Math.max(Tmax * 0.72, 22);
  const maxHeatExcess = Tmax - T_ambient;
  const coolingRange  = maxHeatExcess * 0.60;
  const temps         = [];

  const urbanSlider = parseFloat(document.getElementById("urban").value);
  const greenSlider = parseFloat(document.getElementById("green").value);

  zones.forEach(function(zone, i) {
    const effectiveUrban = (zone.urban + urbanSlider) / 2;
    const effectiveGreen = (zone.green + greenSlider) / 2;
    const heatExcess     = maxHeatExcess * effectiveUrban * (1 - effectiveGreen * 0.7);
    const cooling        = fn(effectiveGreen) * coolingRange;
    const finalTemp      = parseFloat(Math.max(T_ambient + heatExcess - cooling, T_ambient).toFixed(1));
    temps.push(finalTemp);

    // FIX #9: use structured color object — border now correctly uses rgba string
    const colors = getZoneColors(finalTemp, zone.label);

    document.getElementById("zone"   + i).style.background  = colors.bg;
    document.getElementById("zone"   + i).style.borderColor = colors.border;
    document.getElementById("ztemp"  + i).innerText         = finalTemp + "°C";
    document.getElementById("ztemp"  + i).style.color       = colors.fg;
    document.getElementById("zlabel" + i).innerText         = colors.label;
    document.getElementById("zlabel" + i).style.color       = colors.fg;

    const svgRect = document.getElementById("svg-zone-" + i);
    const svgText = document.getElementById("svg-t-" + i);
    if (svgRect) {
      // FIX #7: SVG now also uses >32 threshold — matches card colours
      svgRect.setAttribute("fill", colors.svgFill);
      svgRect.style.transition = "fill 0.4s ease";
    }
    if (svgText) svgText.textContent = finalTemp + "°C";
  });

  const minT = Math.min(...temps);
  const maxT = Math.max(...temps);
  const avgT = parseFloat((temps.reduce((s, t) => s + t, 0) / temps.length).toFixed(1));
  const uhi  = parseFloat((maxT - minT).toFixed(1));

  document.getElementById("minTemp").innerText = minT + "°C";
  document.getElementById("avgTemp").innerText = avgT + "°C";
  document.getElementById("maxTemp").innerText = maxT + "°C";
  document.getElementById("uhiVal").innerText  = uhi  + "°C";
  document.getElementById("uhiGrid").innerText = uhi  + "°C";

  const svgUhiVal = document.getElementById("svg-uhi-val");
  if (svgUhiVal) svgUhiVal.textContent = uhi + "°C";

  // LIVE CALCULATION BREAKDOWN
  document.getElementById("calc-ambient-working").innerText  = `= max(${Tmax} × 0.72, 22) = max(${(Tmax * 0.72).toFixed(1)}, 22)`;
  document.getElementById("calc-ambient").innerText          = T_ambient.toFixed(1) + "°C";
  document.getElementById("calc-heat-working").innerText     = `= ${Tmax} − ${T_ambient.toFixed(1)}`;
  document.getElementById("calc-heat").innerText             = maxHeatExcess.toFixed(1) + "°C";
  document.getElementById("calc-cooling-working").innerText  = `= ${maxHeatExcess.toFixed(1)} × 0.60`;
  document.getElementById("calc-cooling").innerText          = coolingRange.toFixed(1) + "°C";

  // FIX #10: removed stray whitespace between <br> and <strong> in template literal
  document.getElementById("calc-zone-breakdown").innerHTML = zones.map(function(zone, i) {
    const effectiveUrban = (zone.urban + urbanSlider) / 2;
    const effectiveGreen = (zone.green + greenSlider) / 2;
    const heatExcess     = maxHeatExcess * effectiveUrban * (1 - effectiveGreen * 0.7);
    const cooling        = fn(effectiveGreen) * coolingRange;
    const finalTemp      = parseFloat(Math.max(T_ambient + heatExcess - cooling, T_ambient).toFixed(1));
    const colors         = getZoneColors(finalTemp, zone.label);
    return `<div style="background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:8px; padding:8px 12px; min-width:160px; flex:1;">
      <div style="font-size:11px; font-weight:600; color:${colors.fg}; margin-bottom:4px;">${zone.icon} ${zone.label}</div>
      <div style="font-family:'Courier New',monospace; font-size:10px; color:#64748b; line-height:1.7;">
        Heat = ${maxHeatExcess.toFixed(1)} × ${effectiveUrban.toFixed(2)} × (1−${effectiveGreen.toFixed(2)}×0.7) = <span style="color:#f59e0b;">${heatExcess.toFixed(1)}°C</span><br><strong style="color:${colors.fg};">T = ${T_ambient.toFixed(1)} + ${heatExcess.toFixed(1)} − ${cooling.toFixed(1)} = ${finalTemp}°C</strong>
      </div>
    </div>`;
  }).join("");

  // GLOBAL BEFORE / AFTER SCENARIOS
  const scenarios = [
    { label: "Before",     desc: "High density, minimal greenery",  urban: 0.9, green: 0.1, icon: "🏭" },
    { label: "After",      desc: "Planned green corridors added",   urban: 0.9, green: 0.5, icon: "🌿" },
    { label: "Green City", desc: "Low density, abundant greenery",  urban: 0.3, green: 0.8, icon: "🌳" }
  ];

  const scenarioTemps = scenarios.map(function(s) {
    const heat    = maxHeatExcess * s.urban * (1 - s.green * 0.7);
    const cooling = fn(s.green) * coolingRange;
    return parseFloat(Math.max(T_ambient + heat - cooling, T_ambient).toFixed(1));
  });

  const baColors = ["rgba(239,68,68,0.15)","rgba(245,158,11,0.15)","rgba(34,211,238,0.15)"];
  const baFg     = ["#fca5a5","#fcd34d","#67e8f9"];
  const baBorder = ["rgba(239,68,68,0.4)","rgba(245,158,11,0.4)","rgba(34,211,238,0.4)"];

  document.getElementById("beforeAfterGrid").innerHTML = scenarios.map(function(s, i) {
    return `
      <div class="col-md-4">
        <div style="background:${baColors[i]}; border:1px solid ${baBorder[i]}; border-radius:10px; padding:16px; text-align:center;">
          <div style="font-size:22px; margin-bottom:4px;">${s.icon}</div>
          <div style="font-size:11px; font-weight:600; letter-spacing:0.06em; color:${baFg[i]}; margin-bottom:2px;">${s.label.toUpperCase()}</div>
          <div style="font-size:11px; color:var(--muted); margin-bottom:10px;">${s.desc}</div>
          <div style="font-size:28px; font-weight:800; color:${baFg[i]};">${scenarioTemps[i]}°C</div>
          <div style="font-size:10px; color:var(--muted); margin-top:4px;">Urban ${Math.round(s.urban * 100)}% · Green ${Math.round(s.green * 100)}%</div>
        </div>
      </div>`;
  }).join("");

  const saved   = parseFloat((scenarioTemps[0] - scenarioTemps[2]).toFixed(1));
  const mid     = parseFloat((scenarioTemps[0] - scenarioTemps[1]).toFixed(1));
  const summary = document.getElementById("beforeAfterSummary");
  summary.style.display = "block";
  summary.innerHTML = `<span style="color:var(--text);">
    Adding green corridors (Before → After) reduces temperature by <strong style="color:#fcd34d;">${mid}°C</strong>.
    A full green city transformation saves <strong style="color:#67e8f9;">${saved}°C</strong> compared to the unplanned scenario.
    This demonstrates the UHI mitigation potential of urban greening.
  </span>`;

  drawChart();
}

// ── CHART ─────────────────────────────────────────────────────────────────────
function drawChart() {
  const labels   = Array.from({length: 11}, (_, i) => i * 10 + "%");
  const datasets = modelNames.map(function(name, i) {
    return {
      label:            name,
      data:             Array.from({length: 11}, (_, s) => parseFloat((modelFunctions[name](s / 10) * 10).toFixed(2))),
      borderColor:      modelColors[i],
      backgroundColor:  "transparent",
      borderWidth:      2.5,
      borderDash:       modelDash[i],
      pointRadius:      0,
      pointHoverRadius: 5,
      tension:          0.35
    };
  });

  document.getElementById("chartLegend").innerHTML = modelNames.map(function(name, i) {
    return `<span style="display:flex; align-items:center; gap:5px;">
      <span class="legend-dot" style="background:${modelColors[i]};"></span>
      <span>${name}</span>
    </span>`;
  }).join("");

  if (chart) chart.destroy();

  chart = new Chart(document.getElementById("chart"), {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(10,15,30,0.95)",
          borderColor:     "rgba(59,130,246,0.3)",
          borderWidth:     1,
          titleColor:      "#e2e8f0",
          bodyColor:       "#94a3b8",
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)}°C cooling`
          }
        }
      },
      scales: {
        x: {
          ticks: { color: "#64748b", font: { size: 11 } },
          grid:  { color: "rgba(255,255,255,0.05)" },
          title: { display: true, text: "Green cover (%)", color: "#64748b", font: { size: 11 } }
        },
        y: {
          min: 0, max: 10,
          ticks: { color: "#64748b", font: { size: 11 }, callback: v => v + "°C" },
          grid:  { color: "rgba(255,255,255,0.05)" },
          title: { display: true, text: "Cooling effect (°C)", color: "#64748b", font: { size: 11 } }
        }
      }
    }
  });
}

// ── INITIALISE ────────────────────────────────────────────────────────────────
buildZoneGrid();
updateLabels();
updateTmax();
calculate();

// ── ZONE DETAIL MODAL ─────────────────────────────────────────────────────────
// FIX #1 & #2: removed dead _origCalculate variable and unused lastTemps array

function openZoneModal(index) {
  const zone    = zones[index];
  const Tmax    = parseFloat(document.getElementById("tmax").value);
  const fn      = modelFunctions[document.getElementById("model").value];
  const model   = document.getElementById("model").value;
  const urbanSl = parseFloat(document.getElementById("urban").value);
  const greenSl = parseFloat(document.getElementById("green").value);

  const T_ambient     = Math.max(Tmax * 0.72, 22);
  const maxHeatExcess = Tmax - T_ambient;
  const coolingRange  = maxHeatExcess * 0.60;

  const effectiveUrban = (zone.urban + urbanSl) / 2;
  const effectiveGreen = (zone.green + greenSl) / 2;
  const heatExcess     = maxHeatExcess * effectiveUrban * (1 - effectiveGreen * 0.7);
  const coolingApplied = fn(effectiveGreen) * coolingRange;
  const finalTemp      = parseFloat(Math.max(T_ambient + heatExcess - coolingApplied, T_ambient).toFixed(1));

  const colors  = getZoneColors(finalTemp, zone.label);
  const fg      = colors.fg;
  const heatLbl = colors.label;

  // Header
  document.getElementById("zoneModalTitle").innerHTML = zone.icon + " " + zone.label;
  document.getElementById("zoneModalSub").innerText   = "Zone " + (index + 1) + " of " + zones.length + " · Model: " + model;

  // Current temp
  document.getElementById("zoneModalTempVal").style.color = fg;
  document.getElementById("zoneModalTempVal").innerText   = finalTemp + "°C";

  // FIX #3: fg is hex — use hardcoded rgba from the colors object for pill styling
  document.getElementById("zoneModalHeatLabel").style.color = fg;
  document.getElementById("zoneModalHeatLabel").innerHTML   =
    `<span style="display:inline-block; padding:2px 10px; border-radius:20px; background:${colors.bg}; border:1px solid ${colors.border};">${heatLbl} zone</span>`;

  // Zone property bars
  function propBar(label, value, color) {
    const pct = Math.min(Math.round(value * 100), 100);
    return `<div style="display:flex; align-items:center; gap:8px;">
      <span style="font-size:10px; color:#64748b; min-width:95px;">${label}</span>
      <div style="flex:1; background:rgba(255,255,255,0.06); border-radius:4px; height:5px; overflow:hidden;">
        <div style="width:${pct}%; height:100%; background:${color}; border-radius:4px; transition:width 0.4s;"></div>
      </div>
      <span style="font-size:10px; color:#94a3b8; min-width:34px; text-align:right;">${pct}%</span>
    </div>`;
  }

  // FIX #8: guard against division by zero on the heat retained bar
  const heatRetainedRatio = maxHeatExcess > 0
    ? Math.min(heatExcess / maxHeatExcess, 1)
    : 0;

  document.getElementById("zoneModalProps").innerHTML =
    propBar("Urbanization",  effectiveUrban,    "#ef4444") +
    propBar("Green cover",   effectiveGreen,    "#22d3ee") +
    propBar("Heat retained", heatRetainedRatio, "#f59e0b");

  // FIX #6: Before scenario uses a fixed low green cover (0.1) instead of a
  // relative offset — this is meaningful and consistent across all zones,
  // including naturally green ones like Central Park
  const baScenarios = [
    { label: "Before",     icon: "🏭", urban: zone.urban,       green: 0.1,                              desc: "Base — minimal greening" },
    { label: "Current",    icon: "📍", urban: effectiveUrban,   green: effectiveGreen,                   desc: "Your slider settings"    },
    { label: "Green Plan", icon: "🌿", urban: zone.urban * 0.8, green: Math.min(zone.green + 0.35, 1.0), desc: "+35% green added"        }
  ];

  const baCardColors  = ["rgba(239,68,68,0.12)","rgba(59,130,246,0.12)","rgba(34,211,238,0.12)"];
  const baFgList      = ["#fca5a5","#93c5fd","#67e8f9"];
  const baBorders     = ["rgba(239,68,68,0.3)","rgba(59,130,246,0.3)","rgba(34,211,238,0.3)"];

  const baTemps = baScenarios.map(function(s) {
    const heat = maxHeatExcess * s.urban * (1 - s.green * 0.7);
    const cool = fn(s.green) * coolingRange;
    return parseFloat(Math.max(T_ambient + heat - cool, T_ambient).toFixed(1));
  });

  document.getElementById("zoneModalBAGrid").innerHTML = baScenarios.map(function(s, i) {
    return `<div style="background:${baCardColors[i]}; border:1px solid ${baBorders[i]}; border-radius:10px; padding:12px; text-align:center;">
      <div style="font-size:18px; margin-bottom:3px;">${s.icon}</div>
      <div style="font-size:10px; font-weight:600; letter-spacing:0.06em; color:${baFgList[i]}; margin-bottom:2px;">${s.label.toUpperCase()}</div>
      <div style="font-size:9px; color:#64748b; margin-bottom:8px;">${s.desc}</div>
      <div style="font-size:1.6rem; font-weight:800; font-family:'Syne',sans-serif; color:${baFgList[i]};">${baTemps[i]}°C</div>
      <div style="font-size:9px; color:#64748b; margin-top:4px;">U:${Math.round(s.urban * 100)}% G:${Math.round(s.green * 100)}%</div>
    </div>`;
  }).join("");

  // FIX #4: rewritten summary sentence handles negative curr cleanly
  const saving   = parseFloat((baTemps[0] - baTemps[2]).toFixed(1));
  const curr     = parseFloat((baTemps[0] - baTemps[1]).toFixed(1));
  let currPhrase;
  if (curr > 0) {
    currPhrase = `saves <strong style="color:#93c5fd;">${curr}°C</strong> versus the ungreened baseline`;
  } else if (curr < 0) {
    currPhrase = `adds <strong style="color:#fca5a5;">${Math.abs(curr)}°C</strong> above the ungreened baseline`;
  } else {
    currPhrase = `matches the ungreened baseline temperature`;
  }
  document.getElementById("zoneModalBASummary").innerHTML =
    `Your current settings ${currPhrase}. The green plan could bring it down a further <strong style="color:#67e8f9;">${saving}°C</strong>.`;

  // Formula breakdown
  document.getElementById("zoneModalFormula").innerHTML =
    `T_ambient  = max(${Tmax} × 0.72, 22) = <span style="color:#3b82f6;">${T_ambient.toFixed(1)}°C</span><br>` +
    `maxHeat    = ${Tmax} − ${T_ambient.toFixed(1)} = <span style="color:#f59e0b;">${maxHeatExcess.toFixed(1)}°C</span><br>` +
    `heatExcess = ${maxHeatExcess.toFixed(1)} × ${effectiveUrban.toFixed(2)} × (1 − ${effectiveGreen.toFixed(2)}×0.7) = <span style="color:#f59e0b;">${heatExcess.toFixed(1)}°C</span><br>` +
    `cooling    = ${fn(effectiveGreen).toFixed(3)} × ${coolingRange.toFixed(1)} = <span style="color:#22d3ee;">${coolingApplied.toFixed(1)}°C</span><br>` +
    `<strong style="color:${fg};">T_final = ${T_ambient.toFixed(1)} + ${heatExcess.toFixed(1)} − ${coolingApplied.toFixed(1)} = ${finalTemp}°C</strong>`;

  // Brief SVG highlight on clicked zone
  const rect = document.getElementById("svg-zone-" + index);
  if (rect) {
    rect.style.filter = "drop-shadow(0 0 10px " + fg + ") brightness(1.4)";
    setTimeout(function() { rect.style.filter = ""; }, 1600);
  }

  // FIX #5: modal visibility is driven entirely by JS — removed the fragile
  // CSS [style*="flex"] selector. We just set display + opacity directly.
  const modal = document.getElementById("zoneModal");
  modal.style.opacity = "0";
  modal.style.display = "flex";
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      modal.style.opacity = "1";
    });
  });
}

function closeZoneModal() {
  const modal = document.getElementById("zoneModal");
  modal.style.opacity = "0";
  setTimeout(function() { modal.style.display = "none"; }, 180);
}

// Close on backdrop click
document.getElementById("zoneModal").addEventListener("click", function(e) {
  if (e.target === this) closeZoneModal();
});

// Close on Escape key
document.addEventListener("keydown", function(e) {
  if (e.key === "Escape") closeZoneModal();
});