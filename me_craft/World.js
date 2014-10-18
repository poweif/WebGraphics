Block = function () {
    this.ix = 0;
    this.iy = 0;
    this.iz = 0;
}

Block.XY0 = 0;
Block.XY1 = 1;
Block.YZ0 = 2;
Block.YZ1 = 3;
Block.XZ0 = 4;
Block.XZ1 = 5;
Block.cubeFaces = [
    [0, 1, 3, 2],
    [5, 4, 6, 7],
    [4, 0, 2, 6],
    [1, 5, 7, 3],    
    [4, 5, 1, 0],
    [2, 3, 7, 6]];

Block.cubeVerts = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(1, 1, 0),
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(1, 0, 1),
    new THREE.Vector3(0, 1, 1),
    new THREE.Vector3(1, 1, 1)];

BlockMeshBuckets = function (nb, w) {
    this.nbuckets = nb;
    this.world = w;
    this.gl = this.world.gl;
    this.counter = 1;
    this.bqueue = new Object();
    this.dqueue = new Object();

    this.buckets = [];
    for (var i = 0; i < nb; i++)
        this.buckets.push(new Bucket(w,i));

    this.updateMeshQ = new Object();
}

BlockMeshBuckets.prototype = {
    constructor: BlockMeshBuckets,

    addBlock: function (bid) {
        this.buckets[bid % this.nbuckets].addBlock(bid);
        this.counter++;
        this.addToUpdateQueue(bid);
    },

    removeBlock: function (bid){
        this.buckets[bid % this.nbuckets].removeBlock(bid);
        this.addToDeleteQueue(bid);
    },

    _updateBlock: function (bid) {
        this.buckets[bid % this.nbuckets].updateBlock(bid);
    },

    processQueues: function () {
        this.updateMeshQ = new Object();
        for (var bid in this.bqueue) {
            if (this.dqueue[bid]) 
                continue;

            this.updateMeshQ[bid % this.nbuckets] = bid % this.nbuckets;
            this._updateBlock(bid);
        }
        this.bqueue = new Object();

        for (var bid in this.dqueue) {
            this.updateMeshQ[bid % this.nbuckets] = bid % this.nbuckets;
        }
        this.dqueue = new Object(); 
    },

    addToUpdateQueue: function (bid) {
        if(bid>=0)
            this.bqueue[bid] = bid;
    },

    addToDeleteQueue: function (bid) {
        if(bid>=0)
            this.dqueue[bid] = bid;
    },

    _updateMesh: function () {
        var ret = []; 
        for (var i in this.updateMeshQ) {
            if (this.buckets[i].changedMesh) {
                this.buckets[i].makeMeshArray();
                ret.push(i);
            }
        }
        return ret;
    },

    // should the GL stuff go here?  I wonder
    updateGLMeshes: function () {
        var updates = this._updateMesh();
        for (var i = 0; i < updates.length; i++) {
            var buc = this.buckets[updates[i]];
            if (buc.vbo) 
                this.gl.deleteBuffer(this.buckets[updates[i]].vbo);
            if (buc.nbo)
                this.gl.deleteBuffer(this.buckets[updates[i]].nbo);

            buc.vbo = this.gl.createBuffer();
            buc.nbo = this.gl.createBuffer();
            buc.tbo = this.gl.createBuffer(); 

            this.gl.bindBuffer(gl.ARRAY_BUFFER, buc.vbo);
            this.gl.bufferData(gl.ARRAY_BUFFER, buc.verts, gl.STATIC_DRAW);

            this.gl.bindBuffer(gl.ARRAY_BUFFER, buc.nbo);
            this.gl.bufferData(gl.ARRAY_BUFFER, buc.norms, gl.STATIC_DRAW);

            this.gl.bindBuffer(gl.ARRAY_BUFFER, buc.tbo);
            this.gl.bufferData(gl.ARRAY_BUFFER, buc.texcoords, gl.STATIC_DRAW);
        }
    }
}

Bucket = function (w, id) {
    this.blocks = [];   
    this.world = w;
    this.verts = null;
    this.normals = null;
    this.texcoords = null; 
    this.faces = new Object();
    this.changedMesh = false;
    this.id = id; 
}

