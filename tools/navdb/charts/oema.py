# OEMA Madinah / Prince Mohammad bin Abdulaziz. Jeppesen 10-2..10-2G (STAR), 10-3..10-3S (SID), 11-1, 11-2, 12-1..12-4, 13-1..13-4.
AP = Apt('OEMA', var=2.6)
a = AP
a.rcrs.update({'17': 165, '35': 345, '18': 180, '36': 360})
fix, to, frm, rad, chk = a.fix, a.to, a.frm, a.rad, a.chk
JL = 'JKLMNOPQRSTUVWXYZ'   # Jeppesen DME letters from 10 NM (J) to 26 NM (Z)
def dfix(r, d):
    n = 'D%03d%s' % (r, JL[d-10] if 10 <= d <= 26 else 'X'); fix(n, rad('PMA', r, d)); return n

# ================= approaches: IF / FAF on the extended centreline =================
fix('EGMEM', a.ext('17', 14.3)); fix('MA455', a.ext('17', 7.3)); fix('FF17', a.ext('17', 9.8)); fix('MA454', a.dep('17', 1.0))
fix('MA415', a.ext('18', 17.3)); fix('MA417', a.ext('18', 8.9)); fix('MA419', a.dep('18', 1.0))
fix('OBTOX', a.ext('35', 15.4)); fix('MA703', a.ext('35', 7.2)); fix('FF35', a.ext('35', 7.4)); fix('CF35', a.ext('35', 9.4)); fix('MA702', a.dep('35', 1.0))
fix('MUVDA', a.ext('36', 15.3)); fix('MA510', a.ext('36', 5.3)); fix('MA508', a.dep('36', 1.0))
fix('MA407', to('EGMEM', 165, 6.0)); fix('MA465', to('MA415', 180, 6.0)); fix('MA443', to('OBTOX', 345, 6.0)); fix('MA428', to('MUVDA', 360, 6.0))
for r, d in [(93, 16), (60, 16), (148, 16), (350, 16), (355, 16), (156, 16), (156, 10), (185, 16), (185, 10), (179, 16), (179, 26), (179, 22), (268, 16), (296, 16), (6, 16), (114, 16)]:
    dfix(r, d)
fix('GERIR', rad('PMA', 93, 16))
fix('VOR13', rad('PMA', 350, 12.9)); fix('FD17', rad('PMA', 350, 9.4)); fix('VOR14', rad('PMA', 355, 13.8)); fix('FD18', rad('PMA', 355, 8.3))
chk('EGMEM', rad('PMA', 353, 16))
a.notes.append('OBTOX  %.2f NM between RNP 35 (15.4 NM) and ILS 35 (CF35 + 5.9 NM)' % gc(a.P('OBTOX'), to('CF35', 345, 5.9)))

