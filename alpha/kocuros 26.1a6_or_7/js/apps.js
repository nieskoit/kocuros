function openFiles(folderName = "Root") {
    const refreshFiles = () => {
        const files = getFileSystem();
        let html = `<div class="file-grid">`;
        const filtered = files.filter(f => f.parent === (folderName === "Root" ? "root" : folderName));
        if (filtered.length === 0) html += `<p style="opacity:0.5">${t('empty')}</p>`;
        filtered.forEach((f) => {
            const idx = files.indexOf(f);
            html += `
                <div class="file-icon-box" onclick="${f.type === 'folder' ? `openFiles('${f.name}')` : `openNotes(${idx})`}">
                    <span>${f.type === 'folder' ? '📁' : '📄'}</span>
                    <label>${f.name}</label>
                </div>`;
        });
        html += `</div>`;
        const win = openWindows[t('files')];
        if (win) win.querySelector(".content").innerHTML = html;
        return html;
    };
    createWindow(t('files'), refreshFiles(), "500px", "400px");
}

function openVoiceRec() {
    const html = `
        <div style="display:flex; flex-direction:column; align-items:center; gap:20px; padding:20px;">
            <div id="rec-status" style="font-size:12px; color:var(--accent); text-transform:uppercase;">${t('recReady')}</div>
            <div id="v-timer" style="font-size:32px; font-family:monospace;">00:00</div>
            <div style="display:flex; gap:15px;">
                <button id="btn-rec-start" onclick="startRecording()" style="background:#ff5f56; width:60px; height:60px; border-radius:50%; font-size:20px;">●</button>
                <button id="btn-rec-stop" onclick="stopRecording()" style="background:#444; width:60px; height:60px; border-radius:50%; font-size:20px;" disabled>■</button>
            </div>
            <div id="rec-list" style="width:100%; max-height:150px; overflow:auto; background:rgba(0,0,0,0.2); border-radius:8px; padding:10px;">
                <small style="opacity:0.5">${t('recentRecordings')}</small>
            </div>
        </div>
    `;
    createWindow(t('voiceRecorder'), html, "350px", "400px");
}

let mediaRecorder;
let audioChunks = [];
let startTime;
let timerInterval;

window.startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
    mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
            const files = getFileSystem();
            const fileName = `Nagranie_${new Date().toLocaleString().replace(/[/\\?%*:|"<>]/g, '-')}.wav`;
            files.push({ name: fileName, type: "file", content: reader.result, parent: "root", isAudio: true });
            saveFileSystem(files);
            showModal(t('recordSaved') + fileName, "alert");
        };
    };

    mediaRecorder.start();
    startTime = Date.now();
    timerInterval = setInterval(updateRecTimer, 1000);
    document.getElementById('btn-rec-start').disabled = true;
    document.getElementById('btn-rec-stop').disabled = false;
    document.getElementById('rec-status').innerText = t('recRecording');
};

window.stopRecording = () => {
    mediaRecorder.stop();
    clearInterval(timerInterval);
    document.getElementById('btn-rec-start').disabled = false;
    document.getElementById('btn-rec-stop').disabled = true;
    document.getElementById('rec-status').innerText = t('recSaving');
    document.getElementById('v-timer').innerText = "00:00";
};

function updateRecTimer() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const s = (elapsed % 60).toString().padStart(2, '0');
    document.getElementById('v-timer').innerText = `${m}:${s}`;
}

