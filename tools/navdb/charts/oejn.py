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

# ================= STARs =================
# ---------- BOSUT, EGMEG, ULULU 2L, MUVOL 1A (RWY 34L), chart 10-2 ----------
a.grid(470, 22.0, 1108, 21.0, 595, 38.5, 896, 39.0)
for n, x, y in [('MUVOL', 447, 280), ('ALKEV', 527, 338), ('KAVOD', 673, 452), ('GINKU', 885, 613), ('TOTNU', 912, 685),
                ('JN818', 945, 776), ('GEVUS', 968, 836), ('JN908', 990, 896), ('JN906', 1012, 955), ('ITUXI', 1070, 935),
                ('JN812', 1050, 875), ('VEDIR', 1028, 815), ('ULULU', 857, 833), ('TADMA', 787, 1153), ('EGMEG', 633, 1197),
                ('JN830', 872, 1128), ('REXED', 1050, 1052), ('TAPSU', 1093, 1138), ('JN840', 1133, 1177), ('BOSUT', 1213, 1243)]:
    a.cfix(n, x, y)
L34L = [W('ITUXI', '+5000'), W('JN812'), W('VEDIR', '@3100')]
star('BOSU2L', ['34L'], [W('BOSUT'), W('JN840', '-13000'), W('TAPSU'), W('REXED', '-8500', 210)] + L34L)
star('EGME2L', ['34L'], [W('EGMEG'), W('TADMA'), W('JN830', '-11000'), W('REXED', '-8500', 210)] + L34L)
star('MUVO1A', ['34L'], [W('MUVOL'), W('ALKEV'), W('KAVOD', '+17000', 250), W('GINKU', '+13000', 210), W('TOTNU'), W('JN818'),
                         W('GEVUS', '+10000'), W('JN908'), W('JN906')] + L34L)
star('ULUL2L', ['34L'], [W('ULULU'), W('GEVUS', '+10000', 210), W('JN908'), W('JN906')] + L34L)

# ---------- BOSUT, EGMEG, ULULU 2M, MUVOL 1B (RWY 34C), chart 10-2A ----------
a.grid(477, 22.0, 1113, 21.0, 565, 38.5, 862, 39.0)
for n, x, y in [('PUSPO', 1015, 650), ('ASVAK', 1037, 712), ('ITOMA', 1058, 772), ('JN798', 1080, 832), ('JN796', 1102, 890),
                ('PUVNU', 1043, 913), ('LORUS', 1020, 855), ('KASOP', 998, 795), ('JN917', 905, 762), ('JN920', 958, 733),
                ('ULULU', 824, 840), ('JN910', 640, 1138), ('EGMEG', 602, 1200), ('IMLER', 1148, 1120), ('JN732', 1110, 968),
                ('BOSUT', 1180, 1248), ('GINKU', 852, 620)]:
    a.cfix(n, x, y)
M34C = [W('ASVAK'), W('ITOMA', '@3000'), W('JN798'), W('JN796'), W('PUVNU', '@3000'), W('LORUS', '@3000'), W('KASOP', '@2100')]
star('BOSU2M', ['34C'], [W('BOSUT'), W('IMLER', '-10000', 210), W('JN732', '-5500'), W('PUVNU', '@3000'), W('LORUS', '@3000'), W('KASOP', '@2100')])
star('EGME2M', ['34C'], [W('EGMEG'), W('JN910', '-17000'), W('ULULU', '+13000'), W('JN917', '+10000', 210), W('JN920', '+8000')] + M34C)
star('MUVO1B', ['34C'], [W('MUVOL'), W('ALKEV'), W('KAVOD', '+17000', 250), W('GINKU', '+13000', 210), W('PUSPO', '+7000')] + M34C)
star('ULUL2M', ['34C'], [W('ULULU'), W('JN917', '+10000', 210), W('JN920', '+8000')] + M34C)

# ---------- BOSUT, EGMEG, ULULU 2N, MUVOL 1C (RWY 34R), chart 10-2B ----------
a.grid(475, 22.0, 1113, 21.0, 580, 38.5, 878, 39.0)
for n, x, y in [('OTAPA', 1068, 910), ('SOLOG', 1045, 850), ('PAXOS', 1025, 790)]:
    a.cfix(n, x, y)
N34R = [W('ASVAK'), W('ITOMA', '@3000'), W('JN798'), W('JN796'), W('OTAPA', '@3000'), W('SOLOG', '@3000'), W('PAXOS', '@2100')]
star('BOSU2N', ['34R'], [W('BOSUT'), W('IMLER', '-10000', 210), W('JN732', '-5500'), W('OTAPA', '@3000'), W('SOLOG', '@3000'), W('PAXOS', '@2100')])
star('EGME2N', ['34R'], [W('EGMEG'), W('JN910', '-17000'), W('ULULU', '+13000'), W('JN917', '+10000', 210), W('JN920', '+8000')] + N34R)
star('MUVO1C', ['34R'], [W('MUVOL'), W('ALKEV'), W('KAVOD', '+17000', 250), W('GINKU', '+13000', 210), W('PUSPO', '+7000')] + N34R)
star('ULUL2N', ['34R'], [W('ULULU'), W('JN917', '+10000', 210), W('JN920', '+8000')] + N34R)

