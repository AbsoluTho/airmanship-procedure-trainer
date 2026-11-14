# OEJN Jeddah / King Abdulaziz. Jeppesen 10-2.. (STAR), 10-3.. (SID), 11-.., 12-.. (approaches). Fix positions read on each chart's
# lat/long grid (about 1 NM), fixes already known (OFP) keep their positions.
AP = Apt('OEJN', var=2.6)
a = AP
F = '+15000'
def sid(rwy, id, legs): a.sids.setdefault(rwy, {})[id] = legs
def star(id, rwys, legs): a.stars[id] = {'rwys': rwys, 'legs': legs}

# ---------- SIDs 2F (RWY 16R), chart 10-3B ----------
a.grid(763, 22.0, 1162, 21.5, 744, 39.0, 1117, 39.5)
for n, x, y in [('JN251', 893, 1150), ('JN277', 873, 1245), ('JN252', 700, 1125), ('JN322', 573, 1052), ('JN324', 478, 793),
                ('JN253', 655, 1000), ('JN276', 758, 757), ('JN326', 1090, 483), ('JN254', 797, 846), ('JN233', 942, 737),
                ('JN229', 1080, 635), ('OBTUG', 905, 908), ('JN237', 1162, 960), ('JN228', 559, 745), ('ISLAM', 1388, 940)]:
    a.cfix(n, x, y)
I16R = [W('JN251', '+3200', 210), W('JN277'), W('JN252', '-6000')]
sid('16R', 'BOMO2F', I16R + [W('JN322'), W('JN324', '+13000'), W('BOMOX')])
sid('16R', 'DATA2F', I16R + [W('JN253'), W('JN276', '+13000'), W('JN326', '+19000'), W('DATAP')])
sid('16R', 'EGRE2F', I16R + [W('JN253'), W('JN254', '+12000'), W('JN233', '+15000'), W('JN229', '+17000'), W('EGREP')])
sid('16R', 'ISLA2F', I16R + [W('JN253'), W('OBTUG', '+11000'), W('JN237'), W('ISLAM')])
sid('16R', 'MIGD2F', I16R + [W('JN253'), W('JN228', '+13000'), W('MIGDA')])

# ---------- SIDs 3D (RWY 16L), chart 10-3 ----------
a.grid(855, 22.0, 1252, 21.5, 1070, 39.0, 1443, 39.5)
for n, x, y in [('JN230', 1225, 1155), ('JN238', 1382, 1138), ('JN225', 1322, 972), ('RIBIL', 1296, 905), ('JN397', 1258, 797),
                ('JN398', 1208, 662), ('JN222', 1590, 1105)]:
    a.cfix(n, x, y)
I16L = [W('JN230', '+1000', 210), W('JN238', '-6000')]
R16L = I16L + [W('JN225', '+10000'), W('RIBIL')]
sid('16L', 'BOMO3D', R16L + [W('JN397', '+12000'), W('BOMOX')])
sid('16L', 'DATA3D', R16L + [W('JN229', '+12000'), W('JN326'), W('DATAP')])
sid('16L', 'EGRE3D', R16L + [W('JN229', '+12000'), W('EGREP')])
sid('16L', 'ISLA3D', I16L + [W('JN222'), W('ISLAM')])
sid('16L', 'MIGD3D', R16L + [W('JN397', '+12000'), W('JN398'), W('MIGDA')])

# ---------- SIDs 3V (RWY 34R), chart 10-3C ----------
a.grid(835, 22.0, 1233, 21.5, 1000, 39.0, 1373, 39.5)
for n, x, y in [('JN232', 1120, 1045), ('JN234', 925, 628), ('JN274', 788, 548), ('JN550', 1367, 657), ('JN555', 1417, 577),
                ('JN236', 1272, 1008), ('JN237', 1418, 1032)]:
    a.cfix(n, x, y)
