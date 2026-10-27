# Space rover software and bench firmware

Approved mapping: arduino_myProject → space-exploration-rover. Original main `005549f9d996ea1f9df9afabf17ecddddf72f5fc` is saved and verified remotely at `archive/before-space-rover-2026-10-27`. Repository ID550864402 / R_kgDOINWGEg and17stars retained. The old sketches have no license file; new code is original and MIT applies only to new files. MyPortfolio remains unchanged. The user approved rover v3 line-art cover 8 on27October2026; the README includes that exact PNG and its portable provenance. MyPortfolio artwork remains unchanged.

## Design

Deliver a runnable two-dimensional rover navigation lab and a separate Arduino-compatible bench controller. A six-wheel skid-steer rover is approximated by left/right side speeds and a conservative circular body. World coordinates use metres, x east, y north and positive counterclockwise heading. Perfect range beams build a private occupancy map; a bounded grid planner uses only that map. A controller follows cell-centre waypoints with bounded wheel speed, yaw rate and wheel acceleration. Constant-speed arcs are integrated analytically. A central simulator shield checks the entire curved swept disc using conservative chord capsules with a sagitta bound. It rejects unsafe motion and ends the simulation; this is not a physical braking guarantee.

Build three original maps: open rocks, a wall detour and a blocked route. Record actual path/time/control/termination results. A browser worker/replay and CLI share the same core. No ROS, OpenCV, real localization or hardware control is claimed unless actually delivered and checked.

Firmware has fixed-size parsing, CRC8, sequence checks, neutral boot, explicit ARM/MOVE/STOP, bounded PWM and lease, controlled slew/reversal and watchdog neutral. Native C++ tests exercise the actual header. Compile for Arduino Uno with the official toolchain when available; never upload or connect to hardware automatically. A standard-library serial host is opt-in and a dry-run mode needs no device. A preliminary BOM/pin map/build/test guide clearly separates software from hardware evidence and requires actual motor-current/driver selection before wiring.

## Steps and evidence

1. Preserve, inspect and rename the approved source; create isolated branch. Read official differential-drive/Arduino/driver references.
2. Write the simulation/protocol contracts and failing tests. Implement geometry, sensing/private planning, bounded controller, telemetry and failure reports.
3. Implement the shared protocol, actual AVR-compatible controller/sketch and host adapter; test malformed, stale/oversized input, sequence wrap, watchdog, slew and neutral behavior.
4. Add scenarios, reproducible measured runs, CLI, browser worker/replay, scientific plots where useful, and documentation.
5. Run core/protocol/CLI/native firmware tests, actual Arduino compilation, browser QA and cross-platform CI. Record unsupported or unverified checks honestly.
6. Commit/push/attach PR; root independently reviews and merges after CI. Clean only task-created sources/tools after remote verification.

## Limits

Software only: no physical rover, flight/space deployment, electronics certification, current sizing, traction calibration or physical emergency-stop verification. The safety shield uses simulator ground truth, not onboard perception. A failed simulation can end with a moving model state; its rejection does not prove a realizable stop. PWM is open-loop and not metres/second. Hardware requires human assembly and bench evidence.

## Final bench correction

The actual sketch now neutralizes PWM before any direction transition, including STOP from negative output, without an off/on interruption on unchanged nonzero output. A native Arduino API mock includes the actual `.ino` and reproduced the prior bad call order before the correction. Eleven controller behavior groups and the sketch output regression pass under sanitizers. Official Uno compilation of the corrected source uses5872bytes flash and309bytes global SRAM. This is software/compile evidence, not physical pin timing or hardware acceptance.
