# Bench protocol and verification

The firmware is a preliminary wired controller, not a complete rover autopilot. The simulator does not send its output to motors. The browser and packet CLI only create text. No upload or real serial connection was made during development.

## Command and state

See the exact [protocol contract](contract.md). Examples, with actual CRC8 values:

```text
R1,1,A,0,0,300*BB
R1,2,M,30,-30,300*22
R1,3,S,0,0,300*F2
```

CRC8 covers the bytes before `*`, polynomial0x07, initial0, no reflection or final xor. It detects accidental corruption, not malicious commands. Sequence freshness applies only during one boot. A reboot forgets the previous sequence; this is not authentication or durable replay protection. If a host process restarts while the board retains its state, use an explicitly known `--sequence-start LAST_ACK` or reset the board with motor supply disabled. The host never guesses or automatically retries an arm sequence.

ARM is neutral. MOVE requires armed state, a fresh sequence and a lease from100 to 500 ms. Any invalid/stale/overflow input or unarmed movement disarms and neutralizes. The watchdog checks unsigned32-bit elapsed milliseconds before processing incoming bytes and in the main loop, including clock rollover. A late MOVE cannot renew an already expired lease. A new explicit ARM is required.

Normal PWM changes by at most 20 units at a 20 ms update, with reversal reaching zero first. If a loop runs late, it does not apply several catch-up increments at once. STOP and faults neutralize immediately. Physical motor response depends on the driver, load and supply and is unverified. Telemetry is best effort: a full TX buffer drops that message rather than blocking control. RX consumes at most 32 bytes per loop. The sketch sets PWM to zero before a direction transition, including STOP from reverse; an unchanged nonzero direction does not insert a PWM off/on cycle.

## Compile, never automatic upload

Official Arduino CLI 1.5.1 and Arduino AVR core 1.8.8 were used with FQBN `arduino:avr:uno`. The archive was checked against the official release SHA-256 list before execution. Local results:5872 bytes flash,309 bytes static SRAM. Native C++ behavior tests compile the same controller header with address/undefined-behavior sanitizers. The real AVR compile verifies the sketch and pin API, not physical timing or motor behavior.

CI uses a checksum-pinned official Linux CLI archive, compiles the Uno sketch and runs native controller and Python host tests. It has no upload step or board access.

## Optional host

`tools/serial_host.py --dry-run` prints frames only. The optional `--port /dev/...` mode uses POSIX termios at 115200 baud; Windows physical serial transport is not implemented. It requires a valid matching acknowledgment after ARM before sending MOVE. Invalid telemetry or timeout exits; movement is not automatically retried. On exit it makes a best-effort STOP write, while the firmware lease watchdog remains independent.

Opening a USB TTY can reset an Uno. The host waits briefly for that reset without arming. Commands are `arm`, `move LEFT RIGHT`, `stop`, and `quit`. A MOVE is a short bench pulse, not continuous teleoperation. There is no automatic keepalive, so typing slowly can allow the arm lease to expire. Use a deliberate short bench command sequence only after the hardware review below. Never pipe a navigation replay directly to this interface.

Tests used a newly created pseudo-terminal for fragmented acknowledgments and dry-run text. That establishes host code behavior, not USB, UART wiring, bootloader, actual motor or watchdog timing on a board.

## Human bench stages

1. Finish driver/motor current sizing, protective hardware and pin review before purchasing or wiring.
2. Inspect polarity and grounding with power disconnected. Add external PWM pull-downs and an independent supply-cut emergency stop. Firmware alone cannot hold outputs safe during boot/reset/hang.
3. With no motor supply connected, a human may upload the reviewed sketch and measure PWM/logic with a suitable instrument. Verify boot neutral, arm neutral, stop, malformed input and lease expiry.
4. Test one unloaded motor per driver channel on a mechanically restrained bench with a current-limited supply. Check direction and reversal at low PWM before any wheel contact.
5. Only after measured current/thermal limits and emergency-stop checks, expand to grouped motors and a supported chassis. Keep wheels clear of people and the ground until direction and watchdog behavior are measured.
6. Record measured speed/PWM curves, encoder/pose uncertainty, electrical protections, thermal behavior and stopping distance. None of that evidence exists in this software package yet.
