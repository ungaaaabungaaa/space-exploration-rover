# Safety and security boundaries

This repository is a simulator and a preliminary wired bench controller. It is not a flight/space controller, collision-certified vehicle or physical navigation approval. No real board, motor or sensor was connected or flashed during development.

The simulator validates finite units, grid/start/goal geometry and coupled work limits. Curved swept-disc checks use ground truth as a central interlock; a rejected simulation stops accepting states, not a proven physical brake. Accepted state velocities may remain nonzero at a failed termination. Unknown terrain, sensing noise, slip and physical deceleration are not validated.

Firmware uses a bounded fixed buffer, CRC, per-boot sequence checks, explicit arm, signed PWM caps and a command-lease watchdog. These are not authentication, electrical isolation or a hardware emergency stop. A reset clears sequence history. Software cannot establish motor current, thermal margin, wiring or physical stopping distance. A separate supply-cut emergency stop and measured bench tests are required.

The optional serial host opens a device only through an explicit POSIX `--port`. It requires acknowledgments before movement and sends no automatic movement retry/keepalive. Never feed a simulator replay directly to motors. Dry-run and pseudo-terminal tests do not constitute real UART or hardware validation.

The local web server is loopback-only and serves a fixed allowlist; there is no device-control endpoint, telemetry upload, arbitrary file serving or credential. CLI output requires a new path. Generated cover art is labelled as a concept.

Report reproducible defects with synthetic inputs through GitHub issues. Use private vulnerability reporting where available for sensitive issues; otherwise request a private channel with a minimal description. Never include credentials, private locations or actual operational maps publicly. Version 0.1 is the current supported line; no response-time guarantee is offered.
