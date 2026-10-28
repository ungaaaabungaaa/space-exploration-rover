"""Opt-in POSIX bench transport. No device is opened in --dry-run mode."""
import argparse
import os
import re
import select
import sys
import time

MAX_PWM = 180

def crc8(text):
    value = 0
    for byte in text.encode("ascii"):
        value ^= byte
        for _ in range(8):
            value = ((value << 1) ^ (0x07 if value & 0x80 else 0)) & 255
    return value

def encode(sequence, command, left=0, right=0, lease=300):
    if any(type(value) is not int for value in (sequence, left, right, lease)) or not 0 <= sequence <= 65535 or command not in ("A", "M", "S") or any(abs(value) > MAX_PWM for value in (left, right)) or not 100 <= lease <= 500 or (command in "AS" and (left or right)):
        raise ValueError("Command outside protocol bounds")
    body = f"R1,{sequence},{command},{left},{right},{lease}"
    return f"{body}*{crc8(body):02X}\n".encode("ascii")

def telemetry(raw):
    if len(raw) > 64 or not raw.endswith(b"\n"):
        raise ValueError("Invalid telemetry length")
    text = raw[:-1].decode("ascii")
    if text.endswith("\r"):
        text = text[:-1]
    match = re.fullmatch(r"(T1,(0|[1-9][0-9]*),([AD]),(-?(?:0|[1-9][0-9]*)),(-?(?:0|[1-9][0-9]*)),([0-5]))\*([0-9A-Fa-f]{2})", text)
    if not match or crc8(match[1]) != int(match[7], 16):
        raise ValueError("Invalid telemetry CRC or schema")
    sequence, left, right = int(match[2]), int(match[4]), int(match[5])
    if sequence > 65535 or abs(left) > MAX_PWM or abs(right) > MAX_PWM:
        raise ValueError("Telemetry field outside bounds")
    return {"sequence": sequence, "state": match[3], "left": left, "right": right, "fault": int(match[6])}

class Port:
    def __init__(self, path):
        import termios
        self.fd = os.open(path, os.O_RDWR | os.O_NOCTTY | os.O_NONBLOCK)
        try:
            if not os.isatty(self.fd):
                raise ValueError("--port must name a TTY device")
            settings = termios.tcgetattr(self.fd)
            settings[0] = settings[1] = settings[3] = 0
            settings[2] = termios.CS8 | termios.CREAD | termios.CLOCAL
            settings[4] = settings[5] = termios.B115200
            settings[6][termios.VMIN] = settings[6][termios.VTIME] = 0
            termios.tcsetattr(self.fd, termios.TCSANOW, settings)
            termios.tcflush(self.fd, termios.TCIOFLUSH)
        except Exception:
            os.close(self.fd)
            raise
        self.buffer = bytearray()
        self.failed = False

    def exchange(self, frame, sequence):
        if self.failed:
            raise ConnectionError("Serial exchange failed; close and reopen explicitly before sending commands")
        try:
            return self._exchange(frame, sequence)
        except (OSError, ValueError, KeyboardInterrupt):
            self.failed = True
            self.buffer.clear()
            raise

    def _exchange(self, frame, sequence):
        deadline = time.monotonic() + 1.0
        offset = 0
        while offset < len(frame):
            remaining = deadline - time.monotonic()
            if remaining <= 0 or not select.select([], [self.fd], [], remaining)[1]:
                raise TimeoutError("Serial write timed out")
            try:
                offset += os.write(self.fd, frame[offset:])
            except BlockingIOError:
                pass
        while time.monotonic() < deadline:
            if not select.select([self.fd], [], [], max(0, deadline - time.monotonic()))[0]:
                break
            try:
                chunk = os.read(self.fd, 256)
                if not chunk:
                    raise OSError("Serial device closed")
                self.buffer.extend(chunk)
            except BlockingIOError:
                continue
            if len(self.buffer) > 1024:
                raise ValueError("Serial input exceeded its buffer limit")
            while b"\n" in self.buffer:
                line, _, tail = self.buffer.partition(b"\n")
                self.buffer = bytearray(tail)
                result = telemetry(bytes(line) + b"\n")
                if result["sequence"] == sequence:
                    return result
        raise TimeoutError("No valid matching acknowledgement; do not retry movement automatically")

    def close(self):
        os.close(self.fd)

def read_commands(stream):
    while True:
        line = stream.readline(82)
        if not line:
            return
        if len(line) > 80:
            raise ValueError("Host command too long")
        yield line

def bounded_int(minimum, maximum):
    def convert(text):
        try:
            value = int(text)
        except ValueError as error:
            raise argparse.ArgumentTypeError("Expected a whole number") from error
        if not minimum <= value <= maximum:
            raise argparse.ArgumentTypeError(f"Choose a value from {minimum} to {maximum}")
        return value
    return convert

def main():
    parser = argparse.ArgumentParser(description="Explicit bench commands only; never opens a device in dry-run mode.")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--dry-run", action="store_true", help="Print encoded commands without a serial device")
    mode.add_argument("--port", help="Explicit POSIX TTY path, 115200 baud")
    parser.add_argument("--lease", type=bounded_int(100, 500), metavar="100..500", default=300)
    parser.add_argument("--sequence-start", type=bounded_int(0, 65535), metavar="0..65535", default=0, help="Last acknowledged sequence; next command increments it")
    args = parser.parse_args()
    port = None
    sequence = args.sequence_start
    armed = False
    try:
        if args.port:
            port = Port(args.port)
            time.sleep(2)  # Some Uno USB adapters reset on open. This never arms them.
        if sys.stdin.isatty():
            print("Commands: arm | move LEFT RIGHT | stop | quit. PWM -180..180. A move is one bounded lease; no automatic keepalive.", file=sys.stderr)
        for line in read_commands(sys.stdin):
            fields = line.strip().split()
            if not fields:
                continue
            left = right = 0
            if fields == ["arm"]:
                command = "A"
            elif fields == ["stop"] or fields == ["quit"]:
                command = "S"
            elif len(fields) == 3 and fields[0] == "move":
                if not armed:
                    raise ValueError("An acknowledged arm is required before movement")
                command, left, right = "M", int(fields[1]), int(fields[2])
            else:
                raise ValueError("Unknown command")
            sequence = (sequence + 1) & 65535
            frame = encode(sequence, command, left, right, args.lease)
            if port:
                result = port.exchange(frame, sequence)
                armed = result["state"] == "A" and result["fault"] == 0
                if command in "AM" and not armed:
                    raise ValueError("Controller is neutral/disarmed; no movement retry was sent")
                print(f"ACK {sequence}: {result}", file=sys.stderr)
            else:
                sys.stdout.write(frame.decode("ascii"))
                armed = command != "S"
            if fields == ["quit"]:
                break
    except (OSError, ValueError, TimeoutError, KeyboardInterrupt) as error:
        print(f"Stopped: {error}", file=sys.stderr)
        return 1
    finally:
        if port:
            try:
                # Best effort only. The firmware watchdog is independent of this write.
                os.write(port.fd, encode((sequence + 1) & 65535, "S", lease=args.lease))
            except OSError:
                pass
            port.close()
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
