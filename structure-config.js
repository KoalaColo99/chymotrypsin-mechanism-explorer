window.STRUCTURES = {
  "4cha": {
    id: "4CHA", file: "./assets/structures/4cha.cif", label: "free enzyme", resolution: "1.68 Å",
    method: "X-ray diffraction", year: 1985, chains: { hisAsp: "B", serPocket: "C" },
    citation: "Tsukada & Blow (1985), J. Mol. Biol. 184, 703–711.",
    doi: "https://doi.org/10.1016/0022-2836(85)90314-6",
    rcsb: "https://www.rcsb.org/structure/4CHA"
  },
  "8gch": {
    id: "8GCH", file: "./assets/structures/8gch.cif", label: "peptide-associated", resolution: "1.60 Å",
    method: "X-ray diffraction", year: 1991, chains: { hisAsp: "F", serPocket: "G" },
    citation: "Harel et al. (1991), Biochemistry 30, 5217–5225.",
    doi: "https://doi.org/10.1021/bi00235a015",
    rcsb: "https://www.rcsb.org/structure/8GCH"
  },
  "1gct": {
    id: "1GCT", file: "./assets/structures/1gct.cif", label: "acyl-enzyme candidate", resolution: "1.60 Å",
    method: "X-ray diffraction", year: 1989, chains: { hisAsp: "B", serPocket: "C" },
    citation: "Dixon & Matthews (1989), Biochemistry 28, 7033–7038.",
    doi: "https://doi.org/10.1021/bi00443a038",
    rcsb: "https://www.rcsb.org/structure/1GCT"
  },
  "1gg6": {
    id: "1GG6", file: "./assets/structures/1gg6.cif", label: "tetrahedral-state analogue", resolution: "1.40 Å",
    method: "X-ray diffraction", year: 2001, chains: { hisAsp: "B", serPocket: "C" },
    citation: "Neidhart et al. (2001), Biochemistry 40, 2439–2447.",
    doi: "https://doi.org/10.1021/bi002535a",
    rcsb: "https://www.rcsb.org/structure/1GG6"
  }
};

window.ACTIVE_SITE_RESIDUES = [
  { name: "HIS", number: 57, chainGroup: "hisAsp" },
  { name: "ASP", number: 102, chainGroup: "hisAsp" },
  { name: "SER", number: 195, chainGroup: "serPocket" },
  { name: "GLY", number: 193, chainGroup: "serPocket" },
  { name: "SER", number: 189, chainGroup: "serPocket" },
  { name: "GLY", number: 216, chainGroup: "serPocket" },
  { name: "GLY", number: 226, chainGroup: "serPocket" }
];