# ---------- BOSUT, EGMEG, ULULU 2R, MUVOL 1F (RWY 16R), chart 10-2C ----------
a.grid(477, 22.0, 1113, 21.0, 600, 38.5, 900, 39.0)
for n, x, y in [('JN997', 793, 395), ('JN911', 880, 410), ('JN912', 820, 433), ('SOGER', 903, 468), ('JN918', 843, 492),
                ('RESEN', 925, 530), ('ORSOD', 865, 550), ('JN914', 905, 662), ('JN917', 942, 762), ('GEVUS', 970, 843),
                ('JN906', 1015, 960), ('JN814', 1157, 1015), ('IMLER', 1183, 1120), ('JN371', 700, 1103)]:
    a.cfix(n, x, y)
R16R = [W('JN917', '@8000', 210), W('JN914', '@8000'), W('ORSOD', '@4000'), W('JN918'), W('JN912'), W('JN911', '@4000'), W('SOGER', '@4000'), W('RESEN', '@3000')]
star('BOSU2R', ['16R'], [W('BOSUT'), W('IMLER', '+16000'), W('JN814', '+15000'), W('JN906', '+12000'), W('GEVUS')] + R16R)
star('EGME2R', ['16R'], [W('EGMEG'), W('JN371', '-15000'), W('ULULU', '+12000')] + R16R)
star('MUVO1F', ['16R'], [W('MUVOL'), W('ALKEV', '+13000', 250), W('JN997', '+6000', 210), W('JN911', '@4000'), W('SOGER', '@4000'), W('RESEN', '@3000')])
star('ULUL2R', ['16R'], [W('ULULU')] + R16R)

# ---------- BOSUT, EGMEG, ULULU 2S, MUVOL 1D (RWY 16L), chart 10-2D ----------
a.grid(473, 22.0, 1110, 21.0, 878, 38.5, 1178, 39.0)
for n, x, y in [('ORMIX', 1192, 428), ('NIVGO', 1240, 410), ('JN801', 1263, 470), ('UMADU', 1287, 532), ('LOXON', 1213, 490),
                ('ORKOK', 1235, 550), ('PUSPO', 1330, 648), ('ITOMA', 1373, 770), ('JN904', 1410, 908), ('JN814', 1435, 1012)]:
    a.cfix(n, x, y)
S16L = [W('PUSPO', '@8000'), W('UMADU', '@3000'), W('JN801'), W('NIVGO'), W('ORMIX', '@3000'), W('LOXON', '@3000'), W('ORKOK', '@2000')]
star('BOSU2S', ['16L'], [W('BOSUT'), W('IMLER', '+16000', 250), W('JN814', '+15000'), W('JN904', '+11000'), W('ITOMA', '+8000', 210)] + S16L)
star('EGME2S', ['16L'], [W('EGMEG'), W('JN371', '-15000', 250), W('ULULU', '+12000'), W('JN917', '+9000', 210)] + S16L)
star('MUVO1D', ['16L'], [W('MUVOL'), W('ALKEV', '+13000', 250), W('JN997', '-5000', 210), W('ORMIX', '@3000'), W('LOXON', '@3000'), W('ORKOK', '@2000')])
star('ULUL2S', ['16L'], [W('ULULU'), W('JN917', '+9000', 210)] + S16L)

# ---------- BOSUT, EGMEG, ULULU 2T, MUVOL 1E (RWY 16C), chart 10-2E ----------
a.grid(475, 22.0, 1110, 21.0, 877, 38.5, 1177, 39.0)
for n, x, y in [('TAVKU', 1177, 425), ('JN901', 1237, 405), ('JN903', 1258, 465), ('DAVGA', 1200, 485), ('RIGOG', 1282, 523),
                ('EMOXO', 1222, 545)]:
    a.cfix(n, x, y)
T16C = [W('PUSPO', '@8000'), W('RIGOG', '@3000'), W('JN903'), W('JN901'), W('TAVKU', '@3000'), W('DAVGA', '@3000'), W('EMOXO', '@2000')]
star('BOSU2T', ['16C'], [W('BOSUT'), W('IMLER', '+16000', 250), W('JN814', '+15000'), W('JN904', '+11000'), W('ITOMA', '+8000', 210)] + T16C)
star('EGME2T', ['16C'], [W('EGMEG'), W('JN371', '-15000', 250), W('ULULU', '+12000'), W('JN917', '+9000', 210)] + T16C)
star('MUVO1E', ['16C'], [W('MUVOL'), W('ALKEV', '+13000', 250), W('JN997', '-5000', 210), W('TAVKU', '@3000'), W('DAVGA', '@3000'), W('EMOXO', '@2000')])
star('ULUL2T', ['16C'], [W('ULULU'), W('JN917', '+9000', 210)] + T16C)

