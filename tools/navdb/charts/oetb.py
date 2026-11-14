# OETB Tabuk / Prince Sultan bin Abdulaziz. Jeppesen 11-1, 13-1, 13-2, 13-3, 13-4 (eff 9 Jul 26).
# No SIDs or STARs published: departures are NO SID (or radar vectors), arrivals start at the approach IAFs.
AP = Apt('OETB', var=3.2)
a = AP
# ---- TBK VORTAC radial/DME fixes ----
for r, d, n in [(43, 15, 'D043O'), (179, 15, 'D179O'), (120, 15, 'D120O'), (90, 15, 'D090O'), (70, 15, 'D070O'),
                (61, 15, 'MUPVA'), (61, 20, 'D061T'), (242, 15, 'D242O'), (242, 4.4, 'RIKOL'), (123, 15, 'D123O'),
                (123, 5.4, 'KUMDI'), (123, 1.3, 'MA31'), (61, 13, 'D061M'), (343, 13, 'D343M'), (313, 13, 'D313M'),
                (313, 9.8, 'D313J'), (313, 6.3, 'RAGMI'), (313, 1.8, 'MA13'), (62, 3.1, 'MA24')]:
    a.fix(n, a.rad('TBK', r, d))
# ---- ILS DME 24: ITBK DME reads 0.7 at the threshold ----
a.fix('SOBOX', a.ext('24', 5.1))
a.fix('CI24', a.ext('24', 8.1))
a.notes.append('MUPVA  %.2f NM between D15 TBK R-061 and D12.8 ITBK' % gc(a.P('MUPVA'), a.ext('24', 12.1)))
a.notes.append('SOBOX  %.2f NM between D5.8 ITBK and D8.0 TBK' % gc(a.P('SOBOX'), a.rad('TBK', 62, 8.0)))

MISS_24 = [W('TBK', '+3500'), W('MUPVA', '@6000'), HOLD(241, 'R', 6000)]
VIA_24 = {'D043O': [W('D043O', '+5000'), ARC('MUPVA', 'TBK', '@5000')],
          'D179O': [W('D179O', '+5500'), ARC('MUPVA', 'TBK', '@5000')],
          'D061T': [W('D061T', '+5000'), W('MUPVA', '@5000')]}
a.apprs['ILS24'] = dict(type='ILS', rwy='24', crs=242, nav='ITBK', freq=109.5, vias=VIA_24,
                        final=[W('CI24', '@5000'), W('SOBOX', '@4130')], dest={'lbl': 'C242°', 'alt': A('@2602')},
                        missed=MISS_24)
a.apprs['VOR24'] = dict(type='VOR', rwy='24', crs=242, vor='TBK', vias=VIA_24,
                        final=[W('SOBOX', '@4400'), W('MA24', '@3000')], dest={'lbl': 'C242°', 'alt': A('@2602')},
                        missed=MISS_24)
a.apprs['VOR06'] = dict(type='VOR', rwy='06', crs=62, vor='TBK',
                        vias={'D179O': [W('D179O', '+5200'), ARC('D242O', 'TBK', '+5200')]},
                        final=[W('RIKOL', '@4200')], dest={'lbl': 'C062°', 'alt': A('@2595')},
                        missed=[W('MUPVA', '+6000'), HOLD(241, 'R', 6000)])
a.apprs['VOR13'] = dict(type='VOR', rwy='13', crs=133, vor='TBK',
                        vias={'D061M': [W('D061M', '+5000'), ARC('D343M', 'TBK', '+5000'), ARC('D313M', 'TBK', '@5000')]},
                        final=[W('D313M', '@5000'), W('D313J', '+3500'), W('RAGMI', '@4200'), W('MA13', '@3160')],
                        dest={'lbl': 'C133°', 'alt': A('@2580')},
                        missed=[HDG(133, 3500), W('MUPVA', '@6000'), HOLD(241, 'R', 6000)])
a.apprs['VOR31'] = dict(type='VOR', rwy='31', crs=303, vor='TBK',
                        vias={'D179O': [W('D179O', '+5500'), ARC('D123O', 'TBK', '+5000')],
                              'D043O': [W('D043O', '+5000'), ARC('D123O', 'TBK', '+5000')]},
                        final=[W('KUMDI', '@4200'), W('MA31', '@2900')], dest={'lbl': 'C303°', 'alt': A('@2598')},
                        missed=[HDG(310, 3500), W('MUPVA', '@6000'), HOLD(241, 'R', 6000)])
# ILS 31 as first typed in the prototype from John's chart (IPKS 111.9 confirmed by John)
a.apprs['ILS31'] = dict(type='ILS', rwy='31', crs=309, nav='IPKS', freq=111.9,
                        vias={'D179O': [W('D179O', '+5500'), ARC('D136O', 'TBK', '+5500'), W('CI31', '@4200')],
                              'D043O': [W('D043O', '+5000'), ARC('D120O', 'TBK', '+5000'), W('CI31', '@4200')],
                              'TBK': [W('TBK', '+5000'), W('ITNOG', '@5000', lbl='C127°')]},
                        final=[W('ITNOG', '+4200', lbl='C309°')], dest={'lbl': 'C309°', 'alt': A('@2598')},
                        missed=[HDG(309, 3500), W('MUPVA', '+6000'), HOLD(241, 'R', 6000)])
