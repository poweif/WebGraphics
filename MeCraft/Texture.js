Texture = function (gl, width, height, url) {
    var tex = this;

    tex.img = null;
    tex.gl = gl;
    tex.id = gl.createTexture();

    if (url != "") {
        tex.img = new Image();
        tex.img.src = "test.png"
        tex.img.onload = function () {
            log("test loaded");
            tex.handleTextureLoad();
        }
    }
}

Texture.prototype = {
    constructor: Texture,
    
    nothing: function () { },
    
    handleTextureLoad: function(){
        var gl = this.gl;
        gl.bindTexture(gl.TEXTURE_2D, this.id);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.img);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.bindTexture(gl.TEXTURE_2D, null);
    }
}