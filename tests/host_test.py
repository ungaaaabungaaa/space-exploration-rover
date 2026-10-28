import importlib.util
import os
import select
import threading
import time
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("serial_host", ROOT / "tools/serial_host.py")
host = importlib.util.module_from_spec(spec)
spec.loader.exec_module(host)

class HostTests(unittest.TestCase):
    def test_dry_run_opens_no_port_and_requires_arm(self):
        result = subprocess.run([sys.executable, str(ROOT / "tools/serial_host.py"), "--dry-run"], input="arm\nmove 30 -30\nstop\n", text=True, capture_output=True, timeout=5)
        self.assertEqual(result.returncode, 0)
        frames = result.stdout.splitlines()
        self.assertEqual(len(frames), 3)
        self.assertTrue(frames[1].startswith("R1,2,M,30,-30,300*"))
        bad = subprocess.run([sys.executable, str(ROOT / "tools/serial_host.py"), "--dry-run"], input="move 30 30\n", text=True, capture_output=True, timeout=5)
        self.assertEqual(bad.returncode, 1)
        self.assertEqual(bad.stdout, "")

    def test_crc_and_telemetry_validation(self):
        self.assertEqual(host.crc8("123456789"), 0xF4)
        body = "T1,5,A,20,-20,0"
        packet = f"{body}*{host.crc8(body):02X}\n".encode()
        self.assertEqual(host.telemetry(packet)["right"], -20)
        for bad in [packet[:-1], packet.replace(b"*", b"X*"), b"X" * 80 + b"\n"]:
            with self.assertRaises(ValueError):
                host.telemetry(bad)

    @unittest.skipUnless(hasattr(os, "openpty"), "POSIX pseudo-terminal required")
    def test_real_tty_adapter_handles_fragmented_matching_ack(self):
        master, slave = os.openpty()
        port = host.Port(os.ttyname(slave))
        errors = []
        def respond():
            try:
                if not select.select([master], [], [], 1)[0]:
                    raise AssertionError("No command arrived")
                command = os.read(master, 128)
                if not command.startswith(b"R1,1,A,0,0,300*"):
                    raise AssertionError(command)
                body = "T1,1,A,0,0,0"
                response = f"{body}*{host.crc8(body):02X}\n".encode()
                os.write(master, response[:5])
                time.sleep(0.01)
                os.write(master, response[5:])
            except Exception as error:
                errors.append(error)
        responder = threading.Thread(target=respond)
        responder.start()
        try:
            result = port.exchange(host.encode(1, "A"), 1)
            self.assertEqual(result["state"], "A")
            responder.join(timeout=2)
            self.assertFalse(responder.is_alive())
            self.assertEqual(errors, [])
        finally:
            port.close()
            os.close(master)
            os.close(slave)

    def test_explicit_sequence_start_wraps_without_automatic_retry(self):
        result = subprocess.run([sys.executable, str(ROOT / "tools/serial_host.py"), "--dry-run", "--sequence-start", "65535"], input="arm\n", text=True, capture_output=True, timeout=5)
        self.assertEqual(result.returncode, 0)
        self.assertTrue(result.stdout.startswith("R1,0,A,0,0,300*"))

    def test_host_reads_each_line_with_an_actual_size_bound(self):
        class BoundedInput:
            def __init__(self):
                self.calls = []
                self.lines = ["arm\n", "x" * 200]
            def readline(self, size=-1):
                self.calls.append(size)
                if not 0 < size <= 82:
                    raise AssertionError("Unbounded host input read")
                return self.lines.pop(0)[:size] if self.lines else ""
        stream = BoundedInput()
        commands = host.read_commands(stream)
        self.assertEqual(next(commands), "arm\n")
        with self.assertRaises(ValueError):
            next(commands)
        self.assertEqual(stream.calls, [82, 82])

    def test_telemetry_rejects_extra_line_terminators(self):
        body = "T1,5,A,0,0,0"
        frame = f"{body}*{host.crc8(body):02X}".encode()
        self.assertEqual(host.telemetry(frame + b"\n")["state"], "A")
        self.assertEqual(host.telemetry(frame + b"\r\n")["state"], "A")
        for ending in (b"\r\r\n", b"\n\n", b"\r\n\n", b"\r\n\r\n"):
            with self.subTest(ending=ending), self.assertRaises(ValueError):
                host.telemetry(frame + ending)

    @unittest.skipUnless(hasattr(os, "openpty"), "POSIX pseudo-terminal required")
    def test_tty_rejects_malformed_ack_without_retry(self):
        master, slave = os.openpty()
        port = host.Port(os.ttyname(slave))
        commands = []
        errors = []
        def respond():
            try:
                if not select.select([master], [], [], 1)[0]:
                    raise AssertionError("No command arrived")
                commands.append(os.read(master, 128))
                body = "T1,1,A,0,0,0"
                os.write(master, f"{body}*{host.crc8(body):02X}\r\r\n".encode())
            except Exception as error:
                errors.append(error)
        responder = threading.Thread(target=respond)
        responder.start()
        try:
            with self.assertRaises(ValueError):
                port.exchange(host.encode(1, "A"), 1)
            responder.join(timeout=2)
            self.assertFalse(responder.is_alive())
            self.assertEqual(errors, [])
            self.assertEqual(commands, [host.encode(1, "A")])
            self.assertFalse(select.select([master], [], [], 0)[0])
        finally:
            port.close()
            os.close(master)
            os.close(slave)

    def test_bounds(self):
        for fields in [(1, "M", 181, 0, 300), (1, "A", 1, 0, 300), (1, "M", 0, 0, 501), (1, "", 0, 0, 300), (1.5, "A", 0, 0, 300), (1, "M", 1.5, 0, 300)]:
            with self.assertRaises(ValueError):
                host.encode(*fields)

if __name__ == "__main__":
    unittest.main()
