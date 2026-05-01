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

function getZoneBg(temp, label) {
  if (label === "Industrial") return "rgba(239,68,68,0.25)";
  if (temp > 32) return "rgba(239,68,68,0.25)";
  if (temp > 28) return "rgba(245,158,11,0.25)";
  return "rgba(34,211,238,0.2)";
}

function getZoneFg(temp, label) {
  if (label === "Industrial") return "#fca5a5";
  if (temp > 32) return "#fca5a5";
  if (temp > 28) return "#fcd34d";
  return "#67e8f9";
}

function getZoneHeatLabel(temp, label) {
  if (label === "Industrial") return "Hot";
  if (temp > 32) return "Hot";
  if (temp > 28) return "Warm";
  return "Cool";
}

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
    // Blend each zone's base value with the global slider (50/50 mix)
    // so dragging either slider causes a clear, visible shift across all zones
    const effectiveUrban = (zone.urban + urbanSlider) / 2;
    const effectiveGreen = (zone.green + greenSlider) / 2;
    const heatExcess = maxHeatExcess * effectiveUrban * (1 - effectiveGreen * 0.7);
    const cooling    = fn(effectiveGreen) * coolingRange;
    const finalTemp  = parseFloat(Math.max(T_ambient + heatExcess - cooling, T_ambient).toFixed(1));
    temps.push(finalTemp);

    const bg  = getZoneBg(finalTemp, zone.label);
    const fg  = getZoneFg(finalTemp, zone.label);
    const lbl = getZoneHeatLabel(finalTemp, zone.label);

    document.getElementById("zone"   + i).style.background  = bg;
    document.getElementById("zone"   + i).style.borderColor = fg.replace("1)", "0.4)");
    document.getElementById("ztemp"  + i).innerText         = finalTemp + "°C";
    document.getElementById("ztemp"  + i).style.color       = fg;
    document.getElementById("zlabel" + i).innerText         = lbl;
    document.getElementById("zlabel" + i).style.color       = fg;

    const svgRect = document.getElementById("svg-zone-" + i);
    const svgText = document.getElementById("svg-t-" + i);
    if (svgRect) {
      const svgFill = finalTemp > 33 || zone.label === "Industrial"
        ? "rgba(239,68,68,0.45)"
        : finalTemp > 28
          ? "rgba(245,158,11,0.45)"
          : "rgba(34,211,238,0.25)";
      svgRect.setAttribute("fill", svgFill);
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

  // ── LIVE CALCULATION BREAKDOWN ──────────────────────────
  document.getElementById("calc-ambient-working").innerText  = `= max(${Tmax} × 0.72, 22) = max(${(Tmax*0.72).toFixed(1)}, 22)`;
  document.getElementById("calc-ambient").innerText          = T_ambient.toFixed(1) + "°C";
  document.getElementById("calc-heat-working").innerText     = `= ${Tmax} − ${T_ambient.toFixed(1)}`;
  document.getElementById("calc-heat").innerText             = maxHeatExcess.toFixed(1) + "°C";
  document.getElementById("calc-cooling-working").innerText  = `= ${maxHeatExcess.toFixed(1)} × 0.60`;
  document.getElementById("calc-cooling").innerText          = coolingRange.toFixed(1) + "°C";

  document.getElementById("calc-zone-breakdown").innerHTML = zones.map(function(zone, i) {
    const effectiveUrban = (zone.urban + urbanSlider) / 2;
    const effectiveGreen = (zone.green + greenSlider) / 2;
    const heatExcess = maxHeatExcess * effectiveUrban * (1 - effectiveGreen * 0.7);
    const cooling    = fn(effectiveGreen) * coolingRange;
    const finalTemp  = parseFloat(Math.max(T_ambient + heatExcess - cooling, T_ambient).toFixed(1));
    const fg         = getZoneFg(finalTemp, zone.label);
    return `
      <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:8px; padding:8px 12px; min-width:160px; flex:1;">
        <div style="font-size:11px; font-weight:600; color:${fg}; margin-bottom:4px;">${zone.icon} ${zone.label}</div>
        <div style="font-family:'Courier New',monospace; font-size:10px; color:#64748b; line-height:1.7;">
          Heat = ${maxHeatExcess.toFixed(1)} × ${effectiveUrban.toFixed(2)} × (1−${effectiveGreen.toFixed(2)}×0.7) = <span style="color:#f59e0b;">${heatExcess.toFixed(1)}°C</span><br>
          Cool = ${fn(effectiveGreen).toFixed(2)} × ${coolingRange.toFixed(1)} = <span style="color:#22d3ee;">${cooling.toFixed(1)}°C</span><br>          <strong style="color:${fg};">T = ${T_ambient.toFixed(1)} + ${heatExcess.toFixed(1)} − ${cooling.toFixed(1)} = ${finalTemp}°C</strong>
        </div>
      </div>`;
  }).join("");

  const scenarios = [
    { label: "Before",     desc: "High density, minimal greenery",  urban: 0.9, green: 0.1, icon: "🏭" },
    { label: "After",      desc: "Planned green corridors added",   urban: 0.9, green: 0.5, icon: "🌿" },
    { label: "Green City", desc: "Low density, abundant greenery",  urban: 0.3, green: 0.8, icon: "🌳" },
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
          <div style="font-size:10px; color:var(--muted); margin-top:4px;">Urban ${Math.round(s.urban*100)}% · Green ${Math.round(s.green*100)}%</div>
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

buildZoneGrid();
updateLabels();
updateTmax();
calculate();