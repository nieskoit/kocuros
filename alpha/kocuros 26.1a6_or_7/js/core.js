const SYSTEM = {
    name: "KOCUROS",
    version: "26.1a6_or_7",
    channel: "alpha"
};

function showBuildBadge() {
    if (SYSTEM.channel === "stable") return;
    const badge = document.getElementById("build-badge");
    if(!badge) return;
    badge.innerText = `${SYSTEM.channel.toUpperCase()} BUILD`;
    badge.style.display = "block";
}

let langLib = {};
let currentLang = localStorage.kocuros_lang || 'en';
const t = (key) => (langLib[currentLang] && langLib[currentLang][key]) || key;

async function loadLangs() {
    if (window.KOCUROS_LANGS && window.KOCUROS_LANGS.pl && window.KOCUROS_LANGS.en) {
        langLib = window.KOCUROS_LANGS;
        return;
    }}

const boot = document.getElementById("boot"),
      loginScreen = document.getElementById("loginScreen"),
      setupScreen = document.getElementById("setupScreen"),
      desktop = document.getElementById("desktop"),
      ctxMenu = document.getElementById("context-menu"),
      modal = document.getElementById("os-modal");

function showModal(text, type = "confirm", callback = null) {
    const textEl = document.getElementById("modal-text");
    const inputCont = document.getElementById("modal-input-container");
    const btnCont = document.getElementById("modal-buttons");
    textEl.innerText = text;
    inputCont.innerHTML = "";
    btnCont.innerHTML = "";
    modal.style.display = "flex";

    if (type === "prompt") {
        const input = document.createElement("input");
        input.id = "modal-field";
        inputCont.appendChild(input);
        input.focus();
    }

    const okBtn = document.createElement("button");
    okBtn.innerText = "OK";
    okBtn.onclick = () => {
        modal.style.display = "none";
        if (callback) {
            const val = document.getElementById("modal-field")?.value;
            callback(type === "prompt" ? val : true);
        }
    };

    const cancelBtn = document.createElement("button");
    cancelBtn.innerText = "Anuluj";
    cancelBtn.style.background = "#444";
    cancelBtn.onclick = () => {
        modal.style.display = "none";
        if (callback && type !== "alert") callback(false);
    };

    btnCont.appendChild(okBtn);
    if (type !== "alert") btnCont.appendChild(cancelBtn);
}

function getFileSystem() {
    if (!localStorage.kocuros_files) {
        localStorage.kocuros_files = JSON.stringify([
            {name: "read_me.txt", content: "Welcome to KOCUROS!", type: "file", parent: "root"},
            {name: "My documents", type: "folder", parent: "root"}
        ]);
    }
    return JSON.parse(localStorage.kocuros_files);
}

function saveFileSystem(files) {
    localStorage.kocuros_files = JSON.stringify(files);
    renderDesktopIcons();
}

function updateClock() {
    const now = new Date();
    const ttime = document.getElementById("tray-time");
    const tdate = document.getElementById("tray-date");
    if(ttime) ttime.textContent = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    if(tdate) tdate.textContent = now.toLocaleDateString();
}
setInterval(updateClock, 1000);

async function bootSequence() {
    await loadLangs();

    setTimeout(() => {
        if (boot) boot.remove();
        if (!localStorage.kocuros_setup_done) {
            if (setupScreen) setupScreen.style.display = "grid";
        } else if (!localStorage.kocuros_user) {
            if (loginScreen) {
                loginScreen.style.display = "grid";
                const lw = document.getElementById("loginWelcome");
                if(lw) lw.innerText = t('welcome') + ", " + (localStorage.kocuros_username || "User");
            }
        } else {
            startOS();
        }
    }, 1500);
}

function nextSetupStep() {
    currentLang = document.getElementById("setupLang").value;
    localStorage.kocuros_lang = currentLang;

    document.getElementById("txt-setup-title").innerText = t('setup');
    document.getElementById("setupUser").placeholder = t('username');
    document.getElementById("setupPass").placeholder = t('password');
    document.getElementById("btn-install").innerText = t('install');

    document.getElementById("setup-step-1").style.display = "none";
    document.getElementById("setup-step-2").style.display = "flex";
    document.getElementById("setup-step-2").style.flexDirection = "column";
}

function finishSetup() {
    const user = document.getElementById("setupUser").value.trim();
    const pass = document.getElementById("setupPass").value.trim();
    if (!user || !pass) {
        showModal(currentLang === 'pl' ? "Wypełnij wszystkie pola!" : "Please fill all fields!", "alert");
        return;
    }
    localStorage.kocuros_username = user;
    localStorage.kocuros_password = pass;
    localStorage.kocuros_setup_done = "true";
    location.reload();
}

function doLogin() {
    const inputPass = document.getElementById("usernameInput").value;
    const savedPass = localStorage.kocuros_password;
    if (inputPass === savedPass) {
        localStorage.kocuros_user = localStorage.kocuros_username;
        startOS();
    } else {
        showModal(t('errPass'), "alert");
        document.getElementById("usernameInput").value = "";
    }
}

