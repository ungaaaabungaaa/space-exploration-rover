# Navigation model and evidence limits

## Frame and kinematics

A map cell is one metre square. Stored rows go north-to-south; simulation coordinates increase east/north. Heading zero faces east and positive turns counterclockwise. The six-wheel chassis is approximated by two side channels with an effective track width; wheel slip and scrubbing are absent. Body collision geometry is a circular envelope, so a physical chassis would have to fit inside it after measurement.

For side linear speeds l,r and track b, v=(l+r)/2 and ω=(r-l)/b. For ω nonzero, the integrated centre is x'=x+(v/ω)[sin(θ+ωdt)-sinθ], y'=y-(v/ω)[cos(θ+ωdt)-cosθ]. Straight motion uses the zero-ω limit. Heading is wrapped to[-π,π]. [WPILib's official differential-drive guide](https://docs.wpilib.org/en/stable/docs/software/kinematics-and-odometry/differential-drive-kinematics.html) documents the chassis/side-speed convention; this code does not depend on WPILib.

Desired side speeds are scaled together to their bound. A common interpolation factor limits their next change to acceleration×dt and preserves the convex side-speed/yaw constraints. This is a discrete command slew bound. Side velocities are held constant inside each tick; continuous motor torque, acceleration and braking transients are not modeled.

## Sensor and private map

Each ideal beam intersects static obstacle rectangles and the world boundary analytically. The first intersection supplies the range. Samples along the clear part update occupancy cells; the hit cell becomes blocked. There is no beam noise, missed return, real LiDAR driver, camera, SLAM, or pose estimator. The complete world is available to this simulated sensor and safety layer, not the planner.

The planner receives dimensions, private occupancy, pose and goal. Unknown cells are provisionally traversable, then blocked when observed. Cardinal BFS produces cell-centre waypoints. A route is replanned when a discovered blocked cell invalidates it. Replanning may briefly return toward the current cell centre; this favors a simple clear reference path over speed. A proportional heading controller turns toward the waypoint and slows near it using a braking-speed envelope. This controller can still fail in tight/fast cases.

## Full swept-path checking

A constant-speed differential-drive tick is an arc. Segments are limited to 0.05 m centre travel and 0.1 rad heading change. For each minor arc, the maximum deviation from its chord is the sagitta |v/ω|×[1-cos(|ωΔt|/2)]. Add that margin to the body radius and test the entire chord against radius-expanded obstacle rectangles. The square expansion is conservative near corners. Boundary clearance is checked with the same margin. A hard 512-piece helper limit and global simulation work/output limits bound computation.

This central ground-truth check rejects unsafe proposals before state/time advance. A rejected run can end with nonzero model side speed at its last accepted frame. No realizable physical deceleration, contact avoidance under uncertainty or emergency-stop distance is established. `acceptedCollisions:0` means the successful-return invariant held; it is not an empirical physical success rate.

## Metrics and reproducibility

Steps count accepted state transitions, with an initial frame at step 0. Time is steps×dt. Path length sums |v|×dt, including curved centre travel rather than chord distance. Replans count actual route searches. Goal error is centre-to-goal Euclidean distance. Maximum speed/yaw/slew metrics use accepted controls only. Rejected-motion count is separate.

Arrival requires position within 0.12 m and stopped model wheels. Unreachable means the private map leaves no route even if remaining unknown cells are considered open. `budget` and `safety_stop` remain failures. Observed-cell counts describe sensor coverage and do not certify terrain traversability.

The nine-run record varies side-speed limit over 0.3,0.6,0.9 m/s on three fixed original maps. All other recorded settings match. There are no random variables, confidence intervals, terrain samples or field trials. Metrics are recorded at 1e-6 precision and checked against fresh runs. Higher speed does not guarantee faster or successful navigation.
