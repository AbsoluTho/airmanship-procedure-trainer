# OERK Riyadh / King Khalid. Jeppesen ILS Y and RNP Rwy 15L, 15R, 33L, 33R (RNAV transitions), RNAV STARs.
# Not entered yet: ILS Z and VOR approaches, conventional STARs (1B, 1C) and the SIDs.
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
# missed approach fixes (RNP charts: the turn points 3.0 NM past the threshold; tracks and distances as published).
# RK769, RK612 and ORBON have no published distance: measured on the chart drawing with the chart's own scale, to about 0.5 NM.
for r, n in [('15L', 'RK703'), ('15R', 'RK603'), ('33L', 'RK503'), ('33R', 'RK533')]: fix(n, dep(r, 3.0 - a.a['rwy'][r]['len']/1852))
fix('RK769', frm('RK703', 2, 11.9)); fix('RK762', frm('RK769', 327, 7.0)); fix('MEPTU', frm('RK762', 12, 9.9))
fix('RK612', frm('ALPUR', 197, 7.0)); fix('RK655', frm('RK612', 320, 11.1)); fix('PEDIR', frm('RK655', 327, 7.0))
fix('RK526', frm('RK503', 243, 13.9)); fix('ORLUD', frm('RK526', 188, 9.3)); fix('ORBON', frm('RK533', 76, 16.0))
d_ = lambda c, t: {'lbl': 'C%03d°' % c, 'alt': A('@%d' % t)}
def appr(id, rwy, crs, vias, final, dest, missed, nav, freq):
    a.apprs[id] = dict(type='ILS', rwy=rwy, crs=crs, vias=vias, final=final, dest=dest, missed=missed, nav=nav, freq=freq)
    r = dict(type='RNP', rwy=rwy, crs=crs, vias=vias, final=final, dest=dest, missed=[W('RK603')] + missed[1:] if rwy == '15R' else missed)
    a.apprs['RNP' + rwy] = r          # the RNP approach of each runway: same IAFs, IF, FAF and missed approach
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

# ================= ILS Z and VOR approaches (21-1, 21-3, 21-5, 21-7, 23-1, 23-2): KSA DME arcs =================
rad = a.rad
# KSA VOR/DME 115.0 (OurAirports still has the old KIA): on the 15R centreline, 0.7 NM before the threshold (VOR 15R profile; RW33L is D2.9 on R-147)
a.nav('KSA', ext('15R', 0.7), 115.0, 'Riyadh')
def xr(p0, trk, vor, radial):
    """the point where magnetic track trk from p0 crosses the radial of the VOR"""
    best = None
    for i in range(1, 6000):
        q = dst_(p0, trk, i*0.01); e = abs((brg(a.P(vor), q) - a.var - radial + 540) % 360 - 180)*gc(a.P(vor), q)
        if best is None or e < best[0]: best = (e, q)
    return best[1]
def dst_(p, trk, nm): a.fx['_'] = p; q = frm('_', trk, nm); del a.fx['_']; return q
for n, r, d in [('PEBAK', 18, 17), ('KITAM', 292, 17), ('PUXIB', 332, 17), ('TUGNA', 79, 12.5), ('MOGUB', 212, 12.5), ('D176M', 176, 12.5),
                ('D116G', 116, 7), ('D037G', 37, 7), ('SISIR', 37, 16.5), ('KSA28', 245, 27.6), ('KIRUL', 306, 16.7),
                ('LOVAT', 327, 13.4), ('KEDOL', 147, 7.4)]:
    fix(n, rad('KSA', r, d))