function openNotes(index = -1) {
    const files = getFileSystem();
    if (index === -1) {
        index = parseInt(localStorage.kocuros_last_note_idx);
        if (isNaN(index) || !files[index]) {
            index = files.findIndex(f => f.name === "notatki.txt");
            if (index === -1) index = 0;
        }
    }
    localStorage.kocuros_last_note_idx = index;
    const file = files[index];
    const winTitle = t('notebook');
    if (file.isImage) { createWindow(file.name, `<img src="${file.content}" style="max-width:100%; border-radius:8px;">`, "500px", "auto"); return; }
    else if (file.isVideo) { createWindow(file.name, `<video src="${file.content}" controls style="max-width:100%; border-radius:8px;" autoplay></video>`, "500px", "auto"); return; }
    else if (file.isAudio) { createWindow(file.name, `
            <div style="padding:20px; text-align:center;">
                <h3>${file.name}</h3>
                <audio src="${file.content}" controls style="width:100%" autoplay></audio>
            </div>`, "400px", "200px"); return; }

    const noteHtml = `
        <div style="margin-bottom:8px; display:flex; gap:8px; align-items:center;">
            <button onclick="openNoteList()" style="padding:4px 10px; font-size:12px;">☰ ${t('list')}</button>
            <small>${t('fileLabel')} <b>${file.name}</b></small>
        </div>
        <textarea id="n-area-${index}" style="width:100%; flex:1; background:rgba(0,0,0,0.1); color:inherit; border:1px solid rgba(255,255,255,0.1); border-radius:8px; outline:none; resize:none; font-family:inherit; font-size:16px; padding:10px;">${file.content}</textarea>
    `;

    createWindow(winTitle, noteHtml, "400px", "500px");
    openWindows[winTitle].querySelector(".content").innerHTML = noteHtml;

    const area = document.getElementById(`n-area-${index}`);
    if (area) {
        area.oninput = e => { const currentFiles = getFileSystem(); currentFiles[index].content = e.target.value; saveFileSystem(currentFiles); };
    }

    window.openNoteList = () => {
        let listHtml = `<h3>${t('chooseNote')}</h3><div class="file-grid">`;
        files.forEach((f, i) => { listHtml += `
                <div class="file-icon-box" onclick="openNotes(${i})">
                    <span>📄</span>
                    <label>${f.name}</label>
                </div>`; });
        listHtml += `</div>`;
        openWindows[winTitle].querySelector(".content").innerHTML = listHtml;
    };
}

function openTerminal() {
    createWindow(t('terminal'), `
        <div class="terminal">
            <div>${SYSTEM.name} ${t('version')} ${SYSTEM.version} ${SYSTEM.channel.toUpperCase()}</div>
            <div id="t-out"></div>
            <div style="display:flex">> <input id="t-in" autofocus></div>
        </div>
    `);
    const input = document.getElementById("t-in");
    if (input) {
        input.onkeydown = e => {
            if (e.key === "Enter") {
                const out = document.getElementById("t-out"), cmd = input.value.toLowerCase();
                out.innerHTML += `<div>> ${cmd}</div>`;
                if (cmd === "ls") { const files = getFileSystem(); out.innerHTML += `<div>${files.map(f => f.name).join("  ")}</div>`; }
                else if (cmd === "help") out.innerHTML += "<div>Dostępne: ls, help, clear, date</div>";
                else if (cmd === "clear") out.innerHTML = "";
                else if (cmd === "date") out.innerHTML += `<div>${new Date()}</div>`;
                input.value = "";
            }
        };
    }
}

function openCalendar() {
    const now = new Date();
    const month = now.toLocaleString(currentLang, { month: 'long' });
    const year = now.getFullYear();
    let calHtml = `<h3 style="text-align:center">${month} ${year}</h3><table class="calendar-table"><tr>`;
    const days = currentLang === 'pl' ? ['Pn','Wt','Śr','Cz','Pt','So','Nd'] : ['Mo','Tu','We','Th','Fr','Sa','Su'];
    days.forEach(d => calHtml += `<th>${d}</th>`);
    calHtml += `</tr><tr>`;
    let firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
    if (firstDay === 0) firstDay = 7;
    for (let i=1; i < firstDay; i++) calHtml += `<td></td>`;
    const daysInMonth = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
    for (let d=1; d<=daysInMonth; d++) {
        const isToday = d === now.getDate() ? 'class="today"' : '';
        calHtml += `<td ${isToday}>${d}</td>`;
        if ((d + firstDay - 1) % 7 === 0) calHtml += `</tr><tr>`;
    }
    calHtml += `</tr></table>`;
    createWindow(t('calendar'), calHtml, "300px", "350px");
}

