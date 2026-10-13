// ==========================================
// 1. 状態管理データ＆初期データ
// ==========================================

// ぬか床データ
const nukaBeds = [
    {
        name: "ぬかみ",
        startDate: "2026-09-11",
        vegetables: [
            { name: "にんじん", icon: "🥕", startAt: new Date(Date.now() - 2 * 60 * 60 * 1000), isSute: false },
            { name: "かぶ", icon: "🫜", startAt: new Date(Date.now() - 16 * 60 * 60 * 1000), isSute: false },
            { name: "だいこん", icon: "🥬", startAt: new Date(Date.now() - 22 * 60 * 60 * 1000), isSute: false }
        ]
    },
    {
        name: "ぬか床2号",
        startDate: "2026-10-02",
        vegetables: [
            { name: "きゅうり", icon: "🥒", startAt: new Date(Date.now() - 5 * 60 * 60 * 1000), isSute: false }
        ]
    }
];

let currentIndex = 0; // 現在選択中のぬか床インデックス

// 初期プリセット
const defaultPresets = [
    { name: 'きゅうり', icon: '🥒' },
    { name: 'なす', icon: '🍆' },
    { name: 'だいこん', icon: '🥬' },
    { name: 'かぶ', icon: '🫜' },
    { name: 'にんじん', icon: '🥕' },
    { name: 'キャベツ', icon: '🥬' },
    { name: '長芋', icon: '🍠' },
    { name: 'パプリカ', icon: '🫑' },
    { name: 'アボカド', icon: '🥑' },
    { name: 'プチトマト', icon: '🍅' },
    { name: 'ゆで卵', icon: '🥚' },
    { name: 'オクラ', icon: '🫛' },
    { name: 'チーズ', icon: '🧀' }
];

let vegPresets = [];
let vegHistory = [];        // 食材取り出し履歴（メモ付き）
let activityHistory = [];   // 全体ログ（お手入れ＋取り出し）
let nukaLocation = 'room';   // 'room'(常温) or 'fridge'(冷蔵庫)
let lastMixTime = null;      // 前回かき混ぜた日時
let isSuteMode = false;      // 「捨て漬け」モードフラグ
let pendingRemoveIndex = null; // 取り出し対象食材のインデックス
let currentMemoId = null;    // メモ編集中の履歴ID
let currentCareType = "";    // 現在進行中のお手入れタイプ

let currentCalDate = new Date(); // カレンダー表示用の年月
let selectedDateStr = "";        // カレンダーで選択中の日付文字列 (YYYY-MM-DD)


// ==========================================
// 2. データの保存・読み込み (localStorage)
// ==========================================

function saveData() {
    localStorage.setItem('nukaBedsData', JSON.stringify(nukaBeds));
    localStorage.setItem('activityHistoryData', JSON.stringify(activityHistory));
    localStorage.setItem('vegHistoryData', JSON.stringify(vegHistory));
    localStorage.setItem('nukaLocationData', nukaLocation);
    localStorage.setItem('lastMixTimeData', lastMixTime || '');
}

function loadData() {
    const savedBeds = localStorage.getItem('nukaBedsData');
    const savedHistory = localStorage.getItem('activityHistoryData');
    const savedVegHistory = localStorage.getItem('vegHistoryData');
    const savedLocation = localStorage.getItem('nukaLocationData');
    const savedMixTime = localStorage.getItem('lastMixTimeData');

    if (savedBeds) {
        const parsed = JSON.parse(savedBeds);
        parsed.forEach(bed => {
            if (bed.vegetables) {
                bed.vegetables.forEach(veg => {
                    if (veg.startAt) veg.startAt = new Date(veg.startAt);
                });
            }
        });
        nukaBeds.length = 0;
        nukaBeds.push(...parsed);
    }

    if (savedHistory) activityHistory = JSON.parse(savedHistory);
    if (savedVegHistory) vegHistory = JSON.parse(savedVegHistory);
    if (savedLocation) nukaLocation = savedLocation;
    if (savedMixTime) lastMixTime = new Date(savedMixTime);
}