# ================= STAR fixes, chained back from the approach fixes =================
# runway 36 (1F): ... MA401 - MA426 - MA427 - MA428 - MUVDA
fix('MA427', to('MA428', 270, 6.0)); fix('MA426', to('MA427', 180, 6.0)); fix('MA401', to('MA426', 181, 17.4))
fix('MA425', to('MA401', 181, 9.7)); fix('MA409', to('MA425', 101, 27.5)); fix('MA424', to('MA425', 181, 16.0))
chk('BOVET', to('MA409', 103, 24.8)); fix('LABKO', to('MA424', 178, 22.6)); fix('TAMGO', to('MA409', 58, 34.2))
fix('ORLIG', to('MA401', 258, 12.8)); fix('ELONU', to('ORLIG', 312, 36.3)); fix('MA411', to('ORLIG', 258, 25.6))
fix('ITSEP', to('MA411', 258, 5.4)); fix('EMURI', to('ITSEP', 211, 31.3)); fix('DEGVU', to('MA428', 358, 28.0))
# runway 35 (1H): MA401 - MA439 - MA440 - MA442 - MA443 - OBTOX
fix('MA442', to('MA443', 255, 6.0)); fix('MA440', to('MA442', 165, 6.0)); fix('MA439', to('MA440', 165, 6.0))
chk('MA401', to('MA439', 165, 9.8)); fix('MA444', to('MA401', 165, 9.7)); fix('MA447', to('MA444', 165, 15.3))
chk('MA409', to('MA444', 103, 25.0)); chk('LABKO', to('MA447', 193, 24.8)); chk('DEGVU', to('MA443', 10, 29.2))
# runway 17 (2G): ... MA405 - MA406 - MA407 - EGMEM, LABKO - MA399 - MA400 - MA402 - MA408 - MA407
fix('MA406', to('MA407', 74, 6.0)); fix('MA405', to('MA406', 344, 5.9)); fix('MA420', to('MA405', 80, 20.0))
chk('BOVET', to('MA420', 125, 19.3)); chk('TAMGO', to('MA420', 59, 24.1))
fix('MA408', to('MA407', 254, 6.0)); fix('MA402', to('MA408', 345, 6.1)); fix('MA400', to('MA402', 255, 8.0)); fix('MA399', to('MA400', 165, 6.0))
chk('LABKO', to('MA399', 174, 25.0)); fix('MA414', to('MA401', 345, 6.4)); fix('MA410', to('MA414', 345, 13.7))
chk('DEGVU', to('MA410', 18, 33.7)); chk('ELONU', to('MA410', 274, 34.7)); fix('MA413', to('ORLIG', 258, 17.8)); chk('ITSEP', to('MA413', 258, 13.2))
chk('MA402', frm('MA401', 345, 16.2))
# runway 18 (1E): ... MA468 - MA461 - MA464 - MA465 - MA415, LABKO - MA469 - MA467 - MA462 - MA463 - MA465
fix('MA463', to('MA465', 270, 6.0)); fix('MA462', to('MA463', 360, 6.0)); fix('MA464', to('MA465', 90, 6.0)); fix('MA461', to('MA464', 360, 6.0))
fix('MA468', to('MA461', 360, 5.0)); chk('MA420', to('MA468', 84, 23.3)); fix('MA467', to('MA462', 270, 8.0)); fix('MA469', to('MA467', 180, 6.0))
chk('LABKO', to('MA469', 161, 27.0)); fix('MA460', to('MA462', 360, 14.7)); chk('MA414', to('MA460', 347, 8.4)); chk('ORLIG', to('MA460', 267, 12.7))

