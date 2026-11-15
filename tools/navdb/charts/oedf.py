# OEDF Dammam / King Fahd. Jeppesen 10-2..10-2C (RNAV STAR), 10-3N/P/Q/S/T.. (RNAV SID), 11-1..11-4 (ILS), 12-1..12-4 (RNP),
# 13-1..13-3 (VOR). Charts dated 24 Oct 25 / 19 Dec 25.
# Fixes: KFA radial/DME (14 DME arc IAFs, VOR finals), distance on the extended centreline (ILS, RNP), track and distance (STAR, SID).
# The conventional VOR/DME SIDs (EMUSA & TAYMA 1A-1D, LADNA & METLA 2A-2D, PUSRA & ROTEL 1A-1D, MIBRA & RYDAN 1A-1D) are not entered yet.
AP = Apt('OEDF', var=3.6)          # runway 161/341 magnetic on a true bearing of 164.6
a = AP
a.rcrs.update({'16L': 161, '16R': 161, '34L': 341, '34R': 341})
fix, to, frm, rad, chk, ext, dep = a.fix, a.to, a.frm, a.rad, a.chk, a.ext, a.dep
def sid(rwy, id, legs): a.sids.setdefault(rwy, {})[id] = legs
def star(id, rwys, legs): a.stars[id] = {'rwys': rwys, 'legs': legs}

# ================= KFA 14 DME arc: IAFs and lead radials =================
for n, r, d in [('LOPOD', 324, 14), ('RESAN', 304, 14), ('KEBAP', 266, 14), ('LOSAX', 234, 14), ('DASLA', 182, 14), ('D200N', 200, 14),
                ('D170N', 170, 14), ('D166N', 166, 14), ('D155N', 155, 14), ('D338N', 338, 14), ('D333N', 333, 14),
                ('DAXAR', 324, 27.7), ('D324W', 324, 22.7), ('KAVIV', 324, 25.1), ('KF21A', 324, 21.1)]:
    fix(n, rad('KFA', r, d))

# ================= final approach fixes =================
# ILS: the ILS DME reads 0.2 (16R: 0.3) at the threshold
fix('CF34L', ext('34L', 11.3)); fix('SIDGO', ext('34L', 5.9))
fix('CI34R', ext('34R', 10.9)); fix('SENBA', ext('34R', 5.9))
fix('CI16L', ext('16L', 14.8)); fix('OBREL', ext('16L', 6.0))
fix('CF16R', ext('16R', 14.4)); fix('TATBA', ext('16R', 5.8))
# RNP
fix('DF601', ext('34L', 5.9)); fix('DF602', ext('34L', 11.2)); fix('DF606', ext('34R', 5.9)); fix('DF605', ext('34R', 10.9))
fix('DF671', ext('16L', 5.9)); fix('DF672', ext('16L', 12.0)); fix('DF661', ext('16R', 6.0)); fix('DF662', ext('16R', 11.7))
fix('DF603', to('DF602', 71, 6.0)); fix('DF604', to('DF602', 262, 11.1))
chk('DF603', to('DF605', 71, 7.2)); chk('DF604', to('DF605', 264, 9.9))
chk('RESAN', to('DF672', 71, 9.7)); chk('RESAN', to('DF662', 71, 8.5))
# VOR (KFA radial/DME)
chk('CF16R', rad('KFA', 341, 14)); fix('TOLRO', rad('KFA', 341, 5.5))
chk('CF34L', rad('KFA', 161, 14)); fix('DATMI', rad('KFA', 161, 8.7)); fix('D62V', rad('KFA', 161, 6.2)); fix('MA34L', rad('KFA', 161, 3.7))
fix('CD34R', rad('KFA', 146, 14)); fix('RUKUN', rad('KFA', 146, 9.1)); fix('MD34R', rad('KFA', 146, 4.0))
# missed approach turn points: runway track until the KFA DME
fix('KFA4L', a.rwyd('34L', 'KFA', 4.0)); fix('KFA4R', a.rwyd('34R', 'KFA', 4.0))
fix('KFD4L', a.rwyd('16L', 'KFA', 4.0)); fix('KFD3R', a.rwyd('16R', 'KFA', 3.0))

