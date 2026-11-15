# OEAH Al Ahsa. Jeppesen 10-3 (departures, 23 Sep 22), 11-1 (ILS Z or LOC Rwy 34), 11-2 (ILS Y Rwy 34), 22 May 26; 13-1 (VOR Rwy 16), 13-2 (VOR Rwy 34), 11 Apr 25.
# No STARs: arrivals start at KIREN, at the IAFs of the HSA 16 DME arc or overhead HSA (procedure turns).
AP = Apt('OEAH', var=2.97)         # runway 162/342 magnetic on a true bearing of 164.97
a = AP
a.rcrs.update({'16': 162, '34': 342})
fix, rad, ext, frm, to, chk = a.fix, a.rad, a.ext, a.frm, a.to, a.chk
V = 'HSA'
for n, r, d in [('KIREN', 262, 19.7), ('D262P', 262, 16), ('D088T', 88, 19.7), ('D088P', 88, 16), ('D339P', 339, 16), ('HS355', 355, 16),
                ('CD16H', 347, 16), ('D347J', 347, 10), ('FD16H', 347, 7.7), ('D347C', 347, 3.0), ('D347A', 347, 1.2),
                ('D161I', 161, 9.2), ('D155E', 155, 4.5), ('CD34H', 155, 10.1), ('FD34H', 155, 5.1), ('D155A', 155, 0.5)]:
    fix(n, rad(V, r, d))
# ILS 34: the IHSA DME reads 0.2 at the threshold
fix('CF34H', ext('34', 14.9)); fix('FF34H', ext('34', 4.9)); fix('ODBAX', ext('34', 9.9)); chk('ODBAX', rad(V, 161, 10.4))
fix('AH400', to('ODBAX', 72, 6.0)); a.notes.append('KIREN-AH400 %.1f NM (chart 19.3)' % gc(a.P('KIREN'), a.P('AH400')))
# procedure turns (the outbound leg of the turn is not dimensioned)
fix('HSPTA', frm('D347J', 302, 4)); fix('HSPTB', frm('D161I', 116, 6)); fix('HSPTC', frm('D155E', 110, 5))
d_ = lambda c, t: {'lbl': 'C%03d°' % c, 'alt': A('@%d' % t)}
def appr(id, typ, rwy, crs, vias, final, dest, missed, **k):
    a.apprs[id] = dict(type=typ, rwy=rwy, crs=crs, vias=vias, final=final, dest=dest, missed=missed, **k)
appr('ILS34Z', 'ILS', '34', 342, {'HSA': [W('HSA', '+2500'), W('D161I', '@2500'), W('HSPTB', '@2500')]},
     [W('CF34H', '@2500'), W('FF34H', '@2200')], d_(342, 574), [HDG(342, 1600), W('HSA', '@2500'), HOLD(161, 'R', 2500)], nav='IHSA', freq=110.9)
appr('ILS34Y', 'ILS', '34', 342, {'KIREN': [W('KIREN', '+2500'), W('AH400', '@2500')], 'HSA': [W('HSA', '+2500')]},
     [W('ODBAX', '@2500'), W('FF34H', '@2200')], d_(342, 574), [HDG(342, 1600), W('ODBAX', '@2500'), HOLD(342, 'R', 2500)], nav='IHSA', freq=110.9)
appr('VOR16', 'VOR', '16', 167,
     {'KIREN': [W('KIREN', '+3700'), W('D262P', '@3700'), ARC('D339P', V, '@3700')], 'D088T': [W('D088T', '+3700'), W('D088P', '@3700'), ARC('HS355', V, '@3700')],
      'HSA': [W('HSA', '+3700'), W('D347J', '@3700'), W('HSPTA', '@3700')]},
     [W('CD16H', '@3700'), W('FD16H', '@2700'), W('D347C', '@1200'), W('D347A')], d_(167, 588), [HDG(167, 2000), W('HSA', '@2500'), HOLD(347, 'R', 2500)], vor=V)
appr('VOR34', 'VOR', '34', 335, {'HSA': [W('HSA', '+2500'), W('D155E', '@2500'), W('HSPTC', '@2500')]},
     [W('CD34H', '@2500'), W('FD34H', '@2100'), W('D155A')], d_(335, 574), [HDG(335, 2000), W('HSA', '@2500'), HOLD(155, 'R', 2500)], vor=V)
# departures (10-3): runway heading to 3500, then the flight planned route
for r in ('16', '34'): a.sids[r] = {'RWYHDG': [CA(3500 - 588)]}
