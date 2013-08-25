var gl = null;
var _controller = null;

var _shaderPhong = null;

var _width;
var _height;

var POINT_WIDGET_RANGE = .17;

function main() {
    var c = document.getElementById("c");
    c.addEventListener('webglcontextlost', handleContextLost, false);
    c.addEventListener('webglcontextrestored', handleContextRestored, false);

    var ratio = window.devicePixelRatio ? window.devicePixelRatio : 1;
    var mwidth = document.getElementById("c").getAttribute("style");
    
    _width = c.width;
    _height = c.height;

    gl = WebGLUtils.setupWebGL(c);
    if (!gl)
        return;

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
    e.preventDefault();
    clearLoadingImages();
}

function handleContextRestored() {
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
    _shaderPhong = initPhongShaders(gl);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    initMesh();
    draw();
}

function addPoint(verts, x, y, z) {
    verts.push(x);
    verts.push(y);
    verts.push(z);
}

function initMesh() {
    var vertsflat = []; 
    
    
    _pointWidgetVbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, _pointWidgetVbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertsflat), gl.STATIC_DRAW);
}

function Float32Concat(first, second) {
    var firstLength = first.length;
    var result = new Float32Array(firstLength + second.length);

    result.set(first);
    result.set(second, firstLength);

    return result;
}

function updateMeshes() {
    _controlMesh.updateGLArray(RMesh.DRAW_ELEMENT_UPDATE);

    if (_controlMesh.vbo)
        gl.deleteBuffer(_controlMesh.vbo);
    if (_controlMesh.nbo)
        gl.deleteBuffer(_controlMesh.ebo);

    _controlMesh.vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, _controlMesh.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, _controlMesh.vertsflat, gl.STATIC_DRAW);

    _controlMesh.ebo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, _controlMesh.ebo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, _controlMesh.facesflat, gl.STATIC_DRAW);

    if (_subdivMesh.vbo)
        gl.deleteBuffer(_subdivMesh.vbo);
    if (_subdivMesh.nbo)
        gl.deleteBuffer(_subdivMesh.nbo);

    var res = subdiv(_controlMesh.verts, _controlMesh.quads, 4);
    _subdivMesh = new RMesh(res[0], res[1]);
    _subdivMesh.updateNormals(RMesh.PER_FACE_NORMALS);
    _subdivMesh.updateGLArray(RMesh.DRAW_ARRAY_UPDATE);
    

    _subdivMesh.vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, _subdivMesh.vbo);
    log("len: " + _subdivMesh.verts.length);
    gl.bufferData(gl.ARRAY_BUFFER, _subdivMesh.vertsflat, gl.STATIC_DRAW);
    _subdivMesh.nbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, _subdivMesh.nbo);
    gl.bufferData(gl.ARRAY_BUFFER, _subdivMesh.normsflat, gl.STATIC_DRAW);
/*  */
}

function draw() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Set up the model, view and projection matrices
    var pj = _controller.proj;
    pj.loadIdentity();
    pj.perspective(45, _width / _height, 0.1, 50);

    // Add in camera controller's rotation
    var mv = _controller.modelview;
    mv.loadIdentity();
    mv.translate(0, 0, -4);
    mv.rotate(_controller.xRot, 1, 0, 0);
    mv.rotate(_controller.yRot, 0, 1, 0);

    _controller.updateMat();

    // Compute necessary matrices
    var mvp = _controller.modelviewProj;
    var modelviewInvT = mv.inverse();
    modelviewInvT.transpose();

    var mv32 = new Float32Array(mv.elements);
    var mvit32 = new Float32Array(modelviewInvT.elements);
    var mvp32 = new Float32Array(mvp.elements);

    var shader = _shaderPhong;
    gl.useProgram(shader.id);
        
    // Set up uniforms
    gl.uniformMatrix4fv(shader.mvLoc, gl.FALSE, mv32);
    gl.uniformMatrix4fv(shader.mvInvTLoc, gl.FALSE, mvit32);
    gl.uniformMatrix4fv(shader.mvpLoc, gl.FALSE, mvp32);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, _subdivMesh.vbo);
    gl.enableVertexAttribArray(0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 12, 0);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, _subdivMesh.nbo);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 12, 0);
    
    gl.drawArrays(gl.TRIANGLES, 0, _subdivMesh.vertsflat.length / 3);
    /**/
    
    if (_controller.highlightedFace >= 0) {

        shader = _shaderPointWidget;
        gl.useProgram(shader.id);
        gl.uniformMatrix4fv(shader.mvpLoc, gl.FALSE, mvp32);
        gl.uniform4f(shader.colorLoc, 1, 0, 0, .4);
        gl.bindBuffer(gl.ARRAY_BUFFER, _controlMesh.vbo);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 12, 0);
        gl.enableVertexAttribArray(0);
        gl.disableVertexAttribArray(1);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, _controlMesh.ebo);
        var total = 0;
        for (var i = 0; i < _controlMesh.faces.length; i++) {
            if (i == _controller.highlightedFace) 
                gl.drawElements(gl.TRIANGLE_FAN, _controlMesh.faces[i].length, gl.UNSIGNED_SHORT, total * 2);            
            total += _controlMesh.faces[i].length;
        }
    }
   /* */
    //checkGLError();
}