I34R = [W('JN232', '+600', 210)]
sid('34R', 'BOMO3V', I34R + [W('RIBIL', '-6000'), W('JN397'), W('JN234'), W('JN274'), W('BOMOX')])
sid('34R', 'DATA3V', I34R + [W('RIBIL', '-6000'), W('JN550', '-13000'), W('JN555'), W('DATAP')])
sid('34R', 'EGRE3V', I34R + [W('RIBIL', '-6000'), W('JN550', '-13000'), W('JN555'), W('EGREP')])
sid('34R', 'ISLA3V', I34R + [W('JN236', '-5000'), W('JN237'), W('ISLAM', '-13000')])
sid('34R', 'MIGD3V', I34R + [W('RIBIL', '-6000'), W('JN397'), W('JN234', '-13000'), W('MIGDA')])

# ---------- SIDs 3X (RWY 34L), chart 10-3E ----------
a.grid(782, 22.0, 1187, 21.5, 1080, 39.0, 1457, 39.5)
for n, x, y in [('JN272', 1145, 968), ('ORSOD', 1037, 878), ('SERSO', 968, 725), ('JN266', 830, 650), ('JN383', 1038, 648),
                ('RALVI', 1137, 538), ('JN510', 1368, 322), ('JN520', 1480, 457), ('JN530', 1385, 625)]:
    a.cfix(n, x, y)
I34L = [W('JN272', '+1500', 210), W('ORSOD', '-6000')]
V34L = I34L + [W('SERSO'), W('JN383'), W('RALVI')]
sid('34L', 'BOMO3X', I34L + [W('SERSO', '-12000'), W('JN266'), W('BOMOX')])
sid('34L', 'DATA3X', V34L + [W('JN510', '-13000'), W('DATAP')])
sid('34L', 'EGRE3X', V34L + [W('JN520', '-13000'), W('EGREP')])
sid('34L', 'ISLA3X', V34L + [W('JN530', '-13000'), W('ISLAM', '-13000')])
sid('34L', 'MIGD3X', I34L + [W('SERSO', '-12000'), W('JN274'), W('MIGDA')])

# ---------- SIDs EGPOB / KAROX / RIBAM 2E (RWY 16C), chart 10-3G ----------
a.grid(594, 21.5, 991, 21.0, 862, 38.5, 1235, 39.0)
for n, x, y in [('JN240', 1390, 522), ('JN242', 1478, 610), ('SINBI', 1636, 727), ('EGPOB', 1818, 1050), ('JN224', 1430, 818),
                ('JN226', 1192, 925), ('JN323', 1048, 938), ('DENBU', 745, 970), ('KAROX', 686, 1025), ('RIBAM', 1307, 1220)]:
    a.cfix(n, x, y)
I16C = [W('JN240', '+1600', 210), W('JN242', '-7000')]
SOUTH = {'EGPO': [W('SINBI'), W('EGPOB')], 'KARO': [W('JN224', '-10000'), W('JN226'), W('JN323', '+16000'), W('DENBU'), W('KAROX')],
         'RIBA': [W('JN224', '-10000'), W('RIBAM')]}
for k, legs in SOUTH.items(): sid('16C', k + '2E', I16C + legs)

# ---------- SIDs EGPOB / KAROX / RIBAM 2F (RWY 16R), chart 10-3H ----------
a.grid(586, 21.5, 983, 21.0, 903, 38.5, 1276, 39.0)
for n, x, y in [('JN251', 1425, 575), ('JN277', 1405, 670), ('JN257', 1366, 857), ('JN321', 1686, 977), ('EGPOB', 1858, 1042),
                ('JN226', 1232, 915), ('RIBAM', 1348, 1212)]:
    a.cfix(n, x, y)
S16R = [W('JN251', '+3200', 210), W('JN277'), W('JN257', '-10000')]
sid('16R', 'EGPO2F', S16R + [W('JN321', '-12000'), W('EGPOB')])
sid('16R', 'KARO2F', S16R + [W('JN226'), W('JN323', '+16000'), W('DENBU'), W('KAROX')])
sid('16R', 'RIBA2F', S16R + [W('RIBAM')])

# ---------- SIDs EGPOB / KAROX / RIBAM 3D (RWY 16L), chart 10-3F ----------
a.grid(618, 21.5, 1014, 21.0, 843, 38.5, 1215, 39.0)
for n, x, y in [('JN230', 1368, 520), ('ORPAR', 1552, 578), ('SINBI', 1616, 750), ('JN338', 1468, 970)]:
    a.cfix(n, x, y)
