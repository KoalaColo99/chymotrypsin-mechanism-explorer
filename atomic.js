"use strict";

// Atomic-mode stage text and chemistry metadata are centralized here for instructor editing.
const ATOMIC_STAGES = [
  {short:"Resting triad",title:"Resting catalytic triad",message:"Asp102 hydrogen-bonds with His57, helps orient the imidazole ring, and stabilizes charge redistribution during proton transfer.",reaction:"Resting network",equation:"Asp102–COO⁻ ··· H–Nδ1–His57–Nε2: ··· H–O–Ser195",kind:"resting",arrows:[]},
  {short:"Activate Ser",title:"Ser195 activation",message:"His57 Nε2 acts as a general base. Its lone pair accepts H* while the Ser195 O–H bonding pair returns to oxygen.",reaction:"General base catalysis",equation:"Ser–OH + His ⇌ Ser–O⁻ + His–H⁺",kind:"activation",arrows:[["his-ne2-pair","ser-hstar"],["ser-oh-bond","ser-o"]]},
  {short:"Attack C=O",title:"Attack on the substrate carbonyl",message:"The Ser195 alkoxide attacks the carbonyl carbon; the π electrons move to oxygen as the center changes from planar to tetrahedral.",reaction:"Covalent catalysis begins",equation:"Ser–O⁻ + R–C(=O)–NH–R′ → Ser–O–C(O⁻)(R)(NH–R′)",kind:"attack",arrows:[["ser-o-pair","acyl-c"],["carbonyl-pi","carbonyl-o"]]},
  {short:"Tetrahedral I",title:"First tetrahedral intermediate",message:"The acyl carbon has four single bonds. Gly193 and Ser195 backbone N–H groups stabilize the oxyanion by two hydrogen bonds.",reaction:"Electrostatic stabilization",equation:"Oxyanion hole ··· O⁻–C(R)(NHR′)–O–Ser",kind:"tetra1",arrows:[]},
  {short:"Collapse I",title:"First intermediate collapse",message:"The oxyanion reforms C=O, the scissile C–N bond breaks, and His57 donates H* to the leaving nitrogen.",reaction:"General acid catalysis",equation:"Tetrahedral I → acyl–enzyme + H₂N–R′",kind:"collapse1",arrows:[["oxyanion-pair","acyl-c"],["scissile-bond","peptide-n"],["his-h-bond","peptide-n"]]},
  {short:"Acyl–enzyme",title:"Acyl–enzyme intermediate",message:"The complete ester linkage is Enzyme–Ser195–O–C(=O)–R. The first, amine-containing product has departed.",reaction:"Covalent intermediate",equation:"Enzyme–Ser–O–C(=O)–R + H₂O",kind:"acyl",arrows:[]},
  {short:"Activate H₂O",title:"Water activation",message:"His57 Nε2 acts again as a general base. Its lone pair accepts a water proton while the O–H bonding pair returns to water oxygen.",reaction:"General base catalysis",equation:"H–O–H + His → HO⁻-like nucleophile + His–H⁺",kind:"water",arrows:[["his-ne2-pair","water-hstar"],["water-oh-bond","water-o"]]},
  {short:"Tetrahedral II",title:"Water attack and second tetrahedral intermediate",message:"Water-derived oxygen attacks the acyl carbon. This tetrahedral center bears an added hydroxyl group instead of the peptide nitrogen present in the first intermediate.",reaction:"Hydrolysis + stabilization",equation:"HO⁻ + acyl–enzyme → O⁻–C(R)(OH)–O–Ser",kind:"tetra2",arrows:[["water-o-pair","acyl-c"],["carbonyl-pi","carbonyl-o"]]},
  {short:"Regenerate",title:"Deacylation and regeneration",message:"The oxyanion reforms C=O, the acyl–Ser bond breaks, and His57 returns H* to Ser195 Oγ. The starting triad is restored exactly.",reaction:"Enzyme regeneration",equation:"Tetrahedral II → R–COO⁻/R–COOH + Ser–OH + His",kind:"regenerate",arrows:[["oxyanion-pair","acyl-c"],["acyl-ser-bond","ser-o"],["his-h-bond","ser-o"]]}
];

const atomicState = {stage:0, source:null, arrowIndex:0, geometryOverlay:false, cycleOverlay:false};
const byId = id => document.getElementById(id);
const escapeText = s => s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

