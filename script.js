// ==========================================
// 1. 状態管理データ＆初期データ
// ==========================================

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

let currentIndex = 0;

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
let vegHistory = [];
let activityHistory = [];
let lastMixTime = null;
let isSuteMode = false;
let pendingRemoveIndex = null;
let currentMemoId = null;

let currentCalDate = new Date();
let selectedDateStr = "";
let pendingRemoveVegHistoryId = null; // 削除対象の履歴IDを保持


// ==========================================
// 2. データの保存・読み込み (localStorage)
// ==========================================

function saveData() {
    localStorage.setItem('nukaBedsData', JSON.stringify(nukaBeds));
    localStorage.setItem('activityHistoryData', JSON.stringify(activityHistory));
    localStorage.setItem('vegHistoryData', JSON.stringify(vegHistory));
    localStorage.setItem('lastMixTimeData', lastMixTime || '');
}

function loadData() {
    const savedBeds = localStorage.getItem('nukaBedsData');
    const savedHistory = localStorage.getItem('activityHistoryData');
    const savedVegHistory = localStorage.getItem('vegHistoryData');
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
    // 修正：保存されていたかき混ぜ時間を正しくDate型に変換する
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
// 3. 日時・時間計算の共通関数（上下改行対応）
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

    if (lastMixTime) {
        const now = new Date();
        const diffMs = now - new Date(lastMixTime);
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
                ${preset.icon} ${preset.name}
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

    const isSuteText = veg.isSute ? '【捨漬け】' : '';
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
            <!-- 編集モード時の右上の削除ボタン -->
            <div class="veg-history-controls">
                <button class="veg-history-del-btn" data-id="${item.id}" title="削除">×</button>
            </div>
            <div class="veg-history-header">
                <div class="veg-history-title">
                    <span>${item.icon}</span>
                    <span>${item.isSute ? '【捨漬け】' : ''}${item.name}</span>
                </div>
                <div class="veg-history-right">
                    <span class="veg-history-time">${item.timeText ? '⏱ ' + item.timeText : ''}</span>
                </div>
            </div>
            <div class="veg-history-memo-box" onclick="openMemoModal(${item.id})">${item.memo ? item.memo : '<span class="no-memo">タップしてメモ・感想を入力...</span>'}</div>
        </div>
    `).join('');

    // 生成されたバツボタンに削除確認モーダルを開くイベントを付与
    container.querySelectorAll('.veg-history-del-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id, 10);
            promptRemoveVegHistory(id);
        });
    });
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

function promptRemoveVegHistory(id) {
    const target = vegHistory.find(item => item.id === id);
    if (!target) return;

    pendingRemoveVegHistoryId = id;

    const confirmModal = document.getElementById('remove-modal');
    const confirmTitle = document.getElementById('remove-modal-title');
    const confirmText = document.getElementById('remove-modal-msg');

    if (confirmTitle) confirmTitle.textContent = "履歴の削除";
    if (confirmText) confirmText.textContent = `「${target.name}」の履歴を本当に削除しますか？`;
    if (confirmModal) confirmModal.classList.remove('hidden');
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
        const hasRemove = dayLogs.some(l => l.text.includes('取り出しました') || l.icon === '🥕');
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
// 8. イベントリスナー登録 & 初期化
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // 引っ張って更新
    let touchStartY = 0;
    let isPulling = false;
    const ptrElement = document.getElementById('pull-to-refresh');
    const mainContainer = document.querySelector('.main-content');

    if (ptrElement && mainContainer) {
        window.addEventListener('touchstart', (e) => {
            if (mainContainer.scrollTop === 0) {
                touchStartY = e.touches[0].clientY;
                isPulling = true;
            } else {
                isPulling = false;
            }
        }, { passive: true });

        window.addEventListener('touchmove', (e) => {
            if (!isPulling) return;
            const touchY = e.touches[0].clientY;
            const diffY = touchY - touchStartY;

            if (diffY > 0 && mainContainer.scrollTop === 0) {
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
            if (!isPulling) return;
            isPulling = false;

            const touchEndY = e.changedTouches[0].clientY;
            const diffY = touchEndY - touchStartY;

            if (diffY > 110 && mainContainer.scrollTop === 0) {
                ptrElement.classList.add('refreshing');
                ptrElement.style.transform = `translateY(50px)`;
                ptrElement.querySelector('.pull-text').textContent = '更新中...';

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

    // 3タブ構成のナビゲーション切り替え
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
        });
    });

    // ぬか床スライド切替
    document.getElementById('prev-btn')?.addEventListener('click', () => {
        currentIndex = (currentIndex - 1 + nukaBeds.length) % nukaBeds.length;
        updateNukaDisplay(currentIndex);
    });

    document.getElementById('next-btn')?.addEventListener('click', () => {
        currentIndex = (currentIndex + 1) % nukaBeds.length;
        updateNukaDisplay(currentIndex);
    });

    // ホーム画面のかき混ぜボタン（モーダルを開く）
    document.getElementById('home-btn-mix')?.addEventListener('click', () => {
        document.getElementById('mix-confirm-modal')?.classList.remove('hidden');
    });

    // かき混ぜ確認モーダルの「混ぜた」ボタン
    document.getElementById('mix-modal-submit')?.addEventListener('click', () => {
        addHistoryLog('👋🏼', 'ぬか床をかき混ぜました');
        lastMixTime = new Date();
        updateHomeCareDisplay();
        document.getElementById('mix-confirm-modal')?.classList.add('hidden');
    });

    // かき混ぜ確認モーダルの「キャンセル」ボタン
    document.getElementById('mix-modal-cancel')?.addEventListener('click', () => {
        document.getElementById('mix-confirm-modal')?.classList.add('hidden');
    });

    // ホーム画面のお手入れボタン（足しぬか）
    document.getElementById('home-btn-add-nuka')?.addEventListener('click', () => {
        document.getElementById('care-modal')?.classList.remove('hidden');
    });

    // 足しぬかモーダルの決定
    document.getElementById('care-modal-submit')?.addEventListener('click', () => {
        const nukaG = document.getElementById('input-nuka')?.value || 100;
        const saltG = document.getElementById('input-salt')?.value || 8.0;
        addHistoryLog('🌾', `足しぬか（ぬか: ${nukaG}g / 塩: ${saltG}g）`);
        document.getElementById('care-modal')?.classList.add('hidden');
    });

    document.getElementById('care-modal-cancel')?.addEventListener('click', () => {
        document.getElementById('care-modal')?.classList.add('hidden');
    });

    // 食材追加モーダル関連
    document.getElementById('add-normal-btn')?.addEventListener('click', () => {
        isSuteMode = false;
        resetAddModal();
        const modalTitle = document.getElementById('modal-title');
        if (modalTitle) modalTitle.textContent = "🥕 本漬けする食材を選ぶ";
        document.getElementById('add-modal')?.classList.remove('hidden');
    });

    // ぬか漬け履歴タブのゴミ箱アイコン切替
    document.getElementById('btn-toggle-edit-veg-history')?.addEventListener('click', () => {
        const historyList = document.getElementById('veg-history-list');
        const trashBtn = document.getElementById('btn-toggle-edit-veg-history');

        historyList?.classList.toggle('edit-mode');
        trashBtn?.classList.toggle('active');
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

    // 履歴削除と食材取り出しの分岐
    const removeSubmitBtn = document.getElementById('remove-modal-submit');
    removeSubmitBtn.replaceWith(removeSubmitBtn.cloneNode(true));
    document.getElementById('remove-modal-submit')?.addEventListener('click', () => {
        if (pendingRemoveVegHistoryId !== null) {
            // ぬか漬け履歴の削除処理
            vegHistory = vegHistory.filter(item => item.id !== pendingRemoveVegHistoryId);
            renderVegHistory();
            saveData();

            document.getElementById('remove-modal')?.classList.add('hidden');
            pendingRemoveVegHistoryId = null;

            // 削除後も編集モードを維持
            document.getElementById('veg-history-list')?.classList.add('edit-mode');
            document.getElementById('btn-toggle-edit-veg-history')?.classList.add('active');
        } else {
            // 食材の取り出し処理
            executeRemoveVegetable();
        }
    });

    document.getElementById('remove-modal-cancel')?.addEventListener('click', () => {
        document.getElementById('remove-modal')?.classList.add('hidden');
        pendingRemoveIndex = null;
        pendingRemoveVegHistoryId = null;
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