S = '+16000'
def star(id, rwys, legs): a.stars[id] = {'rwys': rwys, 'legs': legs}
T36 = [W('MA401', s=210), W('MA426', '+8000', 210), W('MA427', '+7000', 210), W('MA428', '+6300', 210), W('MUVDA', '@6000', 210)]
star('BOVE1F', ['36'], [W('BOVET', S), W('MA409', '+13000', 230), W('MA425', '+11000', 230)] + T36)
star('LABK1F', ['36'], [W('LABKO', S), W('MA424', '+13000', 230), W('MA425', '+11000', 230)] + T36)
star('TAMG1F', ['36'], [W('TAMGO', S), W('MA409', '+13000', 230), W('MA425', '+11000', 230)] + T36)
star('DEGV1F', ['36'], [W('DEGVU', S), W('MA428', '+6300', 210), W('MUVDA', '@6000', 210)])
star('ELON1F', ['36'], [W('ELONU', S), W('ORLIG', '+8000', 230)] + T36)
star('EMUR1F', ['36'], [W('EMURI', S), W('ITSEP', S, 230), W('MA411', '-15000'), W('ORLIG', '+8000', 230)] + T36)
star('ITSE1F', ['36'], [W('ITSEP', S, 230), W('MA411', '-15000'), W('ORLIG', '+8000', 230)] + T36)
star('ORLI1F', ['36'], [W('ORLIG', '+8000', 230)] + T36)
T35 = [W('MA401', s=210), W('MA439', '+8000', 210), W('MA440', '+7000', 210), W('MA442', s=210), W('MA443', '+6300', 210), W('OBTOX', '@6000', 210)]
star('BOVE1H', ['35'], [W('BOVET', S), W('MA409', '+13000', 230), W('MA444', '+11000', 230)] + T35)
star('LABK1H', ['35'], [W('LABKO', S), W('MA447', '+13000', 230), W('MA444', '+11000', 230)] + T35)
star('TAMG1H', ['35'], [W('TAMGO', S), W('MA409', '+13000', 230), W('MA444', '+11000', 230)] + T35)
star('DEGV1H', ['35'], [W('DEGVU', S), W('MA443', '+6300', 210), W('OBTOX', '@6000', 210)])
star('ELON1H', ['35'], [W('ELONU', S), W('ORLIG', '+8000', 230)] + T35)
star('EMUR1H', ['35'], [W('EMURI', S), W('ITSEP', S), W('MA411', '-15000'), W('ORLIG', '+8000', 230)] + T35)
star('ITSE1H', ['35'], [W('ITSEP', S), W('MA411', '-15000'), W('ORLIG', '+8000', 230)] + T35)
star('ORLI1H', ['35'], [W('ORLIG', '+8000', 230)] + T35)
T17 = [W('MA402', s=210), W('MA408', s=210), W('MA407', '+6700', 210), W('EGMEM', '@6700', 210)]
star('BOVE2G', ['17'], [W('BOVET', S), W('MA420', '-12000', 230), W('MA405', '+8000', 210), W('MA406', s=210), W('MA407', '+6700', 210), W('EGMEM', '@6700', 210)])
star('TAMG2G', ['17'], [W('TAMGO', S), W('MA420', '-12000', 230), W('MA405', '+8000', 210), W('MA406', s=210), W('MA407', '+6700', 210), W('EGMEM', '@6700', 210)])
star('LABK2G', ['17'], [W('LABKO', S), W('MA399', '+8000', 210), W('MA400', s=210)] + T17)
star('DEGV2G', ['17'], [W('DEGVU', S), W('MA410', '+12000', 230), W('MA414', '+11000'), W('MA401', '+8000', 210)] + T17)
star('ELON2G', ['17'], [W('ELONU', S), W('MA410', '+12000', 230), W('MA414', '+11000'), W('MA401', '+8000', 210)] + T17)
star('EMUR2G', ['17'], [W('EMURI', S), W('ITSEP', S), W('MA413', '-12000', 230), W('ORLIG', '+8000'), W('MA401', '+8000', 210)] + T17)
star('ITSE2G', ['17'], [W('ITSEP', S), W('MA413', '-12000', 230), W('ORLIG', '+8000'), W('MA401', '+8000', 210)] + T17)
star('ORLI2G', ['17'], [W('ORLIG', '+8000', 230), W('MA401', '+8000', 210)] + T17)
T18 = [W('MA460', '+8000', 210), W('MA462', '+6400'), W('MA463', s=210), W('MA465', s=210), W('MA415', '@6400', 210)]
star('BOVE1E', ['18'], [W('BOVET', S), W('MA420', '-12000', 230), W('MA468', '+8000', 230), W('MA461', '+6400', 210), W('MA464', s=210), W('MA465', s=210), W('MA415', '@6400', 210)])
star('TAMG1E', ['18'], [W('TAMGO', S), W('MA420', '-12000', 230), W('MA468', '+8000', 230), W('MA461', '+6400', 210), W('MA464', s=210), W('MA465', s=210), W('MA415', '@6400', 210)])
star('LABK1E', ['18'], [W('LABKO', S), W('MA469', '+8000', 230), W('MA467', '+8000', 210), W('MA462', '+6400'), W('MA463', s=210), W('MA465', s=210), W('MA415', '@6400', 210)])
star('DEGV1E', ['18'], [W('DEGVU', S), W('MA410', '+12000', 230), W('MA414', '+11000')] + T18)
star('ELON1E', ['18'], [W('ELONU', S), W('MA410', '+12000', 230), W('MA414', '+11000')] + T18)
star('EMUR1E', ['18'], [W('EMURI', S), W('ITSEP', S, 230), W('MA413', '-12000'), W('ORLIG', '+8000')] + T18)
star('ITSE1E', ['18'], [W('ITSEP', S, 230), W('MA413', '-12000'), W('ORLIG', '+8000')] + T18)
star('ORLI1E', ['18'], [W('ORLIG', '+8000', 230)] + T18)