function atomicDefs(stage) {
  return `<title id="atomicSvgTitle">${escapeText(stage.title)}</title>
  <desc id="atomicSvgDesc">${escapeText(stage.message)} Complete local structures of Asp102 carboxylate, His57 imidazole, Ser195, substrate, water when relevant, and oxyanion-hole backbone N–H donors are shown.</desc>
  <defs>
    <marker id="atomicArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#3f2d63"/></marker>
    <marker id="protonArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#15549a"/></marker>
  </defs>`;
}
function pair(x,y,site,rotate=0) {
  return `<g class="pair" transform="rotate(${rotate} ${x} ${y})"><circle class="click-atom" data-site="${site}" cx="${x}" cy="${y}" r="15" fill="transparent"/><circle cx="${x-4}" cy="${y}" r="2.4"/><circle cx="${x+4}" cy="${y}" r="2.4"/></g>`;
}
function atomText(atom,x,y,cls,id,label) {
  return `<g class="click-atom" data-atom="${id}"><text class="${cls}" x="${x}" y="${y}">${atom}</text>${label?`<text class="atom-name" x="${x-5}" y="${y+18}">${label}</text>`:""}<circle class="atom-hit click-atom" data-atom="${id}" data-site="${id}" cx="${x+9}" cy="${y-8}" r="17"/></g>`;
}
function bond(x1,y1,x2,y2,cls="bond",site="") {
  const d=`M${x1} ${y1}L${x2} ${y2}`;
  return `<path class="${cls}" d="${d}"/>${site?`<circle class="bond-hit click-atom" data-site="${site}" cx="${(x1+x2)/2}" cy="${(y1+y2)/2}" r="14"/>`:""}`;
}
function backboneContext() {
  return `<g class="backbone-context"><path class="context-bg" d="M35 87Q141 24 270 79T515 73T785 77T1160 85V570H34Z"/><g class="context-fade"><path class="bond" d="M83 405Q159 510 257 430M502 455Q614 545 761 477M1004 468Q1090 535 1160 460"/></g></g>`;
}
function aspStructure() {
  return `<g class="not-isolated">
    <text class="residue-name" x="70" y="146">Asp102 carboxylate</text>
    <g class="backbone-context"><text class="annotation" x="55" y="353">Enzyme–CH₂–</text>${bond(155,345,210,305)}</g>
    ${atomText("C",205,312,"carbon","asp-c","Cγ")}${bond(220,296,183,244,"bond secondary-order")}
    ${bond(228,303,191,251,"double-bond secondary-order")}${bond(229,310,273,257)}
    ${atomText("O",161,238,"oxygen","asp-o1","Oδ1")}${atomText("O",275,253,"oxygen","asp-o2","Oδ2")}
    <text class="charge" x="301" y="238">−</text>${pair(151,218,"asp-o1-pair")}${pair(296,270,"asp-o2-pair")}
    <path class="double-bond" stroke-dasharray="3 4" d="M219 297L181 246M231 306L275 260"/>
    <text class="atom-name" x="76" y="184">equivalent C–O bonds · resonance-delocalized COO⁻</text>
  </g>`;
}
function hisStructure(protonated, hDestination="ser") {
  const hX=hDestination==="water"?536:548, hY=hDestination==="water"?352:334;
  return `<g class="not-isolated">
    <text class="residue-name" x="338" y="146">His57 imidazole</text>
    <g class="backbone-context"><text class="annotation" x="340" y="471">Enzyme–CH₂–</text>${bond(435,454,442,394)}</g>
    ${bond(383,250,438,207)}${bond(438,207,506,237)}${bond(506,237,496,315)}${bond(496,315,425,340)}${bond(425,340,383,250)}
    ${bond(443,216,495,239,"double-bond secondary-order")}${bond(487,307,432,327,"double-bond secondary-order")}
    ${atomText("N",365,257,"nitrogen","his-nd1","Nδ1")}${atomText("N",482,337,"nitrogen","his-ne2","Nε2")}
    ${atomText("H",326,239,"hydrogen","his-nd1-h","H")}${bond(365,248,340,238)}
    ${pair(515,348,"his-ne2-pair",22)}
    ${protonated?`${atomText("H*",hX,hY,"hstar","his-hstar","transferred proton")}${bond(502,329,hX-5,hY-10,"bond","his-h-bond")}<text class="charge" x="${hX+20}" y="${hY-15}">+</text>`:""}
    ${pair(363,280,"his-nd1-pair",90)}
    <path class="hbond" d="M181 237Q260 195 331 233"/>
    <text class="atom-name" x="226" y="198">Asp Oδ ··· H–Nδ1</text>
  </g>`;
}
function serStructure(state) {
  const neutral=state==="neutral", alkoxide=state==="alkoxide", covalent=state==="covalent";
  return `<g>
    <text class="residue-name" x="650" y="146">Ser195 side chain</text>
    <g class="backbone-context"><text class="annotation" x="612" y="476">Enzyme–CH₂–</text>${bond(716,456,716,394)}</g>
    ${atomText("O",702,363,"oxygen","ser-o","Oγ · Ser195 nucleophilic O")}
    ${bond(716,394,716,371)}${neutral?`${bond(728,350,770,322,"bond","ser-oh-bond")}${atomText("H*",777,328,"hstar","ser-hstar","H*")}`:""}
    ${pair(681,342,"ser-o-pair")}${pair(689,377,"ser-o-pair-2",30)}${alkoxide?`${pair(725,332,"ser-o-pair-3",90)}<text class="charge" x="739" y="360">−</text>`:""}
    ${covalent?bond(728,350,887,310,"forming","acyl-ser-bond"):""}
    ${!covalent?`<path class="hbond" d="M515 338Q610 304 704 347"/>`:""}
  </g>`;
}
function oxyanionHole(active=true) {
  return `<g class="not-isolated">
    <rect x="834" y="104" width="278" height="110" rx="30" fill="${active?"rgba(40,127,194,.10)":"rgba(40,127,194,.04)"}" stroke="#287fc2" stroke-dasharray="5 5"/>
    <text class="residue-name" x="858" y="129">Oxyanion hole</text>
    <text class="nitrogen" x="858" y="171">N</text><text class="hydrogen" x="891" y="171">H</text>${bond(875,164,891,164)}
    <text class="atom-name" x="842" y="194">Gly193 backbone N–H</text>
    <text class="nitrogen" x="990" y="171">N</text><text class="hydrogen" x="1023" y="171">H</text>${bond(1007,164,1023,164)}
    <text class="atom-name" x="974" y="194">Ser195 backbone N–H</text>
  </g>`;
}
function substrate(kind) {
  const tetra=kind==="tetra1"||kind==="tetra2";
  const covalent=["attack","tetra1","collapse1","acyl","water","tetra2"].includes(kind);
  const peptideAttached=["resting","activation","attack","tetra1","collapse1"].includes(kind);
  const oxygenY=tetra?255:238, carbonY=310;
  let out=`<g><text class="residue-name" x="860" y="400">Substrate acyl center</text>
    ${atomText("C",910,318,"carbon","acyl-c","carbonyl / tetrahedral C")}
    ${atomText("O",910,oxygenY,"oxygen","carbonyl-o",tetra?"oxyanion O":"carbonyl O")}
    ${bond(924,300,924,oxygenY+8,"bond","carbonyl-pi")}${!tetra?bond(934,300,934,oxygenY+8,"double-bond secondary-order"):""}
    ${bond(943,310,1005,275)}<text class="carbon" x="1010" y="278">R</text><text class="atom-name" x="1027" y="278">Phe-side acyl group</text>`;
  if(peptideAttached) out+=`${bond(943,318,1013,340,kind==="collapse1"?"breaking":"bond","scissile-bond")}${atomText("N",1018,353,"nitrogen","peptide-n","leaving-group N")}${bond(1043,344,1090,320)}<text class="carbon" x="1093" y="324">R′</text>`;
  if(tetra) out+=`<path class="hbond" d="M899 ${oxygenY-6}Q889 214 892 173"/><path class="hbond" d="M936 ${oxygenY-6}Q1002 222 1024 174"/>`;
  if(kind==="tetra2") out+=`${bond(930,320,974,373)}${atomText("O",977,390,"oxygen","water-o","water-derived O")}${bond(1000,382,1031,399)}${atomText("H",1034,405,"hydrogen","water-h","H")}`;
  if(covalent) out+=`<text class="annotation" x="745" y="292">Ser–O–C bond</text>`;
  out+="</g>";
  return out;
}
function waterStructure(kind) {
  if(!["acyl","water","tetra2"].includes(kind)) return "";
  if(kind==="tetra2") return "";
  const activated=kind==="water";
  return `<g class="not-isolated"><text class="residue-name" x="584" y="238">Water</text>
    ${atomText("O",608,290,"oxygen","water-o","water O")}${atomText("H",570,317,"hydrogen","water-h","H")}
    ${atomText("H*",649,315,"hstar","water-hstar","H*")}${bond(610,294,582,308)}${bond(630,294,649,307,"bond","water-oh-bond")}
    ${pair(608,267,"water-o-pair")}${activated?`<text class="charge" x="628" y="278">δ−</text>`:""}
    <path class="hbond" d="M648 305Q575 331 518 337"/>
  </g>`;
}
function arrowsFor(kind) {
  const a=[];
  if(kind==="activation"){a.push(`<path class="p-arrow" d="M520 348Q630 280 766 316"/><path class="e-arrow" d="M744 325Q713 305 699 340"/>`)}
  if(kind==="attack"){a.push(`<path class="e-arrow" d="M704 332Q794 269 910 309"/><path class="e-arrow" d="M934 282Q970 252 938 236"/>`)}
  if(kind==="collapse1"){a.push(`<path class="e-arrow" d="M907 241Q875 271 914 301"/><path class="e-arrow" d="M985 329Q1036 302 1042 340"/><path class="p-arrow" d="M545 324Q782 395 1018 346"/>`)}
  if(kind==="water"){a.push(`<path class="p-arrow" d="M515 347Q574 323 642 311"/><path class="e-arrow" d="M628 300Q615 278 610 282"/>`)}
  if(kind==="tetra2"){a.push(`<path class="e-arrow" d="M691 269Q805 255 912 309"/><path class="e-arrow" d="M934 282Q970 252 938 236"/>`)}
  if(kind==="regenerate"){a.push(`<g opacity=".58"><path class="breaking click-atom" data-site="acyl-ser-bond" d="M728 350L887 310"/><path class="bond click-atom" data-site="his-h-bond" d="M502 329L545 324"/><text class="hstar" x="548" y="329">H*</text><text class="atom-name" x="600" y="286">preceding bonds shown faintly for electron flow</text></g><path class="e-arrow" d="M907 241Q875 271 914 301"/><path class="e-arrow" d="M858 323Q787 385 727 355"/><path class="p-arrow" d="M545 324Q632 315 713 350"/>`)}
  return a.join("");
}
function annotations(kind) {
  if(kind==="activation") return `<text class="annotation" x="553" y="270">His57 general base: Nε2 accepts H*</text>`;
  if(kind==="attack") return `<path class="forming" stroke-dasharray="10 7" d="M728 350L887 310"/><rect class="boxed" x="700" y="280" width="248" height="105" rx="12"/><text class="annotation" x="736" y="410">New enzyme–substrate covalent bond</text>`;
  if(kind==="tetra1") return `<text class="annotation" x="850" y="454">sp³-like tetrahedral carbon · four single bonds</text>`;
  if(kind==="collapse1") return `<text class="annotation" x="834" y="454">C=O reforms · C–N breaks · N receives H*</text>`;
  if(kind==="acyl") return `<rect class="boxed" x="692" y="224" width="304" height="176" rx="12"/><text class="annotation" x="770" y="426">Acyl–enzyme ester bond</text>`;
  if(kind==="water") return `<text class="annotation" x="555" y="213">His57 acts again as a general base</text>`;
  if(kind==="tetra2") return `<text class="annotation" x="823" y="454">sp³ center now bears water-derived –OH</text>`;
  if(kind==="regenerate") return `<text class="annotation" x="711" y="454">Ser195–OH regenerated · triad restored</text>`;
  return `<text class="annotation" x="658" y="533">No covalent enzyme–substrate bond</text>`;
}
function stageFlags(kind) {
  return {
    hisProtonated:["activation","attack","tetra1","collapse1","water","tetra2"].includes(kind),
    serState:kind==="resting"||kind==="regenerate"?"neutral":kind==="activation"||kind==="attack"?"alkoxide":["tetra1","collapse1","acyl","water","tetra2"].includes(kind)?"covalent":"neutral"
  };
}
function renderAtomicSvg() {
  const stage=ATOMIC_STAGES[atomicState.stage], flags=stageFlags(stage.kind);
  let svg=atomicDefs(stage)+backboneContext()+aspStructure()+hisStructure(flags.hisProtonated,stage.kind==="water"||stage.kind==="tetra2"?"water":"ser")+serStructure(flags.serState)+oxyanionHole(["attack","tetra1","tetra2","regenerate"].includes(stage.kind))+substrate(stage.kind)+waterStructure(stage.kind)+arrowsFor(stage.kind)+annotations(stage.kind);
  if(atomicState.geometryOverlay && stage.kind==="tetra1") svg+=`<g opacity=".38"><path class="double-bond" d="M950 300L950 235"/><text class="oxygen" x="939" y="225">O</text><path class="bond" d="M940 310L1030 310"/><text class="annotation" x="825" y="502">Overlay: original trigonal-planar carbonyl geometry</text></g>`;
  if(atomicState.cycleOverlay && stage.kind==="regenerate") svg+=`<g opacity=".38"><rect x="44" y="122" width="765" height="378" rx="18" fill="none" stroke="#247746" stroke-width="5"/><text class="annotation" x="66" y="496">Green overlay: resting and regenerated triads align</text></g>`;
  byId("atomicSvg").innerHTML=svg;
  byId("atomicSvg").querySelectorAll("[data-atom],[data-site]").forEach(target=>target.addEventListener("click",event=>{
    event.stopPropagation();
    if(target.dataset.atom) showAtom(target.dataset.atom);
    if(target.dataset.site) handleArrowPick(target.dataset.site,target);
  }));
  applyAtomicClasses();
}
function applyAtomicClasses() {
  const svg=byId("atomicSvg");
  const map={contextToggle:"show-context",lonePairsToggle:"show-pairs",atomicChargesToggle:"show-charges",hydrogensToggle:"show-hydrogens",bondOrdersToggle:"show-orders",atomicArrowsToggle:"show-arrows",atomicHBondsToggle:"show-hbonds",partialChargesToggle:"show-partial",atomLabelsToggle:"show-labels",protonToggle:"track-proton",densityToggle:"density",isolateToggle:"isolate"};
  Object.entries(map).forEach(([id,cls])=>svg.classList.toggle(cls,byId(id).checked));
}

