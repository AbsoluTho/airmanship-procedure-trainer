# Airmanship Procedure Trainer

An unofficial A320 **procedure** trainer that runs in the browser (iPad first). It is not a flight simulator: the aircraft will follow a fixed trajectory, and the training value is in the cockpit procedures, the MCDU and, later, the ND, PFD and FMA.

Not affiliated with any airline. Not a substitute for the FCOM, FCTM or operator manuals. The navigation data was typed from charts for training only and must never be used for navigation.

## Status: Phase 2 prototype (v0.8.0)

- **MCDU** (Thales FMS2 layout, per FCOM DSC-22): keyboard and scratchpad, INIT A, F-PLN with TMPY (ERASE/INSERT), LAT REV, DEPARTURE, AIRWAYS (with airway-to-airway intersection), ARRIVAL, waypoint insertion, CLR of waypoints and discontinuities.
- **Exercise** OEJN to OETB: RWY 16C MIGD2E, L677 WEJ, V54 TBK, ILS 31 via D179O, ALTN OEMA, FL340, CI 20, with automatic progress checks.
- **EFIS control panel and ND** shown as panel photos with live overlays: EFIS above the ND on the left, MCDU on the right. The EFIS option pushbuttons (CSTR, WPT, VOR D, NDB, ARPT) work one at a time: pressing one deselects the others, pressing the lit one turns it off. They light up and the mode and range knobs turn (tap a position or a knob half). The ND opens like the aircraft on the ground: ARC, 10 NM, GPS PRIMARY (cleared with CLR on the MCDU).
- **ND** (ROSE LS, ROSE VOR, ROSE NAV, ARC, PLAN; range 10 to 320 NM; CSTR, WPT, ARPT options; ROSE LS and ROSE VOR show the compass only for now): active F-PLN in green, TMPY in yellow dashed, missed approach in blue, alternate route in blue dashed, DME arcs and holds drawn. PLAN centres on the waypoint on the second line of the MCDU F-PLN page. Also live on both NDs in the 3D cockpit (EXT PWR on).
- **INIT B**: TAXI, ZFW/ZFWCG, BLOCK, TRIP/TIME, RTE RSV, ALTN, FINAL, EXTRA, TOW/LW, TRIP WIND, MIN DEST FOB. **F-PLN** now shows TIME predictions and EFOB at destination once ZFW and BLOCK are entered.
- **PERF TAKE OFF**: V1/VR/V2 (with V1/VR/V2 DISAGREE), F/S/O speeds, RWY, TO SHIFT, FLAPS/THS, FLEX, TRANS ALT, THR RED/ACC, ENG OUT ACC. Changing the takeoff runway clears the V speeds (CHECK TAKE OFF DATA).
- **Altitude and speed constraints** (v0.8.0): managed CLB levels off at an AT or AT-OR-BELOW constraint (ALT CST\*, ALT CST, with CLB armed) and climbs again once the waypoint is sequenced; managed DES follows a 3° path built back from the runway that meets every arrival constraint (level segments flown in DES) and does not go below an AT or AT-OR-ABOVE constraint before its waypoint; speed constraints cap the managed speed (climb: up to the waypoint; descent: from the waypoint on, decelerating before it); T/D moves with the constraints. OP CLB, OP DES, V/S and FPA ignore them. ALT armed and the PFD target altitude turn magenta when the next level-off is a constraint. ND: constraint circles in flight (magenta predicted met, amber missed, white not taken into account), magenta level-off and start of climb/descent symbols, all vertical-profile arrows drawn with the tip on the route. F-PLN: constrained waypoints show the predicted altitude after a magenta (met) or amber (missed) star.
- **ECAM** (v0.8.0), behind the MCDU: the ECAM button on the MCDU switches to the upper (E/WD) and lower (SD) displays, which together take the MCDU's place; the MCDU key on the ECAM control panel switches back. E/WD: N1 and EGT dials, N2, FF, thrust limit (FLX/TOGA/CLB) with the N1 limit, FOB, slats/flaps with the configuration, T.O memo (T.O CONFIG test from the T.O CONFIG key), LDG memo below 2000 ft, T.O INHIBIT and LDG INHIBIT. SD: automatic page by flight phase (WHEEL on the ground, ENGINE for takeoff, CRUISE, WHEEL with the gear down) and the ENG, BLEED, PRESS, ELEC, HYD, FUEL, APU, COND, DOOR, WHEEL, F/CTL, STS and ALL keys (press a lit key again or CLR for the automatic page); permanent data TAT, SAT, UTC, GW. Systems that are not simulated are shown in their normal state.
- **App icon and install** (v0.7.1): browser tab icon, iPhone/iPad home-screen icon, Android/desktop install with a web app manifest (`manifest.webmanifest`, `icons/`). On the iPad: open the site in Safari, Share, Add to Home Screen.
- **v0.7.0 from the first flight notes**: DIR TO page (in flight, from T-P, temporary F-PLN until INSERT, NAV engages); alternate F-PLN after END OF F-PLN in blue (destination, DCT, alternate), ALTN runway via LAT REV ARRIVAL, ALTN entry on LAT REV at the destination and ENABLE ALTN at a waypoint (FlyByWire); the F-PLN restarts at the FROM line when a waypoint is sequenced, TO waypoint in white, DEST distance counts down; the flight path is rebuilt when the active F-PLN changes in flight; PERF CRZ shows T/D distance and time; deceleration 12 NM flaps 1 (S), 8 NM flaps 2 (F) and gear, 5 NM approach speed; ND T/C or level-off (cyan) and T/D (white) symbols and DECEL (D); VOR/ADF switches on the EFIS with ND bearing pointers and VOR1/VOR2 data (manual RAD NAV or nearest station autotuned); EFIS QNH knob with QNH/STD and in Hg/hPa, altitude corrected for the setting, flashing at the transition altitude and level; PFD: bigger FMA, S/F speeds drawn in front, target altitude kept behind the readout window, green vertical deviation dot on the altitude tape in descent; the SPD knob starts from the present speed or Mach.
- **FCU** (photo with live 7-segment displays in the FlyByWire AirbusFCU font): SPD/MACH, HDG/TRK, ALT and V/S/FPA windows with managed dots and dashes and the LVL/CH dot; knobs turn, pull (selected) and push (managed) through a touch pad; AP1, AP2, A/THR, LOC, APPR and EXPED pushbuttons light up; SPD/MACH, HDG-V/S / TRK-FPA, METRIC ALT and the 100/1000 ALT step work.
- **Guidance from the FCU and FMGS**: lateral RWY, RWY TRK, NAV (re-engages only when the route is intercepted), HDG/TRK, LOC* and LOC; vertical SRS, CLB, OP CLB, EXP CLB, DES (armed before T/D, engages at T/D), OP DES, EXP DES, V/S, FPA, ALT* and ALT (holds the captured altitude until the ALT knob is pulled or pushed), ALT CRZ, G/S* and G/S, LAND, FLARE, ROLL OUT; managed or selected speed; T/D REACHED when the FCU altitude was not lowered. CAT 3 DUAL with AP1+2, SINGLE with one AP, CAT 1 with FD only.
- **EFIS FD and LS keys**: FD shows or removes the FD bars and sets 1 FD 2 / - FD 2 on the FMA; LS shows the LOC and G/S scales with the ILS ident and distance, and LS flashes amber when APPR or LOC is armed without LS. TRK/FPA shows the flight path vector.
- **Layout**: EFIS control panel and FCU aligned on the glareshield row, PFD and ND below, the whole deck matching the MCDU height; flight controls in a bar underneath.
- **Automatic flight (Phase 2)**, captain's side only: START FLIGHT once the F-PLN, INIT and PERF TAKE OFF are complete. The aircraft flies the active F-PLN on a fixed path and a scripted profile: FLX takeoff, THR RED and ACC from PERF, 250 kt below 10000 ft, ECON climb and Mach cruise at the CRZ FL, descent from T/D on a 3° profile, level at the FAF altitude, LOC and G/S capture, CAT 3 DUAL autoland, roll-out and stop. Pause, speed ×1 to ×64, and skip to T/D or the approach.
- **PFD** drawn to match the reference A320 PFD photo (layout, colours, attitude shape, tapes, readout window), lined up with the ND, flight controls above it: FMA (five columns, new modes boxed for 10 s), attitude and roll scale, FD bars, speed tape (VLS, VMAX, S/F/green dot, V1, target), Mach, altitude tape with target altitude and STD/QNH, vertical speed, heading tape, radio altitude, LOC and G/S deviation with the ILS ident and distance.
- **Live during the flight**: ND (aircraft position, GS/TAS, TO waypoint), F-PLN sequencing (passed waypoints disappear, UTC and EFOB), flight phases (PROG, PERF page titles, ACTIVATE APPR PHASE), fuel burn, and the captain's PFD and ND in the 3D cockpit.
- **Departures** start with a climb on runway track to 400 ft AAL when a SID is inserted, or to 1500 ft AAL for a runway-only (visual) departure, shown as an altitude leg such as `(426)` with `C156°`.
- **SEC F-PLN** is shown all in white and is revised directly with the normal F-PLN, LAT REV, DEPARTURE, ARRIVAL, AIRWAYS and VERT REV pages, with no temporary flight plan; it is drawn in white on the ND while displayed.
- **More MCDU/FMGC pages** (layouts from FlyByWire A32NX, figures from the simplified model):
  - IRS INIT (from INIT A; simulated 90 s alignment, ALIGN ON REF), CLIMB/CRZ/DES WIND (from INIT A or VERT REV)
  - RAD NAV (VOR, ADF tuned by ident or frequency from OurAirports; LS autotuned from the selected approach; the ILS frequency is not in the data yet)
  - VERT REV (CLB/DES SPD LIM, SPD and ALT constraints); the F-PLN right keys take SPD/ALT entries (for example `250/`, `/+5000`, `/FL100`) or open VERT REV; CLR deletes constraints
  - PERF CLB, CRZ, DES, APPR (QNH, TEMP, MAG WIND, TRANS ALT, BARO/RADIO minimum, VAPP/VLS, LDG CONF) and GO AROUND, linked by PREV/NEXT PHASE; ACTIVATE APPR PHASE appears once the flight phases exist
  - SEC INDEX (COPY ACTIVE, SEC F-PLN, DELETE, ACTIVATE, SWAP), FUEL PRED, PROG (CRZ/OPT/REC MAX, BRG/DIST TO, REPORT, PREDICTIVE GPS)
  - DATA INDEX 1/2 and 2/2: position, IRS and GPS monitors, A/C STATUS, CLOSEST AIRPORTS, waypoint, navaid and runway lookup
  - AIRPORT key cycles through origin, destination and alternate on the F-PLN
  - The PERF key opens the page of the current flight phase. Live in-flight behaviour comes with the automatic flight of a later phase.