function openPaint() {
    createWindow(t('paint'), `
        <canvas id="p-can" width="800" height="400" style="background:white; border-radius:10px; cursor:crosshair"></canvas>
        <div style="margin-top:10px; display:flex; gap:10px;">
            <button onclick="ctxClear()">${t('clear')}</button>
            <button onclick="askPaintSave()" style="background:#27c93f">💾 ${t('saveImage')}</button>
            <input type="color" id="p-col" value="#7c7cff">
        </div>`, "820px", "520px");
    const can = document.getElementById("p-can");
    if (can) {
        const ctx = can.getContext("2d");
        let draw = false;
        can.onmousedown = () => draw = true; can.onmouseup = () => draw = false;
        can.onmousemove = e => { if(!draw) return; ctx.fillStyle = document.getElementById("p-col").value; ctx.beginPath(); ctx.arc(e.offsetX, e.offsetY, 4, 0, Math.PI*2); ctx.fill(); }
        window.ctxClear = () => ctx.clearRect(0,0,can.width,can.height);
    }
}

window.askPaintSave = () => {
    showModal(t('promptImageName'), "prompt", (name) => {
        if(!name) return;
        const can = document.getElementById("p-can");
        const link = document.createElement('a');
        link.download = name + ".png";
        link.href = can.toDataURL();
        link.click();
    });
};

function openCalc() {
    createWindow(t('calculator'), `<div class="calc-screen" id="c-res">0</div><div class="calc-grid">
        <button onclick="cAdd('7')">7</button><button onclick="cAdd('8')">8</button><button onclick="cAdd('9')">9</button><button style="background:#f39c12" onclick="cAdd('/')">/</button>
        <button onclick="cAdd('4')">4</button><button onclick="cAdd('5')">5</button><button onclick="cAdd('6')">6</button><button style="background:#f39c12" onclick="cAdd('*')">*</button>
        <button onclick="cAdd('1')">1</button><button onclick="cAdd('2')">2</button><button onclick="cAdd('3')">3</button><button style="background:#f39c12" onclick="cAdd('-')">-</button>
        <button onclick="cAdd('0')">0</button><button onclick="cClr()">C</button><button onclick="cEval()">=</button><button style="background:#f39c12" onclick="cAdd('+')">+</button></div>`, "300px", "450px");}
let cBuf = "";
window.cAdd = v => { cBuf += v; document.getElementById("c-res").innerText = cBuf; };
window.cClr = () => { cBuf = ""; document.getElementById("c-res").innerText = "0"; };
window.cEval = () => { try { cBuf = eval(cBuf).toString(); document.getElementById("c-res").innerText = cBuf; } catch { cClr(); } };