# ================= STAR fixes, chained back from LOSAX and RESAN =================
# runways 34L/R (10-2, 10-2B)
fix('DF402', to('LOSAX', 139, 6.8)); fix('DF407', to('DF402', 139, 6.1)); fix('DF401', to('DF407', 139, 5.0))
fix('PUSRA', to('DF401', 165, 45.2)); fix('SILBA', to('DF401', 136, 38.9))
fix('DF408', to('LOSAX', 95, 10.0)); fix('DF403', to('DF408', 95, 5.0)); fix('UMENA', to('DF403', 94, 33.7))
fix('DF406', to('LOSAX', 273, 11.9)); fix('NARMI', to('DF406', 273, 29.7)); chk('NARMI', to('DF604', 264, 14.9))
fix('DF405', frm('LOSAX', 165, 9.5)); chk('DF603', frm('DF405', 74, 8.0)); chk('DF603', frm('LOSAX', 125, 12.3))
fix('DF404', to('DF405', 359, 23.8)); fix('RYDAN', to('DF404', 306, 8.6)); fix('MIBRA', to('LOSAX', 54, 46.0))
# runways 16L/R (10-2A, 10-2C)
fix('DF460', to('RESAN', 40, 10.3)); fix('DF461', to('DF460', 40, 13.0)); chk('MIBRA', to('DF461', 40, 33.4))
fix('DF462', to('RESAN', 349, 8.6)); chk('RYDAN', to('DF462', 350, 46.4))
fix('DF464', to('DF462', 283, 11.4)); chk('NARMI', to('DF464', 284, 29.9))
chk('PUSRA', to('RESAN', 150, 47.1)); chk('SILBA', to('RESAN', 124, 46.0))
fix('DF463', to('RESAN', 76, 16.3)); chk('UMENA', to('DF463', 76, 33.5))

F = '+17000'
N = ['34L', '34R']
T603 = [W('LOSAX', '+7000'), W('DF603', '+4000', 210)]
star('LOSA1J', N, [W('LOSAX', '+4000', 230), W('DF603', '+4000', 210)])
star('MIBR2J', N, [W('MIBRA', F)] + T603)
star('NARM1J', N, [W('NARMI', '+12000'), W('DF406', '+8000'), W('LOSAX', '+7000'), W('DF405', '+5000'), W('DF603', '+4000', 210)])
star('NARM1K', N, [W('NARMI', '+12000'), W('DF604', '@6000', 210)])
star('RYDA2J', N, [W('RYDAN', F), W('DF404'), W('DF405', '+5000'), W('DF603', '+4000', 210)])
star('PUSR2J', N, [W('PUSRA', F), W('DF401', '+12000'), W('DF407', '+11000'), W('DF402', '+9000')] + T603)
star('SILB2J', N, [W('SILBA', F), W('DF401', '+12000'), W('DF407', '+11000'), W('DF402', '+9000')] + T603)
star('UMEN2J', N, [W('UMENA', F), W('DF403', '+11000'), W('DF408', '+10000')] + T603)
S = ['16L', '16R']
R5 = [W('RESAN', '+5000', 210)]
star('MIBR2L', S, [W('MIBRA', F), W('DF461', '+13000'), W('DF460', '+9000')] + R5)
star('NARM1L', S, [W('NARMI', '+12000'), W('DF464', '+8000'), W('DF462', '+6000')] + R5)
star('RYDA2L', S, [W('RYDAN', F), W('DF462', '+6000')] + R5)
star('PUSR2L', S, [W('PUSRA', F)] + R5)
star('SILB2L', S, [W('SILBA', F)] + R5)
star('UMEN2L', S, [W('UMENA', F), W('DF463', '+10000')] + R5)

# ================= approaches =================
d_ = lambda c, t: {'lbl': 'C%03d°' % c, 'alt': A('@%d' % t)}
def appr(id, typ, rwy, crs, vias, final, dest, missed, **k):
    a.apprs[id] = dict(type=typ, rwy=rwy, crs=crs, vias=vias, final=final, dest=dest, missed=missed, **k)
ARCW = ['LOPOD', 'RESAN', 'KEBAP', 'LOSAX', 'DASLA']        # the 14 DME arc, north round the west side to the south
def arc_s(lead):
    """vias for the 34 runways: 5000 on the arc down to LOSAX, then 3000 to the lead radial"""
    v = {}
    for i, n in enumerate(ARCW):
        legs = [W(n, '+3000' if n in ('LOSAX', 'DASLA') else '+5000')]
        if i < 3: legs.append(ARC('LOSAX', 'KFA', '+5000'))
        legs.append(ARC(lead, 'KFA', '@3000')); v[n] = legs
    v['KFA'] = [W('KFA', '+5000'), W('LOSAX', '+5000'), ARC(lead, 'KFA', '@3000')]
    return v
def arc_n(lead, far):
    """vias for the 16 runways: 5000 on the arc up to RESAN, then 3000 to the lead radial; the outer IAF on R-324"""
    v = {'RESAN': [W('RESAN', '+5000'), ARC(lead, 'KFA', '@3000')]}
    for n in ('KEBAP', 'LOSAX', 'DASLA'): v[n] = [W(n, '+5000'), ARC('RESAN', 'KFA', '+5000'), ARC(lead, 'KFA', '@3000')]
    v['KFA'] = [W('KFA', '+5000'), W('RESAN', '+5000'), ARC(lead, 'KFA', '@3000')]
    v[far[0]] = [W(far[0], '+5000'), W(far[1], '+3000')]
    return v