- **ND PLAN** uses the whole screen for the map, so the route runs past the range circle.
- **Cockpit 3D** (Three.js): cockpit panels as textured planes, touch look and zoom, view presets; BAT 1, BAT 2, EXT PWR and APU MASTER SW clickable; live MCDU screens on the pedestal (powered by EXT PWR).

## Layout

| Path | Contents |
|---|---|
| `index.html` | Page markup; loads the scripts below in order |
| `css/app.css` | Styles (same visual language as Airmanship Briefings) |
| `js/core.js` | Shared helpers, image paths, great-circle maths |
| `js/data/navdb.js` | Waypoints and airports (generated by `tools/navdb`) |
| `js/data/procedures.js` | SIDs, approaches and airways typed from charts |
| `js/mcdu.js` | MCDU state, flight-plan logic, pages, input, rendering |
| `js/data/world.js` | Generated from OurAirports: Saudi airports, runway thresholds and navaids (`tools/navdb/ourairports.py`) |
| `js/mcdu2.js` | IRS INIT, WIND, RAD NAV, VERT REV, PERF phase pages, SEC, DATA, FUEL PRED, PROG |
| `js/fcu.js` | FCU state, displays, knob pad and pushbuttons; deck layout sizing |
| `js/flight.js` | Flight guided by the FCU/FMGS modes: lateral and vertical modes, speeds, phases, FMA logic, fuel, flight controls |
| `js/vnav.js` | Altitude and speed constraints: constrained descent path and T/D, constraints acting on the guidance, vertical predictions |
| `js/pfd.js` | PFD drawing |
| `js/ecam.js` | ECAM E/WD and SD (behind the MCDU), engine model, ECAM control keys, MCDU/ECAM switch |
| `js/perf.js` | Simplified fuel, time and speed model used by INIT B, PERF and the F-PLN |
| `js/nd.js` | ND drawing (ROSE NAV, ARC, PLAN) and the EFIS control strip |
| `js/cockpit3d.js` | 3D cockpit scene, pushbuttons, live pedestal MCDUs |
| `js/app.js` | Exercise checks, tabs, MCDU pop-up |
| `img/`, `fonts/`, `vendor/three.min.js` | Assets (Three.js r149) |
| `tools/build_single.py` | Builds `dist/index.html`, one self-contained file for the private test page |
| `tools/navdb/` | Scripts used to turn chart positions and OFP coordinates into `navdb.js` |
| `tests/test_flow.py` | End-to-end test (Playwright + Chrome) of the exercise and the 3D cockpit |