Bucket.prototype = {
    constructor: Bucket,

    addBlock: function (bid) {
        var i = this.world.hash[bid];
        this.blocks.push(bid);
        this.world.bmBuckets.addToUpdateQueue(this.world.ind3d([i[0] + 1, i[1], i[2], World.MAX_LEVEL]));
        this.world.bmBuckets.addToUpdateQueue(this.world.ind3d([i[0] - 1, i[1], i[2], World.MAX_LEVEL]));
        this.world.bmBuckets.addToUpdateQueue(this.world.ind3d([i[0], i[1] + 1, i[2], World.MAX_LEVEL]));
        this.world.bmBuckets.addToUpdateQueue(this.world.ind3d([i[0], i[1] - 1, i[2], World.MAX_LEVEL]));
        this.world.bmBuckets.addToUpdateQueue(this.world.ind3d([i[0], i[1], i[2] + 1, World.MAX_LEVEL]));
        this.world.bmBuckets.addToUpdateQueue(this.world.ind3d([i[0], i[1], i[2] - 1, World.MAX_LEVEL]));
        this.world.bmBuckets.addToUpdateQueue(this.world.ind3d([i[0], i[1], i[2], World.MAX_LEVEL]));
        this.updateBlock(bid);
        this.changedMesh = true;
    },
    
    updateBlock: function (bid) {
        var item = this.world.hash[bid];
        if (!item) {
            if (this.faces[bid])
                delete this.faces[bid];
            return;
        }
        this.faces[bid] = [];
        for (var i = 0; i < 6; i++) {
            if (i == Block.XY0)
                res = !this.world.blockPresent(item[0], item[1], item[2] - 1);
            else if (i == Block.XY1)
                res = !this.world.blockPresent(item[0], item[1], item[2] + 1);
            else if (i == Block.YZ0)
                res = !this.world.blockPresent(item[0] - 1, item[1], item[2]);
            else if (i == Block.YZ1)
                res = !this.world.blockPresent(item[0] + 1, item[1], item[2]);
            else if (i == Block.XZ0)
                res = !this.world.blockPresent(item[0], item[1] - 1, item[2]);
            else if (i == Block.XZ1)
                res = !this.world.blockPresent(item[0], item[1] + 1, item[2]);

            if (res) {
                this.faces[bid].push(i);
             }
        }

        this.changedMesh = true;
    },

    removeBlock: function (bid) {
        var nblocks = [];
        var i = this.world.hash[bid];
        if (!i)
            return;
        // change this to allow for array deletion instead of manual deletion
        for (var j = 0; j < this.blocks.length; j++) {
            if (this.blocks[j] == bid)
                continue;
            nblocks.push(this.blocks[j]);
        }
        this.blocks = nblocks;

        this.world.bmBuckets.addToUpdateQueue(this.world.ind3d([i[0] + 1, i[1], i[2], World.MAX_LEVEL]));
        this.world.bmBuckets.addToUpdateQueue(this.world.ind3d([i[0] - 1, i[1], i[2], World.MAX_LEVEL]));
        this.world.bmBuckets.addToUpdateQueue(this.world.ind3d([i[0], i[1] + 1, i[2], World.MAX_LEVEL]));
        this.world.bmBuckets.addToUpdateQueue(this.world.ind3d([i[0], i[1] - 1, i[2], World.MAX_LEVEL]));
        this.world.bmBuckets.addToUpdateQueue(this.world.ind3d([i[0], i[1], i[2] + 1, World.MAX_LEVEL]));
        this.world.bmBuckets.addToUpdateQueue(this.world.ind3d([i[0], i[1], i[2] - 1, World.MAX_LEVEL]));
        this.world.bmBuckets.addToUpdateQueue(this.world.ind3d([i[0], i[1], i[2], World.MAX_LEVEL]));

        if(this.faces[bid])
            delete this.faces[bid];

        this.changedMesh = true;
    },

    makeMeshArray: function () {
        var onev = THREE.Vector3(1, 1, 1);
        var verts = [];
        var norms = [];
        var texcoords = [];
        for (var i = 0; i < this.blocks.length; i++) {
            var pos = this.world.hash[this.blocks[i]];
            if (pos) {
                var ca = new THREE.Vector3(pos[0], pos[1], pos[2]);
                var fs = this.faces[this.blocks[i]];
                for (var j = 0; j < fs.length; j++) {
                    var n = this.world.gnorms[fs[j]];
                    var thisface = Block.cubeFaces[fs[j]];
                    for (var k = 0; k < 3; k++) {
                        var p = Block.cubeVerts[thisface[k]];
                        verts.push(p.x + pos[0]);
                        verts.push(p.y + pos[1]);
                        verts.push(p.z + pos[2]);
                        norms.push(-n.x);
                        norms.push(-n.y);
                        norms.push(-n.z);
                    }
                    texcoords.push(0);
                    texcoords.push(0);
                    texcoords.push(1);
                    texcoords.push(0);            
                    texcoords.push(1);
                    texcoords.push(1);
                    
                    for (var k = 2; k <= 4; k++) {
                        var p = Block.cubeVerts[thisface[k%4]];
                        verts.push(p.x + pos[0]);
                        verts.push(p.y + pos[1]);
                        verts.push(p.z + pos[2]);
                        norms.push(-n.x);
                        norms.push(-n.y);
                        norms.push(-n.z);
                    }
                    
                    texcoords.push(1);
                    texcoords.push(1);
                    texcoords.push(0);
                    texcoords.push(1);            
                    texcoords.push(0);
                    texcoords.push(0);                                 
                }
            }
        }

        this.verts = new Float32Array(verts);
        this.norms = new Float32Array(norms);
        this.texcoords = new Float32Array(texcoords);
        this.changedMesh = false;
    }
}
// octree for intersection? 
// hashmap for neighbors? 

