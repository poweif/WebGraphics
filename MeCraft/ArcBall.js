/// <reference path="index.html" />
/// <reference path="Geometry.js" />
ArcBall = function (NewWidth, NewHeight) {
    this.AdjustWidth = 1 / ((NewWidth - 1) * .5);
    this.AdjustHeight = 1 / ((NewHeight - 1) * .5);

    this.StVec = new THREE.Vector3(0, 0, 0);
    this.EnVec = new THREE.Vector3(0, 0, 0);
}


ArcBall.prototype = {
    constructor: ArcBall,

    mapToSphere: function (NewPt, NewVec) {
        var TempPt;
        var length;

        TempPt = NewPt.clone();
        TempPt.x = -((TempPt.x * this.AdjustWidth) - 1);
        TempPt.y = -(1 - (TempPt.y * this.AdjustHeight));

        length = (TempPt.x * TempPt.x) + (TempPt.y * TempPt.y);

        var r = 2;
        var r2 = 4;
        if (length > r2) {
            var norm = r / Math.sqrt(length);
            NewVec.x = TempPt.x * norm;
            NewVec.y = TempPt.y * norm;
            NewVec.z = 0;
        }
        else {
            NewVec.x = TempPt.x;
            NewVec.y = TempPt.y;
            NewVec.z = Math.sqrt(r2 - length);
        }
    },

    click: function (NewPt) {
        this.mapToSphere(NewPt,this.StVec);
    },

    drag: function (NewPt, NewRot) {
        this.mapToSphere(NewPt, this.EnVec);
    
        if (NewRot) {
            var Perp = this.StVec.clone().cross(this.EnVec);
            if (Perp.length() > .000001) {
                NewRot.x = Perp.x;
                NewRot.y = Perp.y;
                NewRot.z = Perp.z;
                NewRot.w = this.StVec.dot(this.EnVec);
            }
            else {
                NewRot.x = NewRot.y = NewRot.z = NewRot.w = 0;
            }
        }
    },

    MatrixSetRotationFromQuat: function (NewObj, q1) {
        var n = q1.lengthSq();
        var sc = n > 0 ? 2 / n : 0;
        var s = q1.clone().multiplyScalar(sc);
        var w = s.clone().multiplyScalar(q1.w);
        var x = s.clone().multiplyScalar(q1.x);
        var yy = q.y * s.y;
        var yz = q.y * s.z;
        var zz = q.z * s.z;

        NewObj.set(
            1 - (yy + zz), x.y - w.z, x.z + w.y, 0,
            x.y + w.z, 1 - x.x + zz, yz - w.x, 0,
            x.z - w.y, yz + w.x, 1 - (x.x + yy), 0,
            0, 0, 0, 1);
    }
}