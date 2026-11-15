# OEAB Abha. Jeppesen 10-3 (departures), 11-1 (ILS or LOC Rwy 13), 13-1 (VOR Rwy 13), 13-2 (VOR Rwy 31). Charts dated 22 Dec 23.
# No STARs: arrivals start at the IAFs of the ABH DME arcs (17 DME for runway 13, 16 DME for runway 31) or overhead ABH.
AP = Apt('OEAB', var=3.15)         # runway 126/306 magnetic on a true bearing of 129.15
a = AP
a.rcrs.update({'13': 126, '31': 306})
fix, rad, ext, chk = a.fix, a.rad, a.ext, a.chk
V = 'ABH'
for n, r, d in [('D356Q', 356, 17), ('D332Q', 332, 17), ('D313Q', 313, 17), ('D299Q', 299, 17), ('D288Q', 288, 17), ('D326Q', 326, 17),
                ('D321Q', 321, 17), ('D311Q', 311, 17), ('D297Q', 297, 17),
                ('MURUT', 304, 17), ('D304N', 304, 13.8), ('D304K', 304, 10.7), ('SUTLO', 304, 6.3), ('D304A', 304, 0.9),
                ('D180P', 180, 16), ('D139P', 139, 16), ('D149P', 149, 16), ('D131U', 131, 21.2),
                ('ITGOS', 131, 16), ('D131K', 131, 10.9), ('DAVDU', 131, 6.0), ('D131A', 131, 0.9)]:
    fix(n, rad(V, r, d))
# ILS 13: the IABH DME reads 0.2 at the threshold
fix('VUSIT', ext('13', 16.1)); fix('D118I', ext('13', 11.6)); fix('ORNUT', ext('13', 6.9))
a.notes.append('VUSIT %.1f DME ABH (chart 17.0)' % gc(a.P('VUSIT'), a.P(V)))
d_ = lambda c, t: {'lbl': 'C%03d°' % c, 'alt': A('@%d' % t)}
def appr(id, typ, rwy, crs, vias, final, dest, missed, **k):
    a.apprs[id] = dict(type=typ, rwy=rwy, crs=crs, vias=vias, final=final, dest=dest, missed=missed, **k)
def v13(n, s, o, ob):
    """17 DME arc IAFs: from the north to the lead radial n, from the south-west to the lead radial s; overhead ABH outbound on radial ob"""
    return {'D356Q': [W('D356Q', '+11500'), ARC('D332Q', V, '+11500'), ARC(n, V, '@11500')], 'D332Q': [W('D332Q', '+11500'), ARC(n, V, '@11500')],
            'D288Q': [W('D288Q', '+11500'), ARC(s, V, '@11500')], 'ABH': [W('ABH', '+12000'), W(o, '@11500'), ARC(n, V, '@11500')]}
H13 = HOLD(325, 'R', 12000)        # ABH hold south-east of the VOR, inbound 325°, MHA 12000
appr('ILS13', 'ILS', '13', 126, v13('D313Q', 'D299Q', 'D326Q', 326), [W('VUSIT', '@11500', 230), W('D118I', '@10100'), W('ORNUT', '@9100')], d_(126, 6832),
     [HDG(126, 9500), W('ABH', '@12000'), H13], nav='IABH', freq=109.9)
appr('VOR13', 'VOR', '13', 124, v13('D311Q', 'D297Q', 'D321Q', 321), [W('MURUT', '@11500', 230), W('D304N', '@10500'), W('D304K', '@9500'), W('SUTLO', '@8600'), W('D304A')],
     d_(124, 6832), [HDG(124, 9500), W('ABH', '@12000'), H13], vor=V)
appr('VOR31', 'VOR', '31', 311, {'D180P': [W('D180P', '+11000'), ARC('D139P', V, '@11000')], 'D131U': [W('D131U', '+11000')],
                                   'ABH': [W('ABH', '+11000'), W('D149P', '@11000'), ARC('D139P', V, '@11000')]},
     [W('ITGOS', '@11000', 230), W('D131K', '@9500'), W('DAVDU', '@8500'), W('D131A')], d_(311, 6858),
     [HDG(311, 9500), W('ABH', '@11000'), HOLD(160, 'R', 11000)], vor=V)
# departures (10-3): runway heading to 9000 (13) or 10500 (31), then the flight planned route
a.sids['13'] = {'RWYHDG': [CA(9000 - 6858)]}; a.sids['31'] = {'RWYHDG': [CA(10500 - 6858)]}