function atomMetadata(id) {
  const kind=ATOMIC_STAGES[atomicState.stage].kind, flags=stageFlags(kind);
  const data={
    "asp-o1":{atom:"Asp102 Oδ1",charge:"−½ (resonance-delocalized)",bonds:"1.5 equivalent",pairs:"~2.5 equivalent",geometry:"carboxylate, sp²",role:"Hydrogen-bond acceptor to His57 Nδ1",change:"Maintains the organized electrostatic network."},
    "asp-o2":{atom:"Asp102 Oδ2",charge:"−½ (resonance-delocalized)",bonds:"1.5 equivalent",pairs:"~2.5 equivalent",geometry:"carboxylate, sp²",role:"Shares delocalized negative charge",change:"Does not directly remove the Ser195 proton."},
    "his-nd1":{atom:"His57 Nδ1",charge:flags.hisProtonated?"+ within imidazolium":"0",bonds:"3",pairs:flags.hisProtonated?"0 available":"pyrrole-like pair in aromatic sextet",geometry:"trigonal planar, sp²",role:"Faces Asp102 and bears H",change:"Remains hydrogen-bonded to Asp102."},
    "his-ne2":{atom:"His57 Nε2",charge:flags.hisProtonated?"+ within imidazolium":"0",bonds:flags.hisProtonated?"3":"2",pairs:flags.hisProtonated?"0":"1",geometry:"trigonal planar, sp²",role:flags.hisProtonated?"General acid in the next transfer":"General base; proton-transfer nitrogen",change:flags.hisProtonated?"Accepted H*":"Available lone pair faces Ser195 or water."},
    "ser-o":{atom:"Ser195 Oγ",charge:flags.serState==="alkoxide"?"−1":"0",bonds:flags.serState==="neutral"?2:flags.serState==="alkoxide"?1:2,pairs:flags.serState==="alkoxide"?3:2,geometry:"bent; approximately sp³",role:flags.serState==="alkoxide"?"Nucleophile":flags.serState==="covalent"?"Covalent catalyst / ester oxygen":"Future nucleophile",change:flags.serState==="alkoxide"?"Lost H* after deprotonation by His57":flags.serState==="covalent"?"Bonded to substrate acyl carbon":"Ser195–OH resting form."},
    "acyl-c":{atom:"Substrate acyl carbon",charge:"0",bonds:["tetra1","tetra2"].includes(kind)?4:3,pairs:0,geometry:["tetra1","tetra2"].includes(kind)?"tetrahedral, sp³":"trigonal planar, sp²",role:"Electrophilic center",change:["tetra1","tetra2"].includes(kind)?"Changed from C=O to four single bonds":"Carbonyl geometry."},
    "carbonyl-o":{atom:["tetra1","tetra2"].includes(kind)?"Oxyanion oxygen":"Carbonyl oxygen",charge:["tetra1","tetra2"].includes(kind)?"−1":"0",bonds:["tetra1","tetra2"].includes(kind)?1:2,pairs:["tetra1","tetra2"].includes(kind)?3:2,geometry:"terminal oxygen",role:["tetra1","tetra2"].includes(kind)?"Receives two oxyanion-hole H bonds":"Polarizes the acyl carbon",change:["tetra1","tetra2"].includes(kind)?"Received the carbonyl π electrons":"C=O restored or intact."},
    "peptide-n":{atom:"Scissile peptide nitrogen",charge:"0",bonds:3,pairs:1,geometry:"approximately trigonal planar before cleavage",role:"Leaving group during acylation",change:kind==="collapse1"?"C–N bond breaks and N receives H*":"Still attached in the first tetrahedral intermediate."},
    "water-o":{atom:"Water-derived oxygen",charge:kind==="water"?"polarized / hydroxide-like":"0",bonds:kind==="tetra2"?2:2,pairs:kind==="water"?3:2,geometry:"bent; approximately sp³",role:kind==="tetra2"?"New hydroxyl substituent":"Deacylation nucleophile",change:"Activated by His57 Nε2."}
  };
  return data[id]||{atom:id,charge:"—",bonds:"—",pairs:"—",geometry:"—",role:"Electron-flow site",change:"Select a labeled atom for full details."};
}
function showAtom(id) {
  const d=atomMetadata(id);
  const rows=[["Atom",d.atom],["Formal charge",d.charge],["Bonds",String(d.bonds)],["Lone pairs",String(d.pairs)],["Geometry",d.geometry],["Catalytic role",d.role],["Change",d.change]];
  byId("atomDetails").innerHTML=rows.map(([k,v])=>`<dt>${escapeText(k)}</dt><dd>${escapeText(v)}</dd>`).join("");
}

