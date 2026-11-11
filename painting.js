(function () {
    'use strict';

    const DURATION_SECONDS = 120;
    const PALETTE = ['#111827', '#ffffff', '#e63946', '#f4a261', '#f6bd60', '#2a9d8f', '#457b9d', '#5e60ce', '#9b5de5', '#e76f9a'];
    let timerId = null;
    let paintingCanvas = null;
    let paintingContext = null;
    let originalImage = null;
    let isDrawing = false;
    let lastPoint = null;
    let secondsLeft = DURATION_SECONDS;
    let selectedColor = PALETTE[0];
    let selectedSize = 7;
    let toolMode = 'brush';

    const viewer = document.getElementById('artwork-viewer');
    const card = document.getElementById('artwork-card');
    const closeButton = document.getElementById('artwork-close');
    const startButton = document.getElementById('start-painting');

    if (!viewer || !card || !startButton) return;

    const originalCard = card.innerHTML;

    function addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #artwork-card.painting-card { width: min(90vw, 760px); max-height: 90vh; overflow: auto; }
            .painting-header { display:flex; align-items:center; justify-content:space-between; gap:16px; margin-bottom:14px; }
            .painting-header h2 { margin:0; font-size:clamp(1.2rem, 3vw, 1.8rem); }
            .painting-timer { color:#fff; background:#a62c2c; border-radius:999px; padding:8px 13px; font:700 1rem/1 monospace; white-space:nowrap; }
            .painting-canvas-wrap { display:flex; justify-content:center; align-items:center; background:#20232a; border-radius:10px; padding:12px; }
            #painting-canvas { display:block; max-width:100%; max-height:52vh; background:#fff; border-radius:3px; cursor:crosshair; touch-action:none; box-shadow:0 3px 16px #0008; }
            .painting-tools { display:flex; flex-wrap:wrap; align-items:stretch; gap:10px; margin-top:15px; }
            .tool-group { display:flex; align-items:center; gap:8px; padding:8px 10px; border:1px solid #ffffff22; border-radius:8px; background:#ffffff0b; }
            .painting-tools-label { font-size:.72rem; text-transform:uppercase; letter-spacing:.08em; opacity:.75; }
            .color-swatch { width:25px; height:25px; border:2px solid #fff8; border-radius:50%; padding:0; cursor:pointer; }
            .color-swatch.is-selected { outline:3px solid #d6a655; outline-offset:2px; }
            .brush-size { accent-color:#d6a655; width:112px; }
            .painting-actions { display:flex; justify-content:flex-end; gap:10px; margin-top:16px; }
            .painting-actions button { border:0; border-radius:6px; padding:10px 14px; cursor:pointer; font-weight:700; }
            #finish-painting { background:#d6a655; color:#1c1915; }
            .tool-button { border:0; border-radius:6px; padding:8px 10px; cursor:pointer; font-weight:700; background:#e9e3d7; color:#28231b; }
            .tool-button.is-active { outline:2px solid #d6a655; background:#fff7dc; }
            #clear-painting { background:#e9e3d7; color:#28231b; }
            .painting-result { text-align:center; }
            .painting-result h2 { margin:0 0 8px; }
            .similarity-score { font-size:clamp(2.5rem, 8vw, 4.8rem); font-weight:800; color:#d6a655; line-height:1; margin:18px 0 8px; }
            .result-canvas { max-width:100%; max-height:52vh; background:white; box-shadow:0 3px 16px #0008; }
        `;
        document.head.appendChild(style);
    }

    function formatTime(value) {
        return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
    }

    function setTimer() {
        const timer = document.getElementById('painting-timer');
        if (timer) timer.textContent = formatTime(secondsLeft);
    }

    function stopTimer() {
        if (timerId) window.clearInterval(timerId);
        timerId = null;
    }

    function pointFromEvent(event) {
        const rect = paintingCanvas.getBoundingClientRect();
        return {
            x: (event.clientX - rect.left) * (paintingCanvas.width / rect.width),
            y: (event.clientY - rect.top) * (paintingCanvas.height / rect.height)
        };
    }

    function drawLine(from, to) {
        paintingContext.strokeStyle = toolMode === 'eraser' ? '#ffffff' : selectedColor;
        paintingContext.lineWidth = selectedSize * (paintingCanvas.width / 700);
        paintingContext.lineCap = 'round';
        paintingContext.lineJoin = 'round';
        paintingContext.beginPath();
        paintingContext.moveTo(from.x, from.y);
        paintingContext.lineTo(to.x, to.y);
        paintingContext.stroke();
    }

    function bindDrawing() {
        paintingCanvas.addEventListener('pointerdown', event => {
            isDrawing = true;
            lastPoint = pointFromEvent(event);
            paintingCanvas.setPointerCapture(event.pointerId);
            drawLine(lastPoint, { x: lastPoint.x + 0.01, y: lastPoint.y + 0.01 });
        });
        paintingCanvas.addEventListener('pointermove', event => {
            if (!isDrawing) return;
            const point = pointFromEvent(event);
            drawLine(lastPoint, point);
            lastPoint = point;
        });
        const stopDrawing = () => { isDrawing = false; lastPoint = null; };
        paintingCanvas.addEventListener('pointerup', stopDrawing);
        paintingCanvas.addEventListener('pointercancel', stopDrawing);
        paintingCanvas.addEventListener('pointerleave', stopDrawing);
    }

    function calculateSimilarity() {
        const sampleSize = 64;
        const reference = document.createElement('canvas');
        const user = document.createElement('canvas');
        reference.width = user.width = sampleSize;
        reference.height = user.height = sampleSize;
        const refCtx = reference.getContext('2d', { willReadFrequently: true });
        const userCtx = user.getContext('2d', { willReadFrequently: true });
        refCtx.fillStyle = userCtx.fillStyle = '#ffffff';
        refCtx.fillRect(0, 0, sampleSize, sampleSize);
        userCtx.fillRect(0, 0, sampleSize, sampleSize);
        refCtx.drawImage(originalImage, 0, 0, sampleSize, sampleSize);
        userCtx.drawImage(paintingCanvas, 0, 0, sampleSize, sampleSize);
        const source = refCtx.getImageData(0, 0, sampleSize, sampleSize).data;
        const drawing = userCtx.getImageData(0, 0, sampleSize, sampleSize).data;
        let totalDifference = 0;
        let paintedPixels = 0;
        for (let i = 0; i < source.length; i += 4) {
            const isPainted = drawing[i] < 245 || drawing[i + 1] < 245 || drawing[i + 2] < 245;
            if (!isPainted) continue;
            paintedPixels += 1;
            totalDifference += Math.abs(source[i] - drawing[i]) + Math.abs(source[i + 1] - drawing[i + 1]) + Math.abs(source[i + 2] - drawing[i + 2]);
        }
        if (paintedPixels === 0) return 0;
        const colorAccuracy = 1 - totalDifference / (paintedPixels * 255 * 3);
        const coverage = Math.min(1, paintedPixels / (sampleSize * sampleSize * 0.35));
        return Math.max(1, Math.min(99, Math.round(colorAccuracy * Math.sqrt(coverage) * 100)));
    }

    function finishPainting() {
        if (!window.paintingActive) return;
        stopTimer();
        window.paintingActive = false;
        isDrawing = false;
        const similarity = calculateSimilarity();
        const imageData = paintingCanvas.toDataURL('image/png');
        card.className = 'painting-result';
        card.innerHTML = `
            <span class="artwork-label">Sua reprodução</span>
            <h2>Tempo encerrado</h2>
            <div class="similarity-score">${similarity}%</div>
            <p>de semelhança aproximada com a obra original</p>
            <img class="result-canvas" src="${imageData}" alt="Resultado da sua pintura">
            <div class="painting-actions"><button id="open-painting" type="button">Abrir</button><button id="finish-result" type="button">Concluir e voltar à sala</button></div>`;
        document.getElementById('open-painting').addEventListener('click', () => openPainting(imageData, artworkTitle()));
        document.getElementById('finish-result').addEventListener('click', returnToRoom);
    }

    function artworkTitle() {
        return window.currentArtwork?.userData?.title || 'Minha pintura';
    }

    function openPainting(imageData, title) {
        const paintingWindow = window.open('', '_blank');
        if (!paintingWindow) return;
        paintingWindow.document.title = title;
        paintingWindow.document.body.style.cssText = 'margin:0;min-height:100vh;display:grid;place-items:center;background:#111;';
        const image = paintingWindow.document.createElement('img');
        image.src = imageData;
        image.alt = `Pintura de ${title}`;
        image.style.cssText = 'display:block;max-width:100vw;max-height:100vh;object-fit:contain;';
        paintingWindow.document.body.appendChild(image);
    }

    function returnToRoom() {
        stopTimer();
        window.paintingActive = false;
        card.className = '';
        card.innerHTML = originalCard;
        const newStartButton = document.getElementById('start-painting');
        newStartButton.disabled = !(window.currentArtwork && window.currentArtwork.userData.image);
        newStartButton.addEventListener('click', startPainting);
        closeButton.style.display = '';
        if (typeof window.closeArtworkViewer === 'function') window.closeArtworkViewer();
    }

    function startPainting() {
        const artwork = window.currentArtwork;
        if (!artwork || !artwork.userData.image || window.paintingActive) return;
        originalImage = new Image();
        originalImage.onload = () => {
            const ratio = originalImage.naturalWidth / originalImage.naturalHeight || 1;
            const canvasWidth = 700;
            const canvasHeight = Math.round(canvasWidth / ratio);
            paintingCanvas = document.createElement('canvas');
            paintingCanvas.id = 'painting-canvas';
            paintingCanvas.width = canvasWidth;
            paintingCanvas.height = canvasHeight;
            paintingContext = paintingCanvas.getContext('2d');
            paintingContext.fillStyle = '#ffffff';
            paintingContext.fillRect(0, 0, canvasWidth, canvasHeight);
            window.paintingActive = true;
            closeButton.style.display = 'none';
            card.className = 'painting-card';
            card.innerHTML = `
                <div class="painting-header"><h2>${artwork.userData.title}</h2><div id="painting-timer" class="painting-timer">02:00</div></div>
                <p>Reproduza a obra antes de o tempo acabar.</p>
                <div class="painting-canvas-wrap"></div>
                <div class="painting-tools">
                    <div class="tool-group"><span class="painting-tools-label">Cores</span><span id="paint-colors"></span></div>
                    <div class="tool-group"><span class="painting-tools-label">Pincel</span><input id="brush-size" class="brush-size" type="range" min="2" max="28" value="7" aria-label="Tamanho do pincel"></div>
                    <div class="tool-group"><button id="eraser-painting" class="tool-button" type="button">Borracha</button><button id="clear-painting" class="tool-button" type="button">Apagar tudo</button></div>
                </div>
                <div class="painting-actions"><button id="finish-painting" type="button">Finalizar agora</button></div>`;
            card.querySelector('.painting-canvas-wrap').appendChild(paintingCanvas);
            const colorBox = document.getElementById('paint-colors');
            PALETTE.forEach(color => {
                const button = document.createElement('button');
                button.className = `color-swatch${color === selectedColor ? ' is-selected' : ''}`;
                button.style.backgroundColor = color;
                button.type = 'button';
                button.title = `Usar a cor ${color}`;
                button.addEventListener('click', () => {
                    selectedColor = color;
                    toolMode = 'brush';
                    document.getElementById('eraser-painting').classList.remove('is-active');
                    colorBox.querySelectorAll('.color-swatch').forEach(swatch => swatch.classList.toggle('is-selected', swatch === button));
                });
                colorBox.appendChild(button);
            });
            document.getElementById('brush-size').addEventListener('input', event => { selectedSize = Number(event.target.value); });
            document.getElementById('eraser-painting').addEventListener('click', event => {
                toolMode = toolMode === 'eraser' ? 'brush' : 'eraser';
                event.currentTarget.classList.toggle('is-active', toolMode === 'eraser');
            });
            document.getElementById('clear-painting').addEventListener('click', () => {
                paintingContext.fillStyle = '#ffffff';
                paintingContext.fillRect(0, 0, paintingCanvas.width, paintingCanvas.height);
            });
            document.getElementById('finish-painting').addEventListener('click', finishPainting);
            bindDrawing();
            secondsLeft = DURATION_SECONDS;
            setTimer();
            timerId = window.setInterval(() => {
                secondsLeft -= 1;
                setTimer();
                if (secondsLeft <= 0) finishPainting();
            }, 1000);
        };
        originalImage.onerror = () => { startButton.disabled = true; };
        originalImage.src = artwork.userData.image;
    }

    addStyles();
    startButton.addEventListener('click', startPainting);
}());