# ================= approaches =================
MISS_N = lambda c, a0: [HDG(c, 4000), W('D148P', '+6700'), ARC('GERIR', 'PMA', '@6700'), HOLD(273, 'R', 6700)]
MISS_S = [W('D060P', '+6000'), ARC('GERIR', 'PMA', '@6000'), HOLD(273, 'R', 6000)]
ORL = lambda m: [W(m, '+3500'), W('ORLIG', '@7000', 210), HOLD(258, 'R', 7000)]
ARC17 = {'D268P': [W('D268P', '+7500'), ARC('D350P', 'PMA', '@6700')], 'GERIR': [W('GERIR', '+6700'), ARC('D350P', 'PMA', '@6700')]}
ARC18 = {'D268P': [W('D268P', '+7500'), ARC('D355P', 'PMA', '@6700')], 'GERIR': [W('GERIR', '+6700'), ARC('D355P', 'PMA', '@6700')]}
d = lambda r, t: {'lbl': 'C%03d°' % r, 'alt': A('@%d' % t)}
a.apprs['ILS17'] = dict(type='ILS', rwy='17', crs=165, nav='INAH', freq=111.7, vias={'MA407': [W('MA407', '@6700', 210)]},
                        final=[W('EGMEM', '@6700', 210), W('FF17', '@5300')], dest=d(165, 2184), missed=MISS_N(165, 0))
a.apprs['ILS35'] = dict(type='ILS', rwy='35', crs=345, nav='IDIN', freq=111.3,
                        vias={'D179Z': [W('D179Z', '+6000'), W('D179V', '@6000'), W('OBTOX', '@6000')], 'MA443': [W('MA443', '+6300', 210)]},
                        final=[W('OBTOX', '@6000'), W('CF35', '@4500'), W('FF35', '@4500')], dest=d(345, 2113), missed=MISS_S)
a.apprs['RNP17'] = dict(type='RNP', rwy='17', crs=165, vias={'MA407': [W('MA407', '@6700', 210)]},
                        final=[W('EGMEM', '@6700', 210), W('MA455', '@4500')], dest=d(165, 2184), missed=ORL('MA454'))
a.apprs['RNP18'] = dict(type='RNP', rwy='18', crs=180, vias={'MA465': [W('MA465', '@6400', 210)]},
                        final=[W('MA415', '@6400', 210), W('MA417', '@5000')], dest=d(180, 2174), missed=ORL('MA419'))
a.apprs['RNP35'] = dict(type='RNP', rwy='35', crs=345, vias={'MA443': [W('MA443', '+6300', 210)]},
                        final=[W('OBTOX', '@6000', 210), W('MA703', '@4400')], dest=d(345, 2113), missed=ORL('MA702'))
a.apprs['RNP36'] = dict(type='RNP', rwy='36', crs=360, vias={'MA428': [W('MA428', '+6300', 210)]},
                        final=[W('MUVDA', '@6000', 210), W('MA510', '@3800')], dest=d(360, 2110), missed=ORL('MA508'))
a.apprs['VOR17'] = dict(type='VOR', rwy='17', crs=170, vor='PMA', vias=ARC17,
                        final=[W('D350P', '@6700'), W('VOR13', '@5700'), W('FD17', '@4600')], dest=d(170, 2184), missed=MISS_N(170, 0))
a.apprs['VOR18'] = dict(type='VOR', rwy='18', crs=175, vor='PMA', vias=ARC18,
                        final=[W('D355P', '@6700'), W('VOR14', '@6000'), W('FD18', '@4500')], dest=d(175, 2174), missed=MISS_N(175, 0))
a.apprs['VOR35'] = dict(type='VOR', rwy='35', crs=336, vor='PMA',
                        vias={'D179P': [W('D179P', '+6000'), ARC('D156P', 'PMA', '@6000')], 'D114P': [W('D114P', '+6700'), ARC('D156P', 'PMA', '@6000')]},
                        final=[W('D156P', '@6000'), W('D156J', '@6000'), W('FD35', '@4500')], dest=d(336, 2113), missed=MISS_S)
a.apprs['VOR36'] = dict(type='VOR', rwy='36', crs=5, vor='PMA',
                        vias={'D179Z': [W('D179Z', '+6000'), W('D179V', '@6000'), W('D185P', '@6000')]},
                        final=[W('D185P', '@6000'), W('D185J', '@6000'), W('FD36', '@3800')], dest=d(5, 2110), missed=MISS_S)
fix('FD35', rad('PMA', 156, 8.2)); fix('FD36', rad('PMA', 185, 6.0)); fix('D179V', rad('PMA', 179, 22))