HRES = lambda t: HOLD(124, 'L', t)       # RESAN: inbound 124°, racetrack on R-304
HLOS = lambda t: HOLD(54, 'R', t)        # LOSAX: inbound 054°
M34 = lambda f: [W(f), W('RESAN', '@3000'), HRES(3000)]
M16 = lambda f: [W(f), W('D200N'), ARC('LOSAX', 'KFA', '@3000'), HLOS(3000)]
MR34 = [HDG(341, 1000), W('LOSAX', '+4000'), HLOS(4000)]
MR16 = [HDG(161, 1000), W('RESAN', '+5000'), HRES(5000)]

appr('ILS34L', 'ILS', '34L', 341, arc_s('D170N'), [W('CF34L', '@3000'), W('SIDGO', '@2000')], d_(341, 59), M34('KFA4L'), nav='IWMR', freq=108.9)
appr('ILS34R', 'ILS', '34R', 341, arc_s('D166N'), [W('CI34R', '@3000'), W('SENBA', '@2000')], d_(341, 75), M34('KFA4R'), nav='IABF', freq=110.7)
appr('ILS16L', 'ILS', '16L', 161, arc_n('D338N', ('DAXAR', 'D324W')), [W('CI16L', '@3000'), W('OBREL', '@2000')], d_(161, 61), M16('KFD4L'),
     nav='IMBF', freq=111.7)
appr('ILS16R', 'ILS', '16R', 161, arc_n('D333N', ('KAVIV', 'KF21A')), [W('CF16R', '@3000'), W('TATBA', '@2000')], d_(161, 51), M16('KFD3R'),
     nav='IWSR', freq=108.1)
RV34 = {'DF603': [W('DF603', '+4000', 210)], 'DF604': [W('DF604', '@6000', 210)]}
appr('RNP34L', 'RNP', '34L', 341, RV34, [W('DF602', '@3000', 210), W('DF601', '@2000')], d_(341, 59), MR34)
appr('RNP34R', 'RNP', '34R', 341, RV34, [W('DF605', '@3000', 210), W('DF606', '@2000')], d_(341, 75), MR34)
RV16 = {'RESAN': [W('RESAN', '+5000', 210)]}
appr('RNP16L', 'RNP', '16L', 161, RV16, [W('DF672', '@3000', 210), W('DF671', '@2000')], d_(161, 61), MR16)
appr('RNP16R', 'RNP', '16R', 161, RV16, [W('DF662', '@3000', 210), W('DF661', '@2000')], d_(161, 51), MR16)
appr('VOR16R', 'VOR', '16R', 161, arc_n('D333N', ('KAVIV', 'KF21A')), [W('CF16R', '@3000'), W('TOLRO', '@2000')], d_(161, 51), M16('KFD3R'), vor='KFA')
appr('VOR34L', 'VOR', '34L', 341, arc_s('D170N'), [W('CF34L', '@3000'), W('DATMI', '@2000'), W('D62V', '@1200'), W('MA34L')], d_(341, 59),
     M34('KFA4L'), vor='KFA')
appr('VOR34R', 'VOR', '34R', 326, arc_s('D155N'), [W('CD34R', '@3000'), W('RUKUN', '@2000'), W('MD34R')], d_(326, 75), M34('KFA4R'), vor='KFA')

