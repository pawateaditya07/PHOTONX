
// ==================================
// PHOTONX - QR GENERATOR
// ==================================

var fileInput = document.getElementById("fileInput");
var fileInfo = document.getElementById("fileInfo");
var message = document.getElementById("message");

var qrBox = document.getElementById("qrcode");
var qrStatus = document.getElementById("qrStatus");
var frameInfo = document.getElementById("frameInfo");
var playButton = document.getElementById("playButton");

var frames = [];
var currentFrame = 0;
var animationTimer = null;

function selectFile() {
    fileInput.click();
}

function encodeText(text) {
    return btoa(unescape(encodeURIComponent(text)));
}

fileInput.addEventListener("change", function() {

    var file = fileInput.files[0];

    if (!file) return;

    if (file.size > 1024 * 1024) {
        alert("Please select a file smaller than 1 MB for testing.");
        fileInput.value = "";
        return;
    }

    if (animationTimer !== null) {
        clearInterval(animationTimer);
        animationTimer = null;
    }

    playButton.innerHTML = "START ANIMATION";

    fileInfo.innerHTML =
        "File: " + file.name +
        "<br>Size: " + (file.size / 1024).toFixed(2) + " KB";

    message.innerHTML = "Reading file...";

    var reader = new FileReader();

    reader.onload = function(event) {

        var base64 = event.target.result.split(",")[1];

        var chunkSize = 300;
        var total = Math.ceil(base64.length / chunkSize);

        var transferID = String(new Date().getTime());

        var filename = encodeText(file.name);
        var mime = encodeText(file.type || "application/octet-stream");

        frames = [];

        for (var i = 0; i < total; i++) {

            var chunk = base64.substring(
                i * chunkSize,
                (i + 1) * chunkSize
            );

            var packet =
                "PX1|" +
                transferID + "|" +
                i + "|" +
                total + "|" +
                filename + "|" +
                mime + "|" +
                chunk;

            frames.push(packet);
        }

        currentFrame = 0;

        message.innerHTML = "File successfully converted into data packets.";

        qrStatus.innerHTML = "QR frames generated successfully.";

        showFrame();
    };

    reader.onerror = function() {
        message.innerHTML = "Error reading file.";
    };

    reader.readAsDataURL(file);
});

function showFrame() {

    if (frames.length === 0) return;

    if (typeof QRCode === "undefined") {
        qrStatus.innerHTML = "QR library not loaded. Check your internet.";
        return;
    }

    qrBox.innerHTML = "";

    new QRCode(qrBox, {
        text: frames[currentFrame],
        width: 260,
        height: 260,
        correctLevel: QRCode.CorrectLevel.L
    });

    frameInfo.innerHTML =
        "Frame " + (currentFrame + 1) +
        " of " + frames.length;
}

function nextFrame() {

    if (frames.length === 0) {
        alert("Select a file first.");
        return;
    }

    currentFrame++;

    if (currentFrame >= frames.length) {
        currentFrame = 0;
    }

    showFrame();
}

function previousFrame() {

    if (frames.length === 0) return;

    currentFrame--;

    if (currentFrame < 0) {
        currentFrame = frames.length - 1;
    }

    showFrame();
}

function toggleAnimation() {

    if (frames.length === 0) {
        alert("Select a file first.");
        return;
    }

    if (animationTimer !== null) {

        clearInterval(animationTimer);
        animationTimer = null;

        playButton.innerHTML = "START ANIMATION";
        return;
    }

    playButton.innerHTML = "STOP ANIMATION";

    animationTimer = setInterval(function() {

        currentFrame++;

        if (currentFrame >= frames.length) {
            currentFrame = 0;
        }

        showFrame();

    }, 700);
}

function receiveFile() {

    message.innerHTML =
        "Receiver mode will be available in the next update.";

    qrStatus.innerHTML =
        "Waiting for receiver scanner development.";
}

message.innerHTML = "PHOTONX QR Engine ready.";

console.log("PHOTONX loaded successfully.");
