from geo import *
import json
P['BOMOX']=dest(P['JN397'],299,51.3)
ofp={'RIDEP':('N23:38.8','E038:16.0'),'YEN':('N24:09.0','E038:02.3'),'RAGNO':('N25:16.3','E037:11.4'),'ORGIM':('N25:23.7','E037:05.7'),'TUGRU':('N25:42.9','E036:50.9'),'WEJ':('N26:10.8','E036:29.3'),'LABUN':('N26:39.9','E036:30.9'),'NETOL':('N27:07.8','E036:32.4'),'DEMSU':('N27:41.8','E036:34.4'),'TBK':('N28:21.9','E036:36.6'),'KULKI':('N25:48.2','E037:14.7'),'TULOK':('N25:10.0','E038:30.6'),'BOVET':('N24:57.7','E038:54.6'),'MIGDA':('N22:38.5','E038:42.9')}
for k,(n,e) in ofp.items(): P[k]=ll(n,e)
AP={'OEJN':ll('N21:40.9','E039:09.4'),'OETB':ll('N28:22.4','E036:37.3'),'OEMA':ll('N24:33.0','E039:42.4')}
TBK=P['TBK']
for k,b in [('D179O',183),('D136O',140),('D043O',47),('D120O',124),('MUPVA',65)]: P[k]=dest(TBK,b,15)
P['ITNOG']=dest(TBK,131,5.4)
RW31=dest(P['ITNOG'],313,5.0); P['CI31']=dest(RW31,133,14.6)
print('CI31 from TBK',dist(TBK,P['CI31']),'RW31 from TBK',dist(TBK,RW31))
RW16C=dest(P['JN254'],159,12.8); RW34C=dest(RW16C,159,2.16)
print('JN240 from 34C',dist(RW34C,P['JN240']),brg(RW34C,P['JN240'])-3)
r=lambda p:[round(p[0],5),round(p[1],5)]
db={'wpt':{k:r(v) for k,v in P.items()},'apt':{
 'OEJN':{'pos':r(AP['OEJN']),'elev':50,'var':3,'rwy':{
   '16C':{'pos':r(RW16C),'len':4000,'crs':156},'34C':{'pos':r(RW34C),'len':4000,'crs':336},
   '16L':{'pos':r(dest(RW16C,70,1.6)),'len':4000,'crs':156},'34R':{'pos':r(dest(RW34C,70,1.6)),'len':4000,'crs':336},
   '16R':{'pos':r(dest(RW16C,250,2.4)),'len':3800,'crs':156},'34L':{'pos':r(dest(RW34C,250,2.4)),'len':3800,'crs':336}}},
 'OETB':{'pos':r(AP['OETB']),'elev':2551,'var':4,'rwy':{'31':{'pos':r(RW31),'len':3350,'crs':309,'tdze':2539}}},
 'OEMA':{'pos':r(AP['OEMA']),'elev':2134,'var':3,'rwy':{}}}}
json.dump(db,open('db.json','w'))
print(len(db['wpt']),'wpts')
