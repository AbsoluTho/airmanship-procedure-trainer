# OERK Riyadh / King Khalid. Jeppesen 11-.. ILS Y Rwy 15L, 15R, 33L, 33R (RNAV transitions). First part only:
# the ILS Z, RNP and VOR approaches, the STARs and the SIDs are not entered yet.
AP = Apt('OERK', var=3.2)          # runway 147/327 magnetic on a true bearing of 150.2
a = AP
a.rcrs.update({'15L': 147, '15R': 147, '33L': 327, '33R': 327})
fix, to, frm, ext, dep = a.fix, a.to, a.frm, a.ext, a.dep
# IF and FAF on the extended centreline (distance to the threshold from the profile view)
fix('LONUD', ext('15L', 13.7)); fix('ITETU', ext('15L', 6.0)); fix('ALPUR', ext('15R', 13.3)); fix('TAVNU', ext('15R', 9.1))
fix('LOPAK', ext('33L', 9.6)); fix('SODUT', ext('33L', 4.4)); fix('ORMAT', ext('33R', 9.1)); fix('KIRUP', ext('33R', 4.5))
# IAFs
fix('RK621', to('LONUD', 135, 7.2)); fix('RK721', to('LONUD', 147, 7.0))
a.chk('RK621', to('ALPUR', 147, 7.1)); a.chk('RK721', to('ALPUR', 159, 7.1))
fix('RK413', to('LOPAK', 300, 3.3)); fix('RK517', to('LOPAK', 327, 6.8))
a.chk('RK413', to('ORMAT', 327, 3.0)); a.chk('RK517', to('ORMAT', 339, 7.1))
# missed approach fixes. Published: the tracks and the distances 7.0, 9.9, 11.1 and 9.3. The other positions (RK703, RK769, RK612, RK503,
# RK526, RK533, ORBON) are measured on the chart drawing with the chart's own scale, to about 0.5 NM.
fix('RK703', dep('15L', 0.5)); fix('RK769', frm('RK703', 2, 11.9)); fix('RK762', frm('RK769', 327, 7.0)); fix('MEPTU', frm('RK762', 12, 9.9))
fix('RK612', frm('ALPUR', 197, 7.0)); fix('RK655', frm('RK612', 320, 11.1)); fix('PEDIR', frm('RK655', 327, 7.0))
fix('RK503', dep('33L', 1.3)); fix('RK526', frm('RK503', 243, 13.9)); fix('ORLUD', frm('RK526', 188, 9.3))
fix('RK533', dep('33R', 1.0)); fix('ORBON', frm('RK533', 76, 16.0))
d_ = lambda c, t: {'lbl': 'C%03d°' % c, 'alt': A('@%d' % t)}
def appr(id, rwy, crs, vias, final, dest, missed, nav, freq):
    a.apprs[id] = dict(type='ILS', rwy=rwy, crs=crs, vias=vias, final=final, dest=dest, missed=missed, nav=nav, freq=freq)
appr('ILS15LY', '15L', 147, {'RK621': [W('RK621', '@6000', 210)], 'RK721': [W('RK721', '@6000', 210)]},
     [W('LONUD', '@6000', 210), W('ITETU', '@4000')], d_(147, 2037),
     [W('RK703'), W('RK769', '@5000'), W('RK762'), W('MEPTU', '@5000', 190), HOLD(57, 'R', 5000)], 'IELF', 109.5)
appr('ILS15RY', '15R', 147, {'RK621': [W('RK621', '@5000', 210)], 'RK721': [W('RK721', '@6000', 210)]},
     [W('ALPUR', '@5000', 210), W('TAVNU', '@5000')], d_(147, 2053),
     [HDG(147, 2500), W('RK612', '@4000'), W('RK655'), W('PEDIR', '@4000', 190), HOLD(312, 'R', 4000)], 'ITIH', 110.5)
appr('ILS33LY', '33L', 327, {'RK413': [W('RK413', '@5000', 190)], 'RK517': [W('RK517', '@7000', 190)]},
     [W('LOPAK', '@5000', 190), W('SODUT', '@3500')], d_(327, 2037),
     [W('RK503'), W('RK526'), W('ORLUD', '@6000', 220), HOLD(57, 'R', 6000)], 'IFAT', 110.1)
appr('ILS33RY', '33R', 327, {'RK413': [W('RK413', '@4000', 190)], 'RK517': [W('RK517', '@7000', 190)]},
     [W('ORMAT', '@4000', 190), W('KIRUP', '@3500')], d_(327, 2016),
     [W('RK533'), W('ORBON', '@4000', 220), HOLD(256, 'R', 4000)], 'IKIA', 109.1)