function loadPresets() {
    const saved = localStorage.getItem('vegPresetsData');
    if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) {
            vegPresets = parsed;
        } else {
            vegPresets = [...defaultPresets];
        }
    } else {
        vegPresets = [...defaultPresets];
    }
}

function savePresets() {
    localStorage.setItem('vegPresetsData', JSON.stringify(vegPresets));
}


// ==========================================
// 3. 日時・時間計算の共通関数
// ==========================================

function updateClock() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const date = now.getDate();
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    const day = dayNames[now.getDay()];

    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    const clockElement = document.getElementById('current-datetime');
    if (clockElement) {
        clockElement.textContent = `${year}年${month}月${date}日(${day}) ${hours}:${minutes}:${seconds}`;
    }

    updateVegetableTimes();
}

function calculateDays(startDateString) {
    const today = new Date();
    const startDate = new Date(startDateString);

    today.setHours(0, 0, 0, 0);
    startDate.setHours(0, 0, 0, 0);

    const diffTime = today - startDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

    return `${diffDays}日目`;
}

function getElapsedTimeText(startAt) {
    const now = new Date();
    const diffMs = now - new Date(startAt);
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    return `${diffHours}時間`;
}

function getFormattedDateTime(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return {
        full: `${y}/${m}/${d} ${hh}:${mm}`,
        dateOnly: `${y}-${m}-${d}`
    };
}


// ==========================================
// 4. ホーム画面（ぬか床 & 食材リスト）
// ==========================================

function updateNukaDisplay(index) {
    const titleElement = document.getElementById('nuka-title');
    const daysElement = document.getElementById('nuka-days');
    const dots = document.querySelectorAll('.dot');
    const currentBed = nukaBeds[index];

    if (titleElement) titleElement.textContent = currentBed.name;
    if (daysElement) daysElement.textContent = calculateDays(currentBed.startDate);

    dots.forEach((dot, i) => {
        if (i === index) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });

    renderVegetables();
}

function renderVegetables() {
    const vegListElement = document.getElementById('vegetable-list');
    if (!vegListElement) return;

    const currentVegs = nukaBeds[currentIndex].vegetables;

    if (currentVegs.length === 0) {
        vegListElement.innerHTML = '<p style="text-align:center; color:#a09080; padding:20px; grid-column: span 2;">現在漬けている食材はありません</p>';
        return;
    }

    vegListElement.innerHTML = currentVegs.map((veg, index) => `
        <div class="veg-card ${veg.isSute ? 'sute' : ''}" onclick="removeVegetable(${index})">
            <div class="veg-info">
                <div class="veg-icon">${veg.icon}</div>
                <div>
                    <div class="veg-name">${veg.name}</div>
                    ${veg.isSute ? '<span class="veg-subtext">🧄 捨て漬け</span>' : ''}
                </div>
            </div>
            <div class="veg-time-box">
                <div class="veg-elapsed" data-start="${veg.startAt}">${getElapsedTimeText(veg.startAt)}</div>
                <div class="veg-badge">経過</div>
            </div>
        </div>
    `).join('');
}

function updateVegetableTimes() {
    const elapsedElements = document.querySelectorAll('.veg-elapsed');
    elapsedElements.forEach(el => {
        const startAt = el.getAttribute('data-start');
        if (startAt) {
            el.textContent = getElapsedTimeText(startAt);
        }
    });
}


// ==========================================
// 5. プリセット & 食材追加・削除モーダル
// ==========================================