# ================= RNAV SIDs =================
fix('DF502', dep('34L', 5.0)); fix('DF501', dep('34R', 5.0)); fix('DF520', dep('16R', 5.0)); fix('DF530', dep('16L', 5.0))
# 34L/R west and north (10-3T, 2E/2F)
fix('DF504', frm('DF502', 279, 13.0)); chk('DF504', frm('DF501', 278, 14.2))
fix('DF506', frm('DF504', 233, 13.3)); fix('DF507', frm('DF506', 237, 8.8)); fix('DF514', frm('DF507', 237, 11.0))
fix('EMUSA', frm('DF514', 237, 17.1)); fix('DF515', frm('DF507', 209, 11.0)); fix('DF511', frm('DF515', 209, 14.1))
chk('MIBRA', frm('DF511', 209, 8.0))
fix('DF518', frm('DF502', 326, 12.4)); chk('DF518', frm('DF501', 322, 13.0)); fix('DF519', frm('DF518', 322, 6.6))
fix('DF510', frm('DF519', 322, 28.8)); chk('PUSRA', frm('DF510', 323, 8.0))
fix('DF505', frm('DF504', 279, 22.3)); fix('TAYMA', frm('DF505', 279, 22.5))
# 34L/R east and south (10-3N/P, 1E/2E, 1F/2F)
fix('DF516', frm('DF502', 76, 22.1)); chk('DF516', frm('DF501', 76, 20.9)); fix('ROTEL', frm('DF516', 76, 11.1)); fix('LADNA', frm('DF516', 128, 15.6))
fix('METLA', frm('DF502', 34, 28.3)); chk('METLA', frm('DF501', 32, 27.6))
fix('DF503', frm('DF502', 84, 11.2)); chk('DF503', frm('DF501', 84, 10.0)); fix('DF508', frm('DF503', 173, 8.8))
fix('DF513', frm('DF508', 210, 13.6)); fix('DF509', frm('DF513', 210, 11.1)); fix('DF512', frm('DF509', 181, 13.4)); chk('RYDAN', frm('DF512', 181, 8.0))
# 16L/R west and north (2G/2H)
fix('DF523', frm('DF520', 247, 11.4)); chk('DF523', frm('DF530', 249, 12.5))
fix('DF524', frm('DF523', 258, 35.2)); chk('EMUSA', frm('DF524', 258, 13.8))
fix('DF527', frm('DF523', 240, 36.9)); chk('MIBRA', frm('DF527', 239, 10.0))
fix('DF525', frm('DF523', 297, 23.2)); fix('DF529', frm('DF525', 296, 14.0)); chk('TAYMA', frm('DF529', 296, 19.2))
fix('DF522', frm('DF520', 45, 14.5)); chk('DF522', frm('DF530', 42, 13.7)); fix('DF531', frm('DF522', 314, 20.0))
fix('DF526', frm('DF531', 314, 39.1)); chk('PUSRA', frm('DF526', 311, 7.0))
# 16L/R east and south (10-3Q/S, 1G/2G, 1H/2H)
chk('LADNA', frm('DF520', 77, 30.8)); chk('LADNA', frm('DF530', 76, 29.6)); chk('ROTEL', frm('DF520', 56, 34.4)); chk('ROTEL', frm('DF530', 55, 33.4))
chk('METLA', frm('DF522', 4, 24.8)); fix('DF528', frm('DF520', 186, 29.2)); chk('DF528', frm('DF530', 188, 29.4)); chk('RYDAN', frm('DF528', 186, 10.0))

L = '-16000'
for rwy, f0, sx in [('34L', 'DF502', 'E'), ('34R', 'DF501', 'F')]:
    w = [W(f0), W('DF504', '+4000')]
    sid(rwy, 'EMUS2' + sx, w + [W('DF506', '-8000'), W('DF507', '-9000'), W('DF514', '-10000'), W('EMUSA', L)])
    sid(rwy, 'MIBR2' + sx, w + [W('DF506', '-8000'), W('DF507', '-9000'), W('DF515', '-10000'), W('DF511', L), W('MIBRA')])
    sid(rwy, 'PUSR2' + sx, [W(f0, '+1300'), W('DF518', '+4000'), W('DF519', '+6000'), W('DF510', L), W('PUSRA')])
    sid(rwy, 'TAYM2' + sx, w + [W('DF505', '-10000'), W('TAYMA', L)])
    sid(rwy, 'LADN1' + sx, [W(f0), W('DF516'), W('LADNA', '+7000')])
    sid(rwy, 'METL1' + sx, [W(f0, '+1300'), W('METLA', '+9000')])
    sid(rwy, 'ROTE1' + sx, [W(f0), W('DF516'), W('ROTEL', '+7000')])
    k = 210 if rwy == '34L' else 200
    sid(rwy, 'RYDA2' + sx, [W(f0, '+1300', k), W('DF503', '+4000', k), W('DF508', '+6000'), W('DF513', '-7000'), W('DF509'), W('DF512', L), W('RYDAN')])
for rwy, f0, sx in [('16R', 'DF520', 'G'), ('16L', 'DF530', 'H')]:
    w = [W(f0, s=230), W('DF523', '-5000')]
    sid(rwy, 'EMUS2' + sx, w + [W('DF524', '-12000'), W('EMUSA', L)])
    sid(rwy, 'MIBR2' + sx, w + [W('DF527', L), W('MIBRA')])
    sid(rwy, 'PUSR2' + sx, [W(f0, s=220 if rwy == '16R' else 210), W('DF522', '-7000'), W('DF531', '+8000'), W('DF526', L), W('PUSRA')])
    sid(rwy, 'TAYM2' + sx, w + [W('DF525', '-8000'), W('DF529', '-9000'), W('TAYMA', L)])
    sid(rwy, 'LADN1' + sx, [W(f0), W('LADNA', '+7000')])
    sid(rwy, 'METL1' + sx, [W(f0, s=230), W('DF522', '-7000'), W('METLA', '+9000')])
    sid(rwy, 'ROTE2' + sx, [W(f0), W('ROTEL', '+7000')])
    sid(rwy, 'RYDA2' + sx, [W(f0), W('DF528', '-13000'), W('RYDAN')])
