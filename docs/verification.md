# Verification record

27 October 2026, macOS, Node.js 24.18.0.

- Final Node checks passed: 17 tests, zero skips/failures, static build and all nine measured scenario reproductions. Imported Node modules had 100% line coverage, 91.25% branch coverage and 95.83% function coverage; browser UI and firmware code are not included in Node coverage.
- Native tests compile the actual `RoverController.h` with C++11, warnings-as-errors and address/undefined-behavior sanitizers. Eleven behavior groups passed, including boot neutral, arm/stop, signed slew/reversal, malformed/oversized input, CRC, sequence wrap/staleness, lease expiry, millis rollover and a late MOVE after lease expiry. A 10000-byte malformed-input sequence also ran under sanitizers.
- Official Arduino CLI 1.5.1 archive SHA-256 was verified from its release checksum list. AVRcore 1.8.8 compiled `arduino:avr:uno` locally:5836 bytes program storage,307 bytes global SRAM. The clean-core build reported four unused-parameter warnings that came from the supplied Arduino core's `new.cpp`, not this project's code. No upload or real serial device operation was run.
- Six Python host tests passed, including dry-run refusal of movement without arm, strict CRC/schema/bounds and a newly created POSIX pseudo-terminal returning fragmented matching telemetry and a bounded-read stream proving the 82-character read limit before rejection. No physical UART was tested.
- Nine deterministic terrain/speed runs are recorded in `results/scenario-runs.json`/CSV at 1e-6 precision and reproduced by the demo check. Default 0.6 m/s runs arrived in the rock field and wall detour; the blocked map ended unreachable. Higher-speed wall runs are explicit safety-stop failures.
- Browser run/step/scrub/frame-builder review is pending root verification. No mobile viewport, public deployment, mechanical build, sensor integration, electrical qualification or field trial is claimed.
- Approved cover 8 SHA-256 is 12f23706a1fbbe1abf9026cfacf42146f893752cb474e2cbdd11162c9cd27d60. PNG chunks/CRC, dimensions 1672×941 and zlib image data were checked before copying, with portable provenance. It is generated concept artwork.

Local checks, native behavior, target compilation, CI, browser operation and hardware acceptance are separate evidence. CI and independent review are required before merge.