function renderPresets() {
    const container = document.getElementById('veg-presets');
    if (!container) return;

    container.innerHTML = '';

    vegPresets.forEach((preset, index) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'preset-wrapper';
        wrapper.setAttribute('draggable', 'true');
        wrapper.dataset.index = index;

        wrapper.innerHTML = `
            <button class="preset-btn" data-name="${preset.name}" data-icon="${preset.icon}">
                ${preset.icon} ${preset.name}
            </button>
            <div class="preset-controls">
                <button class="preset-del-btn" data-index="${index}" title="削除">×</button>
            </div>
        `;

        // 1. 食材タップでぬか床に追加
        const btn = wrapper.querySelector('.preset-btn');
        btn.addEventListener('click', () => {
            if (!container.classList.contains('edit-mode')) {
                addVegetableFromPreset(preset.name, preset.icon);
            }
        });

        // 2. 削除（×）ボタン
        const delBtn = wrapper.querySelector('.preset-del-btn');
        delBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            removePreset(index);
        });

        // 3. ドラッグ＆ドロップ（並び替え）
        wrapper.addEventListener('dragstart', (e) => {
            if (!container.classList.contains('edit-mode')) {
                e.preventDefault();
                return;
            }
            wrapper.classList.add('dragging');
            e.dataTransfer.setData('text/plain', index);
        });

        wrapper.addEventListener('dragend', () => {
            wrapper.classList.remove('dragging');
        });

        wrapper.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        wrapper.addEventListener('drop', (e) => {
            e.preventDefault();
            if (!container.classList.contains('edit-mode')) return;

            const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
            const toIndex = index;

            if (fromIndex !== toIndex && !isNaN(fromIndex)) {
                const movedItem = vegPresets.splice(fromIndex, 1)[0];
                vegPresets.splice(toIndex, 0, movedItem);

                savePresets();
                renderPresets();

                document.getElementById('veg-presets')?.classList.add('edit-mode');
            }
        });

        container.appendChild(wrapper);
    });
}

function addVegetableFromPreset(name, icon) {
    const newVeg = {
        name: name,
        icon: icon,
        startAt: new Date(),
        isSute: isSuteMode
    };

    nukaBeds[currentIndex].vegetables.push(newVeg);
    renderVegetables();
    saveData();

    document.getElementById('add-modal')?.classList.add('hidden');
}

function addNewPreset() {
    const iconInput = document.getElementById('new-veg-icon');
    const nameInput = document.getElementById('new-veg-name');
    const iconBtn = document.getElementById('btn-select-icon');
    const errorMsg = document.getElementById('preset-error-msg');

    const icon = iconInput ? iconInput.value || '🫑' : '🫑';
    const name = nameInput ? nameInput.value.trim() : '';

    if (!name) {
        document.getElementById('emoji-picker')?.classList.add('hidden');
        if (errorMsg) {
            errorMsg.textContent = '食材の名前を入力してください';
            errorMsg.classList.remove('hidden');
        }
        return;
    }

    if (errorMsg) errorMsg.classList.add('hidden');

    vegPresets.push({ name, icon });
    savePresets();
    renderPresets();

    if (nameInput) nameInput.value = '';
    if (iconInput) iconInput.value = '🫑';
    if (iconBtn) iconBtn.textContent = '🫑';

    document.getElementById('emoji-picker')?.classList.add('hidden');
}

function removePreset(index) {
    vegPresets.splice(index, 1);
    savePresets();
    renderPresets();
}

function resetAddModal() {
    const errorMsg = document.getElementById('preset-error-msg');
    const nameInput = document.getElementById('new-veg-name');
    const iconInput = document.getElementById('new-veg-icon');
    const iconBtn = document.getElementById('btn-select-icon');
    const emojiPicker = document.getElementById('emoji-picker');
    const presetsContainer = document.getElementById('veg-presets');
    const trashBtn = document.getElementById('btn-toggle-edit-preset');
    const pencilBtn = document.getElementById('btn-toggle-add-preset');
    const addFormBox = document.getElementById('add-preset-form-box');

    presetsContainer?.classList.remove('edit-mode');
    trashBtn?.classList.remove('active');
    pencilBtn?.classList.remove('active');
    addFormBox?.classList.add('hidden');

    if (errorMsg) errorMsg.classList.add('hidden');
    if (nameInput) nameInput.value = '';
    if (iconInput) iconInput.value = '🫑';
    if (iconBtn) iconBtn.textContent = '🫑';
    if (emojiPicker) emojiPicker.classList.add('hidden');
}

