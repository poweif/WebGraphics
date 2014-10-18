/*  
 * Copyright (c) 2009 The Chromium Authors. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *    * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *    * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *    * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

var gl = null;
var controller_ = null;

var shaderPhong_ = null;
var shaderWireframe_ = null;
var shaderPointWidget_ = null;

var width_;
var height_;

var controlMesh_ = new RMesh();
var world_ = null;

var highlightFace_ = new Object();
var zoomDiff_ = 0;

var testImage_ = new Image();
var testTex_ = null;


var POINT_WIDGET_RANGE = .17;

function main() {
    var c = document.getElementById("c");
    c.addEventListener('webglcontextlost', handleContextLost, false);
    c.addEventListener('webglcontextrestored', handleContextRestored, false);

    var ratio = window.devicePixelRatio ? window.devicePixelRatio : 1;
    var mwidth = document.getElementById("c").getAttribute("style");

    width_ = c.width;
    height_ = c.height;

    gl = WebGLUtils.setupWebGL(c);
    if (!gl)
        return;
    world_ = new World(gl);
    controller_ = new InputController(document, c, controlMesh_, world_);

    controller_.onMouseMove = function () {
        draw();
    };

    controller_.updateMeshes = function () {
        //updateMeshes();
        world_.runUpdate(); 
        draw();
    }
    controller_.updateHighlightedFace = function () {
        updateHighlightedFace();
        draw();
    }

    controller_.zoomIn = function () {
        var mdim = 1<<World.MAX_LEVEL;
        zoomDiff_ += mdim * .02;
    }

    controller_.zoomOut = function () {
        var mdim = 1 << World.MAX_LEVEL;
        zoomDiff_ -= mdim * .02;
    }

    testTex_ = new Texture(gl, 0, 0, "1");

    init();
}

function log(msg) {
    if (window.console && window.console.log) {
        console.log(msg);
    }
}

function vstr(msg) {
    return (msg.x + " " + msg.y + " " + msg.z);
}

function handleContextLost(e) {
    log("handle context lost");
    e.preventDefault();
    clearLoadingImages();
}

function handleContextRestored() {
    log("handle context restored");
    init();
}

function output(str) {
    document.body.appendChild(document.createTextNode(str));
    document.body.appendChild(document.createElement("br"));
}

function checkGLError() {
    var error = gl.getError();
    if (error != gl.NO_ERROR && error != gl.CONTEXT_LOST_WEBGL) {
        var str = "GL Error: " + error;
        output(str);
        throw str;
    }
}

function init() {
    gl.lineWidth(10);
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    shaderPhong_ = initPhongShaders(gl);
    shaderWireframe_ = initWireframeShaders(gl);
    shaderPointWidget_ = initPointWidgetShaders(gl);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    initMesh();
    draw();
}

function gridInterp(la, lb, lc, ld, dimx, dimy) {
    var ret = []; 
    for (var i = 0; i < dimx; i++) {
        var dx = i / (dimx - 1);
        for (var j = 0; j < dimy; j++) {            
            var dy = j / (dimy - 1);
            var res1 = la.clone().multiplyScalar(1 - dx).add(lb.clone().multiplyScalar(dx));
            var res2 = lc.clone().multiplyScalar(1 - dx).add(ld.clone().multiplyScalar(dx));
            res1.multiplyScalar(1 - dy).add(res2.multiplyScalar(dy));
            ret.push(res1);
        }
    }
    return ret;
}

function initMesh() {
    var step = (1 << 0)+1;    

    var r1 = gridInterp(
        new THREE.Vector3(-1, -1, -1),
        new THREE.Vector3(1, -1, -1),
        new THREE.Vector3(-1, -1, 1),
        new THREE.Vector3(1, -1, 1),
        step, step);
    var r2 = gridInterp(
        new THREE.Vector3(-1, 1, -1),
        new THREE.Vector3(1, 1, -1),
        new THREE.Vector3(-1, 1, 1),
        new THREE.Vector3(1, 1, 1),
        step, step);

    for (var i = 0; i < r1.length; i++) {
        controlMesh_.addVert(r1[i].x, r1[i].y, r1[i].z);
        controlMesh_.addVert(r2[i].x, r2[i].y, r2[i].z);
    }

    r1 = gridInterp(
        new THREE.Vector3(-1, -1, -1),
        new THREE.Vector3(1, -1, -1),
        new THREE.Vector3(-1, 1, -1),
        new THREE.Vector3(1, 1, -1),        
        step, step);
    r2 = gridInterp(
        new THREE.Vector3(-1, -1, 1),
        new THREE.Vector3(1, -1, 1),        
        new THREE.Vector3(-1, 1, 1),
        new THREE.Vector3(1, 1, 1),
        step, step);

    for (var i = 0; i < r1.length; i++) {
        controlMesh_.addVert(r1[i].x, r1[i].y, r1[i].z);
        controlMesh_.addVert(r2[i].x, r2[i].y, r2[i].z);
    }

    r1 = gridInterp(
        new THREE.Vector3(-1, -1, 1),
        new THREE.Vector3(-1, -1, -1),
        new THREE.Vector3(-1, 1, 1),
        new THREE.Vector3(-1, 1, -1),
        step, step);
    r2 = gridInterp(
        new THREE.Vector3(1, -1, 1),
        new THREE.Vector3(1, -1, -1),
        new THREE.Vector3(1, 1, 1),
        new THREE.Vector3(1, 1, -1),
        step, step);

    for (var i = 0; i < r1.length; i++) {
        controlMesh_.addVert(r1[i].x, r1[i].y, r1[i].z);
        controlMesh_.addVert(r2[i].x, r2[i].y, r2[i].z);
    }

    var verts = controlMesh_.verts;
    var d = new THREE.Vector3(1,1,1);

    var dim = 1 << World.MAX_LEVEL;

    for (var i = 0; i < verts.length; i++) 
        verts[i].add(d).multiplyScalar(.5*dim);
 
    controlMesh_.faces = [];//controlMesh_.quads;        
    updateMeshes();
}

function updateMeshes() {
    
    controlMesh_.updateGLArray(RMesh.DRAW_ELEMENT_UPDATE);

    if (!controlMesh_.vbo) {
        controlMesh_.vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, controlMesh_.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, controlMesh_.vertsflat, gl.STATIC_DRAW);
    }

    updateHighlightedFace();
}

function updateHighlightedFace() {
    if (controller_.highlightedFace) {
        if (highlightFace_.vbo)
            gl.deleteBuffer(highlightFace_.vbo);
        highlightFace_.vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, highlightFace_.vbo);

        var p = controller_.highlightedFace[0];
        var side = controller_.highlightedFace[1];
        var basep = new THREE.Vector3(p[0], p[1], p[2]);
        var npts = [];
        for (var i = 0; i < Block.cubeVerts.length; i++)
            npts.push(Block.cubeVerts[i].clone().add(basep));

        var normals = [
            new THREE.Vector3(0, 0, -1),
            new THREE.Vector3(0, 0, 1),
            new THREE.Vector3(-1, 0, 0),
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(0, -1, 0),
            new THREE.Vector3(0, 1, 0)];

        var quadpts = [];
        normals[side].multiplyScalar(.01);
        for (var j = 0; j < Block.cubeFaces[side].length; j++) {
            var pp = npts[Block.cubeFaces[side][j]].add(normals[side]);
            quadpts.push(pp.x);
            quadpts.push(pp.y);
            quadpts.push(pp.z);
        }
        var vflat = new Float32Array(quadpts);
        gl.bufferData(gl.ARRAY_BUFFER, vflat, gl.STATIC_DRAW);
    }
}


function draw() {
    var wdim = 1 << World.MAX_LEVEL;
    // Note: the viewport is automatically set up to cover the entire Canvas.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Set up the model, view and projection matrices
    var pj = controller_.proj;
    pj.identity();
    //pj.perspective(45, width_ / height_, 0.1, 25000);
    pj.makePerspective(45, width_ / height_, 0.1, 25000);

    // Add in camera controller's rotation
    var mv = controller_.modelview;
    mv.identity();
    mv.translate(0, 0, -wdim * 2 + zoomDiff_);
    mv.rotateX(controller_.xRot);
    mv.rotateY(controller_.yRot);
    //mv.rotate(controller_.xRot, 1, 0, 0);
    //mv.rotate(controller_.yRot, 0, 1, 0);
    mv.translate(-wdim / 2, -wdim / 2, -wdim/2);

    controller_.updateMat();

    // Compute necessary matrices
    var mvp = controller_.modelviewProj;
    var modelviewInvT = mv.getInverse();
    modelviewInvT.transpose();

    var mv32 = new Float32Array(mv.elements);
    var mvit32 = new Float32Array(modelviewInvT.elements);
    var mvp32 = new Float32Array(mvp.elements);
   
    var shader = shaderWireframe_;
    
    gl.useProgram(shader.id);
    
    // Set up uniforms
    gl.uniformMatrix4fv(shader.mvpLoc, gl.FALSE, mvp32);
    gl.bindBuffer(gl.ARRAY_BUFFER, controlMesh_.vbo);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 12, 0);
    gl.enableVertexAttribArray(0);
    gl.disableVertexAttribArray(1);
    gl.drawArrays(gl.LINES, 0, controlMesh_.vertsflat.length / 3);
    
    gl.disableVertexAttribArray(0);
    gl.disableVertexAttribArray(1);   

    shader = shaderPhong_;
    gl.useProgram(shader.id);

    // Set up uniforms
    gl.uniformMatrix4fv(shader.mvLoc, gl.FALSE, mv32);
    gl.uniformMatrix4fv(shader.mvInvTLoc, gl.FALSE, mvit32);
    gl.uniformMatrix4fv(shader.mvpLoc, gl.FALSE, mvp32);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, testTex_.id);
    gl.uniform1i(shader.quadtex, 0);

    var bucs = world_.bmBuckets.buckets;
    for (var i = 0; i < bucs.length; i++) {
        if (bucs[i].vbo && bucs[i].nbo) {
            gl.bindBuffer(gl.ARRAY_BUFFER, bucs[i].vbo);
            gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
            gl.bindBuffer(gl.ARRAY_BUFFER, bucs[i].nbo);
            gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
            gl.bindBuffer(gl.ARRAY_BUFFER, bucs[i].tbo);
            gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(0);
            gl.enableVertexAttribArray(1);
            gl.enableVertexAttribArray(2);
            gl.drawArrays(gl.TRIANGLES, 0, bucs[i].verts.length / 3)
        }
    }

    if (controller_.highlightedFace) {
        shader = shaderPointWidget_;
        gl.useProgram(shader.id);
        gl.uniformMatrix4fv(shader.mvpLoc, gl.FALSE, mvp32);
        gl.uniform4f(shader.colorLoc, 1, 0, 0, .4);
        gl.bindBuffer(gl.ARRAY_BUFFER, highlightFace_.vbo);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 12, 0);
        gl.enableVertexAttribArray(0);
        gl.disableVertexAttribArray(1);
        gl.disableVertexAttribArray(2);
        gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
    }
}