# ---------- IMDAP 2L, MISAM / NOMDA / VEMEM 1A (RWY 34L), chart 10-2E1 ----------
a.grid(528, 22.5, 1467, 21.5, 178, 39.0, 1052, 40.0)
for n, x, y in [('NOMDA', 265, 326), ('LOPAV', 270, 515), ('NIVGO', 272, 908), ('IMDAP', 612, 1050), ('OBTUG', 368, 1167),
                ('RABTU', 940, 837), ('VEMEM', 1070, 750), ('RABEP', 1002, 1107), ('MISAM', 1080, 1087)]:
    a.cfix(n, x, y)
I34L = [W('OBTUG', '+13000', 210), W('TOTNU'), W('JN818'), W('GEVUS', '+10000'), W('JN908'), W('JN906'), W('ITUXI', '+5000'), W('JN812'), W('VEDIR', '@3100')]
star('IMDA2L', ['34L'], [W('IMDAP')] + I34L)
star('MISA1A', ['34L'], [W('MISAM'), W('RABEP', '@15000', 230), W('IMDAP', '@15000')] + I34L)
star('NOMD1A', ['34L'], [W('NOMDA'), W('LOPAV', '+17000', 250), W('NIVGO', '+15000'), W('GINKU', '+13000', 210)] + I34L[1:])
star('VEME1A', ['34L'], [W('VEMEM'), W('RABTU', '+17000', 250), W('IMDAP', '+15000')] + I34L)

# ---------- IMDAP 2M, MISAM / NOMDA / VEMEM 1B (RWY 34C), chart 10-2E2 ----------
def imdap(sfx, sfx1, rwy, tail):
    star('IMDA' + sfx, [rwy], [W('IMDAP')] + tail)
    star('MISA' + sfx1, [rwy], [W('MISAM'), W('RABEP', '@15000', 230), W('IMDAP', '@15000')] + tail)
    star('NOMD' + sfx1, [rwy], [W('NOMDA'), W('LOPAV', '+17000', 250), W('NIVGO', '+15000')] + tail)
    star('VEME' + sfx1, [rwy], [W('VEMEM'), W('RABTU', '+17000', 250), W('IMDAP', '+15000')] + tail)
imdap('2M', '1B', '34C', [W('OBTUG', '+9000', 210), W('PUSPO', '+7000')] + M34C)
imdap('2N', '1C', '34R', [W('OBTUG', '+9000', 210), W('PUSPO', '+7000')] + N34R)

# ---------- IMDAP 2R, MISAM / NOMDA / VEMEM 1F (RWY 16R), chart 10-2E4 ----------
a.grid(459, 22.5, 1256, 21.5, 552, 39.0, 1297, 40.0)
for n, x, y in [('LADLA', 628, 390), ('NABGI', 567, 718), ('JN916', 723, 1030)]:
    a.cfix(n, x, y)
def imdap16(sfx, sfx1, rwy, tail, nomda):
    star('IMDA' + sfx, [rwy], [W('IMDAP')] + tail)
    star('MISA' + sfx1, [rwy], [W('MISAM'), W('RABEP', '@11000', 230), W('IMDAP', '+10000')] + tail)
    star('VEME' + sfx1, [rwy], [W('VEMEM'), W('RABTU', '+13000', 250), W('IMDAP', '+10000')] + tail)
    star('NOMD' + sfx1, [rwy], [W('NOMDA'), W('LADLA', '+13000', 250)] + nomda)
imdap16('2R', '1F', '16R', [W('JN916', '-8000', 210), W('JN914', '-6000'), W('ORSOD', '@4000'), W('JN918'), W('JN912'), W('JN911', '@4000'), W('SOGER', '@4000'), W('RESEN', '@3000')],
        [W('NABGI', '@6000', 210), W('JN911', '@6000'), W('SOGER', '@4000'), W('RESEN', '@3000')])
imdap16('2S', '1D', '16L', [W('UMADU', '@3000', 210), W('JN801'), W('NIVGO'), W('ORMIX', '@3000'), W('LOXON', '@3000'), W('ORKOK', '@2000')],
        [W('NABGI', '@6000', 210), W('ORMIX', '@6000'), W('LOXON', '+3000'), W('ORKOK', '@2000')])
imdap16('2T', '1E', '16C', [W('RIGOG', '@3000', 210), W('JN903'), W('JN901'), W('TAVKU', '@3000'), W('DAVGA', '@3000'), W('EMOXO', '@2000')],
        [W('NABGI', '@6000', 210), W('TAVKU', '@6000'), W('DAVGA', '+3000'), W('EMOXO', '@2000')])
