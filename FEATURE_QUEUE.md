# Feature queue

Delivered 28 October 2026: the POSIX serial host rejects repeated telemetry line terminators. Exactly LF or CRLF is accepted, in agreement with the JavaScript parser. A pseudo-terminal check proves malformed acknowledgement rejection without an automatic movement retry. No physical serial device was opened.

Next useful work:
Delivered final round: failed POSIX serial exchanges now latch the adapter against further commands until explicit close/reopen. Actual pseudo-terminal disconnect and dropped-ack tests verify no retry write and cleared partial input.

- Expand stale-acknowledgement diagnostics and user-controlled reconnection checks.
- Add watchdog and emergency-stop state-machine edge cases before hardware bench tests.
- Compare controlled sensor-noise cases with the existing idealized navigation model.