a.chk('PUXIB', to('LONUD', 147, 4.3)); fix('ORDEG', to('ALPUR', 147, 4.4)); a.chk('ORDEG', to('LOVAT', 147, 3.6))
fix('PEDIR', rad('KSA', 312, 27.6)); fix('ORBON', rad('KSA', 76, 16.4))      # published radial and DME replace the positions measured on the drawing
a.chk('TAVNU', rad('KSA', 327, 8.4)); a.chk('LOPAK', rad('KSA', 147, 12.5))
a.notes.append('ORDEG %.1f, LOPAK %.1f, ORMAT %.1f DME KSA (charts: 17.0, 12.5, 12.5 arc)' % tuple(gc(a.P('KSA'), a.P(n)) for n in ('ORDEG', 'LOPAK', 'ORMAT')))
fix('KSA04', a.rwyd('15L', 'KSA', 3.8)); fix('KSA03', a.rwyd('15R', 'KSA', 3.1))
fix('D245E', xr(a.P('KSA03'), 302, 'KSA', 245)); fix('D082C', xr(a.thr('33R'), 327, 'KSA', 82))
def ap2(id, typ, rwy, crs, vias, final, dest, missed, **k):
    a.apprs[id] = dict(type=typ, rwy=rwy, crs=crs, vias=vias, final=final, dest=dest, missed=missed, **k)
K = 'KSA'
V15L = {'PEBAK': [W('PEBAK', '+6000'), ARC('PUXIB', K, '+6000')], 'KITAM': [W('KITAM', '+6000'), ARC('PUXIB', K, '+6000')], 'PUXIB': [W('PUXIB', '+6000')]}
ap2('ILS15LZ', 'ILS', '15L', 147, V15L, [W('LONUD', '@6000', 190), W('ITETU', '@4000')], d_(147, 2037),
    [W('KSA04'), W('D116G', s=210), ARC('D037G', K), W('SISIR', '@5000'), HOLD(217, 'L', 5000)], nav='IELF', freq=109.5)
def v15r(f):
    return {'PEBAK': [W('PEBAK', '+6000'), ARC('ORDEG', K, '+5000')], 'KITAM': [W('KITAM', '+6000'), ARC('ORDEG', K, '+5000')], 'ORDEG': [W('ORDEG', '+5000')]}
M15R = lambda k: [W('KSA03', s=k), W('D245E'), W('KSA28'), ARC('PEDIR', K, '+7000'), HOLD(312, 'R', 7000)]
ap2('ILS15RZ', 'ILS', '15R', 147, v15r(0), [W('ALPUR', '@5000'), W('TAVNU', '@5000')], d_(147, 2053), M15R(230), nav='ITIH', freq=110.5)
ap2('VOR15R', 'VOR', '15R', 147, v15r(0), [W('LOVAT', '@5000'), W('TAVNU', '@5000'), W('KSA')], d_(147, 2053), M15R(220), vor='KSA')
def v33(f, alt):
    return {'TUGNA': [W('TUGNA', '+6000'), ARC(f, K, '@%d' % alt)], 'MOGUB': [W('MOGUB', '+6000'), ARC('D176M', K, '+6000'), ARC(f, K, '@%d' % alt)]}
MKIR = [W('KSA', s=220), W('KIRUL', '+5500'), HOLD(126, 'L', 5500)]
ap2('ILS33LZ', 'ILS', '33L', 327, v33('LOPAK', 5000), [W('LOPAK', '@5000', 190), W('SODUT', '@3500')], d_(327, 2037), MKIR, nav='IFAT', freq=110.1)
ap2('VOR33L', 'VOR', '33L', 327, v33('LOPAK', 4600), [W('LOPAK', '@4600'), W('KEDOL', '@3500')], d_(327, 2037), MKIR, vor='KSA')
ap2('ILS33RZ', 'ILS', '33R', 327, v33('ORMAT', 4000), [W('ORMAT', '@4000', 190), W('KIRUP', '@3500')], d_(327, 2016),
    [W('D082C', s=190), W('ORBON', '@4000'), HOLD(76, 'L', 4000)], nav='IKIA', freq=109.1)

# ================= RNAV STARs (20-2 .. 20-2G), chained back from the IAFs with the published tracks and distances =================
chk = a.chk
def chain(start, *steps):
    """steps (name, track, nm) backwards from a known fix: each fix is the point from which track for nm reaches the one before"""
    cur = start
    for n, t, d in steps:
        p = to(cur, t, d)
        if n in a.fx or n in a.navs: chk(n, p)
        else: fix(n, p)
        cur = n
