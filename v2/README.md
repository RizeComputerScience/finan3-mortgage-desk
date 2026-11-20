# The Mortgage Machine (version 2 preview)

FINAN III, Financial Markets and Institutions, Unit 6. A practice-and-check tool with one short lender game (step 10), redesigning The Mortgage Desk (version 1, at the root of this repo, still the live course link). Preview: https://rizecomputerscience.github.io/finan3-mortgage-desk/v2/

Source of truth: `build/interactives-v2/mortgage/` in the FINAN III rebuild folder (DESIGN.md, FACTS.md). This folder is a copy of its `site/`.

- `js/core.js`: receipt, checksum, seeding and verification, lifted unchanged from version 1's engine.
- `js/rules.js`: every number, judge, diagnosis and the lender's game simulation, copied from version 1's config; v2 adds the step order, the problem text, the 30-year schedule and the gesture-to-answer maps. App id, seed version and salt are version 1's; receipts are version 3 (round 3's four-year game is saved as `g4:` plus the choices). `verify.html` checks version 3 receipts, and version 1 receipts with `js/rules-v1.js` (version 1's config, unchanged).
- `js/app.js` (shell, the house, debrief steps, memo, receipt, self-checks), `js/game.js` (the machine and the game), `js/art.js` (pictograms), `js/hpi.js` (FHFA price series), `js/photos.js` (year photos and credits).
- `verify.html`: the instructor's checker.
- Tests: serve this folder, then `node tests/core_test.js "$PWD"` (lesson test, every v1 assertion plus v2's) and `node tests/play.js http://127.0.0.1:<port>/ <out dir> [v1 verify URL]` (full playthrough at 1440 and 390 wide, receipt through both verifiers, reduced motion).
- No build step, no external scripts; fonts and images are in the repo.