function removeVegetable(index) {
    const veg = nukaBeds[currentIndex].vegetables[index];
    if (!veg) return;

    pendingRemoveIndex = index;

    const confirmModal = document.getElementById('remove-modal');
    const confirmText = document.getElementById('remove-modal-msg');

    if (confirmText) confirmText.textContent = `「${veg.name}」を取り出しますか？`;
    if (confirmModal) confirmModal.classList.remove('hidden');
}

function executeRemoveVegetable() {
    if (pendingRemoveIndex === null) return;

    const veg = nukaBeds[currentIndex].vegetables[pendingRemoveIndex];
    if (!veg) return;

    let timeText = '';

    if (veg.startAt) {
        const now = new Date();
        const start = new Date(veg.startAt);
        const diffMs = now - start;

        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        if (diffHours > 0) {
            timeText = `（漬け時間: ${diffHours}時間${diffMins}分）`;
        } else {
            timeText = `（漬け時間: ${diffMins}分）`;
        }
    }

    const isSuteText = veg.isSute ? '【捨て漬け】' : '';
    addHistoryLog(veg.icon || '🥕', `${isSuteText}${veg.name}を取り出しました${timeText}`);

    vegHistory.unshift({
        id: Date.now(),
        name: veg.name,
        icon: veg.icon || '🥕',
        isSute: veg.isSute,
        timeText: timeText.replace('（漬け時間: ', '').replace('）', ''),
        dateStr: getFormattedDateTime().full,
        memo: ''
    });

    nukaBeds[currentIndex].vegetables.splice(pendingRemoveIndex, 1);
    renderVegetables();
    renderVegHistory();
    saveData();

    document.getElementById('remove-modal')?.classList.add('hidden');
    pendingRemoveIndex = null;
}


// ==========================================
// 6. ぬか漬け履歴タブ & メモモーダル
// ==========================================

function renderVegHistory() {
    const container = document.getElementById('veg-history-list');
    if (!container) return;

    if (vegHistory.length === 0) {
        container.innerHTML = '<p style="font-size: 0.8rem; color: #8c7462; text-align: center; padding: 15px 0;">まだ取り出した食材はありません。</p>';
        return;
    }

    container.innerHTML = vegHistory.map(item => `
        <div class="veg-history-card">
            <div class="veg-history-header">
                <div class="veg-history-title">
                    <span>${item.icon}</span>
                    <span>${item.isSute ? '【捨て漬け】' : ''}${item.name}</span>
                </div>
                <div class="veg-history-right">
                    <span class="veg-history-time">${item.timeText ? '⏱ ' + item.timeText : ''}</span>
                    <span class="edit-icon" onclick="openMemoModal(${item.id})">✏️</span>
                </div>
            </div>
            <div class="veg-history-memo-box" onclick="openMemoModal(${item.id})">${item.memo ? item.memo : '<span class="no-memo">タップしてメモ・感想を入力...</span>'}</div>
        </div>
    `).join('');
}

function openMemoModal(id) {
    const target = vegHistory.find(item => item.id === id);
    if (!target) return;

    currentMemoId = id;
    const modal = document.getElementById('memo-modal');
    const input = document.getElementById('memo-input');

    if (input) input.value = target.memo || '';
    if (modal) modal.classList.remove('hidden');
}


// ==========================================
// 7. お手入れタブ & モーダル
// ==========================================

function updateCareRemind() {
    const elapsedEl = document.getElementById('last-mix-elapsed');
    const guideEl = document.getElementById('care-guide-msg');
    const roomBtn = document.getElementById('loc-room-btn');
    const fridgeBtn = document.getElementById('loc-fridge-btn');

    if (!elapsedEl || !guideEl) return;

    if (nukaLocation === 'room') {
        roomBtn?.classList.add('active');
        fridgeBtn?.classList.remove('active');
        guideEl.textContent = '常温保存では1日1回のかき混ぜが目安です。';
    } else {
        fridgeBtn?.classList.add('active');
        roomBtn?.classList.remove('active');
        guideEl.textContent = '冷蔵庫保存では2〜3日に1回のかき混ぜが目安です。';
    }

    if (lastMixTime) {
        const now = new Date();
        const diffMs = now - new Date(lastMixTime);
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        elapsedEl.textContent = `${diffHours}時間`;
    } else {
        elapsedEl.textContent = '未記録';
    }
}