def star(id, rwys, legs): a.stars[id] = {'rwys': rwys, 'legs': legs}
# 15L/R from the east and north (20-2, 20-2A): the trombone to RK721
chain('RK721', ('RK727', 147, 7), ('RK734', 147, 7), ('RK741', 236, 7), ('RK748', 327, 7), ('RK755', 327, 7), ('RK762', 327, 7), ('RK769', 327, 7),
      ('RK776', 327, 7), ('RK783', 237, 7), ('SISIR', 147, 7), ('RK797', 147, 7), ('RK705', 236, 7), ('RK712', 236, 7), ('RK719', 248, 9.9),
      ('REXOV', 239, 19.6), ('ITUNI', 281, 25.5))
chain('REXOV', ('MEMGO', 227, 8.1)); chain('RK719', ('RK750', 298, 31.0), ('KOBOX', 298, 9.4), ('DEBUD', 313, 66.8)); chain('KOBOX', ('MEPDA', 261, 18.1))
chain('RK797', ('MEPTU', 147, 7), ('RK711', 147, 7.2), ('RK718', 147, 7), ('RK735', 235, 17), ('ESRAT', 235, 11.4))
chain('RK718', ('RK740', 147, 21.7), ('SEPDO', 218, 12)); chain('RK740', ('RK778', 81, 25), ('RARSU', 82, 9.5))
# 33L/R from the east and north (20-2F, 20-2G): to RK413
chain('RK413', ('RK415', 241, 3.0), ('RK420', 198, 5.1), ('RK427', 147, 7), ('ORBON', 237, 7), ('RK441', 327, 7), ('RK448', 237, 7), ('RK455', 237, 7),
      ('RK462', 147, 6.7), ('RK469', 237, 7), ('RK476', 276, 7), ('RK483', 276, 7), ('RK490', 276, 7), ('KOBOX', 278, 8.2))
chain('RK462', ('RK470', 147, 6.7), ('RK477', 108, 7), ('RK484', 198, 7), ('REXOV', 238, 28.2))
chain('RK477', ('RK485', 108, 7), ('RK492', 147, 6.4), ('RK499', 147, 7.5), ('ESRAT', 215, 25)); chain('RK499', ('MURLU', 152, 23.1), ('SEPDO', 167, 11.7))
# 15L/R from the west and south (20-2B, 20-2C): to RK621
chain('RK621', ('RK627', 147, 7), ('RK634', 147, 7), ('RK641', 57, 7), ('PEDIR', 327, 7), ('RK655', 327, 7), ('RK662', 327, 7), ('RK669', 327, 7),
      ('RK676', 327, 7), ('RK697', 57, 7), ('RK604', 147, 7), ('RK611', 147, 7), ('RK618', 147, 7), ('RK625', 57, 7), ('RK632', 327, 7),
      ('RK639', 327, 7), ('RK646', 55, 7), ('RK661', 73, 15.7), ('KAVUR', 73, 12.3), ('ORDEM', 76, 40))
chain('RK618', ('RK626', 147, 7), ('ALPEK', 147, 7), ('KUNEK', 88, 19), ('SIVIS', 114, 40))
chain('RK639', ('RK653', 327, 7), ('RK660', 327, 7.2), ('RK683', 25, 23), ('SIVON', 25, 21.9), ('MOBAG', 40, 31.7)); chain('SIVON', ('RIBIM', 333, 56.6))
chain('RK660', ('RK680', 328, 19.7), ('RK681', 328, 20), ('ALNEB', 328, 14), ('NAGUB', 303, 43))
# 33L/R from the west and south (20-2D, 20-2E): to RK517
chain('RK517', ('RK524', 327, 7), ('RK531', 327, 7), ('RK538', 327, 7), ('RK544', 57, 6), ('RK551', 147, 7), ('RK558', 147, 7), ('RK565', 147, 7),
      ('RK572', 147, 7), ('RK579', 147, 7), ('RK586', 57, 7), ('ORLUD', 57, 7), ('RK500', 85, 7), ('RK507', 85, 7), ('RK547', 85, 13.4), ('KAVUR', 85, 12.2))
