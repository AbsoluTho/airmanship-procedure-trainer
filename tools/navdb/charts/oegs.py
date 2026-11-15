# OEGS Gassim / Prince Naif bin Abdulaziz. Jeppesen 10-3 (departures, 12 Apr 24), 11-1 (ILS or LOC Rwy 15), 13-1 (VOR Rwy 15), 13-2 (VOR Rwy 33), 19 Apr 24.
# No STARs: arrivals start at the IAFs of the GAS 15 DME arc or overhead GAS (level procedure turn at 10 DME).
AP = Apt('OEGS', var=3.73)         # runway 149/329 magnetic on a true bearing of 152.73
a = AP
a.rcrs.update({'15': 149, '33': 329})
fix, rad, ext, frm = a.fix, a.rad, a.ext, a.frm
V = 'GAS'
for n, r, d in [('D352O', 352, 15), ('GOKDU', 42, 15), ('D059O', 59, 15), ('D298O', 298, 15), ('D272O', 272, 15), ('D257O', 257, 15),
                ('D336O', 336, 15), ('D321O', 321, 15), ('D332O', 332, 15), ('D316O', 316, 15), ('D144O', 144, 15), ('D144C', 144, 3.0),
                ('D329J', 329, 10), ('D324J', 324, 10), ('GS156', 156, 10),
                ('CD15G', 324, 15), ('UKMOD', 324, 6.3), ('D324A', 324, 1.2),
                ('D133O', 133, 15), ('D219O', 219, 15), ('D147O', 147, 15), ('D164O', 164, 15), ('D167V', 167, 22), ('D167S', 167, 19.1),
                ('CF33G', 156, 15), ('ULUDO', 156, 5.9), ('D156A', 156, 0.4)]:
    fix(n, rad(V, r, d))
# ILS 15: the IGAS DME reads 0.2 at the threshold
fix('CF15G', ext('15', 13.8)); fix('ORPOP', ext('15', 5.1))
a.notes.append('CF15G %.1f DME GAS (chart 15.0)' % gc(a.P('CF15G'), a.P(V)))
# level procedure turns from 10 DME (the outbound leg of the turn is not dimensioned: 4 NM)
fix('GSPTA', frm('D329J', 14, 4)); fix('GSPTB', frm('D324J', 9, 4)); fix('GSPTC', frm('GS156', 111, 4))
d_ = lambda c, t: {'lbl': 'C%03d°' % c, 'alt': A('@%d' % t)}
def appr(id, typ, rwy, crs, vias, final, dest, missed, **k):
    a.apprs[id] = dict(type=typ, rwy=rwy, crs=crs, vias=vias, final=final, dest=dest, missed=missed, **k)
def v15(e, w, j, pt):
    v = {'D352O': [W('D352O', '+5000'), ARC(e, V, '@5000')], 'GOKDU': [W('GOKDU', '+5000'), ARC('D352O', V, '+5000'), ARC(e, V, '@5000')],
         'D059O': [W('D059O', '+5000'), ARC('GOKDU', V, '+5000'), ARC('D352O', V, '+5000'), ARC(e, V, '@5000')],
         'D298O': [W('D298O', '+5000'), ARC(w, V, '@5000')], 'D272O': [W('D272O', '+5000'), ARC('D298O', V, '+5000'), ARC(w, V, '@5000')],
         'D257O': [W('D257O', '+5000'), ARC('D272O', V, '+5000'), ARC('D298O', V, '+5000'), ARC(w, V, '@5000')],
         'GAS': [W('GAS', '+6000'), W(j, '@5000'), W(pt, '@5000')]}
    return v
HG = HOLD(222, 'R', 5000)          # GOKDU hold on R-042, inbound 222°, MHA 5000
M15 = [W('D144C', s=230), W('D144O'), ARC('GOKDU', V, '@5000'), HG]
appr('ILS15', 'ILS', '15', 149, v15('D336O', 'D321O', 'D329J', 'GSPTA'), [W('CF15G', '@5000', 230), W('ORPOP', '@3800')], d_(149, 2126), M15, nav='IGAS', freq=110.1)
appr('VOR15', 'VOR', '15', 144, v15('D332O', 'D316O', 'D324J', 'GSPTB'), [W('CD15G', '@5000', 230), W('UKMOD', '@3800'), W('D324A')], d_(144, 2126), M15, vor=V)
appr('VOR33', 'VOR', '33', 336,
     {'D133O': [W('D133O', '+5000'), ARC('D147O', V, '@5000')], 'D219O': [W('D219O', '+5000'), ARC('D164O', V, '@5000')],
      'D059O': [W('D059O', '+5000'), ARC('D133O', V, '+5000'), ARC('D147O', V, '@5000')],
      'GOKDU': [W('GOKDU', '+5000'), ARC('D059O', V, '+5000'), ARC('D133O', V, '+5000'), ARC('D147O', V, '@5000')],
      'D167V': [W('D167V', '+5000'), W('D167S', '@5000')], 'GAS': [W('GAS', '+6000'), W('GS156', '@5000'), W('GSPTC', '@5000')]},
     [W('CF33G', '@5000', 230), W('ULUDO', '@3900'), W('D156A')], d_(336, 2120), [W('D336O', s=230), ARC('GOKDU', V, '@5000'), HG], vor=V)
# departures (10-3): runway heading to 5000, then radar vectors to the flight planned route
for r in ('15', '33'): a.sids[r] = {'RWYHDG': [CA(5000 - 2126)]}
