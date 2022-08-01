// Get the canvas for the edited image
let canvas = document.getElementById('canvas-pixels');
let canvas_wrapper = document.getElementById('canvas-wrapper');
let canvas_grid = document.getElementById('canvas-grid');

// Get the 2D context of the image
let context = canvas.getContext('2d');

// Get which color is being selected
let color_radio_buttons = document.getElementsByName('color');

function uploadImage(event) {
    // no file was chosen
    if (event.target.files[0] === undefined)
        return

    // Set the canvas CORS
    canvas.crossOrigin = "anonymous";

    // read CHR data
    let fr = new FileReader();
    fr.readAsArrayBuffer(new Blob([event.target.files[0]]))
    fr.onload = function() {
        let bytes = new Uint8Array(fr.result);
        let data = chr.readBytes(bytes);
        chr.drawCanvas(context, canvas, canvas_grid, canvas_wrapper, data);

        // Show the image editor controls and hide the help text
        document.querySelector('.help-text').style.display = "none";
        document.querySelector('.image-save').style.display = "block";
        document.querySelector('.image-preview').style.display = "flex";

        // Update color picker colors
        updateColorPickers();
    }
};

function updateColorSelection(event) {
    for (let i=0; i<color_radio_buttons.length; i++) {
        if (color_radio_buttons[i].checked) {
            chr.selected_color_i = i;
            return;
        }
    }
}


// Reset all the slider values to there default values
function resetImage() {
    if (!window.confirm("Are you sure to reset the drawing?")) return;
    chr.reset();
    chr.drawCanvas(context, canvas, canvas_grid, canvas_wrapper, chr.current_data);
}

function saveImagePng() {
    // Select the temporary element we have created for
    // helping to save the image
    let linkElement = document.getElementById('link');
    linkElement.setAttribute(
      'download', 'edited_image.png'
    );

    // Convert the canvas data to a image data URL
    let canvasData = canvas.toDataURL("image/png")

    // Replace it with a stream so that
    // it starts downloading
    canvasData.replace(
      "image/png", "image/octet-stream"
    )

    // Set the location href to the canvas data
    linkElement.setAttribute('href', canvasData);

    // Click on the link to start the download
    linkElement.click();
}

function saveImageChr() {
    let bytes = chr.writeBytes(chr.current_data);

    // Select the temporary element we have created for
    // helping to save the image
    let linkElement = document.getElementById('link');
    linkElement.setAttribute(
      'download', 'output.chr'
    );

    // Convert the bytes data to a image data URL
    let data = window.URL.createObjectURL(new Blob([bytes], {type: 'image/octet-stream'}));

    // Set the location href to the image data
    linkElement.setAttribute('href', data);

    // Click on the link to start the download
    linkElement.click();
}

// Canvas controls

function undo(event) {
    chr.pop();
    chr.drawCanvas(context, canvas, canvas_grid, canvas_wrapper, chr.current_data);
}

// paint pixel at (x, y) location in canvas
function paintPixel(x, y) {
    // update single pixel
    chr.paintPixel(x, y, context, canvas);

    // show a warn message that changes will not be saved when trying to exit page
    $(window).bind('beforeunload', function(ev){
        ev.preventDefault();
        return ev.returnValue = 'Are you sure you want to exit?';
    });
}

let painting = false;
function canvasMouseDown(event) {
    // left mouse button
    if (event.button == 0) {
        // save history
        chr.push();

        painting = true;
        paintPixel(event.offsetX, event.offsetY);
    }
}

function canvasMouseMove(event) {
    if (painting) {
        paintPixel(event.offsetX, event.offsetY);
    }
}

function canvasMouseUp(event) {
    if (event.button == 0) {
        painting = false;
    }
}

function canvasUpdateSize(new_size) {
    chr.VIS_SCALE = new_size;
    canvas_wrapper.style.height = `${chr.SPRITE_SIZE*chr.HEIGHT_SPRITE_N*chr.VIS_SCALE}px`;
    canvas_grid.style.height = `${chr.SPRITE_SIZE*chr.HEIGHT_SPRITE_N*chr.VIS_SCALE}px`;
    canvas.style.height = `${chr.SPRITE_SIZE*chr.HEIGHT_SPRITE_N*chr.VIS_SCALE}px`;
}

function zoomNumberChangeValue(val) {
    val = isNaN(parseInt(val, 10)) ? 1 : parseInt(val, 10);
    // limit input text value
    val = Math.min(10, Math.max(1, val));
    document.getElementById("zoom-range").value = val;
    document.getElementById("zoom-number").value = val;
    canvasUpdateSize(val);
}

function zoomRangeChangeValue(val) {
    val = isNaN(parseInt(val, 10)) ? 1 : parseInt(val, 10);
    document.getElementById("zoom-number").value = val;
    canvasUpdateSize(val);
}

function pencilNumberChangeValue(val) {
    val = isNaN(parseInt(val, 10)) ? 1 : parseInt(val, 10);
    // limit input text value
    val = Math.min(32, Math.max(1, val));
    document.getElementById("pencil-size-range").value = val;
    document.getElementById("pencil-size-number").value = val;

    chr.pencil_size = val;
}

function pencilRangeChangeValue(val) {
    val = isNaN(parseInt(val, 10)) ? 1 : parseInt(val, 10);
    document.getElementById("pencil-size-number").value = val;

    chr.pencil_size = val;
}

function changeDisplayGrid(event) {
    let cb_grid = document.getElementById('checkbox-display-grid');
    canvas_grid.style.display = cb_grid.checked ? 'flex' : 'none';
}

function KeyPress(ev) {
    var e = window.event ? event : ev
    // check if ctrl+z was pressed
    if (e.keyCode == 90 && e.ctrlKey)
        undo(e);
}

document.onkeydown = KeyPress;

// color pickers
$(function() {
    $('#color-picker0').colorpicker({
        format: 'hex',
        component: '.btn',
        container: true
    }).on('changeColor', updateColorCanvas(0));
    $('#color-picker1').colorpicker({
        format: 'hex',
        component: '.btn',
        container: true
    }).on('changeColor', updateColorCanvas(1));
    $('#color-picker2').colorpicker({
        format: 'hex',
        component: '.btn',
        container: true
    }).on('changeColor', updateColorCanvas(2));
    $('#color-picker3').colorpicker({
        format: 'hex',
        component: '.btn',
        container: true
    }).on('changeColor', updateColorCanvas(3));
});

function updateColorPickers() {
    let tohex = (arr) =>
        '#' + arr.map(c => {c = parseInt(c).toString(16); return c.length==1 ? '0'+c : c;}).join("")

    $('#color-picker0').colorpicker('setValue', tohex(chr.colors[0]));
    $('#color-picker1').colorpicker('setValue', tohex(chr.colors[1]));
    $('#color-picker2').colorpicker('setValue', tohex(chr.colors[2]));
    $('#color-picker3').colorpicker('setValue', tohex(chr.colors[3]));
}

function updateColorCanvas(i) {
    return (ev) => {
        let color = ev.color.toRGB();
        chr.colors[i] = [color.r, color.g, color.b];
        chr.drawCanvas(context, canvas, canvas_grid, canvas_wrapper, chr.current_data);
    }
}