function startOS() {
    if (loginScreen) loginScreen.remove();
    if (setupScreen) setupScreen.remove();
    if (desktop) desktop.style.display = "block";

    setTimeout(() => {
        const taskbar = document.getElementById("taskbar");
        if(taskbar) taskbar.classList.add("visible");
    }, 4500);

    applyStoredSettings();
    updateClock();
    renderDesktopIcons();
    showBuildBadge();
    applyVolumeSettings();
}

const splash = document.getElementById("splashScreen");
const splashStatus = document.getElementById("splash-status");

setTimeout(() => {
    if(boot) boot.style.display = "none";
    if(splash) splash.style.display = "flex";

        const statuses = [
    "Loading hardware abstraction layer...",
    "Checking filesystem integrity... [OK]",
    "Spawning desktop environment services...",
    `${SYSTEM.name} | ${t('version')} ${SYSTEM.version} ${SYSTEM.channel.toUpperCase()}`
];
    statuses.forEach((msg, i) => setTimeout(() => { if(splashStatus) splashStatus.innerText = msg; }, i * 1000));

    setTimeout(() => {
        if(splash) splash.style.animation = "windowClose 0.5s forwards";
        setTimeout(() => {
            if(splash) splash.remove();
            if(!localStorage.kocuros_setup_done) {
                if(setupScreen) setupScreen.style.display = "grid";
            } else if(!localStorage.kocuros_user) {
                if(loginScreen) {
                    loginScreen.style.display = "grid";
                    const lw = document.getElementById("loginWelcome");
                    if(lw) lw.innerText = t('welcome') + ", " + (localStorage.kocuros_username || "User");
                }
            } else {
                startOS();
            }
        }, 500);
    }, 4000);
}, 1500);

function renderDesktopIcons() {
    const container = document.getElementById("desktop-icons");
    if(!container) return;
    container.innerHTML = "";
    const files = getFileSystem();
    files.filter(f => f.parent === "root").forEach((f) => {
        const icon = document.createElement("div");
        icon.className = "file-icon-box";
        icon.innerHTML = `<span>${f.type === 'folder' ? '📁' : '📄'}</span><label>${f.name}</label>`;
        icon.onclick = () => {
            if (f.type === 'folder') openFiles(f.name);
            else {
                const globalIdx = files.indexOf(f);
                openNotes(globalIdx);
            }
        };
        icon.oncontextmenu = (e) => { e.preventDefault(); e.stopPropagation(); showFileContext(e, files.indexOf(f)); };
        container.appendChild(icon);
    });
}

function showFileContext(e, index) {
    const { clientX: x, clientY: y } = e;
    if(!ctxMenu) return;
    ctxMenu.style.display = "block";
    ctxMenu.style.left = x + "px";
    ctxMenu.style.top = y + "px";
    ctxMenu.innerHTML = `\n        <div class="context-item" onclick="deleteFile(${index})"><span>🗑</span> ${t('delete')}</div>\n    `;
}

window.oncontextmenu = (e) => {
    if (e.target.closest('.file-icon-box')) return;
    e.preventDefault();
    const { clientX: x, clientY: y } = e;
    if(!ctxMenu) return;
    ctxMenu.style.display = "block";
    ctxMenu.style.left = x + "px";
    ctxMenu.style.top = y + "px";

    const clickedWindow = e.target.closest('.window');
    if (clickedWindow) {
        const title = clickedWindow.id.replace('win-', '');
        ctxMenu.innerHTML = `\n            <div class="context-item" onclick="maximizeWin('${title}')"><span>▢</span> Powiększ</div>\n            <div class="context-item" onclick="closeWin('${title}')" style="color:#ff5f56"><span>✕</span> Zamknij</div>\n        `;
    } else {
        ctxMenu.innerHTML = `\n            <div class="context-item" onclick="openTerminal()"><span>>_</span> ${t('terminal')}</div>\n            <div class="context-item" onclick="openFiles()"><span>📁</span> ${t('files')}</div>\n            <div class="context-sep"></div>\n            <div class="context-item" onclick="createNew('file')"><span>📄</span> ${t('newFile')}</div>\n            <div class="context-item" onclick="createNew('folder')"><span>📁</span> ${t('newFolder')}</div>\n            <div class="context-sep"></div>\n            <div class="context-item" onclick="location.reload()"><span>🔄</span> ${t('refresh')}</div>\n        `;
    }
};
window.onclick = () => { if(ctxMenu) ctxMenu.style.display = "none"; };

function createNew(type) {
    showModal("Podaj nazwę:", "prompt", (name) => {
        if (!name) return;
        const files = getFileSystem();
        files.push({
            name: name + (type === 'file' && !name.includes('.') ? '.txt' : ''),
            type: type,
            content: "",
            parent: "root"
        });
        saveFileSystem(files);
    });
}