D16L = [W('JN230', '+1000', 210), W('ORPAR', '-6000'), W('SINBI')]
sid('16L', 'EGPO3D', D16L + [W('EGPOB')])
sid('16L', 'KARO3D', D16L + [W('JN224', '-10000'), W('JN226'), W('JN323', '+16000'), W('DENBU'), W('KAROX')])
sid('16L', 'RIBA3D', D16L + [W('JN338', '@13000'), W('RIBAM')])

# ---------- SIDs EGPOB / KAROX / RIBAM 3V (RWY 34R), chart 10-3J ----------
a.grid(606, 21.5, 1002, 21.0, 617, 38.5, 990, 39.0)
for n, x, y in [('JN232', 1108, 420), ('JN236', 1260, 380), ('ORPAR', 1328, 566), ('SINBI', 1392, 740), ('JN223', 1268, 677),
                ('JN224', 1185, 830), ('JN226', 947, 937), ('JN227', 852, 947), ('DENBU', 500, 983), ('JN600', 1283, 902),
                ('RIBAM', 1062, 1233), ('EGPOB', 1573, 1062)]:
    a.cfix(n, x, y)
V34R = [W('JN232', '+1000', 210), W('JN236', '-5000')]
sid('34R', 'EGPO3V', V34R + [W('ORPAR'), W('SINBI'), W('EGPOB')])
sid('34R', 'KARO3V', V34R + [W('ORPAR', '+8000'), W('JN223', '+10000'), W('JN224'), W('JN226'), W('JN227', '+18000'), W('DENBU'), W('KAROX')])
sid('34R', 'RIBA3V', V34R + [W('ORPAR', '+8000'), W('SINBI', '+11000'), W('JN600', '+15000'), W('RIBAM')])

# ---------- SIDs EGPOB / KAROX / RIBAM 3X (RWY 34L), chart 10-3L ----------
a.grid(586, 21.5, 983, 21.0, 903, 38.5, 1275, 39.0)
for n, x, y in [('JN272', 1338, 372), ('JN264', 1195, 450), ('JN278', 980, 718), ('JN279', 942, 765), ('JN382', 1045, 846),
                ('JN390', 1268, 898), ('JN395', 1525, 962), ('JN385', 1105, 917), ('RIBAM', 1347, 1213)]:
    a.cfix(n, x, y)
X34L = [W('JN272', '+1500', 210), W('JN264', '-6000'), W('JN278')]
sid('34L', 'EGPO3X', X34L + [W('JN382'), W('JN390', '@12000'), W('JN395', '+16000'), W('EGPOB')])
sid('34L', 'KARO3X', X34L + [W('JN279', '-12000'), W('DENBU'), W('KAROX')])
sid('34L', 'RIBA3X', X34L + [W('JN382'), W('JN385', '@12000'), W('RIBAM')])

# ---------- SIDs EGPOB / KAROX / RIBAM 2W (RWY 34C), chart 10-3K ----------
a.grid(390, 22.0, 1025, 21.0, 840, 38.5, 1138, 39.0)
for n, x, y in [('ASPAG', 970, 345), ('NIVBA', 1040, 523), ('JN610', 965, 617), ('JN733', 838, 775), ('JN522', 1150, 815),
                ('JN521', 1187, 913), ('JN259', 1457, 958)]:
    a.cfix(n, x, y)
W34C = [W('JN254'), W('JN276', '@6000'), W('JN383'), W('ASPAG'), W('NIVBA')]
sid('34C', 'EGPO2W', W34C + [W('JN522', '-9000'), W('JN521', '@12000'), W('JN259'), W('EGPOB')])
sid('34C', 'KARO2W', W34C + [W('JN610', '-12000'), W('JN733'), W('DENBU'), W('KAROX')])
sid('34C', 'RIBA2W', W34C + [W('JN522', '-9000'), W('JN521', '@12000'), W('RIBAM')])
# ORPAR: two charts agree, 1.6 NM from the older hand-typed position
a.fx['ORPAR'] = [21.55051, 39.45302]