# ================= RNAV SIDs =================
fix('MA840', a.dep('18', 12.0 - 1.65)); fix('MA870', a.dep('17', 12.0 - 2.0)); fix('MA800', a.dep('35', 6.2 - 2.3)); fix('MA991', a.dep('36', 9.3 - 1.65))
fix('MA900', a.dep('36', 6.4 - 1.65))
fix('MA880', frm('MA840', 258, 16.9)); fix('MA885', frm('MA880', 349, 17.6)); fix('MA886', frm('MA885', 349, 20.9))
fix('ALTEP', frm('MA886', 22, 28.9)); fix('PEGUR', frm('MA886', 335, 18.7)); fix('SISUD', frm('MA840', 199, 37.6)); fix('UKTOM', frm('MA880', 271, 30.8))
fix('MA890', frm('MA840', 78, 15.7)); fix('MA895', frm('MA890', 77, 17.6)); fix('MEDRO', frm('MA895', 78, 18.0)); fix('MIXUG', frm('MA895', 350, 51.0))
chk('MA880', frm('MA870', 259, 20.6)); chk('SISUD', frm('MA870', 203, 39.4)); chk('MA890', frm('MA870', 77, 12.0))
fix('MA726', frm('MA800', 345, 10.6)); fix('MA811', frm('MA726', 343, 6.1)); chk('ALTEP', frm('MA811', 343, 25.2)); chk('PEGUR', frm('MA811', 299, 29.5))
fix('MA812', frm('MA800', 257, 20.1)); chk('SISUD', frm('MA812', 170, 52.9)); chk('UKTOM', frm('MA812', 234, 32.3))
fix('MA802', frm('MA726', 74, 12.0)); fix('MA804', frm('MA802', 86, 13.9)); fix('MA805', frm('MA804', 130, 14.9)); chk('MEDRO', frm('MA805', 130, 22.8))
chk('MIXUG', frm('MA802', 35, 28.1))
chk('MA811', frm('MA991', 336, 14.9)); fix('MA999', frm('MA900', 259, 6.5)); chk('MA812', frm('MA999', 259, 15.2))
fix('MA901', frm('MA991', 360, 9.0)); fix('MA803', frm('MA901', 75, 19.1)); fix('MA998', frm('MA803', 98, 9.7)); fix('MA997', frm('MA998', 132, 10.6))
chk('MEDRO', frm('MA997', 142, 22.8)); chk('MIXUG', frm('MA803', 14, 20.5))
# the north (35/36) and south (17/18) chains end about 4 NM apart: CTA exit fixes placed midway between them
def mid(p, q): return [round((p[0]+q[0])/2, 5), round((p[1]+q[1])/2, 5)]
for n, q in [('ALTEP', frm('MA811', 343, 25.2)), ('PEGUR', frm('MA811', 299, 29.5)), ('SISUD', frm('MA812', 170, 52.9)),
             ('UKTOM', frm('MA812', 234, 32.3)), ('MEDRO', frm('MA805', 130, 22.8)), ('MIXUG', frm('MA802', 35, 28.1))]:
    fix(n, mid(a.P(n), q))

F = '+15000'
def sid(rwy, id, legs): a.sids.setdefault(rwy, {})[id] = legs
for rwy, f1, alt1, frst in [('18', 'MA840', '+6200', []), ('17', 'MA870', '+6300', [])]:
    up = [W(f1, alt1), W('MA880'), W('MA885', '+13000'), W('MA886')]
    sx = '1C' if rwy == '18' else '1J'
    sid(rwy, 'ALTE' + sx, up + [W('ALTEP', F)]); sid(rwy, 'PEGU' + sx, up + [W('PEGUR', F)])
    sid(rwy, 'SISU' + sx, [W(f1, alt1), W('SISUD', F)]); sid(rwy, 'UKTO' + sx, [W(f1, alt1), W('MA880'), W('UKTOM', F)])
    sid(rwy, 'MEDR' + sx, [W(f1, alt1), W('MA890', '-10000'), W('MA895', '+13000'), W('MEDRO', F)])
    sid(rwy, 'MIXU' + sx, [W(f1, alt1), W('MA890', '-10000'), W('MA895', '+13000'), W('MIXUG', F)])
