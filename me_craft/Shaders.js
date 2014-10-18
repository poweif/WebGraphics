var PHONG_VERT_SRC = 
    "uniform mat4 modelview;\n\
     uniform mat4 modelviewInvT;\n\
     uniform mat4 modelviewProj;\n\
     attribute vec4 vertex;\n\
     attribute vec3 normal;\n\
     attribute vec2 texcoord;\n\
     varying vec3 worldEyeVec;\n\
     varying vec3 worldNormal;\n\
     varying vec3 worldPos;\n\
     varying vec2 worldTex;\n\
     void main() {\n\
       gl_Position = modelviewProj * vec4(vertex.xyz, 1.);\n\
       worldNormal = (modelviewInvT * vec4(normal, 0.)).xyz;\n\
       worldPos = (modelview * vec4(vertex.xyz, 1.)).xyz;\n\
       worldEyeVec = normalize(worldPos);\n\
       worldTex = texcoord;\n\
     }"

var PHONG_FRAG_SRC = 
    "precision mediump float;\n\
     varying vec3 worldEyeVec;\n\
     varying vec3 worldNormal;\n\
     varying vec3 worldPos;\n\
     varying vec2 worldTex;\n\
     uniform sampler2D quadTex;\n\
     void main() {\n\
      float specCoeff = 10.0;\n\
      vec3 lightpos = vec3(0,1.5,5);\n\
      vec3 L = normalize(lightpos-worldPos);\n\
      vec3 N = normalize(worldNormal);\n\
      vec3 R = 2.*dot(N,L)*N-L;\n\
      vec3 V = worldEyeVec;\n\
      float diff = dot(N,L)*.6;\n\
      float amb = .3;\n\
      float spec = (pow(dot(R,V),specCoeff) * .5);\n\
      vec4 tc = texture2D(quadTex, worldTex);\n\
      gl_FragColor = vec4(tc.xyz*(amb+diff) + vec3(spec), 1);\n\
    }"

var WIRE_VERT_SRC = 
    "uniform mat4 modelviewProj;\n\
     attribute vec4 vertex;\n\
     void main() {\n\
      gl_PointSize = 5.;\n\
      gl_Position = modelviewProj * vec4(vertex.xyz, 1.);\n\
     }"

var WIRE_FRAG_SRC = 
    "precision mediump float;\n\
     void main() {\n\
       gl_FragColor = vec4(0,0,0,1);\n\
    }"

var POINTWIDGET_VERT_SRC = 
    "uniform mat4 modelviewProj;\n\
     uniform vec4 color;\n\
     attribute vec4 vertex;\n\
     varying vec4 ocolor;\n\
     void main() {\n\
       gl_Position = modelviewProj * vec4(vertex.xyz, 1.);\n\
       ocolor = color;\n\
     }"

var POINTWIDGET_FRAG_SRC = 
    "precision mediump float;\n\
     varying vec4 ocolor;\n\
     void main() {\n\
      gl_FragColor = ocolor;\n\
     }"

function loadShader(gl, type, shaderSrc) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, shaderSrc);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS) &&
        !gl.isContextLost()) {
        var infoLog = gl.getShaderInfoLog(shader);
        output("Error compiling shader:\n" + infoLog);
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function initPhongShaders(gl) {
    var vertexShader = loadShader(gl, gl.VERTEX_SHADER, PHONG_VERT_SRC);
    var fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, PHONG_FRAG_SRC);
    // Create the program object
    var programObject = gl.createProgram();
    gl.attachShader(programObject, vertexShader);
    gl.attachShader(programObject, fragmentShader);

    // Bind Attributes
    gl.bindAttribLocation(programObject, 0, "vertex");
    gl.bindAttribLocation(programObject, 1, "normal");
    gl.bindAttribLocation(programObject, 2, "texcoord");
    
    // Link the program
    gl.linkProgram(programObject);
    // Check the link status
    var linked = gl.getProgramParameter(programObject, gl.LINK_STATUS);
    if (!linked && !gl.isContextLost()) {
        var infoLog = gl.getProgramInfoLog(programObject);
        output("Error linking program:\n" + infoLog);
        gl.deleteProgram(programObject);
        return;
    }
    var ret = new Object();
    ret.id = programObject;
    // Look up uniform locations
    ret.mvLoc = gl.getUniformLocation(programObject, "modelview");
    ret.mvInvTLoc = gl.getUniformLocation(programObject, "modelviewInvT");
    ret.mvpLoc = gl.getUniformLocation(programObject, "modelviewProj");
    ret.quadTex = gl.getUniformLocation(programObject, "quadTex");


    return ret;
}

function initWireframeShaders(gl) {
    var vertexShader = loadShader(gl, gl.VERTEX_SHADER, WIRE_VERT_SRC);
    var fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, WIRE_FRAG_SRC);
    // Create the program object
    var programObject = gl.createProgram();
    gl.attachShader(programObject, vertexShader);
    gl.attachShader(programObject, fragmentShader);

    // Bind Attributes
    gl.bindAttribLocation(programObject, 0, "vertex");

    // Link the program
    gl.linkProgram(programObject);
    // Check the link status
    var linked = gl.getProgramParameter(programObject, gl.LINK_STATUS);
    if (!linked && !gl.isContextLost()) {
        var infoLog = gl.getProgramInfoLog(programObject);
        output("Error linking program:\n" + infoLog);
        gl.deleteProgram(programObject);
        return;
    }

    var ret = new Object();
    ret.id = programObject;
    // Look up uniform locations
    ret.mvpLoc = gl.getUniformLocation(programObject, "modelviewProj");

    return ret;
}

function initPointWidgetShaders(gl) {
    log("here!");
    var vertexShader = loadShader(gl, gl.VERTEX_SHADER, POINTWIDGET_VERT_SRC);
    var fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, POINTWIDGET_FRAG_SRC);
    // Create the program object
    var programObject = gl.createProgram();
    gl.attachShader(programObject, vertexShader);
    gl.attachShader(programObject, fragmentShader);

    // Bind Attributes
    gl.bindAttribLocation(programObject, 0, "vertex");
    //gl.bindAttribLocation(programObject, 1, "color");

    // Link the program
    gl.linkProgram(programObject);
    // Check the link status
    var linked = gl.getProgramParameter(programObject, gl.LINK_STATUS);
    if (!linked && !gl.isContextLost()) {
        var infoLog = gl.getProgramInfoLog(programObject);
        output("Error linking program:\n" + infoLog);
        gl.deleteProgram(programObject);
        return;
    }

    var ret = new Object();
    ret.id = programObject;
    // Look up uniform locations
    ret.mvpLoc = gl.getUniformLocation(programObject, "modelviewProj");
    ret.colorLoc = gl.getUniformLocation(programObject, "color");

    return ret;
}