Plain JavaScript, no build step: open `index.html` through any static web server (GitHub Pages works as is).

## Roadmap

1. ~~ND (PLAN, ARC, ROSE NAV) from the flight plan; INIT B and PERF TAKEOFF for predictions.~~ Done in v0.2.0.
2. Aircraft moving along the route, PFD, FMA logic from takeoff to cruise, FCU interaction.
3. Descent and approach (DES, LOC/G/S capture, LAND), go-around and missed approach.
4. Cockpit flows tied to the same aircraft state.

## Data and references

- **OurAirports** (public domain, https://ourairports.com/data/): 37 Saudi airports with runway thresholds, lengths and elevations, and 54 navaids (VOR, VORTAC, DME, NDB) with frequencies. Rebuild with `python3 tools/navdb/ourairports.py` (downloads the CSV files into `tools/navdb/ourairports/`, which is not committed). Airports typed from charts keep their chart elevation, variation and runway courses; their threshold positions now come from OurAirports. Any of these airports can be used in INIT A (FROM/TO, ALTN); only OEJN and OETB have procedures.
- **FlyByWire A32NX** (GPL-3.0, https://github.com/flybywiresim/aircraft): the AirbusFCU font (`fonts/AirbusFCU.ttf`), FCU display formats and FMA mode names; reference for the INIT FUEL PRED and PERF TAKE OFF page layouts and for the ND ROSE and PLAN range labels and compass points. This project is GPL-3.0 as well.
- **FAA CIFP** covers United States procedures only, so it is not used for the Saudi exercises. It could feed a future US exercise route through an ARINC 424 parser.

## Performance figures

`js/perf.js` is a generic, simplified A320-class model (climb, cruise and descent blocks, weight factor, rule-of-thumb F, S and green dot speeds). It exists so the pages show plausible numbers. It is not the FMGS performance database or a performance tool, and its figures must never be used for real flight planning. Transition altitudes in `js/data/procedures.js` default to 13000 ft and should be checked against the current AIP.

## Credits and licence

Flight deck images: [FlyByWire Simulations](https://github.com/flybywiresim) (GPL-3.0). Three.js (MIT). Fonts: Barlow Condensed and IBM Plex (SIL Open Font License).

This project is licensed under the GNU General Public License v3.0 (see `LICENSE`).
