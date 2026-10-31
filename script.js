
// ==========================================
// PHOTONX - TRANSFER THROUGH LIGHT
// Sender + QR Animation + Receiver
// ==========================================

let qrFrames = [];
let currentFrame = 0;
let animationTimer = null;

let html5QrCode = null;
let receivedFrames = {};
let receivedTransferId = null;
let receivedTotal = 0;
let receivedFilename = "";
let receivedMime = "application/octet-stream";
let completedFile = null;

const MAX_FILE_SIZE = 1024 * 1024;
const CHUNK_SIZE = 120;

// ==========================================
// ELEMENTS
// ==========================================

const fileInput = document.getElementById("fileInput");
const fileInfo = document.getElementById("fileInfo");
const message = document.getElementById("message");
const qrStatus = document.getElementById("qrStatus");
const qrDisplay = document.getElementById("qrcode");
const frameInfo = document.getElementById("frameInfo");
const playButton = document.getElementById("playButton");
const scanStatus = document.getElementById("scanStatus");
const receiveProgress = document.getElementById("receiveProgress");
const downloadButton = document.getElementById("downloadButton");

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function encodeText(text) {
    return btoa(unescape(encodeURIComponent(text)));
}

function decodeText(text) {
    return decodeURIComponent(escape(atob(text)));
}

function makeTransferId() {
    return Date.now().toString(36) +
        Math.random().toString(36).substring(2, 8);
}

// ==========================================
// SELECT FILE
// ==========================================

function selectFile() {
    if (fileInput) {
        fileInput.click();
    }
}

if (fileInput) {
    fileInput.addEventListener("change", function () {
        const file = fileInput.files[0];

        if (file) {
            prepareFile(file);
        }
    });
}

// ==========================================
// PREPARE FILE AND GENERATE QR FRAMES
// ==========================================

function prepareFile(file) {

    stopAnimation();

    if (file.size > MAX_FILE_SIZE) {
        message.textContent =
            "File is too large. Please select a file under 1 MB.";
        return;
    }

    if (file.size === 0) {
        message.textContent = "Please select a non-empty file.";
        return;
    }

    if (typeof QRCode === "undefined") {
        message.textContent =
            "QR library did not load. Check your internet connection.";
        return;
    }

    fileInfo.textContent =
        "Selected: " + file.name +
        " (" + (file.size / 1024).toFixed(1) + " KB)";

    message.textContent = "Preparing your file...";
    qrStatus.textContent = "Generating QR frames...";

    const reader = new FileReader();

    reader.onload = function (event) {

        const dataUrl = event.target.result;
        const base64Data = dataUrl.split(",")[1];

        const transferId = makeTransferId();
        const filename = encodeText(file.name);
        const mime = encodeText(
            file.type || "application/octet-stream"
        );

        qrFrames = [];

        for (
            let i = 0;
            i < base64Data.length;
            i += CHUNK_SIZE
        ) {

            const chunk = base64Data.substring(
                i,
                i + CHUNK_SIZE
            );

            qrFrames.push(
                "PX2|" +
                transferId + "|" +
                (qrFrames.length) + "|" +
                Math.ceil(base64Data.length / CHUNK_SIZE) + "|" +
                filename + "|" +
                mime + "|" +
                chunk
            );
        }

        currentFrame = 0;

        showFrame();

        message.textContent = "QR frames generated successfully!";
        qrStatus.textContent =
            "Your file is ready for optical transfer.";

        frameInfo.textContent =
            "Total frames: " + qrFrames.length;
    };

    reader.onerror = function () {
        message.textContent = "Could not read this file.";
    };

    reader.readAsDataURL(file);
}

// ==========================================
// DISPLAY CURRENT QR FRAME
// ==========================================

function showFrame() {

    if (qrFrames.length === 0) {
        return;
    }

    qrDisplay.innerHTML = "";

    try {

        new QRCode(qrDisplay, {
            text: qrFrames[currentFrame],
            width: 250,
            height: 250,
            correctLevel: QRCode.CorrectLevel.L
        });

        frameInfo.textContent =
            "Frame " + (currentFrame + 1) +
            " of " + qrFrames.length;

    } catch (error) {

        message.textContent =
            "QR generation failed. Try a smaller file.";

        console.error(error);
    }
}

// ==========================================
// NEXT FRAME
// ==========================================

function nextFrame() {

    if (qrFrames.length === 0) {
        message.textContent = "Select a file first.";
        return;
    }

    currentFrame++;

    if (currentFrame >= qrFrames.length) {
        currentFrame = 0;
    }

    showFrame();
}

// ==========================================
// PREVIOUS FRAME
// ==========================================

function previousFrame() {

    if (qrFrames.length === 0) {
        message.textContent = "Select a file first.";
        return;
    }

    currentFrame--;

    if (currentFrame < 0) {
        currentFrame = qrFrames.length - 1;
    }

    showFrame();
}

// ==========================================
// ANIMATION
// ==========================================

function toggleAnimation() {

    if (animationTimer) {
        stopAnimation();
    } else {
        startAnimation();
    }
}

function startAnimation() {

    if (qrFrames.length === 0) {
        message.textContent = "Select a file first.";
        return;
    }

    if (animationTimer) {
        return;
    }

    playButton.textContent = "STOP ANIMATION";

    animationTimer = setInterval(function () {
        nextFrame();
    }, 900);
}

