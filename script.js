// ==========================================
// 1. 状態管理データ＆初期データ
// ==========================================

const nukaBeds = [
    {
        name: "ぬかみ",
        startDate: "2026-09-11",
        lastMixTime: new Date(Date.now() - 17 * 60 * 60 * 1000),
        vegetables: [
            { name: "にんじん", icon: "🥕", startAt: new Date(Date.now() - 2 * 60 * 60 * 1000), isSute: false },
            { name: "かぶ", icon: "🫜", startAt: new Date(Date.now() - 16 * 60 * 60 * 1000), isSute: false },
            { name: "だいこん", icon: "🥬", startAt: new Date(Date.now() - 22 * 60 * 60 * 1000), isSute: false }
        ]
    },
    {
        name: "ぬか床2号",
        startDate: "2026-10-02",
        lastMixTime: new Date(Date.now() - 5 * 60 * 60 * 1000),
        vegetables: [
            { name: "きゅうり", icon: "🥒", startAt: new Date(Date.now() - 5 * 60 * 60 * 1000), isSute: false }
        ]
    }
];

let currentIndex = 0;

const defaultPresets = [
    { name: 'きゅうり', icon: '🥒' },
    { name: 'なす', icon: '🍆' },
    { name: 'だいこん', icon: '⚪️' },
    { name: 'かぶ', icon: '🫜' },
    { name: 'にんじん', icon: '🥕' },
    { name: 'キャベツ', icon: '🥬' },
    { name: 'じゃがいも', icon: '🥔' },
    { name: '長芋', icon: '🍠' },
    { name: 'さつまいも', icon: '🍠' },
    { name: 'パプリカ', icon: '🫑' },
    { name: 'アボカド', icon: '🥑' },
    { name: 'プチトマト', icon: '🍅' },
    { name: 'ゆで卵', icon: '🥚' },
    { name: 'オクラ', icon: '🫛' },
    { name: 'りんご', icon: '🍎' },
    { name: 'なし', icon: '🍐' },
    { name: 'しいたけ', icon: '🍄' }
];

let vegPresets = [];
let vegHistory = [];
let activityHistory = [];
let isSuteMode = false;
let pendingRemoveIndex = null;
let currentMemoId = null;

let currentCalDate = new Date();
let selectedDateStr = "";
let pendingRemoveVegHistoryId = null;
let pendingRemoveActivityHistoryId = null;


// モーダルが開いているか共通チェックする関数
function isAnyModalOpen() {
    const modals = [
        document.getElementById('add-modal'),
        document.getElementById('mix-confirm-modal'),
        document.getElementById('care-modal'),
        document.getElementById('remove-modal'),
        document.getElementById('memo-modal')
    ];
    return modals.some(modal => modal && !modal.classList.contains('hidden'));
}

// モーダルを開く共通処理（背景ロック付き）
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        document.body.classList.add('modal-open');
    }
}

// モーダルを閉じる共通処理（背景ロック解除付き）
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
    }
    if (!isAnyModalOpen()) {
        document.body.classList.remove('modal-open');
    }
}


// ==========================================
// 2. データの保存・読み込み (localStorage)
// ==========================================

function saveData() {
    localStorage.setItem('nukaBedsData', JSON.stringify(nukaBeds));
    localStorage.setItem('activityHistoryData', JSON.stringify(activityHistory));
    localStorage.setItem('vegHistoryData', JSON.stringify(vegHistory));
}

