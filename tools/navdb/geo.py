import math,json
def d2(x,y,lat0,lon0): return (22-(y-lat0)/1020, 39+(x-lon0)/920)
E={'JN240':(655,1125),'JN242':(773,1235),'ORPAR':(893,1162),'RIBIL':(748,770),'JN397':(700,633),'JN398':(633,458),'MIGDA':(188,48),'JN229':(888,543),'JN326':(901,348),'DATAP':(921,33),'EGREP':(1253,230),'JN222':(1122,1027),'ISLAM':(1283,931)}
W={'JN254':(538,855),'JN276':(487,740),'JN383':(413,578),'JN234':(370,482),'JN274':(194,381),'RALVI':(540,440),'JN510':(830,167),'DATAP':(930,72),'JN520':(972,340),'EGREP':(1265,271),'JN530':(851,551),'ISLAM':(1293,971),'MIGDA':(197,90)}
MIG=(22+38.5/60,38+42.9/60)
P={}
e={k:d2(*v,705,460) for k,v in E.items()}; w={k:d2(*v,748,470) for k,v in W.items()}
ce=(MIG[0]-e['MIGDA'][0],MIG[1]-e['MIGDA'][1]); cw=(MIG[0]-w['MIGDA'][0],MIG[1]-w['MIGDA'][1])
for k,v in e.items(): P[k]=(v[0]+ce[0],v[1]+ce[1])
for k,v in w.items():
    v=(v[0]+cw[0],v[1]+cw[1])
    P[k]=((P[k][0]+v[0])/2,(P[k][1]+v[1])/2) if k in P else v
def dist(a,b):
    la1,lo1,la2,lo2=map(math.radians,(a[0],a[1],b[0],b[1]))
    d=2*math.asin(math.sqrt(math.sin((la2-la1)/2)**2+math.cos(la1)*math.cos(la2)*math.sin((lo2-lo1)/2)**2))
    return d*180/math.pi*60
def brg(a,b):
    la1,lo1,la2,lo2=map(math.radians,(a[0],a[1],b[0],b[1]))
    y=math.sin(lo2-lo1)*math.cos(la2);x=math.cos(la1)*math.sin(la2)-math.sin(la1)*math.cos(la2)*math.cos(lo2-lo1)
    return (math.degrees(math.atan2(y,x))+360)%360
def dest(a,b_true,d):
    la1,lo1=map(math.radians,a);br=math.radians(b_true);dr=d/60*math.pi/180
    la2=math.asin(math.sin(la1)*math.cos(dr)+math.cos(la1)*math.sin(dr)*math.cos(br))
    lo2=lo1+math.atan2(math.sin(br)*math.sin(dr)*math.cos(la1),math.cos(dr)-math.sin(la1)*math.sin(la2))
    return (math.degrees(la2),math.degrees(lo2))
dm=lambda s:(int(s[1:3])+float(s[4:])/60)  # N22:38.5
def ll(n,e): return (int(n[1:3])+float(n[4:])/60, int(e[1:4])+float(e[5:])/60)
