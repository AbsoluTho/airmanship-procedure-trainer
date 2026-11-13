from geo import *
P['BOMOX']=dest(P['JN397'],299,51.3)
for a,b,chart in [('JN242','ORPAR',8.2),('ORPAR','RIBIL',24.6),('RIBIL','JN397',8.5),('JN397','JN398',10.9),('JN398','MIGDA',35.3),('RIBIL','JN229',15.6),('JN229','JN326',11.4),('JN326','DATAP',18.4),('JN229','EGREP',28.1),('ORPAR','JN222',15.7),('JN222','ISLAM',11.1),('JN254','JN276',7.2),('JN276','JN383',10.4),('JN383','JN234',6.2),('JN234','MIGDA',25.0),('JN383','RALVI',10.9),('RALVI','JN510',25.3),('JN510','DATAP',8.0),('RALVI','JN520',25.9),('JN520','EGREP',17.5),('RALVI','JN530',19.4),('JN530','ISLAM',35.7),('JN234','JN274',11.8),('JN274','BOMOX',16.7)]:
    print(f'{a}-{b}: calc {dist(P[a],P[b]):5.1f} chart {chart}  trk {brg(P[a],P[b])-3:5.0f}M')