World = function (ogl) {
    this.gl = ogl;
    this.gpts = [
            new THREE.Vector3(),
            new THREE.Vector3(),
            new THREE.Vector3(),
            new THREE.Vector3(),
            new THREE.Vector3(),
            new THREE.Vector3(),
            new THREE.Vector3(),
            new THREE.Vector3()];

    this.gnorms = [
         new THREE.Vector3(0, 0, 1),
         new THREE.Vector3(0, 0, -1),
         new THREE.Vector3(1, 0, 0),
         new THREE.Vector3(-1, 0, 0),
         new THREE.Vector3(0, 1, 0),
         new THREE.Vector3(0, -1, 0)];

    this.hash = new Object(); 
    this.levelsum = [];
    for (var i = 0; i <= World.MAX_LEVEL; i++) {
        var len = (1 << i);
        if (i > 0)
            this.levelsum.push(this.levelsum[i - 1] + len * len * len);
        else
            this.levelsum.push(1);
    }
    this.levelsum[-1] = 0;
    this.bmBuckets = new BlockMeshBuckets(100, this);

    this.rlen = [];
    this.rlen2 = [];
    for (var i = 0; i <= World.MAX_LEVEL; i++) {
        this.rlen.push(1 << i);
        this.rlen2.push(this.rlen[i] * this.rlen[i]);
    }

    var mdim = this.rlen[World.MAX_LEVEL];
    var cx = mdim / 2;
    var cy = mdim / 2;
    var cz = mdim / 2;
    var wid = mdim * .2;
    for (var x = 0; x < mdim; x++) {
        for (var y = 0; y < mdim; y++) {
            for (var z = 0; z < mdim; z++) {
                var dx = x - cx;
                var dy = y - cy;
                var dz = z - cz;
                if (dx * dx + dy * dy + dz * dz < wid * wid)
                    this.addBlock(x, y, z);

            }
        }
    }

    this.root = [0, 0, 0, 0];
    this.runUpdate();
}

World.MAX_LEVEL = 4; 