function loadData() {
    const savedBeds = localStorage.getItem('nukaBedsData');
    const savedHistory = localStorage.getItem('activityHistoryData');
    const savedVegHistory = localStorage.getItem('vegHistoryData');

    if (savedBeds) {
        const parsed = JSON.parse(savedBeds);
        parsed.forEach(bed => {
            if (bed.lastMixTime) bed.lastMixTime = new Date(bed.lastMixTime);
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

    const dateElement = document.getElementById('current-datetime-date');
    const timeElement = document.getElementById('current-datetime-time');

    if (dateElement) {
        dateElement.textContent = `${year}年${month}月${date}日(${day})`;
    }
    if (timeElement) {
        timeElement.textContent = `${hours}:${minutes}:${seconds}`;
    }

    updateVegetableTimes();
    updateHomeCareDisplay();
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

function getElapsedTimeHours(startAt) {
    const now = new Date();
    const diffMs = now - new Date(startAt);
    return Math.floor(diffMs / (1000 * 60 * 60));
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
// 4. ホーム画面（ぬか床 & 食材リスト＆お手入れ）
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
    updateHomeCareDisplay();
}

function renderVegetables() {
    const vegListElement = document.getElementById('vegetable-list');
    if (!vegListElement) return;

    const currentVegs = nukaBeds[currentIndex].vegetables;

    if (currentVegs.length === 0) {
        vegListElement.innerHTML = '<p style="text-align:center; color:#a09080; padding:20px; grid-column: span 2;">現在漬けている食材はありません</p>';
        return;
    }

    vegListElement.innerHTML = currentVegs.map((veg, index) => {
        const hours = getElapsedTimeHours(veg.startAt);
        return `
        <div class="veg-card ${veg.isSute ? 'sute' : ''}" onclick="removeVegetable(${index})">
            <div class="veg-time-badge">
                <span class="veg-time-num">${hours}</span>
                <span class="veg-time-label">時間</span>
            </div>
            <div class="veg-card-icon">${veg.icon}</div>
            <div class="veg-card-name">${veg.name}</div>
            ${veg.isSute ? '<div class="veg-card-subtext">捨漬け</div>' : ''}
        </div>
    `;
    }).join('');
}

function updateVegetableTimes() {
    const cards = document.querySelectorAll('.veg-card');
    cards.forEach((card, index) => {
        const veg = nukaBeds[currentIndex].vegetables[index];
        if (veg && veg.startAt) {
            const numEl = card.querySelector('.veg-time-num');
            if (numEl) {
                numEl.textContent = getElapsedTimeHours(veg.startAt);
            }
        }
    });
}

function updateHomeCareDisplay() {
    const elapsedEl = document.getElementById('last-mix-elapsed');
    if (!elapsedEl) return;

    const currentBed = nukaBeds[currentIndex];

    if (currentBed && currentBed.lastMixTime) {
        const now = new Date();
        const diffMs = now - new Date(currentBed.lastMixTime);
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        elapsedEl.textContent = `${diffHours}時間`;
    } else {
        elapsedEl.textContent = '未記録';
    }
}


// ==========================================
// 5. 食材プリセット & ドラッグ並び替え
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
                <span>${preset.icon}</span>
                <span class="preset-text">${preset.name}</span>
            </button>
            <div class="preset-controls">
                <button class="preset-del-btn" data-index="${index}" title="削除">×</button>
            </div>
        `;

        const btn = wrapper.querySelector('.preset-btn');
        btn.addEventListener('click', () => {
            if (!container.classList.contains('edit-mode')) {
                addVegetableFromPreset(preset.name, preset.icon);
            }
        });

        const delBtn = wrapper.querySelector('.preset-del-btn');
        delBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            removePreset(index);
        });

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

    closeModal('add-modal');
}

function addNewPreset() {
    const iconInput = document.getElementById('new-veg-icon');
    const nameInput = document.getElementById('new-veg-name');
    const iconBtn = document.getElementById('btn-select-icon');
    const errorMsg = document.getElementById('preset-error-msg');

    const icon = iconInput ? iconInput.value || '🥒' : '🥒';
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
    if (iconInput) iconInput.value = '🥒';
    if (iconBtn) iconBtn.textContent = '🥒';

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
    if (iconInput) iconInput.value = '🥒';
    if (iconBtn) iconBtn.textContent = '🥒';
    if (emojiPicker) emojiPicker.classList.add('hidden');
}

function removeVegetable(index) {
    const veg = nukaBeds[currentIndex].vegetables[index];
    if (!veg) return;

    pendingRemoveIndex = index;

    const confirmTitle = document.getElementById('remove-modal-title');
    const confirmText = document.getElementById('remove-modal-msg');
    const confirmSubmitBtn = document.getElementById('remove-modal-submit');

    if (confirmTitle) confirmTitle.textContent = "取り出しの確認";
    if (confirmText) confirmText.textContent = `「${veg.name}」を取り出しますか？`;
    if (confirmSubmitBtn) confirmSubmitBtn.textContent = "取り出す";

    openModal('remove-modal');
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

        if (diffHours >= 100) {
            timeText = `漬け時間: ${diffHours}時間`;
        } else if (diffHours > 0) {
            timeText = `漬け時間: ${diffHours}時間${diffMins}分`;
        } else {
            timeText = `漬け時間: ${diffMins}分`;
        }
    }
    const isSuteText = veg.isSute ? '[捨漬け]' : '';
    const currentBedName = nukaBeds[currentIndex].name;
    addHistoryLog(veg.icon || '🥕', `${isSuteText}${veg.name}を取り出し「${currentBedName}」<br>（${timeText}）`);
    vegHistory.unshift({
        id: Date.now(),
        name: veg.name,
        icon: veg.icon || '🥕',
        isSute: veg.isSute,
        timeText: timeText,
        dateStr: getFormattedDateTime().full,
        memo: '',
        bedName: currentBedName
    });

    nukaBeds[currentIndex].vegetables.splice(pendingRemoveIndex, 1);
    renderVegetables();
    renderVegHistory();
    saveData();

    closeModal('remove-modal');
    pendingRemoveIndex = null;
}


// ==========================================
// 6. ぬか漬け履歴タブ & メモモーダル
// ==========================================

// SVGタイマーアイコン
const timerSvgIcon = `<svg viewBox="0 0 24 24" width="13" height="13" style="display:inline-block;vertical-align:middle;margin-right:3px;stroke:#8c7462;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;flex-shrink:0;" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9"></circle><polyline points="12 6 12 12 15.5 14"></polyline></svg>`;

function renderVegHistory() {
    const container = document.getElementById('veg-history-list');
    if (!container) return;

    if (vegHistory.length === 0) {
        container.innerHTML = '<p style="font-size: 0.8rem; color: #8c7462; text-align: center; padding: 15px 0;">まだ履歴はありません。</p>';
        return;
    }

    container.innerHTML = vegHistory.map(item => {
        // 食材（本漬け・捨漬け）のときだけ区分を表示し、かき混ぜ・足しぬかのときは非表示にする
        let typeBadge = '';
        if (item.name !== 'かき混ぜ' && !item.name.startsWith('足しぬか')) {
            typeBadge = item.isSute ? '[捨漬け]' : '[本漬け]';
        }

        // ぬか床名がある場合は後ろに「（ぬか床名）」を添える
        let bedDisplay = item.bedName ? ` <span style="font-size: 0.8rem; color: #8c7462; font-weight: normal;">「${item.bedName}」</span>` : '';

        return `
        <div class="history-item-wrapper">
            <div class="history-delete-action" onclick="promptRemoveVegHistory(${item.id})">削除</div>
            <div class="veg-history-card history-card-content">
                <div class="veg-history-header">
                    <div class="veg-history-title">
                        <span>${item.icon}</span>
                        <span>${typeBadge}${item.name}${bedDisplay}</span>
                    </div>
                    <div class="veg-history-right">
                        <span class="veg-history-time">${item.timeText ? timerSvgIcon + item.timeText : ''}</span>
                    </div>
                </div>
                <div class="veg-history-memo-box" onclick="openMemoModal(${item.id})">${item.memo ? item.memo : '<span class="no-memo">タップしてメモ・感想を入力...</span>'}</div>
            </div>
        </div>
    `;
    }).join('');

    setupHistorySwipe();
}

function openMemoModal(id) {
    const target = vegHistory.find(item => item.id === id);
    if (!target) return;

    currentMemoId = id;
    const input = document.getElementById('memo-input');

    if (input) input.value = target.memo || '';
    openModal('memo-modal');
}

function promptRemoveVegHistory(id) {
    const target = vegHistory.find(item => item.id === id);
    if (!target) return;

    pendingRemoveVegHistoryId = id;

    const confirmTitle = document.getElementById('remove-modal-title');
    const confirmText = document.getElementById('remove-modal-msg');
    const confirmSubmitBtn = document.getElementById('remove-modal-submit');

    if (confirmTitle) confirmTitle.textContent = "履歴の削除";
    if (confirmText) confirmText.textContent = `「${target.name}」の履歴を本当に削除しますか？`;
    if (confirmSubmitBtn) confirmSubmitBtn.textContent = "削除";

    openModal('remove-modal');
}

function promptRemoveActivityHistory(id) {
    const target = activityHistory.find(item => item.id === id);
    if (!target) return;

    pendingRemoveActivityHistoryId = id;

    const confirmTitle = document.getElementById('remove-modal-title');
    const confirmText = document.getElementById('remove-modal-msg');
    const confirmSubmitBtn = document.getElementById('remove-modal-submit');

    if (confirmTitle) confirmTitle.textContent = "履歴の削除";
    if (confirmText) confirmText.textContent = `この履歴を本当に削除しますか？`;
    if (confirmSubmitBtn) confirmSubmitBtn.textContent = "削除";

    openModal('remove-modal');
}


// ==========================================
// 7. カレンダー & 履歴機能
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
        const hasRemove = dayLogs.some(l => l.text.includes('取り出し') || l.icon === '🥕');
        const hasMix = dayLogs.some(l => l.icon === '👋🏼' || l.text.includes('かき混ぜ'));
        const hasAddNuka = dayLogs.some(l => l.icon === '🌾' || l.text.includes('足しぬか'));
        const hasWater = dayLogs.some(l => l.icon === '🚰' || l.text.includes('水抜き'));

        if (hasRemove) uniqueIcons.push('🥕');
        if (hasMix) uniqueIcons.push('👋🏼');
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

const calendarSvgIcon = `
<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px; color: #8c7462;">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
</svg>
`;

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

    if (title) title.innerHTML = `${calendarSvgIcon} ${displayDate} の履歴`;

    if (logs.length === 0) {
        container.innerHTML = '<p style="font-size: 0.8rem; color: #8c7462; text-align: center; padding: 10px 0;">この日の記録はありません。</p>';
        return;
    }

    container.innerHTML = logs.map(item => `
       <div class="history-item-wrapper">
            <div class="history-delete-action" onclick="promptRemoveActivityHistory(${item.id})">削除</div>
            <div class="history-item history-card-content">
                <span class="history-icon">${item.icon}</span>
                <div class="history-content">
                    <div class="history-text">${item.text}</div>
                    <div class="history-date">${item.fullDate}</div>
                </div>
            </div>
        </div>
    `).join('');

    setupHistorySwipe();
}


// ==========================================
// 8. イベントリスナー登録 & 初期化
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    let touchStartY = 0;
    let isPulling = false;
    const ptrElement = document.getElementById('pull-to-refresh');

    if (ptrElement) {
        window.addEventListener('touchstart', (e) => {
            if (isAnyModalOpen()) return;

            const activePage = document.querySelector('.page-content:not(.hidden)');
            const scrollTop = activePage ? activePage.scrollTop : 0;

            if (scrollTop <= 0) {
                touchStartY = e.touches[0].clientY;
                isPulling = true;
            } else {
                isPulling = false;
            }
        }, { passive: true });

        window.addEventListener('touchmove', (e) => {
            if (isAnyModalOpen() || !isPulling) return;

            const touchY = e.touches[0].clientY;
            const diffY = touchY - touchStartY;

            if (diffY > 0) {
                const pullDistance = Math.min(diffY * 0.4, 60);
                ptrElement.style.transform = `translateY(${pullDistance}px)`;

                if (pullDistance > 45) {
                    ptrElement.querySelector('.pull-text').textContent = '指を離して更新';
                } else {
                    ptrElement.querySelector('.pull-text').textContent = '下に引っ張って更新';
                }
            }
        }, { passive: true });

        window.addEventListener('touchend', (e) => {
            if (isAnyModalOpen() || !isPulling) return;
            isPulling = false;

            const touchEndY = e.changedTouches[0].clientY;
            const diffY = touchEndY - touchStartY;

            if (diffY > 110) {
                ptrElement.classList.add('refreshing');
                ptrElement.style.transform = `translateY(50px)`;
                ptrElement.querySelector('.pull-text').textContent = '更新中';

                setTimeout(() => {
                    location.reload();
                }, 400);
            } else {
                ptrElement.style.transform = `translateY(0px)`;
            }
        });
    }

    loadData();
    loadPresets();

    updateClock();
    setInterval(updateClock, 1000);
    renderPresets();
    updateNukaDisplay(currentIndex);
    renderCalendar();
    renderDayHistory(getFormattedDateTime().dateOnly);
    renderVegHistory();
    updateHomeCareDisplay();

    const navItems = document.querySelectorAll('.nav-item');
    const pages = [
        document.getElementById('home-page'),
        document.getElementById('history-page'),
        document.getElementById('calendar-page')
    ];

    navItems.forEach((item, index) => {
        item.addEventListener('click', () => {
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            pages.forEach(page => page?.classList.add('hidden'));
            if (pages[index]) pages[index].classList.remove('hidden');

            localStorage.setItem('activeTabIndex', index);
        });
    });

    // ==========================================
    // 画面全体の左右スワイプによるタブ切り替え機能
    // ==========================================
    const mainContent = document.querySelector('.main-content');

    if (mainContent && typeof navItems !== 'undefined' && navItems.length > 0) {
        let tabStartX = 0;
        let tabStartY = 0;
        let isTabSwiping = false;

        mainContent.addEventListener('touchstart', (e) => {
            // モーダルが開いている時や、ボタン・入力欄などのタッチは除外
            if (isAnyModalOpen() || e.target.closest('button') || e.target.closest('input') || e.target.closest('textarea')) {
                isTabSwiping = false;
                return;
            }
            tabStartX = e.touches[0].clientX;
            tabStartY = e.touches[0].clientY;
            isTabSwiping = true;
        }, { passive: true });

        mainContent.addEventListener('touchmove', (e) => {
            if (!isTabSwiping) return;
            const currentX = e.touches[0].clientX;
            const currentY = e.touches[0].clientY;

            // 指を斜めではなく、しっかりと「横方向」に動かしているか判定
            const diffX = currentX - tabStartX;
            const diffY = currentY - tabStartY;
            if (Math.abs(diffY) > Math.abs(diffX)) {
                isTabSwiping = false; // 縦スクロールの意図であればスワイプをキャンセル
            }
        }, { passive: true });

        mainContent.addEventListener('touchend', (e) => {
            if (!isTabSwiping) return;
            isTabSwiping = false;

            const tabEndX = e.changedTouches[0].clientX;
            const diffX = tabEndX - tabStartX;

            // 一定以上（70px以上）横にスワイプされた場合
            if (Math.abs(diffX) > 70) {
                // 現在アクティブなタブの番号を探す
                let activeIndex = 0;
                navItems.forEach((item, index) => {
                    if (item.classList.contains('active')) {
                        activeIndex = index;
                    }
                });

                if (diffX > 0) {
                    // 右にスワイプ ➔ 左のタブへ（ホーム ➔ カレンダー ➔ ぬか漬け記録...のループまたは順序）
                    // 順番: ホーム(0) -> ぬか漬け記録(1) -> カレンダー(2)
                    activeIndex = (activeIndex - 1 + navItems.length) % navItems.length;
                } else {
                    // 左にスワイプ ➔ 右のタブへ
                    activeIndex = (activeIndex + 1) % navItems.length;
                }

                // 該当するタブのクリック処理を走らせて画面を切り替える
                navItems[activeIndex].click();
            }
        });
    }

    const savedTabIndex = localStorage.getItem('activeTabIndex');
    if (savedTabIndex !== null && navItems[savedTabIndex]) {
        navItems[savedTabIndex].click();
    }

    document.getElementById('prev-btn')?.addEventListener('click', () => {
        currentIndex = (currentIndex - 1 + nukaBeds.length) % nukaBeds.length;
        updateNukaDisplay(currentIndex);
    });

    document.getElementById('next-btn')?.addEventListener('click', () => {
        currentIndex = (currentIndex + 1) % nukaBeds.length;
        updateNukaDisplay(currentIndex);
    });


    // ぬか床エリア全体の指追従スワイプ切り替え

    const homePage = document.getElementById('home-page');
    // ホーム画面のカード全体をスワイプ対象にする
    const targetCard = homePage ? homePage.querySelector('.card') : null;

    if (homePage && targetCard) {
        let touchStartX = 0;
        let currentX = 0;
        let isSwiping = false;

        targetCard.addEventListener('touchstart', (e) => {
            // カレンダーやボタン、入力欄などのインタラクティブな要素でなければスワイプを開始
            if (e.target.closest('button') || e.target.closest('.vegetable-list')) {
                return;
            }
            touchStartX = e.touches[0].clientX;
            isSwiping = true;
            targetCard.style.transition = 'none'; // 指に完全追従させるためアニメーションをオフ
        }, { passive: true });

        targetCard.addEventListener('touchmove', (e) => {
            if (!isSwiping) return;
            currentX = e.touches[0].clientX;
            const diffX = currentX - touchStartX;

            // カード全体を指の動きに合わせて左右に動かす
            targetCard.style.transform = `translateX(${diffX}px)`;
        }, { passive: true });

        targetCard.addEventListener('touchend', (e) => {
            if (!isSwiping) return;
            isSwiping = false;

            const touchEndX = e.changedTouches[0].clientX;
            const diffX = touchEndX - touchStartX;

            targetCard.style.transition = 'transform 0.25s ease';

            if (Math.abs(diffX) > 70) {
                // 一定以上スワイプされた場合：カードを画面の外へシュッと飛ばす
                const flyOutX = diffX > 0 ? 350 : -350;
                targetCard.style.transform = `translateX(${flyOutX}px)`;

                setTimeout(() => {
                    // ぬか床の切り替え
                    if (diffX > 0) {
                        currentIndex = (currentIndex - 1 + nukaBeds.length) % nukaBeds.length;
                    } else {
                        currentIndex = (currentIndex + 1) % nukaBeds.length;
                    }
                    updateNukaDisplay(currentIndex);

                    // 次のぬか床のカードを反対側からスッと登場させる
                    targetCard.style.transition = 'none';
                    targetCard.style.transform = diffX > 0 ? 'translateX(-350px)' : 'translateX(350px)';

                    setTimeout(() => {
                        targetCard.style.transition = 'transform 0.25s ease';
                        targetCard.style.transform = 'translateX(0px)';
                    }, 20);
                }, 200);
            } else {
                // スワイプが足りない場合は元の位置に戻す
                targetCard.style.transform = `translateX(0px)`;
            }
        });
    }

    document.getElementById('home-btn-mix')?.addEventListener('click', () => {
        openModal('mix-confirm-modal');
    });

    document.getElementById('mix-modal-submit')?.addEventListener('click', () => {
        const now = new Date();
        const currentBed = nukaBeds[currentIndex];
        let elapsedText = '';

        if (currentBed.lastMixTime) {
            const diffMs = now - new Date(currentBed.lastMixTime);
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            elapsedText = `前回から ${diffHours}時間`;
        }

        currentBed.lastMixTime = now;

        // カレンダー用のログ追加
        addHistoryLog('👋🏼', `「${currentBed.name}」をかき混ぜました<br>${elapsedText ? '（' + elapsedText + '）' : ''}`);

        // ぬか漬け記録（履歴・メモ）用のデータ追加
        vegHistory.unshift({
            id: Date.now(),
            name: 'かき混ぜ',
            icon: '👋🏼',
            isSute: false,
            timeText: elapsedText,
            dateStr: getFormattedDateTime().full,
            memo: '',
            bedName: currentBed.name
        });

        updateHomeCareDisplay();
        renderVegHistory();
        saveData();
        closeModal('mix-confirm-modal');
    });

    document.getElementById('mix-modal-cancel')?.addEventListener('click', () => {
        closeModal('mix-confirm-modal');
    });

    document.getElementById('home-btn-add-nuka')?.addEventListener('click', () => {
        openModal('care-modal');
    });

    document.getElementById('care-modal-submit')?.addEventListener('click', () => {
        const nukaG = document.getElementById('input-nuka')?.value || 100;
        const saltG = document.getElementById('input-salt')?.value || 8.0;
        const currentBedName = nukaBeds[currentIndex].name;

        // カレンダー用のログ追加
        addHistoryLog('🌾', `足しぬか（ぬか: ${nukaG}g / 塩: ${saltG}g）<br>「${currentBedName}」`);

        // ぬか漬け記録（履歴・メモ）用のデータ追加
        vegHistory.unshift({
            id: Date.now(),
            name: `足しぬか（ぬか:${nukaG}g / 塩:${saltG}g）`,
            icon: '🌾',
            isSute: false,
            timeText: '',
            dateStr: getFormattedDateTime().full,
            memo: '',
            bedName: currentBedName
        });

        renderVegHistory();
        saveData();
        closeModal('care-modal');
    });

    document.getElementById('care-modal-cancel')?.addEventListener('click', () => {
        closeModal('care-modal');
    });

    const potSvg = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="10.5" y="2" width="3" height="2.5" rx="0.5"></rect><ellipse cx="12" cy="5.5" rx="6.5" ry="1.5"></ellipse><path d="M5.5 8 C4.5 12 4.5 16 7.5 19 C9.5 21 14.5 21 16.5 19 C19.5 16 19.5 12 18.5 8 Z"></path></svg>`;

    document.getElementById('add-normal-btn')?.addEventListener('click', () => {
        isSuteMode = false;
        resetAddModal();
        const modalTitle = document.getElementById('modal-title');
        if (modalTitle) {
            modalTitle.innerHTML = `<span id="modal-icon-container" class="modal-title-icon">${potSvg}</span> 本漬けする食材を選ぶ`;
        }
        openModal('add-modal');
    });

    document.getElementById('add-sute-btn')?.addEventListener('click', () => {
        isSuteMode = true;
        resetAddModal();
        const modalTitle = document.getElementById('modal-title');
        if (modalTitle) {
            modalTitle.innerHTML = `捨て漬けする食材を選ぶ`;
        }
        openModal('add-modal');
    });

    document.getElementById('close-add-modal')?.addEventListener('click', () => {
        closeModal('add-modal');
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

    const removeSubmitBtn = document.getElementById('remove-modal-submit');
    if (removeSubmitBtn) {
        removeSubmitBtn.replaceWith(removeSubmitBtn.cloneNode(true));
        document.getElementById('remove-modal-submit')?.addEventListener('click', () => {
            if (pendingRemoveVegHistoryId !== null) {
                vegHistory = vegHistory.filter(item => item.id !== pendingRemoveVegHistoryId);
                renderVegHistory();
                saveData();
                closeModal('remove-modal');
                pendingRemoveVegHistoryId = null;
            } else if (pendingRemoveActivityHistoryId !== null) {
                activityHistory = activityHistory.filter(item => item.id !== pendingRemoveActivityHistoryId);
                renderCalendar();
                renderDayHistory(selectedDateStr);
                saveData();
                closeModal('remove-modal');
                pendingRemoveActivityHistoryId = null;
            } else {
                executeRemoveVegetable();
            }
        });
    }

    document.getElementById('remove-modal-cancel')?.addEventListener('click', () => {
        closeModal('remove-modal');
        pendingRemoveIndex = null;
        pendingRemoveVegHistoryId = null;
        pendingRemoveActivityHistoryId = null;
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

        closeModal('memo-modal');
        currentMemoId = null;
    });

    document.getElementById('memo-modal-cancel')?.addEventListener('click', () => {
        closeModal('memo-modal');
        currentMemoId = null;
    });

    function exportVegHistoryToCSV() {
        if (!vegHistory || vegHistory.length === 0) {
            alert("書き出す履歴データがまだありません。");
            return;
        }

        // 列順: ID, 日時, アイコン, 区分, 項目, ぬか床名, メモ・感想
        let csvContent = "\uFEFF" + "ID,取り出し日時,アイコン,区分,項目,ぬか床名,メモ・感想\n";

        vegHistory.forEach(item => {
            const id = item.id;
            const dateStr = `"${(item.dateStr || "").replace(/"/g, '""')}"`;
            const icon = `"${(item.icon || "").replace(/"/g, '""')}"`;

            // 区分：かき混ぜ・足しぬかの場合は空欄、食材（本漬け/捨漬け）のときのみ表示
            let typeStr = "";
            if (item.name !== 'かき混ぜ' && (!item.name || !item.name.startsWith('足しぬか'))) {
                typeStr = item.isSute ? "捨漬け" : "本漬け";
            }
            const typeVal = `"${typeStr}"`;

            const name = `"${(item.name || "").replace(/"/g, '""')}"`;
            const bedName = `"${(item.bedName || "").replace(/"/g, '""')}"`;
            const memo = `"${(item.memo || "").replace(/"/g, '""')}"`;

            csvContent += `${id},${dateStr},${icon},${typeVal},${name},${bedName},${memo}\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');

        link.setAttribute("href", url);
        link.setAttribute("download", `nukazuke_history_${y}${m}${d}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    document.getElementById('export-csv-btn')?.addEventListener('click', exportVegHistoryToCSV);
});

// ==========================================
// 9. 左スライド削除操作用関数
// ==========================================

function setupHistorySwipe() {
    const wrappers = document.querySelectorAll('.history-item-wrapper');

    wrappers.forEach(wrapper => {
        const content = wrapper.querySelector('.history-card-content');
        if (!content) return;

        let startX = 0;
        let currentX = 0;
        let isSwiping = false;

        content.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            isSwiping = true;
            wrappers.forEach(w => {
                if (w !== wrapper) w.classList.remove('swiped');
            });
        }, { passive: true });

        content.addEventListener('touchmove', (e) => {
            if (!isSwiping) return;
            currentX = e.touches[0].clientX;
            const diffX = currentX - startX;

            if (diffX < -30) {
                wrapper.classList.add('swiped');
            } else if (diffX > 30) {
                wrapper.classList.remove('swiped');
            }
        }, { passive: true });

        content.addEventListener('touchend', () => {
            isSwiping = false;
        });
    });
}