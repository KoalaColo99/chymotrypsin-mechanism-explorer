# Chymotrypsin Catalytic Mechanism Explorer

## Purpose

This responsive, projector-friendly interactive teaches the complete canonical catalytic cycle of chymotrypsin. It emphasizes substrate recognition, the Ser195–His57–Asp102 catalytic triad, two oxyanion-stabilized tetrahedral intermediates, the covalent acyl–enzyme, product release, and enzyme regeneration.

## Launch locally

Open `index.html` in any current browser. No server, build step, account, or internet connection is required.

## Publish with GitHub Pages

1. Put the project files at the root of a GitHub repository (or in a `/docs` folder).
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, select **Deploy from a branch**.
4. Select the branch and `/ (root)` or `/docs`, then save.

## Controls

- **Previous / Next:** move one mechanistic stage.
- **Play / Pause:** automatically advances through the cycle.
- **Reset:** restores Stage 0, medium speed, default visibility, all highlights, the energy comparison, and tutorial answers.
- **Speed:** slow, medium, or fast playback.
- **Display toggles:** independently show electron arrows, formal charges, and hydrogen bonds or highlight the catalytic triad, oxyanion hole, and covalent intermediate.
- **Timeline:** jump directly to any stage.
- **Strategies panel:** highlight the timeline stages where a catalytic strategy operates.
- **Mechanism + Energy:** reveal the reaction-coordinate view and optionally compare a simplified uncatalyzed barrier.
- **Guided Tutorial:** five scaffolded, stage-specific questions with persistent answer feedback.
- **Keyboard:** Left/Right arrows move by stage, Space plays/pauses, and R resets (when focus is not inside a form control or tutorial dialog).

## Scientific overview

The aromatic side chain of a phenylalanine-containing peptide binds in the hydrophobic specificity pocket, aligning the adjacent scissile bond near Ser195. His57 acts first as a general base to activate Ser195; the serine oxygen performs nucleophilic attack. The first tetrahedral oxyanion is stabilized principally by the backbone N–H groups of Gly193 and Ser195. Collapse releases the amine product and leaves an unmistakable covalent Ser195–O–C acyl–enzyme. His57 then activates water for deacylation. A second, hydroxyl-bearing tetrahedral intermediate forms, again stabilized by the oxyanion hole. Its collapse breaks the acyl–Ser bond, releases the carboxyl product, and restores free enzyme. Asp102 organizes and stabilizes His57 throughout; it is not a direct substrate base or nucleophile.

## Accessibility

Controls use semantic buttons, inputs, labels, ARIA names, keyboard access, strong contrast, and visible focus indicators. Text and line styles reinforce color coding. SVG figures include a title and description for every stage. The layout reflows at narrow widths, and reduced-motion preferences disable continuous arrow animation.

## Editing text, colors, and questions

- Edit mechanism stage text, residue roles, strategy tags, and “Look for this” prompts in the `STAGES` array near the top of `script.js`.
- Edit tutorial content in the `QUESTIONS` array.
- Edit strategy descriptions in `STRATEGIES`.
- Edit the named color variables at the top of `styles.css`. Keep sufficient foreground/background contrast and preserve the use of labels and line styles so color is never the sole cue.

## Mechanism checklist

- [x] Stage 0 — Free enzyme and substrate
- [x] Stage 1 — Enzyme–substrate complex
- [x] Stage 2 — Ser195 activation and nucleophilic attack
- [x] Stage 3 — First tetrahedral intermediate
- [x] Stage 4 — Collapse and amine-product departure
- [x] Stage 5 — Acyl–enzyme intermediate
- [x] Stage 6 — Water activation and attack
- [x] Stage 7 — Second tetrahedral intermediate
- [x] Stage 8 — Collapse and enzyme regeneration
- [x] Stage 9 — Product release / restored enzyme

## Design and accuracy notes

Every stage displays only its relevant electron arrows. Proton-transfer arrows begin at the donating bond/electron source; bond-making arrows begin at the nucleophile; carbonyl arrows begin at the π bond. The two tetrahedral intermediates are differentiated by their leaving-group versus newly added hydroxyl substituents. The acyl–enzyme stage uses a solid labeled purple Ser195–O–C bond. The reaction-coordinate profile is intentionally qualitative: catalysis lowers kinetic barriers without changing overall ΔG or equilibrium.