chain('RK579', ('RK587', 147, 7), ('RK594', 147, 7), ('KIRUL', 147, 7), ('KUNEK', 106, 37), ('RARSU', 174, 30.5))
chain('ORLUD', ('RK502', 327, 7), ('RK509', 327, 7), ('RK516', 327, 7), ('RK532', 60, 15.9), ('SIVON', 41, 24.3)); chain('RK516', ('ALNEB', 331, 36.2))
# the conventional STARs give KSA radial/DME for the same entry fixes
for n, r, d in [('ESRAT', 18, 56.2), ('KOBOX', 79, 63.8), ('REXOV', 47, 59.7), ('KAVUR', 251, 56.5), ('KUNEK', 292, 53.1), ('MOBAG', 212, 98.5)]: chk(n, rad('KSA', r, d))

F = '+16000'
N15, N33 = ['15L', '15R'], ['33L', '33R']
T721 = [W('RK797', '+6000'), W('SISIR'), W('RK783', s=230), W('RK776'), W('RK769'), W('RK762'), W('RK755'), W('RK748'), W('RK741', s=210),
        W('RK734'), W('RK727'), W('RK721', '+6000')]
E719 = [W('RK719', '-12000'), W('RK712'), W('RK705')] + T721
star('DEBU1A', N15, [W('DEBUD', F), W('KOBOX', F), W('RK750', '-12000')] + E719)
star('MEPD1A', N15, [W('MEPDA', F), W('KOBOX', F), W('RK750', '-12000')] + E719)
star('ITUN1A', N15, [W('ITUNI', F), W('REXOV', F)] + E719)
star('MEMG1A', N15, [W('MEMGO', F), W('REXOV', F)] + E719)
E718 = [W('RK718', '-12000', 250), W('RK711', '+8000'), W('MEPTU')] + T721
star('ESRA2A', N15, [W('ESRAT', F), W('RK735', '-15000')] + E718)
star('RARS1A', N15, [W('RARSU', F), W('RK778', '-20000'), W('RK740', '-15000')] + E718)
star('SEPD1A', N15, [W('SEPDO', '+19000'), W('RK740', '-15000')] + E718)
T413 = [W('RK462'), W('RK455'), W('RK448'), W('RK441', '+6000'), W('ORBON', '+5000', 190), W('RK427'), W('RK420', '@4000'), W('RK415'), W('RK413', '@4000')]
E469 = [W('KOBOX', F), W('RK490'), W('RK483'), W('RK476'), W('RK469', '-10000', 250)] + T413
star('DEBU1F', N33, [W('DEBUD', F)] + E469); star('MEPD1F', N33, [W('MEPDA', F)] + E469)
E484 = [W('REXOV', F), W('RK484', '-11000'), W('RK477', '-10000'), W('RK470', s=250)] + T413
star('ITUN1F', N33, [W('ITUNI', F)] + E484); star('MEMG1F', N33, [W('MEMGO', F)] + E484)
E499 = [W('RK499', '-12000'), W('RK492'), W('RK485', '-10000'), W('RK477'), W('RK470', s=250)] + T413
star('ESRA1F', N33, [W('ESRAT', F)] + E499); star('SEPD1F', N33, [W('SEPDO', '-23000'), W('MURLU', '+20000')] + E499)
T621 = [W('RK618', '+6000'), W('RK611'), W('RK604'), W('RK697'), W('RK676'), W('RK669'), W('RK662', '+6000'), W('RK655'), W('PEDIR'),
        W('RK641', '@5000', 210), W('RK634'), W('RK627'), W('RK621', '@5000')]