function openNiescut() {
    const html = `
        <div class="niescut-layout" style="display: flex; flex-direction: column; gap: 10px; height: 100%;">
            <div style="display: flex; gap: 10px; flex: 1; min-height: 0;">
                <div style="width: 160px; background: rgba(0,0,0,0.3); padding: 10px; border-radius: 10px; display: flex; flex-direction: column; gap: 10px;">
                    <strong style="font-size: 11px; color: var(--accent);">${t('tools')}</strong>
                    <button onclick="document.getElementById('v-import').click()" style="font-size: 10px;">${t('import')}</button>
                    <input type="file" id="v-import" accept="video/*" style="display:none">
                    
                    <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px;">
                        <label style="font-size: 9px; opacity: 0.6;">${t('startSec')}</label>
                        <input type="number" id="v-trim-start" value="0" step="0.1" style="width:100%; background:black; color:white; border:1px solid #444; border-radius:4px; padding:2px;">
                        <label style="font-size: 9px; opacity: 0.6; margin-top:5px; display:block;">${t('endSec')}</label>
                        <input type="number" id="v-trim-end" value="5" step="0.1" style="width:100%; background:black; color:white; border:1px solid #444; border-radius:4px; padding:2px;">
                    </div>

                    <button id="v-export-btn" onclick="exportVideo()" style="background: #27c93f; color: white; font-size: 10px; margin-top: auto; padding: 10px; border-radius: 8px;">${t('exportWebm')}</button>
                    <div id="v-status" style="font-size: 9px; color: var(--accent); text-align: center; min-height: 12px;"></div>
                </div>
                
                <div style="flex: 1; background: #000; border-radius: 10px; position: relative; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                    <video id="main-player" style="max-width: 100%; max-height: 100%; pointer-events: none;"></video>
                    <canvas id="export-canvas" style="display:none"></canvas>
                </div>
            </div>

            <div style="height: 100px; background: #111; border-radius: 10px; padding: 15px; display: flex; flex-direction: column; gap: 10px;">
                <div id="v-timeline-rail" style="height: 25px; background: rgba(255,255,255,0.1); position: relative; border-radius: 4px; cursor: pointer; border: 1px solid rgba(255,255,255,0.05);">
                    <div id="v-playhead" style="position: absolute; top: -5px; left: 0; width: 3px; height: 35px; background: #ff5f56; z-index: 10; border-radius: 2px; box-shadow: 0 0 5px rgba(255,95,86,0.5);"></div>
                </div>
                
                <div style="display: flex; align-items: center; gap: 15px;">
                    <button onclick="document.getElementById('main-player').paused ? document.getElementById('main-player').play() : document.getElementById('main-player').pause()" 
                            style="width: 40px; height: 40px; border-radius: 50%; padding: 0; display: grid; place-items: center;">⏯</button>
                    <span id="v-time-display" style="font-family: monospace; font-size: 14px; color: var(--accent);">00:00 / 00:00</span>
                    <small style="opacity: 0.4; font-size: 10px;">${t('clickTimeline')}</small>
                </div>
            </div>
        </div>
    `;

    createWindow(t('niescut'), html, "800px", "550px");

    const player = document.getElementById('main-player');
    const rail = document.getElementById('v-timeline-rail');
    const playhead = document.getElementById('v-playhead');
    const timeDisplay = document.getElementById('v-time-display');
    const startInput = document.getElementById('v-trim-start');
    const endInput = document.getElementById('v-trim-end');
    const status = document.getElementById('v-status');

    const fmt = (s) => new Date(s * 1000).toISOString().substr(14, 5);

    document.getElementById('v-import').onchange = (e) => {
        const file = e.target.files[0];
        if (file) { player.src = URL.createObjectURL(file); player.onloadedmetadata = () => { endInput.value = player.duration.toFixed(1); updateUI(); }; }
    };

    player.ontimeupdate = () => { if (!player.duration) return; const percent = (player.currentTime / player.duration) * 100; playhead.style.left = percent + "%"; updateUI(); };
    function updateUI() { timeDisplay.innerText = `${fmt(player.currentTime)} / ${fmt(player.duration || 0)}`; }
    rail.onclick = (e) => { const rect = rail.getBoundingClientRect(); const pos = (e.clientX - rect.left) / rect.width; player.currentTime = pos * player.duration; };

    window.exportVideo = async () => {
        const tStart = parseFloat(startInput.value);
        const tEnd = parseFloat(endInput.value);
        if (tEnd <= tStart) return alert(t('errorEndBeforeStart'));
        status.innerText = t('exporting');
        player.pause();
        player.currentTime = tStart;

        const canvas = document.getElementById('export-canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = player.videoWidth; canvas.height = player.videoHeight;

        const stream = canvas.captureStream(30);
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        const chunks = [];
        recorder.ondataavailable = e => chunks.push(e.data);
        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = "kocuros_cut.webm"; a.click(); status.innerText = t('exported');
        };
        recorder.start(); player.play();
        const process = () => {
            if (player.currentTime >= tEnd || player.paused) { recorder.stop(); player.pause(); }
            else { ctx.drawImage(player, 0, 0, canvas.width, canvas.height); requestAnimationFrame(process); }
        };
        process();
    };
}