function openCareModal(type) {
    currentCareType = type;
    const careModal = document.getElementById('care-modal');
    const careModalTitle = document.getElementById('care-modal-title');
    const careModalBody = document.getElementById('care-modal-body');

    if (!careModal || !careModalTitle || !careModalBody) return;

    careModal.classList.remove('hidden');

    if (type === 'mix') {
        careModalTitle.textContent = '🥣 かき混ぜる';
        careModalBody.innerHTML = '<p style="text-align: center; color: #6b584a; font-size: 0.9rem;">底から空気が届くようにしっかり混ぜますか？</p>';
    } else if (type === 'water') {
        careModalTitle.textContent = '🚰 水抜き';
        careModalBody.innerHTML = '<p style="text-align: center; color: #6b584a; font-size: 0.9rem;">たまった水分を取り除いて硬さを調整しますか？</p>';
    } else if (type === 'add-nuka') {
        careModalTitle.textContent = '🌾 足しぬか';
        careModalBody.innerHTML = `
            <div class="input-group">
                <label class="input-label">
                    ぬかの量 (0〜200g)
                    <span><input type="number" id="input-nuka" class="num-input" min="0" max="200" step="1" value="50"> g</span>
                </label>
                <label class="input-label">
                    塩の量 (0〜50g)
                    <span><input type="number" id="input-salt" class="num-input" min="0" max="50" step="0.1" value="2.5"> g</span>
                </label>
            </div>
        `;
    }
}


// ==========================================
// 8. カレンダー & 履歴機能
// ==========================================

function addHistoryLog(icon, text) {
    const timeInfo = getFormattedDateTime();
    activityHistory.unshift({
        id: Date.now(),
        icon: icon,
        text: text,
        fullDate: timeInfo.full,
        dateOnly: timeInfo.dateOnly
    });

    renderCalendar();
    renderDayHistory(selectedDateStr || timeInfo.dateOnly);
    saveData();
}

function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const title = document.getElementById('cal-month-title');
    if (!grid || !title) return;

    const year = currentCalDate.getFullYear();
    const month = currentCalDate.getMonth();

    title.textContent = `${year}年 ${month + 1}月`;
    grid.innerHTML = '';

    let firstDay = new Date(year, month, 1).getDay();
    let firstDayMonday = (firstDay === 0) ? 6 : firstDay - 1;

    const lastDate = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDayMonday; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'cal-day empty';
        grid.appendChild(emptyCell);
    }

    const todayStr = getFormattedDateTime().dateOnly;
    if (!selectedDateStr) selectedDateStr = todayStr;

    for (let date = 1; date <= lastDate; date++) {
        const dayCell = document.createElement('div');
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;

        dayCell.className = 'cal-day';
        if (dateStr === todayStr) dayCell.classList.add('today');
        if (dateStr === selectedDateStr) dayCell.classList.add('selected');

        const dayLogs = activityHistory.filter(item => item.dateOnly === dateStr);

        const uniqueIcons = [];
        const hasRemove = dayLogs.some(l => l.text.includes('取り出しました') || l.icon === '🥕');
        const hasMix = dayLogs.some(l => l.icon === '🥣' || l.text.includes('かき混ぜ'));
        const hasAddNuka = dayLogs.some(l => l.icon === '🌾' || l.text.includes('足しぬか'));
        const hasWater = dayLogs.some(l => l.icon === '🚰' || l.text.includes('水抜き'));

        if (hasRemove) uniqueIcons.push('🥕');
        if (hasMix) uniqueIcons.push('🥣');
        if (hasAddNuka) uniqueIcons.push('🌾');
        if (hasWater) uniqueIcons.push('🚰');

        const iconsHtml = uniqueIcons.map(icon => `<span>${icon}</span>`).join('');

        dayCell.innerHTML = `
            <span class="cal-day-num">${date}</span>
            <div class="cal-day-icons">${iconsHtml}</div>
        `;

        dayCell.addEventListener('click', () => {
            document.querySelectorAll('.cal-day').forEach(c => c.classList.remove('selected'));
            dayCell.classList.add('selected');
            selectedDateStr = dateStr;
            renderDayHistory(dateStr);
        });

        grid.appendChild(dayCell);
    }
}