World.prototype = {
    constructor: World,

    ind3d: function (node) {
        if (node[0] < 0 || node[0] >= this.rlen[node[3]] ||
            node[1] < 0 || node[1] >= this.rlen[node[3]] ||
            node[2] < 0 || node[2] >= this.rlen[node[3]])
            return -1;

        return this.levelsum[node[3] - 1] +
            (node[0] + node[1] * this.rlen[node[3]] + node[2] * this.rlen2[node[3]]);
    },
        
    intersect: function (node, raypt, raydir) {        
        var x = node[0];
        var y = node[1];
        var z = node[2];
        var l = node[3];

        var length = 1 << (World.MAX_LEVEL - l);
        x *= length;
        y *= length;
        z *= length;
        var xp = x+length;
        var yp = y+length;
        var zp = z+length;

        var pts = this.gpts;
        pts[0].set(x, y, z);
        pts[1].set(xp, y, z);
        pts[2].set(x, yp, z);
        pts[3].set(xp, yp, z);
        pts[4].set(x, y, zp);
        pts[5].set(xp, y, zp);
        pts[6].set(x, yp, zp);
        pts[7].set(xp, yp, zp);

        var t;
        var bestt = Number.POSITIVE_INFINITY;
        var bestside = -1;
        t = quadRayIsect2([pts[0], pts[1], pts[3], pts[2]], this.gnorms[Block.XY0], raypt, raydir);
        if (t < bestt) {
            bestt = t;
            bestside = Block.XY0;
        }
        t = quadRayIsect2([pts[5], pts[4], pts[6], pts[7]], this.gnorms[Block.XY1], raypt, raydir);
        if (t < bestt) {
            bestt = t;
            bestside = Block.XY1;
        }
        t = quadRayIsect2([pts[4], pts[0], pts[2], pts[6]], this.gnorms[Block.YZ0], raypt, raydir);
        if (t < bestt) {
            bestt = t;
            bestside = Block.YZ0;
        }
        t = quadRayIsect2([pts[1], pts[5], pts[7], pts[3]], this.gnorms[Block.YZ1], raypt, raydir);
        if (t < bestt) {
            bestt = t;
            bestside = Block.YZ1;
        }
        t = quadRayIsect2([pts[2], pts[3], pts[7], pts[6]], this.gnorms[Block.XZ1], raypt, raydir);
        if (t < bestt) {
            bestt = t;
            bestside = Block.XZ1;
        }
        t = quadRayIsect2([pts[4], pts[5], pts[1], pts[0]], this.gnorms[Block.XZ0], raypt, raydir);
        if (t < bestt) {
            bestt = t;
            bestside = Block.XZ0;
        }

        return [bestside >= 0, bestt, bestside];
    },

    intersectRec: function (node, raypt, raydir) {
        var intres = this.intersect(node, raypt, raydir);
        
        if (intres[0]) {
            //log("node: " + node + " hit");
            if (node[3] == World.MAX_LEVEL) {
                this.intersect(node, raypt, raydir, true);                
                return [true, intres[1], node, intres[2]];
            }
            else {
                var x = node[0] << 1;
                var y = node[1] << 1;
                var z = node[2] << 1;
                var l = node[3] + 1;

                var res = false;
                var tdist = Number.POSITIVE_INFINITY;
                var bestblock = null;
                var bestside = -1;
                for (var i = 0 | 0; i < 8; i++) {
                    var nx = x, ny = y, nz = z;
                    if ((i & 1) > 0)
                        nx++;
                    if ((i & 2) > 0)
                        ny++;
                    if ((i & 4) > 0)
                        nz++;

                    var a = [nx, ny, nz, l];
                    var ind = this.ind3d(a);
                    
                    if (this.hash[ind]) {

                        var tres = this.intersectRec(a, raypt, raydir);
                        res = res || tres[0];
                        if (tres[0] && tres[1] < tdist) {
                            tdist = tres[1];
                            bestblock = tres[2];
                            bestside = tres[3];
                        }
                    }
                }                
                return [res, tdist, bestblock, bestside];
            }
        }

        return [false, Number.POSITIVE_INFINITY, null, -1];
    },

    addBlock: function (x, y, z) {        
        var level = World.MAX_LEVEL;
        var ind = this.ind3d([x, y, z, World.MAX_LEVEL]);
        var mdim = 1 << World.MAX_LEVEL;
        if (ind < 0) return;

        var ox = x, oy = y, oz = z;
        while (level >= 0) {
            this.hash[ind] = [x, y, z];
            level--;
            if (level < 0) break;
            x = (x >> 1);
            y = (y >> 1);
            z = (z >> 1);
            ind = this.ind3d([x, y, z, level]);
            if (this.hash[ind])
                break;           
        }
        this.bmBuckets.addBlock(this.ind3d([ox, oy, oz, World.MAX_LEVEL]));
    },

    removeBlock: function (x, y, z) {
        var level = World.MAX_LEVEL;
        var ind = this.ind3d([x, y, z, World.MAX_LEVEL]);
        if (ind < 0) return;
        var mdim = 1 << World.MAX_LEVEL;
        if (x >= mdim || y >= mdim || z >= mdim || x < 0 || y < 0 || z < 0)
            return;

        var toDelete = []; 
        var ox = x, oy = y, oz = z;
        outer: while (level >= 0) {
            toDelete.push(ind);
            level--;
            if (level < 0) break;
            x = (x >> 1);
            y = (y >> 1);
            z = (z >> 1);
            ind = this.ind3d([x, y, z, level]);

            // check all children.  If no children, then delete this node in the 
            // next iteration
            for (var i = 0; i < 8; i++) {
                var nx = x * 2, ny = y * 2, nz = z * 2;
                if (i & 1) nx++;
                if (i & 2) ny++;
                if (i & 4) nz++;

                var nind = this.ind3d([nx, ny, nz, level+1]);

                if (this.hash[nind])
                    break outer; 
            }
        }
        this.bmBuckets.removeBlock(this.ind3d([ox, oy, oz, World.MAX_LEVEL]));

        for (var i = 0; i < toDelete.length; i++) {
            delete this.hash[toDelete[i]];
        }
    },

    runUpdate: function() { 
        this.bmBuckets.processQueues();
        this.bmBuckets.updateGLMeshes();
    }, 

    blockPresent: function (x, y, z) {
        var dim = 1<<World.MAX_LEVEL;
        if(x<0||y<0||z<0||x>=dim||y>=dim||z>=dim) return false;
        var nind = this.ind3d([x, y, z, World.MAX_LEVEL]);
        return (this.hash[nind]);
    }
    
}