function openSettings() {
    const html = `
        <div class="settings-nav">
            <span class="active" onclick="setSetTab('sys', this)">${t('system')}</span>
            <span onclick="setSetTab('app', this)">${t('appearance')}</span>
        </div>
        <div id="s-page-sys" class="settings-page active">
            <button onclick="exportUserData()" style="background:#27c93f; margin-top:10px; width:100%;">${t('exportData')}</button>
            <div>
                <label>${t('langName')}</label><br>
                <select id="s-lang" style="width:100%; padding:5px; margin-top:5px; background:#222; color:white; border:1px solid var(--accent)">
                    <option value="pl" ${currentLang==='pl'?'selected':''}>Polski</option>
                    <option value="en" ${currentLang==='en'?'selected':''}>English</option>
                    <option value="es" ${currentLang==='es'?'selected':''}>Español</option>
                </select>
            </div>
            <div>
                <label>${t('info')}</label>
                <p style="font-size:12px; opacity:0.7">
    ${SYSTEM.name} | ${t('version')} ${SYSTEM.version} ${SYSTEM.channel.toUpperCase()}<br>
    User: ${localStorage.kocuros_username}
</p>

            </div>
            <button onclick="resetOS()" style="background:#ff5f56">${t('reset')}</button>
        </div>
        <div id="s-page-app" class="settings-page">
            <div>
                <label>${t('accent')}</label><br>
                <input type="color" id="s-acc" value="${localStorage.kocuros_accent || '#7c7cff'}">
            </div>
             <div>
                <label>${t('wallpaper')}</label><br>
                <input type="text" id="s-wall" placeholder="URL..." value="${localStorage.kocuros_wallpaper || ''}" style="width:100%; background:#222; color:white; border:1px solid #444; padding:5px; border-radius:4px;">
            </div>
            <div>
                <label>${t('taskSize')} (${localStorage.kocuros_taskbar || 64}px)</label>
                <input type="range" id="s-task" min="40" max="100" value="${localStorage.kocuros_taskbar || 64}">
            </div>
            <div>
                <label>${t('opacity')}</label>
                <input type="range" id="s-op" min="40" max="100" value="${localStorage.kocuros_windowOpacity || 90}">
            </div>
        </div>
    `;
    createWindow(t('settings'), html, "400px", "450px");
    document.getElementById("s-lang").onchange = e => { localStorage.kocuros_lang = e.target.value; showModal(t('restartToChangeLang'), "confirm", (y) => { if(y) location.reload(); }); };
    document.getElementById("s-acc").oninput = e => { document.documentElement.style.setProperty('--accent', e.target.value); localStorage.kocuros_accent = e.target.value; };
    document.getElementById("s-wall").onchange = e => { localStorage.kocuros_wallpaper = e.target.value; document.body.style.backgroundImage = `url('${e.target.value}')`; };
    document.getElementById("s-task").oninput = e => { document.documentElement.style.setProperty('--taskbar-size', e.target.value + 'px'); localStorage.kocuros_taskbar = e.target.value; };
    document.getElementById("s-op").oninput = e => { localStorage.kocuros_windowOpacity = e.target.value; document.querySelectorAll(".window").forEach(w => w.style.background = `rgba(15, 20, 35, ${e.target.value/100})`); };
}

window.setSetTab = (tab, btn) => { document.querySelectorAll('.settings-page').forEach(p => p.classList.remove('active')); document.querySelectorAll('.settings-nav span').forEach(s => s.classList.remove('active')); document.getElementById('s-page-' + tab).classList.add('active'); btn.classList.add('active'); };

function resetOS() { showModal(t('confirmReset'), "confirm", (yes) => { if(yes) { localStorage.clear(); location.reload(); } }); }