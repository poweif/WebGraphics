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

// A simple camera controller which uses an HTML element as the event
// source for constructing a view matrix. Assign an "onchange"
// function to the controller as follows to receive the updated X and
// Y angles for the camera:
//
//   var controller = new CameraController(canvas);
//   controller.onchange = function(xRot, yRot) { ... };
//
// The view matrix is computed elsewhere.
//
// opt_canvas (an HTMLCanvasElement) and opt_context (a
// WebGLRenderingContext) can be passed in to make the hit detection
// more precise -- only opaque pixels will be considered as the start
// of a drag action.

function unproject(winx, winy, winz, mvpinv, width, height) {
    var ivec = new THREE.Vector4((winx * 1. / width) * 2 - 1, 
				 (winy * 1. / height) * 2 - 1, 
				 winz * 2 - 1, 1.0);
    ivec.applyMatrix4(mvpinv);
    ivec.multiplyScalar(1 / ivec.w);
    return new THREE.Vector3(ivec.x, ivec.y, ivec.z);
}

InputController = function(doc,element,cm,wd) {
    var ctl = this;
    this.xRot = 0;
    this.yRot = 0;

    this.scaleFactor = 3.0;
    this.dragging_ = false;
    this.curMouse_ = THREE.Vector2();
    this.modelview = new THREE.Matrix4();
    this.proj = new THREE.Matrix4();
    this.modelviewProj = new THREE.Matrix4();
    this.modelviewProjInv = new THREE.Matrix4();
    this.modelviewProjInvTHREE = new THREE.Matrix4();
    this.canvas_ = element;
    //this.cmesh = cm;
    this.selectedVertInd_ = -1;
    this.selectedAxis_ = -1;
    this.holdchar_ = '';

    this.updateMat();

    this.arcball_ = new ArcBall(ctl.canvas_.width, ctl.canvas_.height);
    this.thisRot_ = new THREE.Matrix4();

    this.highlightedFace = null;

    this.world = wd;

    doc.onkeydown = function (e) {        
        if (e.keyCode == 32) {            
            if (ctl.highlightedFace) {                
                var p = ctl.highlightedFace[0];
                var dir = ctl.highlightedFace[1];
                var np = [p[0], p[1], p[2]];
                if (dir == Block.XY0) 
                    np[2]--;
                else if (dir == Block.XY1)
                    np[2]++;
                else if (dir == Block.YZ0)
                    np[0]--;
                else if (dir == Block.YZ1)
                    np[0]++;
                else if (dir == Block.XZ0)
                    np[1]--;
                else if (dir == Block.XZ1)
                    np[1]++;
                ctl.world.addBlock(np[0], np[1], np[2]);
                ctl.updateMeshes();
            }
        }
        else if (e.keyCode == 68) {
            if (ctl.highlightedFace) {
                var p = ctl.highlightedFace[0];
                ctl.world.removeBlock(p[0], p[1], p[2]);
                ctl.highlightedFace = null;
                ctl.updateMeshes();
            }
        }
        else if (e.keyCode == 87) {
            // zoom in
            ctl.zoomIn();
            ctl.onMouseMove();  
        }
        else if (e.keyCode == 83) {
            // zoom out
            ctl.zoomOut();
            ctl.onMouseMove();
        }
        else {
            log(e.keyCode);
        }
    };
    doc.onkeyup = function(e){

    }

    // Assign a mouse down handler to the HTML element.
    element.onmousedown = function (ev) {
        var dragging = true;
        var rect = ctl.canvas_.getBoundingClientRect();

        var canvasWidth = ctl.canvas_.width;
        var canvasHeight = ctl.canvas_.height;
        ctl.curMouse_.x = ev.clientX - rect.left;
        ctl.curMouse_.y = ev.clientY - rect.top;

        ctl.dragging_ = true;

        if (ctl.highlightedVertInd >= 0) {
            ctl.selectedVertInd_ = ctl.highlightedVertInd;
            ctl.selectedAxis_ = ctl.highlightedAxis;

        }
        else {
            ctl.selectedVertInd_ = -1;
            ctl.selectedAxis_ = -1;
        }
    };

    // Assign a mouse up handler to the HTML element.
    element.onmouseup = function(ev) {
        ctl.dragging_ = false;

    };

    // Assign a mouse move handler to the HTML element.
    element.onmousemove = function (ev) {
        var rect = ctl.canvas_.getBoundingClientRect();
        var curX = ev.clientX - rect.left;
        var width = ctl.canvas_.width;
        var height = ctl.canvas_.height;
        var curY = height - (ev.clientY - rect.top);

        if (ctl.dragging_) {
            curY = ev.clientY - rect.top;
            var deltaX = (ctl.curMouse_.x - curX) / ctl.scaleFactor;
            var deltaY = (ctl.curMouse_.y - curY) / ctl.scaleFactor;
            ctl.curMouse_.x = curX;
            ctl.curMouse_.y = curY;
            // Update the X and Y rotation angles based on the mouse motion.
            ctl.yRot = (ctl.yRot + deltaX) % 360;
            ctl.xRot = (ctl.xRot + deltaY);
            // Clamp the X rotation to prevent the camera from going upside down.
            if (ctl.xRot < -90)
                ctl.xRot = -90;
            else if (ctl.xRot > 90)
                ctl.xRot = 90;
            ctl.onMouseMove();
        }
        else {
            ctl.curMouse_.x = curX;
            ctl.curMouse_.y = curY;
            if (ctl.holdchar_ == 32 && ctl.selectedVertInd_>=0) { }
            else {
                var mrp = unproject(curX, curY, 0, ctl.modelviewProjInvTHREE, width, height);
                var mrd = unproject(curX, curY, 1, ctl.modelviewProjInvTHREE, width, height).sub(mrp).normalize();

                var r = ctl.world.intersectRec(ctl.world.root, mrp, mrd);
                //log(r[0] + " " + r[2] + " " + r[3]);
                if (r[0]) {
                    ctl.highlightedFace = [r[2], r[3]];
                    
                }
                else
                    ctl.highlightedFace = null;               
                ctl.updateHighlightedFace();

            }
        }
    };
}

InputController.prototype = {
    constructor: InputController,
    updateMat: function () {
        this.modelviewProj.identity();
	log("" + this.modelviewProj.elements[0]);
	log("" + this.modelview.elements[0]);
        this.modelviewProj.multiply(this.modelview);
	log("" + this.modelviewProj.elements[0]);
        this.modelviewProj.multiply(this.proj);
	log("" + this.modelviewProj.elements[0]);
        this.modelviewProjInv.getInverse(this.modelviewProj);
	log("" + this.modelviewProjInv.elements[0]);
        //this.modelviewProjInvTHREE.copy(this.modelviewProjInv);
	this.modelviewProjInvTHREE = this.modelviewProjInv;
    }
}