function stopAnimation() {

    if (animationTimer) {
        clearInterval(animationTimer);
        animationTimer = null;
    }

    if (playButton) {
        playButton.textContent = "START ANIMATION";
    }
}

// ==========================================
// OPEN RECEIVER
// ==========================================

function receiveFile() {

    const receiverSection =
        document.getElementById("receiverSection");

    if (receiverSection) {
        receiverSection.scrollIntoView({
            behavior: "smooth"
        });
    }

    startScanner("environment");
}

// ==========================================
// START CAMERA SCANNER
// ==========================================

async function startScanner(cameraFacing) {

    if (typeof Html5Qrcode === "undefined") {
        scanStatus.textContent =
            "Scanner library did not load. Check your internet.";
        return;
    }

    if (!window.isSecureContext) {
        scanStatus.textContent =
            "Camera requires HTTPS or localhost.";
        return;
    }

    if (!navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia) {

        scanStatus.textContent =
            "Camera is not supported by this browser.";
        return;
    }

    try {

        if (html5QrCode) {
            await stopScanner();
        }

        html5QrCode = new Html5Qrcode("reader");

        const config = {
            fps: 10,
            qrbox: {
                width: 220,
                height: 220
            }
        };

        scanStatus.textContent =
            "Starting camera. Please allow camera permission.";

        await html5QrCode.start(
            { facingMode: cameraFacing },
            config,
            function (decodedText) {
                processQRFrame(decodedText);
            },
            function () {
                // Ignore unsuccessful camera scan attempts.
            }
        );

        scanStatus.textContent =
            "Camera running. Point it at the animated QR code.";

    } catch (error) {

        scanStatus.textContent =
            "Camera could not start. Check camera permission.";

        console.error(error);
    }
}

// ==========================================
// STOP CAMERA
// ==========================================

async function stopScanner() {

    if (html5QrCode) {

        try {
            if (html5QrCode.isScanning) {
                await html5QrCode.stop();
            }

            html5QrCode.clear();

        } catch (error) {
            console.log("Scanner stop:", error);
        }

        html5QrCode = null;
    }

    scanStatus.textContent = "Scanner stopped.";
}

// ==========================================
// PROCESS RECEIVED QR FRAME
// ==========================================

function processQRFrame(data) {

    const parts = data.split("|");

    if (parts.length !== 7 || parts[0] !== "PX2") {
        return;
    }

    const transferId = parts[1];
    const index = Number(parts[2]);
    const total = Number(parts[3]);
    const filename = parts[4];
    const mime = parts[5];
    const chunk = parts[6];

    if (
        !transferId ||
        !Number.isInteger(index) ||
        !Number.isInteger(total) ||
        total < 1 ||
        total > 10000 ||
        index < 0 ||
        index >= total ||
        !chunk
    ) {
        return;
    }

    // Start a new transfer when the ID changes.
    if (receivedTransferId !== transferId) {

        receivedFrames = {};
        receivedTransferId = transferId;
        receivedTotal = total;
        completedFile = null;

        receivedFilename = filename;
        receivedMime = mime;

        downloadButton.disabled = true;
    }

    if (total !== receivedTotal) {
        return;
    }

    // Ignore duplicate frames.
    if (receivedFrames[index] === undefined) {
        receivedFrames[index] = chunk;
    }

    const count = Object.keys(receivedFrames).length;

    receiveProgress.textContent =
        "Received frames: " + count +
        " / " + receivedTotal;

    scanStatus.textContent =
        "Receiving QR frames...";

    // Rebuild when all frames have arrived.
    if (count === receivedTotal) {
        rebuildFile();
    }
}

// ==========================================
// REBUILD ORIGINAL FILE
// ==========================================

function rebuildFile() {

    try {

        let base64Data = "";

        for (let i = 0; i < receivedTotal; i++) {

            if (receivedFrames[i] === undefined) {
                return;
            }

            base64Data += receivedFrames[i];
        }

        const binary = atob(base64Data);
        const bytes = new Uint8Array(binary.length);

        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }

        const filename = decodeText(receivedFilename);
        const mime = decodeText(receivedMime);

        completedFile = new Blob(
            [bytes],
            { type: mime }
        );

        receivedFilename = filename;

        downloadButton.disabled = false;

        scanStatus.textContent =
            "File received successfully!";

        receiveProgress.textContent =
            "All " + receivedTotal + " frames received.";

        stopScanner();

    } catch (error) {

        scanStatus.textContent =
            "Could not rebuild file. Please try again.";

        console.error(error);
    }
}

// ==========================================
// DOWNLOAD RECEIVED FILE
// ==========================================

function downloadReceivedFile() {

    if (!completedFile) {
        scanStatus.textContent =
            "No completed file is available.";
        return;
    }

    const url = URL.createObjectURL(completedFile);
    const link = document.createElement("a");

    link.href = url;
    link.download = receivedFilename || "photonx-file";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(function () {
        URL.revokeObjectURL(url);
    }, 1000);

    scanStatus.textContent =
        "Download started: " + link.download;
}

// ==========================================
// INITIAL MESSAGE
// ==========================================

message.textContent = "PHOTONX is ready.";
qrStatus.textContent = "Select a file to begin.";
scanStatus.textContent = "Receiver is ready.";

console.log("PHOTONX system loaded.");