function validateStage(stage) {
  const f=stageFlags(stage.kind), errors=[];
  if(["tetra1","tetra2"].includes(stage.kind) && f.serState!=="covalent") errors.push("Tetrahedral state lacks Ser–O–C bond.");
  if(["tetra1","tetra2"].includes(stage.kind) && stage.kind==="carbonyl") errors.push("Tetrahedral state incorrectly retains C=O.");
  if(["acyl","water"].includes(stage.kind) && f.serState!=="covalent") errors.push("Acyl–enzyme lacks the Ser195–O–C bond.");
  if(stage.kind==="resting" && f.serState!=="neutral") errors.push("Resting Ser195 is not Ser–OH.");
  if(stage.kind==="regenerate" && (f.serState!=="neutral"||f.hisProtonated)) errors.push("Regenerated triad does not match the resting protonation state.");
  stage.arrows.forEach(([source])=>{if(!/(pair|bond|pi)$/.test(source) && !source.includes("-pair")) errors.push(`Arrow source ${source} does not contain an electron pair or bond.`)});
  return errors;
}
function updateValidation() {
  const stage=ATOMIC_STAGES[atomicState.stage], errors=validateStage(stage), badge=byId("chemistryStatus");
  badge.textContent=errors.length?`${errors.length} chemistry issue${errors.length>1?"s":""}`:"Chemistry validated";
  badge.classList.toggle("invalid",errors.length>0);
  const universal=[
    "Asp102 is carboxylate and hydrogen-bonded to His57 Nδ1; it never directly deprotonates Ser195.",
    "His57 Nε2 alone performs the catalytic proton transfers.",
    "Every curved arrow begins at a lone pair or bond.",
    "Tetrahedral intermediates use four single bonds at the acyl carbon.",
    "The acyl–enzyme contains an explicit Ser195–O–C ester bond.",
    "Regeneration restores neutral His57 and Ser195–OH."
  ];
  byId("validationList").innerHTML=(errors.length?errors:universal).map(x=>`<li>${escapeText(x)}</li>`).join("");
}
function renderArrowProgress() {
  const arrows=ATOMIC_STAGES[atomicState.stage].arrows;
  byId("arrowProgress").innerHTML=arrows.length?arrows.map((a,i)=>`<span class="${i<atomicState.arrowIndex?"done":""}">Arrow ${i+1}: ${i<atomicState.arrowIndex?"correct":"waiting"}</span>`).join(""):`<span>No electron-pushing arrows in this stable-state view.</span>`;
  if(byId("buildModeToggle").checked && arrows.length) {
    byId("arrowPrompt").hidden=false;
    byId("arrowPrompt").textContent=atomicState.source?`Source selected. Now select the electron destination for arrow ${atomicState.arrowIndex+1}.`:`Arrow ${atomicState.arrowIndex+1}: select the electron source.`;
  } else byId("arrowPrompt").hidden=true;
}
function handleArrowPick(site,element) {
  if(!byId("buildModeToggle").checked) return;
  const arrows=ATOMIC_STAGES[atomicState.stage].arrows;
  if(!arrows.length||atomicState.arrowIndex>=arrows.length) return;
  const [correctSource,correctDest]=arrows[atomicState.arrowIndex];
  if(!atomicState.source) {
    if(site===correctSource){atomicState.source=site;element.classList.add("selected-source");byId("buildInstructions").textContent="Correct electron source. Now choose the destination."}
    else {element.classList.add("incorrect-pick");byId("buildInstructions").textContent="Curved arrows begin at electrons—a lone pair or bond—not at an atom lacking an available electron source.";setTimeout(()=>element.classList.remove("incorrect-pick"),700)}
  } else {
    if(site===correctDest){atomicState.arrowIndex++;atomicState.source=null;byId("buildInstructions").textContent=atomicState.arrowIndex===arrows.length?"All arrows for this stage are correct.":"Correct. Choose the source for the next arrow.";renderAtomic()}
    else {element.classList.add("incorrect-pick");byId("buildInstructions").textContent="That destination cannot accept this electron pair in the current step.";setTimeout(()=>element.classList.remove("incorrect-pick"),700)}
  }
  renderArrowProgress();
}
function renderMiniComparisons() {
  const base=`<path class="bond" d="M210 115L210 48"/><text class="oxygen" x="199" y="40">O⁻</text><path class="bond" d="M210 115L114 168"/><text x="50" y="184">Ser–O</text><path class="bond" d="M210 115L315 70"/><text x="321" y="72">R</text>`;
  byId("tetraOneMini").innerHTML=base+`<path class="bond" d="M210 115L315 160"/><text class="nitrogen" x="321" y="170">NH–R′</text><text x="132" y="215">Peptide N remains attached</text>`;
  byId("tetraTwoMini").innerHTML=base+`<path class="bond" d="M210 115L315 160"/><text class="oxygen" x="321" y="170">OH</text><text x="120" y="215">Water-derived O is attached</text>`;
}
function renderAtomic() {
  const stage=ATOMIC_STAGES[atomicState.stage];
  byId("atomicStageNumber").textContent=`Atomic step ${atomicState.stage+1} of ${ATOMIC_STAGES.length}`;
  byId("atomicStageTitle").textContent=stage.title;byId("atomicMessage").textContent=stage.message;
  byId("reactionLabel").textContent=stage.reaction;byId("reactionEquation").textContent=stage.equation;
  document.querySelectorAll(".atomic-stage").forEach((b,i)=>{b.classList.toggle("active",i===atomicState.stage);b.setAttribute("aria-current",i===atomicState.stage?"step":"false")});
  byId("compareGeometry").hidden=stage.kind!=="tetra1";byId("compareCycle").hidden=stage.kind!=="regenerate";
  byId("stageQuestion").hidden=atomicState.stage!==0;byId("tetraCompare").hidden=stage.kind!=="tetra2";
  byId("isolateToggle").disabled=!["acyl","water"].includes(stage.kind);if(byId("isolateToggle").disabled)byId("isolateToggle").checked=false;
  renderAtomicSvg();renderArrowProgress();updateValidation();
}
function setAtomicStage(n) {
  atomicState.stage=Math.max(0,Math.min(ATOMIC_STAGES.length-1,n));atomicState.source=null;atomicState.arrowIndex=0;atomicState.geometryOverlay=false;atomicState.cycleOverlay=false;renderAtomic();
}
function resetAtomic() {
  atomicState.stage=0;atomicState.source=null;atomicState.arrowIndex=0;atomicState.geometryOverlay=false;atomicState.cycleOverlay=false;
  ["contextToggle","protonToggle","atomLabelsToggle","lonePairsToggle","atomicChargesToggle","hydrogensToggle","bondOrdersToggle","atomicArrowsToggle","atomicHBondsToggle"].forEach(id=>byId(id).checked=true);
  ["partialChargesToggle","densityToggle","isolateToggle","buildModeToggle"].forEach(id=>byId(id).checked=false);
  document.body.classList.add("zoomed");byId("zoomToggle").setAttribute("aria-pressed","true");byId("questionFeedback").textContent="";byId("buildInstructions").textContent="Select a stage with electron flow, then identify each electron source and destination.";renderAtomic();
}
function initAtomic() {
  byId("atomicTimeline").innerHTML=ATOMIC_STAGES.map((s,i)=>`<button class="atomic-stage" data-stage="${i}" aria-label="Atomic step ${i+1}: ${escapeText(s.title)}"><span class="dot">${i+1}</span><span>${escapeText(s.short)}</span></button>`).join("");
  byId("atomicTimeline").addEventListener("click",e=>{const b=e.target.closest("button");if(b)setAtomicStage(Number(b.dataset.stage))});
  byId("atomicPrev").onclick=()=>setAtomicStage(atomicState.stage-1);byId("atomicNext").onclick=()=>setAtomicStage(atomicState.stage+1);byId("atomicReset").onclick=resetAtomic;
  byId("compareGeometry").onclick=()=>{atomicState.geometryOverlay=!atomicState.geometryOverlay;renderAtomicSvg()};
  byId("compareCycle").onclick=()=>{atomicState.cycleOverlay=!atomicState.cycleOverlay;renderAtomicSvg()};
  byId("zoomToggle").onclick=()=>{const on=document.body.classList.toggle("zoomed");byId("zoomToggle").setAttribute("aria-pressed",String(on));byId("zoomToggle").textContent=on?"Zoomed to Atomic Mechanism":"Zoom to Atomic Mechanism"};
  ["contextToggle","protonToggle","atomLabelsToggle","lonePairsToggle","atomicChargesToggle","hydrogensToggle","bondOrdersToggle","atomicArrowsToggle","atomicHBondsToggle","partialChargesToggle","densityToggle","isolateToggle"].forEach(id=>byId(id).onchange=applyAtomicClasses);
  byId("buildModeToggle").onchange=()=>{atomicState.source=null;atomicState.arrowIndex=0;byId("atomicArrowsToggle").checked=!byId("buildModeToggle").checked;applyAtomicClasses();renderArrowProgress()};
  byId("stageQuestion").addEventListener("click",e=>{const b=e.target.closest("[data-answer]");if(!b)return;const ok=b.dataset.answer==="ne2";b.classList.add(ok?"correct":"incorrect");byId("questionFeedback").textContent=ok?"Correct. Nε2 is pyridine-like, has the available lone pair, and faces Ser195.":"Nδ1 faces Asp102 and bears H. Nε2 is positioned toward Ser195.";byId("questionFeedback").className=`feedback ${ok?"correct":"incorrect"}`});
  window.addEventListener("keydown",e=>{if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;if(e.key==="ArrowLeft"){e.preventDefault();setAtomicStage(atomicState.stage-1)}if(e.key==="ArrowRight"){e.preventDefault();setAtomicStage(atomicState.stage+1)}if(e.key.toLowerCase()==="r"){e.preventDefault();resetAtomic()}});
  renderMiniComparisons();document.body.classList.add("zoomed");renderAtomic();
}
initAtomic();