function renderDayHistory(dateStr) {
    const container = document.getElementById('day-history-list');
    const title = document.getElementById('selected-date-text');
    if (!container) return;

    const logs = activityHistory.filter(item => item.dateOnly === dateStr);
    const dateParts = dateStr.split('-');
    const dateObj = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    const dayName = dayNames[dateObj.getDay()];

    const displayDate = `${dateParts[0]}年${dateParts[1]}月${dateParts[2]}日(${dayName})`;

    if (title) title.textContent = `📅 ${displayDate} の履歴`;

    if (logs.length === 0) {
        container.innerHTML = '<p style="font-size: 0.8rem; color: #8c7462; text-align: center; padding: 10px 0;">この日の記録はありません。</p>';
        return;
    }

    container.innerHTML = logs.map(item => `
        <div class="history-item">
            <span class="history-icon">${item.icon}</span>
            <div class="history-content">
                <div class="history-text">${item.text}</div>
                <div class="history-date">${item.fullDate}</div>
            </div>
        </div>
    `).join('');
}


// ==========================================
// 9. イベントリスナー登録 & 初期化
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    loadPresets();

    updateClock();
    setInterval(updateClock, 1000);
    renderPresets();
    updateNukaDisplay(currentIndex);
    renderCalendar();
    renderDayHistory(getFormattedDateTime().dateOnly);
    renderVegHistory();
    updateCareRemind();

    const navItems = document.querySelectorAll('.nav-item');
    const pages = [
        document.getElementById('home-page'),
        document.getElementById('history-page'),
        document.getElementById('care-page'),
        document.getElementById('calendar-page')
    ];

    navItems.forEach((item, index) => {
        item.addEventListener('click', () => {
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            pages.forEach(page => page?.classList.add('hidden'));
            if (pages[index]) pages[index].classList.remove('hidden');
        });
    });

    document.getElementById('prev-btn')?.addEventListener('click', () => {
        currentIndex = (currentIndex - 1 + nukaBeds.length) % nukaBeds.length;
        updateNukaDisplay(currentIndex);
    });

    document.getElementById('next-btn')?.addEventListener('click', () => {
        currentIndex = (currentIndex + 1) % nukaBeds.length;
        updateNukaDisplay(currentIndex);
    });

    document.getElementById('add-normal-btn')?.addEventListener('click', () => {
        isSuteMode = false;
        resetAddModal();
        const modalTitle = document.getElementById('modal-title');
        if (modalTitle) modalTitle.textContent = "🥕 本漬けする食材を選ぶ";
        document.getElementById('add-modal')?.classList.remove('hidden');
    });

    document.getElementById('add-sute-btn')?.addEventListener('click', () => {
        isSuteMode = true;
        resetAddModal();
        const modalTitle = document.getElementById('modal-title');
        if (modalTitle) modalTitle.textContent = "🧄 捨て漬けする食材を選ぶ";
        document.getElementById('add-modal')?.classList.remove('hidden');
    });

    document.getElementById('close-add-modal')?.addEventListener('click', () => {
        document.getElementById('add-modal')?.classList.add('hidden');
    });

    document.getElementById('btn-add-preset')?.addEventListener('click', addNewPreset);

    document.getElementById('btn-toggle-add-preset')?.addEventListener('click', () => {
        const addFormBox = document.getElementById('add-preset-form-box');
        const pencilBtn = document.getElementById('btn-toggle-add-preset');

        addFormBox?.classList.toggle('hidden');
        pencilBtn?.classList.toggle('active');
    });

    document.getElementById('btn-toggle-edit-preset')?.addEventListener('click', () => {
        const presetsContainer = document.getElementById('veg-presets');
        const trashBtn = document.getElementById('btn-toggle-edit-preset');

        presetsContainer?.classList.toggle('edit-mode');
        trashBtn?.classList.toggle('active');
    });

    const iconBtn = document.getElementById('btn-select-icon');
    const iconInput = document.getElementById('new-veg-icon');
    const emojiPicker = document.getElementById('emoji-picker');

    iconBtn?.addEventListener('click', () => {
        emojiPicker?.classList.toggle('hidden');
    });

    emojiPicker?.querySelectorAll('span').forEach(span => {
        span.addEventListener('click', () => {
            const selectedEmoji = span.textContent;
            if (iconBtn) iconBtn.textContent = selectedEmoji;
            if (iconInput) iconInput.value = selectedEmoji;
            emojiPicker.classList.add('hidden');
        });
    });

    document.getElementById('remove-modal-submit')?.addEventListener('click', executeRemoveVegetable);
    document.getElementById('remove-modal-cancel')?.addEventListener('click', () => {
        document.getElementById('remove-modal')?.classList.add('hidden');
        pendingRemoveIndex = null;
    });

    document.getElementById('btn-mix')?.addEventListener('click', () => openCareModal('mix'));
    document.getElementById('btn-water')?.addEventListener('click', () => openCareModal('water'));
    document.getElementById('btn-add-nuka')?.addEventListener('click', () => openCareModal('add-nuka'));

    document.getElementById('care-modal-submit')?.addEventListener('click', () => {
        if (currentCareType === 'mix') {
            addHistoryLog('🥣', 'ぬか床をかき混ぜました');
            lastMixTime = new Date();
            updateCareRemind();
        } else if (currentCareType === 'water') {
            addHistoryLog('🚰', '水抜きを行いました');
        } else if (currentCareType === 'add-nuka') {
            const nukaG = document.getElementById('input-nuka')?.value || 0;
            const saltG = document.getElementById('input-salt')?.value || 0;
            addHistoryLog('🌾', `足しぬか（ぬか: ${nukaG}g / 塩: ${saltG}g）`);
        }
        document.getElementById('care-modal')?.classList.add('hidden');
    });

    document.getElementById('care-modal-cancel')?.addEventListener('click', () => {
        document.getElementById('care-modal')?.classList.add('hidden');
    });

    document.getElementById('loc-room-btn')?.addEventListener('click', () => {
        nukaLocation = 'room';
        saveData();
        updateCareRemind();
    });

    document.getElementById('loc-fridge-btn')?.addEventListener('click', () => {
        nukaLocation = 'fridge';
        saveData();
        updateCareRemind();
    });

    document.getElementById('cal-prev')?.addEventListener('click', () => {
        currentCalDate.setMonth(currentCalDate.getMonth() - 1);
        renderCalendar();
    });

    document.getElementById('cal-next')?.addEventListener('click', () => {
        currentCalDate.setMonth(currentCalDate.getMonth() + 1);
        renderCalendar();
    });

    document.getElementById('memo-modal-submit')?.addEventListener('click', () => {
        if (currentMemoId === null) return;
        const target = vegHistory.find(item => item.id === currentMemoId);
        const input = document.getElementById('memo-input');

        if (target && input) {
            target.memo = input.value.trim();
            saveData();
            renderVegHistory();
        }

        document.getElementById('memo-modal')?.classList.add('hidden');
        currentMemoId = null;
    });

    document.getElementById('memo-modal-cancel')?.addEventListener('click', () => {
        document.getElementById('memo-modal')?.classList.add('hidden');
        currentMemoId = null;
    });
});