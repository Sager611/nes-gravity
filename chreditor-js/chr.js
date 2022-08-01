let chr = {}

// sprites are 8x8 pixels/colors each
chr.SPRITE_SIZE = 8;
// max no. of sprites in CHR
chr.SPRITES_MAX = 512;
// how we are going to show the sprites //
// width in # of sprites
chr.WIDTH_SPRITE_N = 16;
// height in # of sprites
chr.HEIGHT_SPRITE_N = 32;
// visualization colors
chr.colors = [[30, 30, 30], [200, 0, 0], [0, 200, 0], [0, 0, 200]];
// visualization upscale
chr.VIS_SCALE = 4;
// cached data
chr.current_data = null;
chr.data_history = [];
// color selection
chr.selected_color_i = 0;
// pencil size
chr.pencil_size = 1;

chr.readBytes = function (bytes) {
    let data = {
        pixels: null,
        width: chr.WIDTH_SPRITE_N * chr.SPRITE_SIZE,
        height: chr.HEIGHT_SPRITE_N * chr.SPRITE_SIZE
    };

    data.pixels = new Uint8Array(
          chr.WIDTH_SPRITE_N  * chr.SPRITE_SIZE
        * chr.HEIGHT_SPRITE_N * chr.SPRITE_SIZE);

    // CHR has sprites stored in order:
    // 1st 16 bytes are the 1st sprite, next 16 bytes are the 2nd sprite, etc.
    // Each sprite is 16 bytes because colors are stored in 2 bits, which means
    // that 1 byte has 4 colors, so 8*8 colors per sprite divided 4 = 16 bytes per sprite
    for (let bi=0; bi<bytes.length; bi+=16) {
        for (let sprite_row=0; sprite_row<chr.SPRITE_SIZE; sprite_row++) {
            for (let sprite_col=0; sprite_col<chr.SPRITE_SIZE; sprite_col++) {
                let color_i = sprite_row*chr.SPRITE_SIZE + sprite_col;
                let byte_i = Math.floor(color_i / 8);
                let bit_off = 7 - (color_i % 8);
                // the 1st 8 bytes for a sprite have the 1st bit of color, the other 8
                // bytes have the 2nd bit of color
                let color_bit_1 = (bytes[bi + byte_i] >>> bit_off) & 1;
                let color_bit_2 = (bytes[bi + byte_i + 8] >>> bit_off) & 1;

                let color_n = color_bit_1*2 + color_bit_2;

                let out_i = (chr.WIDTH_SPRITE_N*64) * Math.floor((bi/16) / chr.WIDTH_SPRITE_N)
                          + (8) * (bi/16 % chr.WIDTH_SPRITE_N)
                          + sprite_row * 8 * chr.WIDTH_SPRITE_N
                          + sprite_col;

                data.pixels[out_i] = color_n;
            }
        }
    }

    chr.current_data = data;

    return data;
}

chr.writeBytes = function (data) {
    // 1 byte has 4 colors. data.pixels has N colors -> we need N/4 bytes
    // v this inits the elements to 0, which is important
    let bytes = new Uint8Array(Math.floor(data.pixels.length / 4));

    for (let ci=0; ci<data.pixels.length; ci++) {
        let sprite_j = Math.floor(ci/chr.SPRITE_SIZE) % chr.WIDTH_SPRITE_N;
        let row = Math.floor(ci / (chr.SPRITE_SIZE*chr.WIDTH_SPRITE_N));
        let sprite_i = Math.floor(row / chr.SPRITE_SIZE);

        // the 1st 8 bytes for a sprite have the 1st bit of color, the other 8
        // bytes have the 2nd bit of color
        let color_n = data.pixels[ci];
        let color_bit_1 = (color_n >>> 1) & 1;
        let color_bit_2 = color_n & 1;

        // which byte we are going to store the color
        let byte_i =
            (sprite_i * chr.WIDTH_SPRITE_N + sprite_j) * 16 //< each sprite is 16 bytes
            + (row % 8);
        // in which bit offset we are going to store the color
        let bit_off = 7 - (ci % 8);

        bytes[byte_i]     |= (color_bit_1 << bit_off);
        bytes[byte_i + 8] |= (color_bit_2 << bit_off);
    }

    return bytes;
}

