# Chymotrypsin Mechanism Explorer

A responsive teaching tool that synchronizes experimental chymotrypsin structures
with a twelve-stage chemical mechanism.

## What is included

- Mol* rendering of locally bundled RCSB mmCIF coordinates
- residue and chain validation for His57, Asp102, Ser195, and the binding pocket
- coordinate-derived catalytic-triad distances
- synchronized 3D structure, 2D chemistry, evidence labels, and reaction coordinate
- explicit separation of experimental structures, analogues, and mechanistic inference
- keyboard navigation, playback, reset, fullscreen, and instructor notes

## Open and publish

The complete 2D mechanism works when `index.html` is opened directly. Browsers
may block local-file access to the bundled mmCIF coordinates; in that case the
left panel automatically displays an active-site schematic with a clear notice.
The coordinate-based Mol* view becomes available automatically on GitHub Pages.

All runtime assets use repository-relative paths. No package installation,
terminal command, remote PDB request, or build step is required.

## Structural sources

- [4CHA](https://www.rcsb.org/structure/4CHA), 1.68 Å — Tsukada & Blow (1985), [DOI](https://doi.org/10.1016/0022-2836(85)90314-6)
- [8GCH](https://www.rcsb.org/structure/8GCH), 1.60 Å — Harel et al. (1991), [DOI](https://doi.org/10.1021/bi00235a015)
- [1GCT](https://www.rcsb.org/structure/1GCT), 1.60 Å — Dixon & Matthews (1989), [DOI](https://doi.org/10.1021/bi00443a038)
- [1GG6](https://www.rcsb.org/structure/1GG6), 1.40 Å — Neidhart et al. (2001), [DOI](https://doi.org/10.1021/bi002535a)

Mol* is bundled locally under `assets/vendor/molstar` (v5.6.1).

## Scientific scope

PDB files provide static experimental coordinate sets, not a reaction movie.
Proton transfers, electron-pushing arrows, transient bonds, and stages without
direct structures are labeled as explanatory inference. Hydrogens are schematic
because they are not resolved in these X-ray coordinate sets.