sid('35', 'ALTE1K', [W('MA800', '+4500'), W('MA726'), W('MA811', '-10000'), W('ALTEP', F)])
sid('35', 'PEGU1K', [W('MA800', '+4500'), W('MA726'), W('MA811', '-10000'), W('PEGUR', F)])
sid('35', 'SISU1K', [W('MA800', '+4500', 230), W('MA812', '-10000'), W('SISUD', F)])
sid('35', 'UKTO1K', [W('MA800', '+4500', 230), W('MA812', '-10000'), W('UKTOM', F)])
sid('35', 'MEDR1K', [W('MA800', '+4500'), W('MA726'), W('MA802', '-10000'), W('MA804', '+13000'), W('MA805', '+16000'), W('MEDRO')])
sid('35', 'MIXU1K', [W('MA800', '+4500'), W('MA726'), W('MA802', '-10000'), W('MIXUG', F)])
sid('36', 'ALTE1L', [W('MA991', '+5600'), W('MA811', '-10000'), W('ALTEP', F)])
sid('36', 'PEGU1L', [W('MA991', '+5600'), W('MA811', '-10000'), W('PEGUR', F)])
sid('36', 'SISU1L', [W('MA900', '+4500'), W('MA999', s=230), W('MA812', '-10000'), W('SISUD', F)])
sid('36', 'UKTO1L', [W('MA900', '+4500'), W('MA999', s=230), W('MA812', '-10000'), W('UKTOM', F)])
sid('36', 'MEDR1L', [W('MA991', '+5600'), W('MA901'), W('MA803', '-10000'), W('MA998', '+13000'), W('MA997', '+16000'), W('MEDRO')])
sid('36', 'MIXU1L', [W('MA991', '+5600'), W('MA901'), W('MA803', '-10000'), W('MIXUG', F)])

# ================= conventional SIDs (PMA VOR/DME, 20 and 35 DME arcs) =================
for r in ['17', '18', '35', '36']:
    fix(r + ('D07' if r in ('17', '18') else 'D05'), a.rwyd(r, 'PMA', 7 if r in ('17', '18') else 5))
for r, dd in [(344, 15), (28, 15), (320, 15), (92, 15), (67, 20), (92, 20), (28, 20), (292, 20), (194, 20), (252, 20), (320, 20)]:
    dfix(r, dd)
fix('D028X', rad('PMA', 28, 35)); fix('D344X', rad('PMA', 344, 35))
for rwy, f0, sx in [('36', '36D05', '1D'), ('35', '35D05', '1P')]:
    sid(rwy, 'ALTE' + sx, [W(f0), W('D344O'), W('ALTEP', F)]); sid(rwy, 'MIXU' + sx, [W(f0), W('D028O'), W('MIXUG', F)])
    sid(rwy, 'MEDR' + sx, [W(f0), W('D067T'), ARC('D092T', 'PMA'), W('MEDRO', F)])
    sid(rwy, 'PEGU' + sx, [W(f0), W('D320O'), W('PEGUR', F)])
    sid(rwy, 'SISU' + sx, [W(f0), W('D292T'), ARC('D194T', 'PMA'), W('SISUD', F)])
    sid(rwy, 'UKTO' + sx, [W(f0), W('D292T'), ARC('D252T', 'PMA'), W('UKTOM', F)])
for rwy, f0, sx in [('18', '18D07', '1M'), ('17', '17D07', '1N')]:
    sid(rwy, 'MEDR' + sx, [W(f0), W('D092O'), W('MEDRO', F)])
    sid(rwy, 'MIXU' + sx, [W(f0), W('D092T'), ARC('D028T', 'PMA'), W('MIXUG', F)])
    sid(rwy, 'ALTE' + sx, [W(f0), W('D092T'), ARC('D028T', 'PMA'), W('D028X'), ARC('D344X', 'PMA'), W('ALTEP', F)])
    sid(rwy, 'SISU' + sx, [W(f0), W('D194T'), W('SISUD', F)])
    sid(rwy, 'PEGU' + sx, [W(f0), W('D194T'), ARC('D320T', 'PMA'), W('PEGUR', F)])
    sid(rwy, 'UKTO' + sx, [W(f0), W('D194T'), ARC('D252T', 'PMA'), W('UKTOM', F)])
# radar departures: runway heading to 8000 ft, then vectors
for rwy in ['35', '36']: sid(rwy, 'MADI1T', [CA(8000 - 2134)])
for rwy in ['17', '18']: sid(rwy, 'MADI1Z', [CA(8000 - 2134)])