function deleteFile(index) {
    showModal(t('confirmReset'), "confirm", (yes) => {
        if (yes) { const files = getFileSystem(); files.splice(index, 1); saveFileSystem(files); }
    });
}

/* --- WINDOW SYSTEM --- */
let zIndex = 100;
let openWindows = {};

function createWindow(title, html, wWidth = "650px", wHeight = "450px") {
    if (openWindows[title]) {
        const existing = openWindows[title];
        existing.classList.remove("minimized", "anim-min");
        existing.style.display = "flex";
        existing.style.zIndex = ++zIndex;
        return;
    }
    const w = document.createElement("div");
    w.className = "window";
    w.id = "win-" + title;
    w.style.zIndex = ++zIndex;
    w.style.width = wWidth;
    w.style.height = wHeight;
    w.innerHTML = `
        <div class="titlebar">
            <div class="controls">
                <span class="red" onclick="closeWin('${title}')">✕</span>
                <span class="yellow" onclick="minimizeWin('${title}')">─</span>
                <span class="green" onclick="maximizeWin('${title}')">▢</span>
            </div>
            <strong style="font-size:14px; opacity:0.8">${title}</strong>
            <div style="width:40px"></div>
        </div>
        <div class="content">${html}</div>`;
    document.body.appendChild(w);
    dragWindow(w);
    openWindows[title] = w;
    document.getElementById("task-" + title.split(' ')[0])?.classList.add("active");
    w.style.background = `rgba(15, 20, 35, ${(localStorage.kocuros_windowOpacity || 90)/100})`;
}

function closeWin(title) {
    const win = openWindows[title];
    if (!win) return;
    win.classList.add("anim-close");
    setTimeout(() => { win.remove(); delete openWindows[title]; document.getElementById("task-" + title.split(' ')[0])?.classList.remove("active"); }, 200);
}

function minimizeWin(title) { const win = openWindows[title]; if (!win) return; win.classList.add("anim-min"); setTimeout(() => { win.classList.add("minimized"); }, 250); }
function maximizeWin(title) { if (openWindows[title]) openWindows[title].classList.toggle("maximized"); }

function handleTaskClick(titleShort, openFunc) {
    let fullTitle = Object.keys(openWindows).find(k => k.startsWith(titleShort));
    if (fullTitle) {
        let w = openWindows[fullTitle];
        if (w.classList.contains("minimized")) { w.classList.remove("minimized", "anim-min"); w.style.display = "flex"; w.style.zIndex = ++zIndex; }
        else { minimizeWin(fullTitle); }
    } else { openFunc(); }
}

function dragWindow(w) {
    const bar = w.querySelector(".titlebar");
    let x, y;
    bar.onmousedown = e => {
        if (w.classList.contains("maximized")) return;
        w.style.zIndex = ++zIndex;
        x = e.clientX; y = e.clientY;
        document.onmousemove = ev => { w.style.left = (w.offsetLeft + ev.clientX - x) + "px"; w.style.top = (w.offsetTop + ev.clientY - y) + "px"; x = ev.clientX; y = ev.clientY; }
        document.onmouseup = () => document.onmousemove = null;
    };
}

function applyStoredSettings() {
    if (localStorage.kocuros_accent) document.documentElement.style.setProperty('--accent', localStorage.kocuros_accent);
    if (localStorage.kocuros_taskbar) document.documentElement.style.setProperty('--taskbar-size', localStorage.kocuros_taskbar + 'px');
    if (localStorage.kocuros_wallpaper) document.body.style.backgroundImage = `url('${localStorage.kocuros_wallpaper}')`;
}

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) logoutBtn.onclick = () => { showModal(t('logoutConfirm'), "confirm", (yes) => { if (yes) { localStorage.removeItem("kocuros_user"); location.reload(); } }); };

window.exportUserData = () => {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('kocuros_')) data[key] = localStorage.getItem(key);
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `kocuros_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
};

const volSlider = document.getElementById("global-vol");
const volIcon = document.getElementById("vol-icon");
let lastVolume = 100;
if (volSlider) volSlider.oninput = (e) => { const vol = e.target.value / 100; updateSystemVolume(vol); };

function updateSystemVolume(vol) {
    if (!volIcon) return;
    if (vol === 0) volIcon.innerText = "🔇";
    else if (vol < 0.5) volIcon.innerText = "🔉";
    else volIcon.innerText = "🔊";
    document.querySelectorAll("video, audio").forEach(el => el.volume = vol);
    localStorage.kocuros_volume = vol * 100;
}

function toggleMute() {
    if (!volSlider) return;
    if (volSlider.value > 0) { lastVolume = volSlider.value; volSlider.value = 0; }
    else { volSlider.value = lastVolume; }
    updateSystemVolume(volSlider.value / 100);
}

function applyVolumeSettings() {
    const savedVol = localStorage.kocuros_volume || 100;
    if (volSlider) volSlider.value = savedVol;
    updateSystemVolume(savedVol / 100);
}

bootSequence();
