Texture = function (gl, width, height, url) {
    var tex = this;

    tex.img = null;
    tex.gl = gl;
    tex.id = gl.createTexture();

    if (url != "" && false) {
        tex.img = new Image();
        tex.img.src = "test.png";
        tex.img.onload = function () {
            log("test loaded");
            tex.handleTextureLoad();
        }
    }
    else {
        var canvas = document.createElement('canvas');
        canvas.width = 2;
        canvas.height = 2;
        var ctx = canvas.getContext('2d');

        var dx = canvas.width;
        var dy = canvas.height;
        var imgData = ctx.createImageData(dx, dy);        
        log(imgData.data.length);
        for (var i = 0; i < dy; i++) {
            for (var j = 0; j < dx; j++) {
                if ((i + j) % 2 == 0) {
                    imgData.data[(i * dy + j) * 4] = 255;
                    imgData.data[(i * dy + j) * 4 + 1] = 255;
                    imgData.data[(i * dy + j) * 4 + 2] = 255;
                    imgData.data[(i * dy + j) * 4 + 3] = 255;
                }
                else {
                    imgData.data[(i * dy + j) * 4] = 255;
                    imgData.data[(i * dy + j) * 4 + 1] = 0;
                    imgData.data[(i * dy + j) * 4 + 2] = 0;
                    imgData.data[(i * dy + j) * 4 + 3] = 255;
                }
            }
        }
        ctx.putImageData(imgData, 0, 0);


        tex.img = canvas;
        tex.handleTextureLoad();
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