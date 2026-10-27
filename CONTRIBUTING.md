# Contributing

Use Node.js 22+. Run `npm ci`, `npm run check`, `npm run test:coverage` and `npm run demo -- --check`. Native firmware tests require a C++11 compiler with address/undefined-behavior sanitizers: `npm run test:firmware`. Optional host tests require Python 3 on POSIX: `python3 tests/host_test.py`.

Preserve coordinate/units conventions, private planner knowledge, discrete speed/yaw/slew limits, full curved swept-body checks and bounded replay/work. Add tests before changing those rules. Keep failure outcomes and nonzero terminal model velocity visible; never relabel them as safe physical stops.

For protocol changes, update the written contract and cross-language tests. Retain bounded buffers, neutral boot, explicit arm, rollover-safe lease checks before command processing, sequence handling and fault neutral. Compile the actual Uno sketch. Do not add an upload step or open a physical device in tests or CI.

If the controller changes measured results, regenerate all nine runs and update interpretations, raw JSON/CSV and the generated browser results module. Do not omit failed cases. Record software timing separately from real hardware evidence.

UI changes need actual browser run/step/scrub/frame-builder checks, keyboard access and responsive review. Report browser and viewport checks actually performed. Source photographs, sensor integrations, hardware success or field trials require evidence; generated art is a concept only. Covers require the user's image approval.

Keep tools, caches, binaries, private files and generated logs out of commits. Use temporary local tool directories and clean them after validation/remote preservation.
