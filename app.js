(() => {
  "use strict";

  const stages = window.MECHANISM_STAGES;
  const structures = window.STRUCTURES;
  const $ = id => document.getElementById(id);
  const state = {
    stage: 0, structure: "4cha", viewer: null, timer: null, playing: false,
    cache: new Map(), atoms: [], loadToken: 0
  };

  const atomKey = atom => `${atom.auth_asym_id}:${atom.auth_comp_id}${atom.auth_seq_id}:${atom.auth_atom_id}`;
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
  const escapeXml = value => String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&apos;" }[c]));

  function tokenize(line) {
    return line.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g)?.map(v => v.replace(/^(['"])(.*)\1$/, "$2")) || [];
  }

  function parseAtomSite(text) {
    const lines = text.split(/\r?\n/);
    const atoms = [];
    for (let i = 0; i < lines.length; i += 1) {
      if (lines[i].trim() !== "loop_") continue;
      const headers = [];
      let j = i + 1;
      while (j < lines.length && lines[j].trim().startsWith("_atom_site.")) {
        headers.push(lines[j].trim().slice(11));
        j += 1;
      }
      if (!headers.length) continue;
      const ix = Object.fromEntries(headers.map((h, n) => [h, n]));
      while (j < lines.length) {
        const line = lines[j].trim();
        if (!line || line === "#" || line === "loop_" || line.startsWith("_")) break;
        const t = tokenize(line);
        if (t.length >= headers.length && (t[ix.group_PDB] === "ATOM" || t[ix.group_PDB] === "HETATM")) {
          atoms.push({
            group: t[ix.group_PDB], auth_atom_id: t[ix.auth_atom_id], auth_comp_id: t[ix.auth_comp_id],
            auth_asym_id: t[ix.auth_asym_id], auth_seq_id: Number.parseInt(t[ix.auth_seq_id], 10),
            type_symbol: t[ix.type_symbol], x: Number(t[ix.Cartn_x]), y: Number(t[ix.Cartn_y]), z: Number(t[ix.Cartn_z])
          });
        }
        j += 1;
      }
      return atoms;
    }
    return atoms;
  }

  function findAtom(name, number, chain, atomName) {
    return state.atoms.find(a => a.auth_comp_id === name && a.auth_seq_id === number && a.auth_asym_id === chain && a.auth_atom_id === atomName);
  }

  function validateMapping(config) {
    const missing = [];
    for (const residue of window.ACTIVE_SITE_RESIDUES) {
      const chain = config.chains[residue.chainGroup];
      if (!state.atoms.some(a => a.auth_comp_id === residue.name && a.auth_seq_id === residue.number && a.auth_asym_id === chain)) {
        missing.push(`${residue.name}${residue.number}/${chain}`);
      }
    }
    const asp = findAtom("ASP", 102, config.chains.hisAsp, "OD2");
    const hisND1 = findAtom("HIS", 57, config.chains.hisAsp, "ND1");
    const hisNE2 = findAtom("HIS", 57, config.chains.hisAsp, "NE2");
    const ser = findAtom("SER", 195, config.chains.serPocket, "OG");
    $("aspHisDistance").textContent = asp && hisND1 ? `${distance(asp, hisND1).toFixed(2)} Å` : "not found";
    $("hisSerDistance").textContent = hisNE2 && ser ? `${distance(hisNE2, ser).toFixed(2)} Å` : "not found";
    $("validationState").textContent = missing.length ? `Mapping warning: ${missing.join(", ")}` : `Residues validated in chains ${config.chains.hisAsp}/${config.chains.serPocket}`;
    $("validationState").classList.toggle("warning", missing.length > 0);
    console.info(`[structure validation] ${config.id}`, { atoms: state.atoms.length, missing, aspHis: $("aspHisDistance").textContent, hisSer: $("hisSerDistance").textContent });
  }

  async function ensureViewer() {
    if (state.viewer) return;
    if (!window.molstar?.Viewer) throw new Error("The local Mol* bundle did not initialize.");
    state.viewer = await window.molstar.Viewer.create("molstarViewer", {
      layoutShowControls: false, layoutShowSequence: false, layoutShowLog: false,
      layoutShowLeftPanel: false, viewportShowControls: true, viewportShowExpand: true,
      viewportShowSelectionMode: false, viewportShowAnimation: false,
      viewportShowTrajectoryControls: false, viewportShowSettings: true,
      viewportShowReset: true, viewportBackgroundColor: "#f8fbfc",
      collapseLeftPanel: true, collapseRightPanel: true
    });
  }

  function activeSiteExpression(config) {
    const MS = window.molstar?.lib?.MolScriptBuilder;
    if (!MS) return null;
    const expressions = window.ACTIVE_SITE_RESIDUES.map(residue => MS.struct.generator.atomGroups({
      "chain-test": MS.core.rel.eq([MS.struct.atomProperty.macromolecular.auth_asym_id(), config.chains[residue.chainGroup]]),
      "residue-test": MS.core.rel.eq([MS.struct.atomProperty.macromolecular.auth_seq_id(), residue.number])
    }));
    return MS.struct.combinator.merge(expressions);
  }

  async function focusActiveSite() {
    if (!state.viewer) return;
    const expression = activeSiteExpression(structures[state.structure]);
    try {
      if (expression) {
        await state.viewer.structureInteractivity({ expression, action: "focus", focusOptions: { minRadius: 7, extraRadius: 5, durationMs: 450 } });
      } else {
        state.viewer.plugin.managers.camera.reset(undefined, 450);
      }
    } catch (error) {
      console.warn("Active-site focus fallback", error);
      state.viewer.plugin.managers.camera.reset(undefined, 450);
    }
  }

  async function loadStructure(id, focus = true) {
    const token = ++state.loadToken;
    const config = structures[id];
    state.structure = id;
    $("structureSelect").value = id;
    $("structureLabel").textContent = `${config.id} · ${config.label} · ${config.resolution}`;
    $("loadStatus").textContent = `Loading ${config.id}…`;
    try {
      let cif = state.cache.get(id);
      if (!cif) {
        const response = await fetch(config.file);
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
        cif = await response.text();
        state.cache.set(id, cif);
      }
      if (token !== state.loadToken) return;
      state.atoms = parseAtomSite(cif);
      validateMapping(config);
      await ensureViewer();
      await state.viewer.loadStructureFromData(cif, "mmcif", { dataLabel: `${config.id} · ${config.label}` });
      if (token !== state.loadToken) return;
      $("loadStatus").textContent = `${config.id} ready · local coordinates`;
      if (focus) window.setTimeout(focusActiveSite, 250);
    } catch (error) {
      $("loadStatus").textContent = `Could not load ${config.id}`;
      $("molstarViewer").innerHTML = `<div class="viewer-fallback">Structure unavailable: ${escapeXml(error.message)}. Serve this folder over HTTP rather than opening index.html directly.</div>`;
      console.error(error);
    }
  }

  function drawMechanism(stage) {
    const mode = stage.bonds;
    const bound = !["resting", "release"].includes(mode);
    const tetra = mode === "tetrahedral" || mode === "tetrahedral2";
    const covalent = ["attack", "tetrahedral", "collapse", "acyl", "water", "tetrahedral2", "deacyl"].includes(mode);
    const water = ["water", "tetrahedral2", "deacyl"].includes(mode);
    const activated = ["activation", "attack", "water", "tetrahedral2"].includes(mode);
    const product = ["collapse", "deacyl", "release"].includes(mode);
    const protonX = water ? 445 : activated ? 350 : 305;
    $("mechanismSvg").innerHTML = `
      <title id="mechanismTitle">${escapeXml(stage.title)}</title>
      <desc id="mechanismDesc">${escapeXml(stage.chemistry)}</desc>
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="8" refX="8" refY="4" orient="auto"><path d="M0 0L10 4L0 8Z" fill="#10263a"/></marker>
      </defs>
      <path class="pocket" d="M40 60C90 18 210 18 270 55c80-45 220-35 286 26 91-18 166 63 127 141l-42 80c-48 93-151 149-265 142C242 478 117 421 72 321 23 215 15 112 40 60Z"/>
      <path class="cavity" d="M492 65c97 42 124 95 92 159-19 38-44 56-78 70-33-48-79-70-130-68 36-42 65-93 82-151 9-28 19-33 34-10Z"/>
      <circle class="residue" cx="205" cy="360" r="42" fill="#c84d59"/><text class="res-name" x="175" y="366">Asp102</text>
      <circle class="residue" cx="330" cy="325" r="42" fill="#2777a8"/><text class="res-name" x="303" y="331">His57</text>
      <circle class="residue" cx="455" cy="345" r="42" fill="#ef8b32"/><text class="res-name" x="426" y="351">Ser195</text>
      <path class="hbond" d="M247 350L286 334"/><path class="hbond" d="M372 331L413 340"/>
      <text class="atom" x="241" y="327">O⁻</text><text class="atom" x="282" y="305">Nδ1</text><text class="atom" x="361" y="302">Nε2</text><text class="atom" x="424" y="317">Oγ</text>
      <circle class="proton modeled-h" cx="${protonX}" cy="${water ? 275 : 309}" r="10"/><text class="caption modeled-h" x="${protonX - 5}" y="${water ? 279 : 313}">H</text>
      ${bound ? `<path class="bond substrate" d="M638 95L582 145L536 193L493 240"/><path class="bond substrate" d="M493 240L454 274"/>
        <text class="atom" x="506" y="224">C</text><text class="atom" x="471" y="192">O${tetra ? "⁻" : ""}</text><path class="bond" d="M500 224L479 199"/>
        <text class="caption" x="575" y="77">aromatic side chain in S1 pocket</text>` : ""}
      ${covalent ? `<path class="bond covalent" d="M454 304L491 242"/>` : ""}
      ${water ? `<circle cx="535" cy="320" r="22" fill="#dbeef3" stroke="#2777a8" stroke-width="2"/><text class="atom" x="522" y="327">H₂O</text>` : ""}
      ${activated && !water ? `<path class="arrow" d="M430 292Q420 248 485 234"/>` : ""}
      ${water && mode !== "deacyl" ? `<path class="arrow" d="M522 298Q493 267 503 245"/>` : ""}
      ${product ? `<path class="bond" d="M600 370L661 405" stroke="#7654a8"/><text class="caption" x="578" y="355">${mode === "collapse" ? "amine product" : "carboxylate product"}</text>` : ""}
      <path class="hbond" d="M467 180L445 151"/><path class="hbond" d="M488 184L512 150"/>
      <text class="caption" x="387" y="132">oxyanion-hole NH donors</text>
      <text class="caption" x="55" y="515">${escapeXml(stage.chemistry)}</text>`;
    updateToggles();
  }

  function drawEnergy() {
    const width = 1100, left = 54, right = 34, bottom = 184, top = 22;
    const x = i => left + i * ((width - left - right) / (stages.length - 1));
    const y = value => bottom - value * (bottom - top);
    const path = stages.map((s, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(s.energy).toFixed(1)}`).join(" ");
    $("energySvg").innerHTML = `<line class="energy-baseline" x1="${left}" y1="${bottom}" x2="${width-right}" y2="${bottom}"/>
      <text class="energy-label" x="8" y="30">Higher</text><text class="energy-label" x="8" y="${bottom}">Lower</text>
      <path class="energy-path" d="${path}"/>
      ${stages.map((s, i) => `<g data-energy-stage="${i}"><circle class="energy-point${i === state.stage ? " active" : ""}" cx="${x(i)}" cy="${y(s.energy)}" r="8"/><text class="energy-label" x="${x(i)}" y="214" text-anchor="middle">${i + 1}</text></g>`).join("")}
      <text class="energy-label" x="${width / 2}" y="232" text-anchor="middle">Reaction progress</text>`;
    document.querySelectorAll("[data-energy-stage]").forEach(node => node.addEventListener("click", () => setStage(Number(node.dataset.energyStage))));
  }

  function renderTimeline() {
    $("timeline").innerHTML = stages.map((stage, i) => `<button class="stage-btn" data-stage="${i}" aria-current="${i === state.stage ? "step" : "false"}" title="${escapeXml(stage.title)}"><b>${i + 1}</b>${escapeXml(stage.short)}</button>`).join("");
    document.querySelectorAll("[data-stage]").forEach(button => button.addEventListener("click", () => setStage(Number(button.dataset.stage))));
  }

  function renderSources() {
    $("sourceList").innerHTML = Object.values(structures).map(s => `<li><a href="${s.rcsb}" target="_blank" rel="noreferrer">${s.id}</a>, ${s.resolution}, ${escapeXml(s.citation)} <a href="${s.doi}" target="_blank" rel="noreferrer">DOI</a></li>`).join("");
  }

  function setStage(index, options = {}) {
    state.stage = (index + stages.length) % stages.length;
    const stage = stages[state.stage];
    $("stageKicker").textContent = `Stage ${state.stage + 1} of ${stages.length} · ${stage.phase}`;
    $("stageTitle").textContent = stage.title;
    $("stageSummary").textContent = stage.summary;
    $("chemistryLabel").textContent = stage.chemistry;
    $("evidenceBtn").textContent = stage.evidence;
    $("evidenceBtn").dataset.class = stage.class;
    $("evidenceText").textContent = stage.chemistry;
    const config = structures[stage.pdb];
    $("stageFacts").innerHTML = `<dt>Structure</dt><dd>${config.id} · ${config.resolution}</dd><dt>Method</dt><dd>${config.method}</dd><dt>Chains</dt><dd>${config.chains.hisAsp}/${config.chains.serPocket}</dd><dt>Evidence</dt><dd>${stage.evidence}</dd>`;
    drawMechanism(stage);
    renderTimeline();
    drawEnergy();
    if (!options.keepStructure && stage.pdb !== state.structure) loadStructure(stage.pdb);
  }

  function updateToggles() {
    const svg = $("mechanismSvg");
    svg.classList.toggle("hide-labels", !$("labelsToggle").checked);
    svg.classList.toggle("hide-hbonds", !$("hbondsToggle").checked);
    svg.classList.toggle("hide-arrows", !$("arrowsToggle").checked);
    svg.classList.toggle("hide-hydrogens", !$("hydrogenToggle").checked);
  }

  function stop() {
    window.clearInterval(state.timer);
    state.timer = null;
    state.playing = false;
    $("playBtn").textContent = "Play";
  }

  function play() {
    if (state.playing) return stop();
    state.playing = true;
    $("playBtn").textContent = "Pause";
    const advance = () => {
      if (state.stage === stages.length - 1) return stop();
      setStage(state.stage + 1);
    };
    state.timer = window.setInterval(advance, Number($("speedSelect").value));
  }

  function showEvidence() {
    const stage = stages[state.stage], config = structures[stage.pdb];
    $("dialogTitle").textContent = stage.evidence;
    $("dialogBody").textContent = `${stage.summary} ${stage.chemistry}`;
    $("dialogCitation").innerHTML = `<a href="${config.rcsb}" target="_blank" rel="noreferrer">${config.id} at RCSB PDB</a> · ${config.citation}`;
    $("evidenceDialog").showModal();
  }

  async function copyNotes() {
    const stage = stages[state.stage], config = structures[stage.pdb];
    const note = `${stage.title}: ${stage.summary} ${stage.chemistry} Evidence: ${stage.evidence}. Structure: ${config.id}, ${config.resolution}, ${config.citation}`;
    try { await navigator.clipboard.writeText(note); $("copyNotesBtn").textContent = "Copied"; }
    catch { $("copyNotesBtn").textContent = "Copy unavailable"; }
    window.setTimeout(() => { $("copyNotesBtn").textContent = "Copy instructor note"; }, 1600);
  }

  function bind() {
    $("prevBtn").addEventListener("click", () => { stop(); setStage(state.stage - 1); });
    $("nextBtn").addEventListener("click", () => { stop(); setStage(state.stage + 1); });
    $("playBtn").addEventListener("click", play);
    $("resetBtn").addEventListener("click", () => {
      stop();
      $("labelsToggle").checked = $("hbondsToggle").checked = $("arrowsToggle").checked = true;
      $("hydrogenToggle").checked = false;
      $("representationSelect").value = "cartoon";
      $("speedSelect").value = "3400";
      setStage(0);
    });
    $("focusBtn").addEventListener("click", focusActiveSite);
    $("structureSelect").addEventListener("change", event => loadStructure(event.target.value));
    $("representationSelect").addEventListener("change", focusActiveSite);
    ["labelsToggle","hbondsToggle","arrowsToggle","hydrogenToggle"].forEach(id => $(id).addEventListener("change", updateToggles));
    $("speedSelect").addEventListener("change", () => { if (state.playing) { stop(); play(); } });
    $("evidenceBtn").addEventListener("click", showEvidence);
    $("copyNotesBtn").addEventListener("click", copyNotes);
    $("fullscreenBtn").addEventListener("click", () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen());
    document.addEventListener("keydown", event => {
      if (event.key === "ArrowRight") { stop(); setStage(state.stage + 1); }
      if (event.key === "ArrowLeft") { stop(); setStage(state.stage - 1); }
      if (event.key === " ") { event.preventDefault(); play(); }
    });
  }

  async function init() {
    bind();
    renderSources();
    setStage(0, { keepStructure: true });
    await loadStructure("4cha");
  }

  window.addEventListener("DOMContentLoaded", init);
})();