E639 = [W('RK639'), W('RK632', '-9000'), W('RK625', s=230)] + T621
star('ORDE1A', N15, [W('ORDEM', F), W('KAVUR', '+15000'), W('RK661', '-13000'), W('RK646')] + E639)
star('SIVI1A', N15, [W('SIVIS', F), W('KUNEK', F), W('ALPEK', '-12000'), W('RK626', '-10000', 230)] + T621)
E660 = [W('RK660'), W('RK653')] + E639
star('MOBA1A', N15, [W('MOBAG', F), W('SIVON', F), W('RK683', '-12000')] + E660)
star('RIBI1A', N15, [W('RIBIM', F), W('SIVON', F), W('RK683', '-12000')] + E660)
star('NAGU1A', N15, [W('NAGUB', F), W('ALNEB', F), W('RK681', '-12000'), W('RK680', '-12000')] + E660)
T517 = [W('RK579', s=230), W('RK572', '+7000'), W('RK565'), W('RK558'), W('RK551'), W('RK544', s=190), W('RK538'), W('RK531'), W('RK524'), W('RK517', '+7000')]
star('ORDE1F', N33, [W('ORDEM', F), W('KAVUR', '+15000', 250), W('RK547', '-11000'), W('RK507', '-9000'), W('RK500'), W('ORLUD', '-8000'), W('RK586')] + T517)
E594 = [W('KUNEK', F, 250), W('KIRUL', '+10000'), W('RK594'), W('RK587', '+10000')] + T517
star('RARS1F', N33, [W('RARSU', F)] + E594); star('SIVI1F', N33, [W('SIVIS', F)] + E594)
E516 = [W('RK509', '-10000'), W('RK502'), W('ORLUD', '-8000'), W('RK586')] + T517
star('MOBA1F', N33, [W('MOBAG', F), W('SIVON', F, 250), W('RK532', '-12000'), W('RK516')] + E516)
star('RIBI1F', N33, [W('RIBIM', F), W('SIVON', F, 250), W('RK532', '-12000'), W('RK516')] + E516)
star('NAGU1F', N33, [W('NAGUB', F), W('ALNEB', F, 250), W('RK516', '-12000')] + E516)

# ================= conventional STARs (20-2H .. 20-2L): KSA radials to the DME arc IAFs =================
for n, r, d in [('D018Z', 18, 30), ('D047Z', 47, 30), ('D018M', 18, 12.5), ('RULAK', 47, 12.5), ('D047Q', 47, 17), ('D079Q', 79, 17),
                ('D292Z', 292, 30), ('D251Z', 251, 30), ('D292M', 292, 12.5), ('KURVO', 251, 12.5), ('KOBAR', 251, 17), ('D212Q', 212, 17), ('KSA35', 212, 35.3)]:
    fix(n, rad('KSA', r, d))
star('ESRA1B', N33, [W('ESRAT', '+12000'), W('D018Z', '+6000'), W('D018M', '+6000'), ARC('RULAK', K, '+6000'), ARC('TUGNA', K, '+6000')])
star('REXO1B', N33, [W('REXOV', '+11500'), W('D047Z', '+6000'), W('RULAK', '+6000'), ARC('TUGNA', K, '+6000')])
star('KOBO1B', N33, [W('KOBOX', F), W('TUGNA', '+6000')])
star('ESRA1C', N15, [W('ESRAT', '+12000'), W('D018Z', '+6000'), W('PEBAK', '+6000')])
star('REXO1C', N15, [W('REXOV', '+11500'), W('D047Z', '+6000'), W('D047Q', '+6000'), ARC('PEBAK', K, '+6000')])
star('KOBO1C', N15, [W('KOBOX', F), W('D079Q', '+6000'), ARC('D047Q', K, '+6000'), ARC('PEBAK', K, '+6000')])
star('KUNE1B', N33, [W('KUNEK', '+11500'), W('D292Z', '+6000'), W('D292M', '+6000'), ARC('KURVO', K, '+6000'), ARC('MOGUB', K, '+6000')])
star('KAVU1B', N33, [W('KAVUR', F), W('D251Z', '+6000'), W('KURVO', '+6000'), ARC('MOGUB', K, '+6000')])
star('MOBA1B', N33, [W('MOBAG', F), W('KSA35', '+11000'), W('MOGUB', '+6000')])
star('KUNE1C', N15, [W('KUNEK', '+11500'), W('KITAM', '+6000')])
star('KAVU1C', N15, [W('KAVUR', '+15000'), W('KOBAR', '+8000'), ARC('KITAM', K, '+6000')])
star('MOBA1C', N15, [W('MOBAG', F), W('KSA35', '+11000'), W('D212Q', '+8000'), ARC('KOBAR', K, '+8000'), ARC('KITAM', K, '+6000')])
