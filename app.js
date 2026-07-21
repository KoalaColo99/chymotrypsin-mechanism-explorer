(() => {
  "use strict";
  const BUILD_ID = "2026.07.21-r6";
  const stageCheckpoints = [
    "Ser195 is neutral; His57 is positioned to accept its proton.",
    "The specificity pocket positions the scissile carbonyl beside Ser195.",
    "His57 removes the Ser195 proton, producing Ser–O⁻ and protonated His57.",
    "Ser195 O⁻ attacks the carbonyl carbon; the π electrons move to oxygen.",
    "The substrate oxyanion is stabilized by two backbone N–H groups.",
    "The peptide C–N bond breaks, and His57 protonates the leaving group.",
    "One product has left; the remaining acyl group is covalently attached to Ser195.",
    "His57 removes a proton from water, generating the attacking nucleophile.",
    "Water-derived oxygen attacks the acyl-enzyme carbonyl.",
    "A second substrate-derived oxyanion is stabilized in the oxyanion hole.",
    "The Ser195–acyl bond breaks, restoring the Ser195 hydroxyl.",
    "The second product leaves, and the catalytic triad is ready for another cycle."
  ];
  const timelineLabels = ["Resting triad","Bind substrate","Activate Ser","Attack (TS1)","Tetrahedral I","First collapse (TS2)","Acyl–enzyme","Activate water","Water attack (TS3)","Tetrahedral II","Regenerate (TS4)","Product release"];

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
    stage: 0, structure: "4cha", viewer: null, timer: null, playing: false, reactionFocus: false,
    cache: new Map(), atoms: [], loadToken: 0, detail: "chemical",
    track: "", comparison: false, isolate: false, arrowBuilder: false, arrowPick: [],
    tutorial: 0, chemistryView: { x: 0, y: 0, width: 1200, height: 520 }
  };

  const atomKey = atom => `${atom.auth_asym_id}:${atom.auth_comp_id}${atom.auth_seq_id}:${atom.auth_atom_id}`;
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
  const escapeXml = value => String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&apos;" }[c]));
  let resizeObserver;
  const structureViewState = {
    mode: "focus-active-site", focusedResidues: window.ACTIVE_SITE_RESIDUES, showSurface: false, proteinOpacity: .28
  };
  const structureModes = {
    "focus-active-site": { residues: window.ACTIVE_SITE_RESIDUES, status: "Viewing active site: residues within the catalytic pocket", radius: 9 },
    "catalytic-triad": { residues: [{name:"HIS",number:57,chainGroup:"hisAsp"},{name:"ASP",number:102,chainGroup:"hisAsp"},{name:"SER",number:195,chainGroup:"serPocket"}], status: "Viewing catalytic triad: Asp102, His57, Ser195", radius: 6 },
    "oxyanion-hole": { residues: [{name:"GLY",number:193,chainGroup:"serPocket"},{name:"SER",number:195,chainGroup:"serPocket"}], status: "Viewing oxyanion hole: Gly193 and Ser195 backbone", radius: 5 },
    "specificity-pocket": { residues: [{name:"SER",number:189,chainGroup:"serPocket"},{name:"GLY",number:216,chainGroup:"serPocket"},{name:"GLY",number:226,chainGroup:"serPocket"}], status: "Viewing S1 specificity pocket: Ser189, Gly216, Gly226", radius: 7 }
  };
  const structureModeButtons = {
    "whole-protein":"wholeProteinBtn", "reset-orientation":"orientationBtn",
    "focus-active-site":"focusBtn", "catalytic-triad":"triad3dBtn",
    "oxyanion-hole":"oxyanion3dBtn", "specificity-pocket":"pocket3dBtn"
  };

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
    const resolvedTriadResidues = [
      { residue: "His57", chain: config.chains.hisAsp, found: !!findAtom("HIS",57,config.chains.hisAsp,"NE2") },
      { residue: "Asp102", chain: config.chains.hisAsp, found: !!findAtom("ASP",102,config.chains.hisAsp,"OD2") },
      { residue: "Ser195", chain: config.chains.serPocket, found: !!findAtom("SER",195,config.chains.serPocket,"OG") },
      { residue: "Gly193", chain: config.chains.serPocket, found: !!findAtom("GLY",193,config.chains.serPocket,"N") }
    ];
    console.info("Resolved catalytic triad:", resolvedTriadResidues);
    const unresolved = resolvedTriadResidues.find(item => !item.found);
    if (unresolved) $("viewerLoadState").textContent = `Could not locate ${unresolved.residue} in the loaded structure.`;
    console.info(`[structure validation] ${config.id}`, { atoms: state.atoms.length, missing, aspHis: $("aspHisDistance").textContent, hisSer: $("hisSerDistance").textContent });
  }

  async function ensureViewer() {
    if (state.viewer) return;
    if (!window.molstar?.Viewer) throw new Error("The local Mol* bundle did not initialize.");
    const container = $("molstar-viewer");
    if (!container || container.clientWidth < 20 || container.clientHeight < 20) throw new Error("The viewer panel is not measurable yet.");
    state.viewer = await window.molstar.Viewer.create(container, {
      layoutIsExpanded: false,
      layoutShowControls: false, layoutShowSequence: false, layoutShowLog: false,
      layoutShowLeftPanel: false, viewportShowControls: false, viewportShowExpand: false,
      viewportShowSelectionMode: false, viewportShowAnimation: false,
      viewportShowTrajectoryControls: false, viewportShowSettings: false,
      viewportShowReset: false, viewportBackgroundColor: "#f8fbfc",
      collapseLeftPanel: true, collapseRightPanel: true
    });
    resizeObserver = new ResizeObserver(() => {
      state.viewer?.plugin?.layout?.events?.updated?.next();
      window.dispatchEvent(new Event("resize"));
    });
    resizeObserver.observe(container);
  }

  function activeSiteExpression(config) {
    return selectionSchema(window.ACTIVE_SITE_RESIDUES, config);
  }

  function selectionSchema(residues, config) {
    return {
      items: residues.map(residue => ({
        auth_asym_id: config.chains[residue.chainGroup],
        auth_seq_id: residue.number,
        auth_comp_id: residue.name
      }))
    };
  }

  function updateStructureButtons(activeId) {
    ["focusBtn","wholeProteinBtn","triad3dBtn","oxyanion3dBtn","pocket3dBtn","orientationBtn"].forEach(id => {
      $(id).setAttribute("aria-pressed", String(id === activeId));
    });
  }

  function applyFallbackStructureMode(mode) {
    const svg = $("molstar-viewer").querySelector(".viewer-fallback svg");
    if (!svg) return false;
    const views = {
      "whole-protein": "0 0 620 400", "reset-orientation": "0 0 620 400",
      "focus-active-site": "120 130 360 220", "catalytic-triad": "140 145 320 190",
      "oxyanion-hole": "250 120 260 210", "specificity-pocket": "330 45 260 245"
    };
    svg.setAttribute("viewBox", views[mode] || views["whole-protein"]);
    svg.dataset.mode = mode;
    return true;
  }

  async function applyStructureMode(mode, buttonId) {
    const button = $(buttonId);
    button.disabled = true;
    updateStructureButtons(buttonId);
    structureViewState.mode = mode;
    $("oxyanionCaption").hidden = mode !== "oxyanion-hole";
    const fallback = applyFallbackStructureMode(mode);
    try {
      if (mode === "whole-protein" || mode === "reset-orientation") {
        structureViewState.focusedResidues = [];
        structureViewState.proteinOpacity = 1;
        state.viewer?.plugin?.managers?.interactivity?.lociSelects?.deselectAll?.();
        state.viewer?.plugin?.managers?.camera?.reset(undefined, 500);
        $("viewerLoadState").textContent = mode === "whole-protein" ? "Viewing whole protein" : "Orientation reset";
        return;
      }
      const definition = structureModes[mode];
      structureViewState.focusedResidues = definition.residues;
      structureViewState.proteinOpacity = .28;
      $("viewerLoadState").textContent = definition.status;
      if (!state.viewer) {
        if (!fallback) $("viewerLoadState").textContent = "3D viewer is not ready; using the active-site schematic.";
        return;
      }
      const elements = selectionSchema(definition.residues, structures[state.structure]);
      state.viewer.plugin?.managers?.interactivity?.lociSelects?.deselectAll?.();
      await state.viewer.structureInteractivity({ elements, action: "select" });
      await state.viewer.structureInteractivity({ elements, action: "focus", focusOptions: { minRadius: definition.radius, extraRadius: definition.radius, durationMs: 500 } });
    } catch (error) {
      $("viewerLoadState").textContent = error.message;
      console.warn("Structure view update failed", mode, error);
    } finally {
      window.setTimeout(() => { button.disabled = false; }, 220);
    }
  }

  async function focusActiveSite() {
    if (!state.viewer) return;
    const elements = activeSiteExpression(structures[state.structure]);
    try {
      if (elements) {
        await state.viewer.structureInteractivity({ elements, action: "focus", focusOptions: { minRadius: 7, extraRadius: 5, durationMs: 450 } });
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
    $("viewerLoadState").textContent = `Loading ${config.id}…`;
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
      $("viewerLoadState").textContent = "Interactive 3D ready";
      if (focus) window.setTimeout(() => {
        if (structureViewState.mode === "whole-protein") {
          updateStructureButtons("wholeProteinBtn");
          state.viewer?.plugin?.managers?.camera?.reset(undefined, 350);
        } else {
          applyStructureMode(structureViewState.mode, structureModeButtons[structureViewState.mode]);
        }
      }, 250);
    } catch (error) {
      $("loadStatus").textContent = `Could not load ${config.id}`;
      $("viewerLoadState").textContent = "Schematic fallback";
      $("molstar-viewer").innerHTML = `<div class="viewer-fallback active"><svg viewBox="0 0 620 400" aria-label="Active-site schematic fallback"><path d="M45 205C70 75 220 43 309 105c92-68 237-23 261 92-25 121-168 174-281 111C184 361 68 319 45 205Z" fill="#dcecf2" stroke="#6f9eb5" stroke-width="4"/><path d="M410 82q100 48 38 170q-49-35-110-7q42-69 72-163Z" fill="#fff" stroke="#6f9eb5" stroke-width="3"/><circle cx="211" cy="261" r="27" fill="#194e79"/><circle cx="305" cy="235" r="27" fill="#194e79"/><circle cx="393" cy="264" r="27" fill="#ef8b32"/><text x="178" y="307">Asp102</text><text x="280" y="196">His57</text><text x="380" y="310">Ser195</text><path d="M480 118L434 171L393 230" fill="none" stroke="#23936c" stroke-width="10"/></svg><p>The interactive 3D structure will become available automatically after this project is published through GitHub Pages. You can continue using the complete 2D chemical mechanism below.</p><button id="retryViewerBtn" class="button small" type="button">Retry 3D viewer</button></div>`;
      $("retryViewerBtn")?.addEventListener("click", () => { state.viewer = null; loadStructure(state.structure); });
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
    const atom = (key, x, y, label, cls="carbon", info="") => {
      const symbol = label.replace(/[⁺⁻−+*]/g, "");
      const charge = /[⁺+]/.test(label) ? "+" : /[⁻−]/.test(label) ? "−" : "";
      const star = label.includes("*") ? "*" : "";
      return `<g class="atom-node ${cls}${tracked(key)}" data-atom="${key}" data-info="${escapeXml(info)}"><circle class="atom-hit" cx="${x}" cy="${y}" r="22"/><text class="atom-symbol" x="${x}" y="${y+8}" text-anchor="middle">${symbol}</text>${charge ? `<text class="formal-charge" x="${x+15}" y="${y-12}">${charge}</text>` : ""}${star ? `<text class="atom-star" x="${x+13}" y="${y-10}">*</text>` : ""}</g>`;
    };
    const pairAnchors = {
      top:[0,-30,0], "upper-right":[24,-23,45], right:[31,0,90], "lower-right":[24,23,135],
      bottom:[0,31,0], "lower-left":[-24,23,45], left:[-31,0,90], "upper-left":[-24,-23,135]
    };
    const loneAround = (owner,x,y,anchors=[],active=false) => chemical ? anchors.map((anchor,index)=>{
      const [dx,dy,rotation] = pairAnchors[anchor];
      return `<g class="lone-pair" data-owner="${owner}" data-anchor="${anchor}" transform="translate(${x+dx} ${y+dy}) rotate(${rotation})"><circle cx="-4" cy="0" r="2.7"/><circle cx="4" cy="0" r="2.7"/></g>`;
    }).join("") : "";
    const doubleBond = (x1,y1,x2,y2,offset=3.2,shorten=5,extra="") => {
      const dx=x2-x1,dy=y2-y1,length=Math.hypot(dx,dy)||1,ux=dx/length,uy=dy/length,px=-uy*offset,py=ux*offset;
      const ax=x1+ux*shorten,ay=y1+uy*shorten,bx=x2-ux*shorten,by=y2-uy*shorten;
      return `<g class="double-bond ${extra}"><path class="bond" d="M${(ax+px).toFixed(1)} ${(ay+py).toFixed(1)}L${(bx+px).toFixed(1)} ${(by+py).toFixed(1)}"/><path class="bond" d="M${(ax-px).toFixed(1)} ${(ay-py).toFixed(1)}L${(bx-px).toFixed(1)} ${(by-py).toFixed(1)}"/></g>`;
    };
    const aromaticDetails = `<path class="ring-double" d="M438 186L459 174M482 187L482 211M457 224L438 213"/>`;
    const arrows = [];
    if (full && mode === "activation") arrows.push(`<path class="electron-arrow proton-arrow" d="M658 300Q700 294 748 303"/><path class="electron-arrow bond-return-arrow" d="M770 300Q805 278 832 301"/>`);
    if (full && mode === "attack") arrows.push(`<path class="electron-arrow attack-arrow" d="M835 304Q865 285 900 252"/><path class="electron-arrow pi-arrow" d="M900 235Q872 205 900 183"/>`);
    if (chemical && mode === "collapse") arrows.push(`<path class="electron-arrow collapse-arrow reform-arrow" d="M898 184Q872 213 900 238"/><path class="electron-arrow collapse-arrow cleavage-arrow" d="M925 248Q955 218 978 249"/><path class="electron-arrow collapse-arrow protonate-arrow" d="M724 316Q850 360 978 276"/><text class="event-label event-reform" x="830" y="132">C=O reforms</text><text class="event-label event-cleave" x="936" y="323">C–N bond breaks</text><text class="event-label event-protonate" x="776" y="387">His57 protonates leaving group</text>`);
    if (full && ["water","waterattack"].includes(mode)) arrows.push(`<path class="electron-arrow" d="M650 252Q725 420 795 414"/>${mode==="waterattack"?`<path class="electron-arrow" d="M810 410Q855 350 900 264"/><path class="electron-arrow" d="M902 238Q874 199 900 174"/>`:""}`);
    $("chemistry-svg").innerHTML = `
      <title id="mechanismTitle">${escapeXml(stage.title)}</title>
      <desc id="mechanismDesc">${escapeXml(stage.chemistry)}</desc>
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><path d="M0 0L8 3L0 6Z" fill="#a33263"/></marker>
      </defs>
      <g id="active-site-contour" class="active-site-contour" aria-hidden="true">
        <path class="pocket-contour" d="M128 304C118 190 216 118 334 126C426 78 548 92 620 143C718 99 844 111 921 166C1012 151 1087 177 1135 229L1135 302C1064 274 1004 291 944 339C842 390 726 386 632 354C534 394 414 383 331 346C247 373 156 355 128 304Z"/>
        <path class="specificity-recess" d="M929 164C1007 150 1081 180 1135 229L1135 284C1078 262 1023 275 968 316C981 249 967 201 929 164Z"/>
        <path class="substrate-channel" d="M1125 229C1080 236 1048 249 1018 270"/>
        <path class="product-exit" d="M1010 318C1060 336 1100 351 1142 362"/>
        <path class="oxyanion-feature" d="M846 159Q900 127 946 161"/>
        <text class="contour-label specificity-label" x="979" y="150">specificity pocket</text>
        <text class="contour-label oxyanion-label" x="829" y="139">oxyanion hole</text>
      </g>
      <g id="structures-layer" class="structures-layer ${state.isolate && mode==="acyl" ? "dimmed" : ""}">
      <g class="residue-structure asp-structure" transform="translate(26 73) scale(1.7)">
      <text class="residue-title" x="38" y="36">Asp102</text>
      <path class="bond" d="M48 108L88 108L122 82"/>${doubleBond(122,79,157,57,2.2,3,"asp-carbonyl")}<path class="bond" d="M126 87L161 112"/>
      <text class="fragment" x="38" y="113">Protein–CH₂</text>${atom("aspOD1",170,52,"O","oxygen","Asp102 OD1|Oxygen|0|1|2|Carboxylate oxygen")}
      ${atom("aspOD2",174,118,"O⁻","oxygen","Asp102 OD2|Oxygen|−1|1|3|Hydrogen-bond acceptor")}${chemical?`<text class="atom-label" x="182" y="37">OD1</text><text class="atom-label" x="184" y="139">OD2</text>`:""}
      ${loneAround("aspOD1",170,52,["upper-left","upper-right"],false)}${loneAround("aspOD2",174,118,full?["right","lower-right","bottom"]:["right"],["resting","activation","tetrahedral","collapse"].includes(mode))}
      </g><g class="residue-structure his-structure" transform="translate(39 73) scale(1.7)">
      <text class="residue-title" x="270" y="36">His57</text>
      <path class="bond" d="M284 113L315 83L356 94L366 134L330 154L294 137Z"/>${doubleBond(318,87,350,98,2,3,"ring-bond")}${doubleBond(360,130,332,148,2,3,"ring-bond")}
      ${atom("hisND1",289,112,"N","nitrogen","His57 Nδ1|Nitrogen|0|2|1|Triad hydrogen-bond donor")}
      ${atom("hisN",364,134,hisPlus?"N⁺":"N","nitrogen","His57 Nε2|Nitrogen|"+(hisPlus?"+1":"0")+"|"+(hisPlus?"3":"2")+"|"+(hisPlus?"0":"1")+"|"+(hisPlus?"General acid":"General base"))}
      ${chemical?`<text class="atom-label" x="258" y="111">Nδ1</text><text class="atom-label" x="374" y="155">Nε2</text>`:""}
      ${hisPlus?`<path class="bond" d="M376 142L397 158"/>${atom("proton",405,164,"H*","hydrogen","Transferred proton H*|Hydrogen|+1 modeled|1|0|Proton relay")}`:loneAround("hisN",364,134,["right"],["resting","activation","water"].includes(mode))}
      ${!hisPlus?`<path class="bond" d="M284 101L272 82"/><text class="hydrogen-label" x="258" y="79">H</text>`:""}
      </g><g class="residue-structure ser-structure" transform="translate(-100 120) scale(1.7)">
      <text class="residue-title" x="430" y="36">Ser195</text>
      <path class="bond" d="M505 108L537 108"/><text class="backbone-label" x="468" y="94">Ser195–CH₂</text>
      ${atom("serO",550,108,serMinus?"O⁻":"O","ser-oxygen","Ser195 Oγ|Oxygen|"+(serMinus?"−1":"0")+"|"+(covalent?"2":serMinus?"1":"2")+"|"+(serMinus?"3":"2")+"|"+(covalent?"Acyl bond":"Catalytic nucleophile"))}
      ${chemical?`<text class="atom-label" x="538" y="82">Oγ</text>`:""}
      ${!serMinus && !covalent?`<path class="bond ser-oh-bond" d="M536 108L511 108"/>${atom("proton",500,108,"H*","hydrogen","Transferred proton H*|Hydrogen|0|1|0|Ser195 proton")}`:""}
      ${loneAround("serO",550,108,serMinus?(full?["upper-right","right","lower-right"]:["right"]):["upper-right","lower-right"],mode==="attack")}</g></g>
      <g id="hydrogen-bonds-layer" class="hydrogen-bonds-layer"><path class="hbond asp-his-hbond" d="M322 274L530 263"/><path class="hbond his-ser-hbond" d="M658 301L750 304"/></g>
      ${bound ? `<g class="reaction-fragment ${state.isolate&&mode==="acyl"?"dimmed":""}" transform="translate(290 0)"><path class="aromatic-ring" d="M430 182L460 165L490 182L490 216L460 233L430 216Z"/>${aromaticDetails}<path class="bond substrate p1-connect" d="M490 216L520 233L533 233M567 233L592 249"/>${atom("alphaC",550,233,"Cα","carbon","P1 alpha carbon|Carbon|0|4|0|Connects aromatic side chain to scissile carbonyl")}<path class="bond peptide-stub" d="M550 250L522 270L474 270"/><text class="fragment-label p1-label" x="407" y="145">P1: Phe, Tyr, or Trp</text><text class="fragment-label peptide-left" x="424" y="276">R–NH–</text>
        ${atom("carbonylC",610,252,"C","carbon","Carbonyl carbon|Carbon|0|"+(tetra?"4":"3")+"|0|"+(tetra?"tetrahedral; sp³":"electrophile; trigonal planar; sp²"))}
        ${atom("carbonylO",610,170,tetra?"O⁻":"O","oxygen","Carbonyl oxygen|Oxygen|"+(tetra?"−1":"0")+"|"+(tetra?"1":"2")+"|"+(tetra?"3":"2")+"|"+(tetra?"Oxyanion":"Carbonyl oxygen"))}${loneAround("carbonylO",610,170,tetra?(full?["upper-left","top","upper-right"]:["top"]):["upper-left","upper-right"],["attack","tetrahedral","collapse","waterattack","tetrahedral2","deacyl"].includes(mode))}
        ${carbonylDouble?doubleBond(610,235,610,187,3.2,1,"carbonyl-double"):`<path class="bond" d="M610 235L610 187"/>`}
        ${peptideAttached?`<path class="bond scissile ${mode==="collapse"?"cleaving":""}" d="M627 252L674 252"/><g class="leaving-group ${mode==="collapse"?"departing":""}">${atom("peptideN",691,252,mode==="collapse"?"NH₂":"NH","nitrogen","Peptide nitrogen|Nitrogen|0|3|1|"+(mode==="collapse"?"Amine-side product":"Leaving group"))}${loneAround("peptideN",691,252,["upper-right"])}<path class="bond peptide-continuation" d="M708 252L751 252"/><text class="fragment-label peptide-right" x="758" y="258">–R</text></g><text class="bond-label scissile-label" x="642" y="289">scissile bond</text>${mode==="collapse"?`<text class="product-label" x="650" y="342" text-anchor="middle">First product: amine-containing peptide fragment</text>`:""}`:""}
        ${covalent?`<path class="covalent-highlight" d="M545 294L594 260"/><path class="bond covalent ${mode==="attack"?"forming":""}" d="M545 294L594 260"/><text class="bond-label acyl-bond-label" x="548" y="311">Ser Oγ–C</text>`:`<path class="attack-geometry" d="M545 294L598 260"/>`}
        </g>` : ""}
      ${tetra?`<g id="hydrogen-bonds-layer-extra" class="hydrogen-bonds-layer oxyanion-focus" transform="translate(290 0)"><text class="oxyanion-note" x="610" y="36" text-anchor="middle">Two backbone N–H groups stabilize the negatively charged oxyanion</text><text class="donor" x="505" y="82">Gly193 backbone N–H</text><text class="donor" x="650" y="82">Ser195 backbone N–H</text><path class="donor-bond" d="M548 92L575 116"/><path class="donor-bond" d="M680 92L650 116"/><path class="hbond" d="M575 116L610 154"/><path class="hbond" d="M650 116L610 154"/></g>`:""}
      ${water?`<g class="water-entry" transform="translate(290 0)">${atom("waterO",505,414,mode==="water"?"O⁻":"OH","water-oxygen","Water oxygen|Oxygen|"+(mode==="water"?"−1":"0")+"|"+(mode==="water"?"1":"2")+"|"+(mode==="water"?"3":"2")+"|Water-derived nucleophile")}${loneAround("waterO",505,414,mode==="water"?(full?["left","lower-left","lower-right"]:["left"]):["lower-left","lower-right"],["water","waterattack"].includes(mode))}<path class="bond water-bond" d="M505 397L505 375"/><text class="fragment-label" x="480" y="365">${mode==="water"?"activated H–O:":"water-derived OH"}</text>${["waterattack","tetrahedral2"].includes(mode)?`<path class="bond forming" d="M516 402L600 266"/>`:""}</g>`:""}
      ${product && mode!=="collapse"?`<g class="departing-fragment release-product" transform="translate(290 0)"><path class="aromatic-ring" d="M430 182L460 165L490 182L490 216L460 233L430 216Z"/>${aromaticDetails}<path class="bond substrate" d="M490 216L520 233L533 233M567 233L592 249"/>${atom("productAlphaC",550,233,"Cα","carbon","Product P1 alpha carbon|Carbon|0|4|0|Aromatic product scaffold")}${atom("productC",610,252,"C","carbon","Carboxyl product carbon|Carbon|0|3|0|Carboxyl carbon")}${atom("productO",610,170,"O","oxygen","Carboxyl product oxygen|Oxygen|0|2|2|Carbonyl oxygen")}${loneAround("productO",610,170,["upper-left","upper-right"])}${doubleBond(610,235,610,187,3.2,1,"carbonyl-double")}<path class="bond" d="M627 252L660 252"/>${atom("productOH",677,252,"OH","oxygen","Product hydroxyl oxygen|Oxygen|0|2|2|Carboxylic acid")}${loneAround("productOH",677,252,["upper-right","lower-right"])}<text class="product-label" x="570" y="342" text-anchor="middle">Carboxyl-containing product departing</text></g>`:""}
      <g id="electron-arrows-layer" class="electron-arrows-layer">${arrows.join("")}</g>
      ${state.comparison?`<g class="comparison-inset"><text x="34" y="405">Planar carbonyl: sp², C=O</text><path d="M55 455L105 425M55 455L105 485M55 455L15 455"/><text x="34" y="515">Tetrahedral: sp³, four σ bonds</text></g>`:""}
      `;
    let explanation = stage.chemistry;
    if (mode === "resting") explanation = "His57 Nε2 is positioned to remove the Ser195 proton. Asp102 helps orient His57 and stabilizes charge redistribution within the catalytic triad.";
    if (mode === "activation") explanation = "His57 acts as a general base. Its Nε2 lone pair removes the Ser195 proton, forming the strongly nucleophilic Ser195 alkoxide. His57 becomes protonated, while Asp102 helps organize and stabilize the catalytic hydrogen-bond network.";
    if (tetra) explanation = "The oxyanion hole stabilizes negative charge on the substrate oxygen using backbone N–H groups from Gly193 and Ser195. The Ser195 side-chain oxygen attacks; the Ser195 backbone N–H is a different atom that helps stabilize the oxyanion.";
    $("chemistryExplanation").innerHTML = `<span class="explanation-icon" aria-hidden="true">i</span><div><strong>What’s happening?</strong><p>${escapeXml(explanation)}</p></div>`;
    const intermediateCaption = mode === "tetrahedral"
      ? "Tetrahedral intermediate I (TI1): sp³ (≈109.5°). Oxyanion stabilized by two backbone N–H groups."
      : mode === "tetrahedral2"
        ? "Tetrahedral intermediate II (TI2): sp³ (≈109.5°). The water-derived oxygen is incorporated as the oxyanion is stabilized."
        : stageCheckpoints[state.stage];
    $("stageCheckpoint").textContent = intermediateCaption;
    $("chemistry-svg").classList.toggle("isolate", state.isolate);
    $("chemistry-svg").classList.toggle("playing", state.playing);
    $("chemistry-svg").classList.toggle("tetrahedral-emphasis", tetra);
    $("chemistry-svg").classList.toggle("reaction-focus", state.reactionFocus);
    $("chemistry-svg").classList.toggle("full-electron", full);
    $("chemistry-svg").dataset.bonds = mode;
    const stageFrames = {
      resting:"0 76 950 372", bound:"210 72 970 390", activation:"160 72 900 390", attack:"270 72 860 390",
      tetrahedral:"270 54 880 420", collapse:"300 58 860 410", acyl:"280 75 830 380", water:"270 85 850 410",
      waterattack:"280 68 850 430", tetrahedral2:"280 52 870 440", deacyl:"270 70 870 430", release:"100 74 1020 410"
    };
    if (!state.reactionFocus && stageFrames[mode]) $("chemistry-svg").setAttribute("viewBox", stageFrames[mode]);
    $("oxyanionCaption").hidden = !tetra && structureViewState.mode !== "oxyanion-hole";
    $("chemistry-svg").dataset.strategies = [...document.querySelectorAll("[data-strategy]:checked")].map(node => node.dataset.strategy).join(" ");
    document.querySelectorAll(".atom-node").forEach(node => node.addEventListener("click", () => inspectAtom(node)));
    updateToggles();
    requestAnimationFrame(resolveAnnotationCollisions);
  }

  function resolveAnnotationCollisions() {
    const svg = $("chemistry-svg");
    if (!svg) return;
    const blockers = [...svg.querySelectorAll(".lone-pair,.formal-charge")].map(node => node.getBoundingClientRect());
    const placed = [...blockers];
    const labels = [...svg.querySelectorAll(".atom-label,.residue-title,.fragment-label,.bond-label,.contour-label,.backbone-label")];
    const overlaps = (a,b) => a.left < b.right + 3 && a.right + 3 > b.left && a.top < b.bottom + 3 && a.bottom + 3 > b.top;
    labels.forEach(label => {
      label.style.display = "";
      label.removeAttribute("transform");
      let accepted = false;
      for (const dy of [0,-18,18,-34,34]) {
        label.setAttribute("transform", `translate(0 ${dy})`);
        const rect = label.getBoundingClientRect();
        if (!placed.some(other => overlaps(rect,other))) { placed.push(rect); accepted = true; break; }
      }
      if (!accepted && label.matches(".fragment-label,.bond-label,.contour-label")) label.style.display = "none";
      else if (!accepted) placed.push(label.getBoundingClientRect());
    });
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

  function applyChemistryView() {
    const view = state.chemistryView;
    $("chemistry-svg").setAttribute("viewBox", `${view.x} ${view.y} ${view.width} ${view.height}`);
  }

  function zoomChemistry(factor) {
    const view = state.chemistryView;
    const nextWidth = Math.max(560, Math.min(1500, view.width * factor));
    const nextHeight = nextWidth * (520 / 1200);
    view.x += (view.width - nextWidth) / 2;
    view.y += (view.height - nextHeight) / 2;
    view.width = nextWidth;
    view.height = nextHeight;
    applyChemistryView();
  }

  function resetChemistryView() {
    state.chemistryView = { x: 0, y: 0, width: 1200, height: 520 };
    applyChemistryView();
  }

  function drawEnergy() {
    const width = 1100, bottom = 184, top = 24;
    const xPositions = [55,125,205,275,360,450,535,615,700,785,875,1045];
    const values = [.12,.17,.52,.84,.36,.76,.25,.48,.82,.34,.73,.08];
    const y = value => bottom - value * (bottom - top), x = i => xPositions[i];
    const points = xPositions.map((px,i)=>[px,y(values[i])]);
    const path = points.reduce((d,p,i)=>{
      if (!i) return `M${p[0]} ${p[1]}`;
      const prev=points[i-1], mid=(prev[0]+p[0])/2;
      return `${d} C${mid} ${prev[1]},${mid} ${p[1]},${p[0]} ${p[1]}`;
    },"");
    const features = [
      [55,"Reactants"],[275,"TS1 · nucleophilic attack"],[360,"TI1"],[450,"TS2 · first collapse"],
      [535,"Acyl enzyme"],[700,"TS3 · water attack"],[785,"TI2"],[875,"TS4 · second collapse"],[1045,"Products"]
    ];
    $("energySvg").innerHTML = `<line class="energy-baseline" x1="55" y1="${bottom}" x2="1045" y2="${bottom}"/>
      <text class="energy-disclaimer" x="550" y="18" text-anchor="middle">Schematic free-energy profile — relative energies are qualitative.</text>
      <text class="energy-label" x="8" y="38">Higher</text><text class="energy-label" x="8" y="${bottom}">Lower</text>
      <path class="energy-path" d="${path}"/>
      <path class="current-guide" d="M${x(state.stage)} 25V${bottom}"/>
      ${stages.map((s, i) => { const kind = [3,5,8,10].includes(i) ? " transition" : [4,9].includes(i) ? " tetrahedral" : i === 6 ? " acyl" : ""; return `<g data-energy-stage="${i}"><circle class="energy-point${kind}${i === state.stage ? " active" : ""}" cx="${x(i)}" cy="${y(values[i])}" r="${i===state.stage?10:5}"/><text class="energy-stage-name${i===state.stage?" active":""}" x="${x(i)}" y="218" text-anchor="middle">${i + 1}</text></g>`; }).join("")}
      ${features.map(([fx,label],i)=>`<text class="barrier-label" x="${fx}" y="${i%2?48:68}" text-anchor="middle">${label}</text>`).join("")}
      <text class="current-energy-label" x="${x(state.stage)}" y="${Math.min(176,y(values[state.stage])+26)}" text-anchor="middle">${escapeXml(stages[state.stage].short)}</text>
      <text class="energy-label" x="550" y="232" text-anchor="middle">Reaction progress</text>`;
    document.querySelectorAll("[data-energy-stage]").forEach(node => node.addEventListener("click", () => setStage(Number(node.dataset.energyStage))));
  }

  function renderTimeline() {
    $("timeline").innerHTML = stages.map((stage, i) => `<button class="stage-btn" data-stage="${i}" aria-current="${i === state.stage ? "step" : "false"}" title="${escapeXml(stage.title)}"><b>${i + 1}</b>${escapeXml(timelineLabels[i])}</button>`).join("");
    document.querySelectorAll("[data-stage]").forEach(button => button.addEventListener("click", () => { stop(); setStage(Number(button.dataset.stage)); }));
  }

  function renderSources() {
    $("sourceList").innerHTML = Object.values(structures).map(s => `<li><a href="${s.rcsb}" target="_blank" rel="noreferrer">${s.id}</a>, ${s.resolution}, ${escapeXml(s.citation)} <a href="${s.doi}" target="_blank" rel="noreferrer">DOI</a></li>`).join("");
  }

  function setStage(index, options = {}) {
    state.stage = (index + stages.length) % stages.length;
    const stage = stages[state.stage];
    $("stageKicker").textContent = `Step ${state.stage + 1} of ${stages.length}`;
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
    if ($("structureOverlay")) {
      $("structureOverlay").dataset.stage = state.stage;
      $("structureOverlay").dataset.bonds = stage.bonds;
      $("structureOverlay").classList.toggle("playing", state.playing);
    }
    $("playbackStatus").textContent = `${state.playing ? "Playing" : "Paused at"} step ${state.stage + 1}: ${stage.short}`;
    // Playback keeps one experimentally loaded active-site scaffold and one camera.
    // Alternate structures are loaded only when the user explicitly chooses one.
    if (options.syncStructure && stage.pdb !== state.structure) loadStructure(stage.pdb, false);
  }

  function updateToggles() {
    const svg = $("chemistry-svg");
    const essentialChemistry = state.detail !== "conceptual";
    svg.classList.toggle("hide-atoms", !$("atomsToggle").checked);
    svg.classList.toggle("hide-labels", !$("labelsToggle").checked);
    svg.classList.toggle("hide-atom-labels", !$("atomLabelsToggle").checked);
    svg.classList.toggle("hide-lone-pairs", !essentialChemistry && !$("lonePairsToggle").checked);
    svg.classList.toggle("hide-charges", !essentialChemistry && !$("chargesToggle").checked);
    svg.classList.toggle("hide-hbonds", !essentialChemistry && !$("hbondsToggle").checked);
    svg.classList.toggle("hide-arrows", !$("arrowsToggle").checked);
    svg.classList.toggle("hide-hydrogens", !essentialChemistry && !$("hydrogenToggle").checked);
  }

  function validateChemistry(stage) {
    const tetra = ["tetrahedral", "tetrahedral2"].includes(stage.bonds);
    const checks = {
      restingSerOH: stage.bonds !== "resting" || !$("chemistry-svg").textContent.includes("O⁻"),
      tetrahedralHasOxyanion: !tetra || $("chemistry-svg").textContent.includes("O⁻"),
      tetrahedralNoDoubleCarbonyl: !tetra || !$("chemistry-svg").querySelector(".bond.double[d='M610 235L610 187']"),
      acylBond: stage.bonds !== "acyl" || !!$("chemistry-svg").querySelector(".bond.covalent"),
      regeneratedSerOH: stage.bonds !== "release" || $("chemistry-svg").textContent.includes("H*")
    };
    console.info("[chemical validation]", stage.title, checks);
    return Object.values(checks).every(Boolean);
  }

  function stop() {
    window.clearTimeout(state.timer);
    state.timer = null;
    state.playing = false;
    $("playBtn").textContent = "Play mechanism";
    $("playBtn").setAttribute("aria-pressed", "false");
    $("chemistry-svg")?.classList.remove("playing");
    if ($("playbackStatus")) $("playbackStatus").textContent = `Paused at step ${state.stage + 1}: ${stages[state.stage].short}`;
  }

  function play() {
    if (state.playing) return stop();
    state.playing = true;
    $("playBtn").textContent = "Pause";
    $("playBtn").setAttribute("aria-pressed", "true");
    const advance = () => {
      if (state.stage === stages.length - 1) return stop();
      setStage(state.stage + 1);
      schedule();
    };
    const schedule = () => {
      const base = Number($("speedSelect").value);
      const hold = [4, 6, 9].includes(state.stage) ? Math.max(4500, base * 1.5) : base;
      state.timer = window.setTimeout(advance, hold);
    };
    setStage(state.stage, { keepStructure: true });
    schedule();
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
    $("restartBtn").addEventListener("click", () => { stop(); setStage(0); });
    $("playBtn").addEventListener("click", play);
    $("resetBtn").addEventListener("click", () => {
      stop();
      state.detail = "chemical"; state.track = ""; state.comparison = false; state.isolate = false; state.arrowBuilder = false; state.arrowPick = []; state.reactionFocus = false;
      ["atomsToggle","labelsToggle","atomLabelsToggle","lonePairsToggle","chargesToggle","hbondsToggle","arrowsToggle","hydrogenToggle"].forEach(id => $(id).checked = true);
      document.querySelectorAll("[data-detail]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.detail === "chemical")));
      $("trackAtomSelect").value = "";
      $("comparisonBtn").setAttribute("aria-pressed", "false"); $("isolateBtn").setAttribute("aria-pressed", "false"); $("arrowBuilderBtn").setAttribute("aria-pressed", "false"); $("arrowBuilderBtn").textContent = "Build the arrows";
      $("reactionFocusBtn").setAttribute("aria-pressed", "false");
      $("representationSelect").value = "cartoon";
      $("speedSelect").value = "3000";
      setStage(0);
    });
    $("focusBtn").addEventListener("click", () => applyStructureMode("focus-active-site", "focusBtn"));
    $("wholeProteinBtn").addEventListener("click", () => applyStructureMode("whole-protein", "wholeProteinBtn"));
    $("orientationBtn").addEventListener("click", () => applyStructureMode("reset-orientation", "orientationBtn"));
    $("triad3dBtn").addEventListener("click", () => applyStructureMode("catalytic-triad", "triad3dBtn"));
    $("oxyanion3dBtn").addEventListener("click", () => applyStructureMode("oxyanion-hole", "oxyanion3dBtn"));
    $("pocket3dBtn").addEventListener("click", () => applyStructureMode("specificity-pocket", "pocket3dBtn"));
    $("structureSelect").addEventListener("change", event => loadStructure(event.target.value));
    $("representationSelect").addEventListener("change", focusActiveSite);
    ["atomsToggle","labelsToggle","atomLabelsToggle","lonePairsToggle","chargesToggle","hbondsToggle","arrowsToggle","hydrogenToggle"].forEach(id => $(id).addEventListener("change", updateToggles));
    const updateStrategies = () => {
      const active = [...document.querySelectorAll("[data-strategy]:checked")].map(node => node.dataset.strategy);
      $("chemistry-svg").dataset.strategies = active.join(" ");
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
    $("chemFitBtn").addEventListener("click", resetChemistryView);
    $("chemZoomInBtn").addEventListener("click", () => zoomChemistry(0.82));
    $("chemZoomOutBtn").addEventListener("click", () => zoomChemistry(1.22));
    $("chemResetBtn").addEventListener("click", resetChemistryView);
    $("reactionFocusBtn").addEventListener("click", () => {
      state.reactionFocus = !state.reactionFocus;
      $("reactionFocusBtn").setAttribute("aria-pressed", String(state.reactionFocus));
      drawMechanism(stages[state.stage]);
    });
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
    $("buildId").textContent = BUILD_ID;
    console.info(`[build] Chymotrypsin Mechanism Explorer ${BUILD_ID}`);
    bind();
    renderSources();
    setStage(0, { keepStructure: true });
    requestAnimationFrame(() => requestAnimationFrame(() => loadStructure("4cha")));
  }

  window.addEventListener("DOMContentLoaded", init);
})();
