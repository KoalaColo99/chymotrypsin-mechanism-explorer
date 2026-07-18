(() => {
  "use strict";

  const stages = window.MECHANISM_STAGES;
  const structures = window.STRUCTURES;
  const tutorialQuestions = [
    ["Which atom attacks the substrate carbonyl carbon?","Ser195 Oγ",["Ser195 Oγ","His57 Nε2","Asp102 OD2"],"Ser195 Oγ is the catalytic nucleophile."],
    ["Which nitrogen accepts the proton from Ser195?","His57 Nε2",["His57 Nδ1","His57 Nε2","Peptide nitrogen"],"Nε2 faces Ser195 and acts as the general base."],
    ["What stabilizes the oxyanion?","Gly193 and Ser195 backbone N–H groups",["Asp102 directly","Gly193 and Ser195 backbone N–H groups","Water alone"],"The oxyanion hole supplies two backbone N–H hydrogen bonds."],
    ["When is the enzyme covalently attached?","Acyl–enzyme intermediate",["Substrate binding","Acyl–enzyme intermediate","Product release"],"The Ser195 Oγ–acyl carbon ester is the covalent intermediate."],
    ["What happens to the carbonyl π electrons during attack?","They move onto oxygen",["They move onto oxygen","They move to His57","They leave with R_C"],"Addition converts C=O to C–O⁻."],
    ["Which bond breaks during first collapse?","Scissile peptide C–N",["Ser195 C–O","Scissile peptide C–N","Asp–His hydrogen bond"],"The amine-side fragment departs when the peptide C–N bond breaks."],
    ["What activates water?","His57 acting as a general base",["Free hydroxide diffusion","Asp102 attacks water","His57 acting as a general base"],"Bound water is activated by His57."],
    ["What distinguishes tetrahedral intermediate II?","It contains water-derived oxygen",["It contains peptide nitrogen","It contains water-derived oxygen","It lacks Ser195"],"The peptide nitrogen departed during acylation."],
    ["Which strategy uses a transient enzyme–substrate bond?","Covalent catalysis",["Electrostatic stabilization","Covalent catalysis","Proximity only"],"Ser195 forms a transient covalent acyl–enzyme linkage."],
    ["How is Ser195 regenerated?","His57 returns H while the acyl bond breaks",["Asp102 protonates it directly","His57 returns H while the acyl bond breaks","The product donates carbon"],"Second collapse restores Ser195–OH."],
    ["Does the enzyme change the reaction equilibrium?","No",["Yes","No","Only during acylation"],"Catalysis lowers activation barriers, not the overall equilibrium."],
    ["Where did the elements of water go?","H to amine side; OH to carbonyl side",["Both to the enzyme","H to amine side; OH to carbonyl side","Both to R_N"],"Hydrolysis adds H and OH across the former peptide bond."]
  ];
  const $ = id => document.getElementById(id);
  const state = {
    stage: 0, structure: "4cha", viewer: null, timer: null, playing: false,
    cache: new Map(), atoms: [], loadToken: 0, detail: "chemical",
    track: "", comparison: false, isolate: false, arrowBuilder: false, arrowPick: [],
    tutorial: 0
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
      $("molstarViewer").innerHTML = `<div class="viewer-fallback active"><svg viewBox="0 0 620 400" aria-label="Active-site schematic fallback"><path d="M45 205C70 75 220 43 309 105c92-68 237-23 261 92-25 121-168 174-281 111C184 361 68 319 45 205Z" fill="#dcecf2" stroke="#6f9eb5" stroke-width="4"/><path d="M410 82q100 48 38 170q-49-35-110-7q42-69 72-163Z" fill="#fff" stroke="#6f9eb5" stroke-width="3"/><circle cx="211" cy="261" r="27" fill="#194e79"/><circle cx="305" cy="235" r="27" fill="#194e79"/><circle cx="393" cy="264" r="27" fill="#ef8b32"/><text x="178" y="307">Asp102</text><text x="280" y="196">His57</text><text x="380" y="310">Ser195</text><path d="M480 118L434 171L393 230" fill="none" stroke="#23936c" stroke-width="10"/></svg><p>The interactive 3D structure will become available automatically after this project is published through GitHub Pages. You can continue using the complete 2D chemical mechanism below.</p></div>`;
      console.error(error);
    }
  }

  function drawMechanism(stage) {
    const mode = stage.bonds;
    const bound = !["resting", "release"].includes(mode);
    const tetra = mode === "tetrahedral" || mode === "tetrahedral2";
    const covalent = ["attack", "tetrahedral", "collapse", "acyl", "water", "waterattack", "tetrahedral2", "deacyl"].includes(mode);
    const water = ["water", "waterattack", "tetrahedral2", "deacyl"].includes(mode);
    const serMinus = ["activation", "attack"].includes(mode);
    const hisPlus = ["activation", "attack", "tetrahedral", "water", "waterattack", "tetrahedral2", "deacyl"].includes(mode);
    const product = ["collapse", "deacyl", "release"].includes(mode);
    const peptideAttached = bound && !["acyl","water","waterattack","tetrahedral2","deacyl"].includes(mode);
    const carbonylDouble = !tetra && !["attack","waterattack"].includes(mode);
    const detail = state.detail;
    const full = detail === "electron";
    const chemical = detail !== "conceptual";
    const tracked = key => state.track === key ? " tracked" : "";
    const atom = (key, x, y, label, cls="carbon", info="") => `<g class="atom-node ${cls}${tracked(key)}" data-atom="${key}" data-info="${escapeXml(info)}"><circle cx="${x}" cy="${y}" r="${detail === "conceptual" ? 17 : 13}"/><text x="${x}" y="${y+5}" text-anchor="middle">${label}</text></g>`;
    const lone = (x,y,n=2) => full ? Array.from({length:n},(_,i)=>`<text class="lone-pair" x="${x+i*12}" y="${y}">••</text>`).join("") : "";
    const arrows = [];
    if (full && mode === "activation") arrows.push(`<path class="electron-arrow" d="M390 374Q425 315 461 343"/><path class="electron-arrow" d="M476 348Q500 328 508 350"/>`);
    if (full && mode === "attack") arrows.push(`<path class="electron-arrow" d="M520 365Q574 320 607 259"/><path class="electron-arrow" d="M611 238Q578 195 608 173"/>`);
    if (full && mode === "collapse") arrows.push(`<path class="electron-arrow" d="M608 170Q585 205 610 230"/><path class="electron-arrow" d="M626 252Q661 278 682 258"/><path class="electron-arrow" d="M399 351Q460 306 676 260"/>`);
    if (full && ["water","waterattack"].includes(mode)) arrows.push(`<path class="electron-arrow" d="M390 374Q435 430 493 414"/>${mode==="waterattack"?`<path class="electron-arrow" d="M520 410Q574 350 610 264"/><path class="electron-arrow" d="M612 238Q584 199 610 174"/>`:""}`);
    $("mechanismSvg").innerHTML = `
      <title id="mechanismTitle">${escapeXml(stage.title)}</title>
      <desc id="mechanismDesc">${escapeXml(stage.chemistry)}</desc>
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="8" refX="8" refY="4" orient="auto"><path d="M0 0L10 4L0 8Z" fill="#10263a"/></marker>
      </defs>
      <g class="${state.isolate && mode==="acyl" ? "dimmed" : ""}">
      <text class="residue-title" x="38" y="36">Asp102</text><text class="role-label" x="38" y="55">orients His57; stabilizes charge redistribution</text>
      <path class="bond" d="M48 108L88 108L122 82"/><path class="bond double" d="M122 79L157 57"/><path class="bond" d="M126 87L161 112"/>
      <text class="fragment" x="38" y="113">Protein–CH₂</text>${atom("aspOD1",170,52,"O","oxygen","Asp102 OD1|Oxygen|0|1|2|Carboxylate oxygen")}
      ${atom("aspOD2",174,118,"O⁻","oxygen","Asp102 OD2|Oxygen|−1|1|3|Hydrogen-bond acceptor")}${chemical?`<text class="atom-label" x="182" y="37">OD1</text><text class="atom-label" x="184" y="139">OD2</text>`:""}
      ${lone(184,104,2)}
      <text class="residue-title" x="270" y="36">His57</text><text class="role-label" x="270" y="55">general base ⇄ general acid</text>
      <path class="bond" d="M284 113L315 83L356 94L366 134L330 154L294 137Z"/><path class="bond double" d="M318 87L350 98"/><path class="bond double" d="M360 130L332 148"/>
      ${atom("hisND1",289,112,"N","nitrogen","His57 Nδ1|Nitrogen|0|2|1|Triad hydrogen-bond donor")}
      ${atom("hisN",364,134,hisPlus?"N⁺":"N","nitrogen","His57 Nε2|Nitrogen|"+(hisPlus?"+1":"0")+"|"+(hisPlus?"3":"2")+"|"+(hisPlus?"0":"1")+"|"+(hisPlus?"General acid":"General base"))}
      ${hisPlus?`<path class="bond" d="M376 142L397 158"/>${atom("proton",405,164,"H*","hydrogen","Transferred proton H*|Hydrogen|+1 modeled|1|0|Proton relay")}`:lone(372,119,1)}
      <path class="hbond" d="M191 116L276 113"/>
      <text class="residue-title" x="430" y="36">Ser195 side chain</text><text class="role-label" x="430" y="55">Oγ — catalytic nucleophile</text>
      <text class="fragment" x="438" y="115">Protein–CH₂</text><path class="bond" d="M505 108L537 108"/>
      ${atom("serO",550,108,serMinus?"O⁻":"O","ser-oxygen","Ser195 Oγ|Oxygen|"+(serMinus?"−1":"0")+"|"+(covalent?"2":serMinus?"1":"2")+"|"+(serMinus?"3":"2")+"|"+(covalent?"Acyl bond":"Catalytic nucleophile"))}
      ${!serMinus && !covalent?`<path class="bond" d="M564 108L589 108"/>${atom("proton",600,108,"H*","hydrogen","Transferred proton H*|Hydrogen|0|1|0|Ser195 proton")}`:""}
      ${lone(561,91,serMinus?3:2)}<path class="hbond" d="M378 132L537 109"/>
      </g>
      ${bound ? `<g class="${state.isolate&&mode==="acyl"?"dimmed":""}"><text class="fragment-label" x="462" y="222">R_C</text><path class="bond substrate" d="M486 217L586 247"/>
        ${atom("carbonylC",610,252,"C","carbon","Carbonyl carbon|Carbon|0|"+(tetra?"4":"3")+"|0|"+(tetra?"tetrahedral; sp³":"electrophile; trigonal planar; sp²"))}
        ${atom("carbonylO",610,170,tetra?"O⁻":"O","oxygen","Carbonyl oxygen|Oxygen|"+(tetra?"−1":"0")+"|"+(tetra?"1":"2")+"|"+(tetra?"3":"2")+"|"+(tetra?"Oxyanion":"Carbonyl oxygen"))}
        <path class="bond ${carbonylDouble?"double":""}" d="M610 235L610 187"/>
        ${peptideAttached?`<path class="bond scissile ${mode==="collapse"?"breaking":""}" d="M627 252L674 252"/>${atom("peptideN",691,252,mode==="collapse"?"NH₂":"NH","nitrogen","Peptide nitrogen|Nitrogen|0|3|1|"+(mode==="collapse"?"Amine-side product":"Leaving group"))}<text class="fragment-label" x="713" y="257">–R_N</text><text class="bond-label" x="642" y="281">scissile peptide bond</text>`:""}
        ${covalent?`<path class="bond covalent ${mode==="attack"?"forming":""}" d="M564 117L599 240"/><text class="bond-label" x="510" y="190">Ser Oγ–C</text>`:`<path class="attack-geometry" d="M563 117L600 239"/>`}
        </g>` : ""}
      ${tetra?`<path class="hbond" d="M610 154L535 300"/><path class="hbond" d="M610 154L662 300"/><text class="donor" x="470" y="323">Gly193 N–H</text><text class="donor" x="640" y="323">Ser195 backbone N–H</text><text class="role-label" x="495" y="345">Oxyanion hole stabilizes developing negative charge</text>`:""}
      ${water?`<g>${atom("waterO",505,414,mode==="water"?"O⁻":"OH","water-oxygen","Water oxygen|Oxygen|"+(mode==="water"?"−1":"0")+"|"+(mode==="water"?"1":"2")+"|"+(mode==="water"?"3":"2")+"|Water-derived nucleophile")}<path class="bond water-bond" d="M505 397L505 375"/><text class="fragment-label" x="480" y="365">${mode==="water"?"activated H–O:":"water-derived OH"}</text>${["waterattack","tetrahedral2"].includes(mode)?`<path class="bond forming" d="M516 402L600 266"/>`:""}</g>`:""}
      ${product?`<g>${mode==="collapse"?`${atom("peptideN",618,414,"NH₂","nitrogen","Peptide nitrogen|Nitrogen|0|3|1|Amine-side product")}<text class="fragment-label" x="643" y="420">–R_N · amine-side product</text>`:`<text class="fragment-label" x="536" y="430">R_C–C(=O)O(H) · carboxyl-side product</text>`}</g>`:""}
      ${arrows.join("")}
      ${state.comparison?`<g class="comparison-inset"><text x="34" y="405">Planar carbonyl: sp², C=O</text><path d="M55 455L105 425M55 455L105 485M55 455L15 455"/><text x="34" y="515">Tetrahedral: sp³, four σ bonds</text></g>`:""}
      <text class="caption" x="55" y="515">${escapeXml(stage.chemistry)}</text>`;
    $("mechanismSvg").classList.toggle("isolate", state.isolate);
    $("mechanismSvg").dataset.strategies = [...document.querySelectorAll("[data-strategy]:checked")].map(node => node.dataset.strategy).join(" ");
    document.querySelectorAll(".atom-node").forEach(node => node.addEventListener("click", () => inspectAtom(node)));
    updateToggles();
  }

  function inspectAtom(node) {
    const [name, element, charge, bonds, pairs, role] = (node.dataset.info || "").split("|");
    if (state.arrowBuilder) {
      state.arrowPick.push({ key: node.dataset.atom, name, pairs: Number(pairs) || 0 });
      if (state.arrowPick.length === 1) {
        $("atomInspector").innerHTML = `<strong>Arrow source: ${escapeXml(name)}</strong><p>Now select the atom receiving electrons.</p>`;
        return;
      }
      const [source, destination] = state.arrowPick.splice(0);
      const validSource = source.pairs > 0 && source.key !== "proton";
      $("atomInspector").innerHTML = `<strong>${validSource ? "Proposed arrow recorded" : "Try again"}</strong><p>${validSource ? `${escapeXml(source.name)} → ${escapeXml(destination.name)}` : "Curved arrows begin at an electron pair or bond, not at a proton."}</p>`;
      return;
    }
    state.track = node.dataset.atom;
    $("trackAtomSelect").value = state.track;
    $("atomInspector").innerHTML = `<strong>${escapeXml(name)}</strong><dl><dt>Element</dt><dd>${escapeXml(element)}</dd><dt>Formal charge</dt><dd>${escapeXml(charge)}</dd><dt>Current bonds</dt><dd>${escapeXml(bonds)}</dd><dt>Lone pairs</dt><dd>${escapeXml(pairs)}</dd><dt>Current role</dt><dd>${escapeXml(role)}</dd></dl>`;
    drawMechanism(stages[state.stage]);
  }

  function drawEnergy() {
    const width = 1100, left = 54, right = 34, bottom = 184, top = 22;
    const x = i => left + i * ((width - left - right) / (stages.length - 1)), y = value => bottom - value * (bottom - top);
    const values = $("energyDetailToggle")?.checked ? [.12,.2,.78,.42,.72,.52,.28,.42,.76,.5,.65,.08] : [.12,.18,.62,.45,.52,.42,.28,.42,.64,.48,.52,.08];
    const path = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
    const labels = ["ES","TS1","Tetrahedral I","TS2","Acyl–enzyme","TS3","Tetrahedral II","TS4","E + products"];
    $("energySvg").innerHTML = `<line class="energy-baseline" x1="${left}" y1="${bottom}" x2="${width-right}" y2="${bottom}"/>
      <text class="energy-label" x="8" y="30">Higher</text><text class="energy-label" x="8" y="${bottom}">Lower</text>
      <path class="energy-path" d="${path}"/>
      <path class="current-guide" d="M${x(state.stage)} 20V${bottom}"/>
      ${stages.map((s, i) => `<g data-energy-stage="${i}"><circle class="energy-point${i === state.stage ? " active" : ""}" cx="${x(i)}" cy="${y(values[i])}" r="8"/><text class="energy-label" x="${x(i)}" y="214" text-anchor="middle">${i + 1}</text></g>`).join("")}
      <path class="phase-bracket" d="M${left} 198H${x(6)}"/><text class="energy-label" x="${(left+x(6))/2}" y="197" text-anchor="middle">Acylation</text>
      <path class="phase-bracket" d="M${x(6)} 198H${width-right}"/><text class="energy-label" x="${(x(6)+width-right)/2}" y="197" text-anchor="middle">Deacylation</text>
      ${$("energyDetailToggle")?.checked?labels.map((l,i)=>`<text class="barrier-label" x="${left+i*(width-left-right)/(labels.length-1)}" y="${i%2?42:65}" text-anchor="middle">${l}</text>`).join(""):""}
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
    $("changeList").innerHTML = `<dt>Proton movement</dt><dd>${escapeXml(stage.proton)}</dd><dt>Bond forming</dt><dd>${escapeXml(stage.forming)}</dd><dt>Bond breaking</dt><dd>${escapeXml(stage.breaking)}</dd><dt>Catalytic role</dt><dd>${escapeXml(stage.role)}</dd>`;
    const config = structures[stage.pdb];
    $("stageFacts").innerHTML = `<dt>Structure</dt><dd>${config.id} · ${config.resolution}</dd><dt>Method</dt><dd>${config.method}</dd><dt>Chains</dt><dd>${config.chains.hisAsp}/${config.chains.serPocket}</dd><dt>Evidence</dt><dd>${stage.evidence}</dd>`;
    drawMechanism(stage);
    renderTimeline();
    drawEnergy();
    validateChemistry(stage);
    if (!options.keepStructure && stage.pdb !== state.structure) loadStructure(stage.pdb);
  }

  function updateToggles() {
    const svg = $("mechanismSvg");
    svg.classList.toggle("hide-atoms", !$("atomsToggle").checked);
    svg.classList.toggle("hide-labels", !$("labelsToggle").checked);
    svg.classList.toggle("hide-atom-labels", !$("atomLabelsToggle").checked);
    svg.classList.toggle("hide-lone-pairs", !$("lonePairsToggle").checked);
    svg.classList.toggle("hide-charges", !$("chargesToggle").checked);
    svg.classList.toggle("hide-hbonds", !$("hbondsToggle").checked);
    svg.classList.toggle("hide-arrows", !$("arrowsToggle").checked);
    svg.classList.toggle("hide-hydrogens", !$("hydrogenToggle").checked);
  }

  function validateChemistry(stage) {
    const tetra = ["tetrahedral", "tetrahedral2"].includes(stage.bonds);
    const checks = {
      restingSerOH: stage.bonds !== "resting" || !$("mechanismSvg").textContent.includes("O⁻"),
      tetrahedralHasOxyanion: !tetra || $("mechanismSvg").textContent.includes("O⁻"),
      tetrahedralNoDoubleCarbonyl: !tetra || !$("mechanismSvg").querySelector(".bond.double[d='M610 235L610 187']"),
      acylBond: stage.bonds !== "acyl" || !!$("mechanismSvg").querySelector(".bond.covalent"),
      regeneratedSerOH: stage.bonds !== "release" || $("mechanismSvg").textContent.includes("H*")
    };
    console.info("[chemical validation]", stage.title, checks);
    return Object.values(checks).every(Boolean);
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

  function showTutorial() {
    const [question, answer, options] = tutorialQuestions[state.tutorial];
    $("tutorialQuestion").textContent = question;
    $("tutorialProgress").textContent = `${state.tutorial + 1} of ${tutorialQuestions.length}`;
    $("tutorialFeedback").textContent = "";
    $("tutorialNextBtn").disabled = true;
    $("tutorialOptions").innerHTML = options.map(option => `<button type="button" class="tutorial-option">${escapeXml(option)}</button>`).join("");
    document.querySelectorAll(".tutorial-option").forEach(button => button.addEventListener("click", () => {
      const correct = button.textContent === answer;
      button.classList.add(correct ? "correct" : "incorrect");
      button.setAttribute("aria-pressed", "true");
      $("tutorialFeedback").textContent = correct ? tutorialQuestions[state.tutorial][3] : "Not yet. Use the atom labels and electron-flow direction, then try another choice.";
      if (correct) $("tutorialNextBtn").disabled = false;
    }));
  }

  function bind() {
    $("prevBtn").addEventListener("click", () => { stop(); setStage(state.stage - 1); });
    $("nextBtn").addEventListener("click", () => { stop(); setStage(state.stage + 1); });
    $("playBtn").addEventListener("click", play);
    $("resetBtn").addEventListener("click", () => {
      stop();
      state.detail = "chemical"; state.track = ""; state.comparison = false; state.isolate = false; state.arrowBuilder = false; state.arrowPick = [];
      ["atomsToggle","labelsToggle","atomLabelsToggle","lonePairsToggle","chargesToggle","hbondsToggle","arrowsToggle","hydrogenToggle"].forEach(id => $(id).checked = true);
      document.querySelectorAll("[data-detail]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.detail === "chemical")));
      $("trackAtomSelect").value = "";
      $("comparisonBtn").setAttribute("aria-pressed", "false"); $("isolateBtn").setAttribute("aria-pressed", "false"); $("arrowBuilderBtn").setAttribute("aria-pressed", "false"); $("arrowBuilderBtn").textContent = "Build the arrows";
      $("representationSelect").value = "cartoon";
      $("speedSelect").value = "3400";
      setStage(0);
    });
    $("focusBtn").addEventListener("click", focusActiveSite);
    $("structureSelect").addEventListener("change", event => loadStructure(event.target.value));
    $("representationSelect").addEventListener("change", focusActiveSite);
    ["atomsToggle","labelsToggle","atomLabelsToggle","lonePairsToggle","chargesToggle","hbondsToggle","arrowsToggle","hydrogenToggle"].forEach(id => $(id).addEventListener("change", updateToggles));
    const updateStrategies = () => {
      const active = [...document.querySelectorAll("[data-strategy]:checked")].map(node => node.dataset.strategy);
      $("mechanismSvg").dataset.strategies = active.join(" ");
    };
    document.querySelectorAll("[data-strategy]").forEach(input => input.addEventListener("change", updateStrategies));
    updateStrategies();
    document.querySelectorAll("[data-detail]").forEach(button => button.addEventListener("click", () => {
      state.detail = button.dataset.detail;
      document.querySelectorAll("[data-detail]").forEach(peer => peer.setAttribute("aria-pressed", String(peer === button)));
      drawMechanism(stages[state.stage]);
    }));
    $("trackAtomSelect").addEventListener("change", event => { state.track = event.target.value; drawMechanism(stages[state.stage]); });
    $("comparisonBtn").addEventListener("click", () => { state.comparison = !state.comparison; $("comparisonBtn").setAttribute("aria-pressed", String(state.comparison)); drawMechanism(stages[state.stage]); });
    $("isolateBtn").addEventListener("click", () => { state.isolate = !state.isolate; $("isolateBtn").setAttribute("aria-pressed", String(state.isolate)); drawMechanism(stages[state.stage]); });
    $("arrowBuilderBtn").addEventListener("click", () => {
      state.arrowBuilder = !state.arrowBuilder;
      $("arrowBuilderBtn").setAttribute("aria-pressed", String(state.arrowBuilder));
      $("arrowBuilderBtn").textContent = state.arrowBuilder ? "Select electron source, then destination" : "Build the arrows";
      state.detail = state.arrowBuilder ? "chemical" : "electron";
      drawMechanism(stages[state.stage]);
    });
    $("energyDetailToggle").addEventListener("change", drawEnergy);
    $("speedSelect").addEventListener("change", () => { if (state.playing) { stop(); play(); } });
    $("evidenceBtn").addEventListener("click", showEvidence);
    $("copyNotesBtn").addEventListener("click", copyNotes);
    $("tutorialBtn").addEventListener("click", () => { state.tutorial = 0; showTutorial(); $("tutorialDialog").showModal(); });
    $("tutorialNextBtn").addEventListener("click", () => {
      if (state.tutorial === tutorialQuestions.length - 1) return $("tutorialDialog").close();
      state.tutorial += 1; showTutorial();
    });
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