chr.drawCanvas = function (cxt, canvas, grid, wrapper, data) {
    // update width and height
    canvas.width = data.width;
    canvas.height = data.height;
    grid.width = data.width;
    grid.height = data.height;

    // update style //
    [canvas, grid, wrapper].forEach((canv) => {
        // make 1px -> 4px
        canv.style.height = `${chr.SPRITE_SIZE*chr.HEIGHT_SPRITE_N*chr.VIS_SCALE}px`;
        canv.style.cursor = 'crosshair';
        // choose nearest interpolation when scaling
        canv.style['image-rendering'] = 'optimizeSpeed';
        canv.style['image-rendering'] = '-moz-crisp-edges';          /* Firefox */
        canv.style['image-rendering'] = '-o-crisp-edges';            /* Opera */
        canv.style['image-rendering'] = '-webkit-optimize-contrast'; /* Chrome (and eventually Safari) */
        canv.style['image-rendering'] = 'pixelated';                 /* Chrome */
        canv.style['image-rendering'] = 'optimize-contrast';         /* CSS3 Proposed */
        canv.style['-ms-interpolation-mode'] = 'nearest-neighbor';   /* IE8+ */
    });

    // set pixels' color
    let img_data = cxt.getImageData(0, 0, canvas.width, canvas.height);
    let colors = img_data.data;
    for (let i=0; i<data.pixels.length; i++) {
        let color = chr.colors[data.pixels[i]];
        colors[i*4+0] = color[0]; // R
        colors[i*4+1] = color[1]; // G
        colors[i*4+2] = color[2]; // B
        colors[i*4+3] = 255; // A
    }

    cxt.putImageData(img_data, 0, 0);

    // update grid
    cxt = grid.getContext('2d');
    img_data = cxt.getImageData(0, 0, grid.width, grid.height);
    colors = img_data.data;

    // draw grid
    for (let i=0; i<data.pixels.length; i++) {
        colors[i*4+0] = 255; // R
        colors[i*4+1] = 255; // G
        colors[i*4+2] = 255; // B
        let row = Math.floor(i/(chr.SPRITE_SIZE*chr.WIDTH_SPRITE_N));
        colors[i*4+3] = (i%8==7 || row%8==7) ? 80 : 0; // A
    }

    cxt.putImageData(img_data, 0, 0);
}

chr.paintPixel = function (x, y, cxt, canvas) {
    let half_s = Math.floor(chr.pencil_size / 2);
    let pix_x = Math.floor(x / chr.VIS_SCALE) - half_s;
    let pix_y = Math.floor(y / chr.VIS_SCALE) - half_s;

    pix_x = Math.max(0, pix_x);
    pix_y = Math.max(0, pix_y);

    for (let i=pix_y; i<pix_y+chr.pencil_size && i<chr.current_data.height; i++) {
       for (let j=pix_x; j<pix_x+chr.pencil_size && j<chr.current_data.width; j++) {
            chr.current_data.pixels[i*chr.current_data.width + j] = chr.selected_color_i;
       }
    }

    let img_data = context.getImageData(pix_x, pix_y, chr.pencil_size, chr.pencil_size);
    let colors = img_data.data;
    let new_col = chr.colors[chr.selected_color_i];
    for (let i=0; i<colors.length; i+=4) {
        colors[i+0] = new_col[0]; // R
        colors[i+1] = new_col[1]; // G
        colors[i+2] = new_col[2]; // B
        colors[i+3] = 255;        // A
    }

    context.putImageData(img_data, pix_x, pix_y);
}

// history functions
chr.push = function() {
    let new_data = {
        width: chr.current_data.width,
        height: chr.current_data.height,
        pixels: chr.current_data.pixels.slice()
    };
    chr.data_history.push(new_data);
}

chr.pop = function() {
    if (chr.data_history.length == 0)
        return null;
    let prev_data = chr.data_history.pop();
    chr.current_data = prev_data;
    return prev_data;
}

chr.reset = function() {
    if (chr.data_history.length == 0)
        return;
    chr.current_data = chr.data_history[0];
    chr.data_history = [];
}
