# Preliminary hardware and assembly plan

This is an engineering starting point. It has not been wired, fabricated, current-sized or physically tested. Do not treat the generated cover as an assembly drawing. The software deliverable requires no parts purchase.

## Architecture

A host computer provides explicit bounded bench frames over a wired USB/UART link. An Arduino Uno drives two PWM+direction channels. Three motors per side would form a future skid-steer grouping. A real range sensor, encoders and pose estimator are future interfaces, not shipped drivers.

| Item | Quantity | Selection requirement |
| --- | --- | --- |
| Arduino Uno Rev3 or compatible tested board | 1 | 5V logic, suitable USB connection; sketch currently compiles for Uno |
| Matched brushed geared motors | 6 | Same winding/gear ratio; measured stall and running current, mounting drawings and feedback requirements |
| Matching wheels and hubs | 6 | Known shaft fit, load rating and fastener retention |
| Dual-channel driver assembly | 1 or more | Each side must safely support the **sum** of grouped motor currents with thermal margin; do not assume one board can power all six motors |
| Chassis, motor brackets and fasteners | 1 set | Measured rigid footprint must fit the chosen collision envelope; no fabrication-ready geometry is supplied |
| Motor supply, protection and wiring | 1 set | Selected after voltage/current/thermal analysis; fuse, reverse-polarity protection, suitable wire/connectors, independent supply-cut stop |
| Regulated logic supply and interface protection | 1 set | Follow actual board/driver ratings, grounding and isolation requirements |
| Range sensor and encoders | To select | Drivers, units, timing and calibration are not implemented; ideal simulated beams are not a sensor integration |

A [Cytron MDD10A](https://www.cytron.io/p-10amp-5v-30v-dc-motor-driver-2-channels) is an **interface example**, not a qualified purchase choice for this six-motor design. Its manufacturer lists PWM+DIR input and 5–30 V motor operation, with 10 A continuous per channel and no reverse-polarity protection. Actual grouped motor stall current may exceed a channel rating. Start a hardware investigation with one motor per channel and a current-limited supply; qualify the final driver arrangement from actual motor data. The [manufacturer's Uno tutorial](https://www.cytron.io/tutorial/mdd10a-maker-uno-dc-motor-control) illustrates PWM+DIR and a common ground; no third-party circuit drawing is copied here.

## Current pin interface

| Uno pin | Signal | Firmware behavior |
| --- | --- | --- |
| D5 | Left PWM | 0..180 magnitude, neutral0 |
| D6 | Right PWM | 0..180 magnitude, neutral0 |
| D7 | Left direction | HIGH for nonnegative, LOW for negative command |
| D8 | Right direction | HIGH for nonnegative, LOW for negative command |
| D13 / LED_BUILTIN | Armed indicator | Indicator only, not a safety interlock |
| USB Serial | Host protocol | 115200baud; D0/D1 are not assigned to another device |
| GND | Logic reference | Follow the actual driver's grounding design |

[Arduino's official PWM guide](https://support.arduino.cc/hc/en-us/articles/9350537961500-Use-PWM-output-with-Arduino) lists pins 5 and 6 among Uno PWM outputs. Use external pull-downs at PWM inputs and verify the actual driver's neutral truth table. A physical supply-cut stop must work independently of this firmware and host. Motor supply must not be taken from an Arduino I/O pin.

The simulator defaults to 0.32 m effective track and 0.35 m disc radius. These are model assumptions, not measured dimensions. Six-wheel skid steering changes effective turning behavior through tire scrub; calibrate rather than copying simulation values. Select wheelbase, clearance, centre of mass and structural loads from an actual mechanical design. A physical body and all wheel/sensor projections must fit the measured collision envelope.

Use the staged [bench checks](firmware-bench.md) before any free-driving test. Physical assembly, electrical review, firmware upload, sensor integration and field navigation all remain pending human work and evidence.
