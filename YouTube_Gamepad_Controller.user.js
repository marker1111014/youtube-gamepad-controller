// ==UserScript==
// @name         YouTube 手把控制器 (防呆回退版)
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  支援藍芽/2.4G無線手把、多手把自動切換、相容 Switch Pro 與 Xbox、防呆回退與全頁面影片導航。
// @author       Mark
// @match        *://*.youtube.com/*
// @grant        none
// @run-at       document-end
// @license      MIT
// @downloadURL  https://update.greasyfork.org/scripts/573036/YouTube%20%E6%89%8B%E6%8A%8A%E6%8E%A7%E5%88%B6%E5%99%A8%20%28%E9%98%B2%E5%91%86%E5%9B%9E%E9%80%80%E7%89%88%29.user.js
// @updateURL    https://update.greasyfork.org/scripts/573036/YouTube%20%E6%89%8B%E6%8A%8A%E6%8E%A7%E5%88%B6%E5%99%A8%20%28%E9%98%B2%E5%91%86%E5%9B%9E%E9%80%80%E7%89%88%29.meta.js
// ==/UserScript==

(function() {
    'use strict';

    if (window.top !== window.self) return;

    // ==========================================
    // ⚙️ 用戶設定區 ⚙️
    // ==========================================
    const SHOW_OSD_TOAST = true;       // 是否顯示操作/連線浮動提示 (推薦開啟)
    const ENABLE_DEBUG_WINDOW = false;  // 是否開啟常駐即時除錯視窗 (綠字終端機風格)
    const INPUT_COOLDOWN_MS = 220;      // 按鍵觸發冷卻時間 (毫秒)
    const SKIP_TIME_RT = 10;           // RT 快進 10 秒
    const SKIP_TIME_LT = -10;          // LT 倒退 10 秒
    const UI_HIDE_DELAY_MS = 3000;     // 控制列自動隱藏延遲
    const ROW_SIZE = 4;                // 首頁每行視頻數量估算值
    // ==========================================

    console.log("[手把腳本] 腳本 v3.0 已啟動 (已增強藍芽與 2.4G 多手把相容支援)...");

    let selectedIndex = 0;
    let items = [];
    let lastInputTime = 0;
    let autohideTimeout = null;
    let toastTimeout = null;
    let toastElement = null;
    let debugBox = null;
    let lastActivePadId = '';

    // ==========================================
    // 🎨 UI 提示與除錯工具
    // ==========================================
    function getToastElement() {
        if (toastElement) return toastElement;
        try {
            let container = document.getElementById('gamepad-toast-container');
            if (!container) {
                container = document.createElement('div');
                container.id = 'gamepad-toast-container';
                container.style.cssText = `
                    position: fixed !important;
                    bottom: 30px !important;
                    right: 30px !important;
                    z-index: 2147483647 !important;
                    pointer-events: none !important;
                    display: flex !important;
                    flex-direction: column !important;
                    align-items: flex-end !important;
                    gap: 8px !important;
                `;
                document.body.appendChild(container);
            }

            const toast = document.createElement('div');
            toast.style.cssText = `
                background: rgba(18, 18, 18, 0.92);
                color: #ffffff;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                font-size: 14px;
                font-weight: 500;
                padding: 10px 18px;
                border-radius: 10px;
                border: 1px solid rgba(255, 255, 255, 0.15);
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5), 0 0 12px rgba(255, 50, 50, 0.3);
                opacity: 0;
                transform: translateY(12px) scale(0.96);
                transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                white-space: pre-line;
                line-height: 1.4;
            `;
            container.appendChild(toast);
            toastElement = toast;
            return toast;
        } catch (e) {
            return null;
        }
    }

    function showToast(message, durationMs = 2200) {
        if (!SHOW_OSD_TOAST) return;
        const el = getToastElement();
        if (!el) return;

        el.textContent = message;
        el.style.opacity = '1';
        el.style.transform = 'translateY(0) scale(1)';

        if (toastTimeout) clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(12px) scale(0.96)';
        }, durationMs);
    }

    function getOrInitDebugBox() {
        if (!ENABLE_DEBUG_WINDOW) return null;
        try {
            let container = document.getElementById('gamepad-debug-container');
            if (container && container.shadowRoot) return container.shadowRoot.getElementById('debug-box');
            if (!document.body) return null;

            container = document.createElement('div');
            container.id = 'gamepad-debug-container';
            container.style.cssText = 'position:fixed!important;bottom:20px!important;left:20px!important;z-index:2147483647!important;pointer-events:none!important;';

            const shadow = container.attachShadow({ mode: 'open' });
            const box = document.createElement('div');
            box.id = 'debug-box';
            box.style.cssText = `
                padding: 14px 18px;
                background-color: rgba(5, 10, 5, 0.92);
                color: #00FF66;
                font-family: Consolas, Monaco, "Courier New", monospace;
                font-size: 13px;
                border-radius: 8px;
                border: 2px solid #00FF66;
                box-shadow: 0 0 15px rgba(0, 255, 102, 0.4);
                white-space: pre-wrap;
                line-height: 1.5;
            `;
            box.textContent = '手把狀態: 正在等待按鍵喚醒...';

            shadow.appendChild(box);
            document.body.appendChild(container);
            return box;
        } catch (error) {
            console.error("[手把腳本] 建立視窗錯誤:", error);
            return null;
        }
    }

    function updateDebug(msg) {
        if (!ENABLE_DEBUG_WINDOW) return;
        debugBox = getOrInitDebugBox();
        if (debugBox) debugBox.textContent = msg;
    }

    // ==========================================
    // 🎯 YouTube DOM 元素選取與高亮
    // ==========================================
    function isInputFocused() {
        const el = document.activeElement;
        if (!el) return false;
        const tag = el.tagName.toLowerCase();
        return tag === 'input' || tag === 'textarea' || el.isContentEditable || el.getAttribute('role') === 'textbox';
    }

    function updateItems() {
        // 擴充選取器：支援首頁、搜尋結果頁、頻道頁、播放清單、以及播放頁面側欄
        const rawItems = document.querySelectorAll(
            'ytd-rich-item-renderer:not([is-dismissed]), ' +
            'ytd-compact-video-renderer:not([is-dismissed]), ' +
            'ytd-video-renderer:not([is-dismissed]), ' +
            'ytd-grid-video-renderer:not([is-dismissed]), ' +
            'ytd-playlist-video-renderer:not([is-dismissed])'
        );
        items = Array.from(rawItems).filter(el => {
            return el.offsetParent !== null && el.getBoundingClientRect().height > 40;
        });
    }

    function highlightSelection() {
        if (items.length === 0) return;
        if (selectedIndex < 0) selectedIndex = 0;
        if (selectedIndex >= items.length) selectedIndex = items.length - 1;

        items.forEach(el => {
            el.style.outline = 'none';
            el.style.transform = 'scale(1)';
            el.style.zIndex = '';
            el.style.boxShadow = 'none';
            if (el.gamepadPulseAnimation) {
                el.gamepadPulseAnimation.cancel();
                el.gamepadPulseAnimation = null;
            }
        });

        const currentItem = items[selectedIndex];
        if (currentItem) {
            currentItem.style.outline = '4px solid #ff3333';
            currentItem.style.outlineOffset = '-4px';
            currentItem.style.borderRadius = '12px';
            currentItem.style.zIndex = '100';

            currentItem.gamepadPulseAnimation = currentItem.animate([
                { transform: 'scale(1.02)', boxShadow: '0 0 15px 3px rgba(255, 50, 50, 0.4)' },
                { transform: 'scale(1.04)', boxShadow: '0 0 30px 10px rgba(255, 50, 50, 0.9)' },
                { transform: 'scale(1.02)', boxShadow: '0 0 15px 3px rgba(255, 50, 50, 0.4)' }
            ], { duration: 1500, iterations: Infinity, easing: 'ease-in-out' });

            if (!window.location.pathname.includes('/watch')) {
                currentItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }

    function move(direction) {
        updateItems();
        if (items.length === 0) return;
        switch (direction) {
            case 'right': selectedIndex++; break;
            case 'left': selectedIndex--; break;
            case 'down': selectedIndex += ROW_SIZE; break;
            case 'up': selectedIndex -= ROW_SIZE; break;
        }
        highlightSelection();
    }

    function clickVideo() {
        if (items.length === 0 || !items[selectedIndex]) return;
        const currentItem = items[selectedIndex];
        const link = currentItem.querySelector('a#video-title-link') ||
                     currentItem.querySelector('a#thumbnail') ||
                     currentItem.querySelector('a#video-title') ||
                     currentItem.querySelector('a.ytd-thumbnail') ||
                     currentItem.querySelector('a[href*="/watch"]');

        if (link && link.href) {
            showToast('🎬 正在開啟影片...');
            link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
            const currentUrl = window.location.href;
            setTimeout(() => { if (window.location.href === currentUrl) window.location.href = link.href; }, 300);
            updateDebug(`正在讀取...\n${link.href}`);
        }
    }

    // ==========================================
    // 🎬 播放器控制邏輯
    // ==========================================
    function wakeUpPlayerUI() {
        const player = document.querySelector('.html5-video-player');
        const video = document.querySelector('video');

        if (player) {
            player.classList.remove('ytp-autohide');
            if (autohideTimeout) clearTimeout(autohideTimeout);
            autohideTimeout = setTimeout(() => {
                if (video && !video.paused) {
                    player.classList.add('ytp-autohide');
                }
            }, UI_HIDE_DELAY_MS);
        }
    }

    function togglePlayPause() {
        const video = document.querySelector('video');
        if (video) {
            if (video.paused) {
                video.play();
                showToast('▶️ 播放中');
                updateDebug('狀態: ▶️ 播放中');
            } else {
                video.pause();
                showToast('⏸️ 已暫停');
                updateDebug('狀態: ⏸️ 已暫停');
            }
            wakeUpPlayerUI();
        }
    }

    function goHome() {
        if (window.location.pathname !== '/') {
            showToast('🏠 回到 YouTube 首頁');
            updateDebug('正在回到首頁...');
            window.location.href = '/';
        }
    }

    function goBack() {
        showToast('↩️ 返回上一頁');
        updateDebug('正在返回上一頁...');
        window.history.back();
    }

    function toggleFullscreen() {
        const fullscreenBtn = document.querySelector('.ytp-fullscreen-button');
        if (fullscreenBtn) {
            wakeUpPlayerUI();
            fullscreenBtn.click();
            showToast('🔲 切換全螢幕');
            updateDebug('狀態: 🔲 切換全螢幕');
        } else {
            const player = document.querySelector('#movie_player') || document.querySelector('.html5-video-player');
            if (player && typeof player.toggleFullscreen === 'function') {
                player.toggleFullscreen();
                showToast('🔲 切換全螢幕');
            }
        }
    }

    function toggleSubtitles() {
        const subtitleBtn = document.querySelector('.ytp-subtitles-button');
        if (subtitleBtn) {
            wakeUpPlayerUI();
            subtitleBtn.click();
            showToast('📝 切換字幕');
            updateDebug('狀態: 📝 切換字幕');
        }
    }

    function skipTime(seconds) {
        const video = document.querySelector('video');
        if (video) {
            video.currentTime = Math.max(0, Math.min(video.duration || Infinity, video.currentTime + seconds));
            const actionText = seconds > 0 ? `⏩ 快進 +${Math.abs(seconds)} 秒` : `⏪ 倒退 -${Math.abs(seconds)} 秒`;
            showToast(actionText);
            updateDebug(`狀態: ${actionText}`);
            wakeUpPlayerUI();
        } else {
            updateDebug('錯誤: 畫面上沒有找到影片');
        }
    }

    // ==========================================
    // 🎮 手把解析與相容性標準化核心
    // ==========================================
    /**
     * 安全讀取按鍵狀態 (支援數字壓感與 bool)
     */
    function isBtnPressed(pad, index) {
        if (!pad || !pad.buttons || !pad.buttons[index]) return false;
        const b = pad.buttons[index];
        return b.pressed || b.value > 0.45;
    }

    /**
     * 安全讀取類比軸
     */
    function getAxis(pad, index) {
        if (!pad || !pad.axes || typeof pad.axes[index] !== 'number') return 0;
        return pad.axes[index];
    }

    /**
     * 將各廠牌手把 (Xbox, Switch Pro, 2.4G 接收器, DirectInput) 的訊號轉換為統一操作
     */
    function parseGamepadState(pad) {
        if (!pad || !pad.connected) return null;

        // 排除非手把的鍵盤/滑鼠複合 HID 虛擬裝置 (例如按鍵數過少且無搖桿者)
        const btnCount = pad.buttons ? pad.buttons.length : 0;
        const axisCount = pad.axes ? pad.axes.length : 0;
        if (btnCount < 4 && axisCount < 2) return null;

        const id = (pad.id || '').toLowerCase();
        const isStandard = pad.mapping === 'standard';
        const isSwitch = id.includes('switch') || id.includes('pro controller') || id.includes('joy-con') || id.includes('057e');

        let confirm = false;
        let home = false;
        let back = false;
        let fullscreen = false;
        let playPause = false;
        let subtitles = false;
        let rewind = false;
        let forward = false;

        let dpadUp = false;
        let dpadDown = false;
        let dpadLeft = false;
        let dpadRight = false;

        if (isSwitch && !isStandard) {
            // === 藍芽原生連線 Switch Pro 手把 (DirectInput / Non-Standard) ===
            // 實體按鍵位置：
            // 按鈕 0 = B (下方) -> 若希望如同 Switch 原生邏輯，A (右方/按鈕 1) 為確認，B (下方/按鈕 0) 為返回/首頁
            // 為求最佳相容性：按實體 A (按鈕 1) 或實體 B (按鈕 0) 均有相應映射
            confirm = isBtnPressed(pad, 1) || isBtnPressed(pad, 0); // 支援 A / B 進入
            home = isBtnPressed(pad, 12) || isBtnPressed(pad, 0);   // Home 鍵或 B 鍵
            fullscreen = isBtnPressed(pad, 3);                      // X 鍵 (上方)
            playPause = isBtnPressed(pad, 2);                       // Y 鍵 (左方)
            back = isBtnPressed(pad, 4);                            // L 鍵
            subtitles = isBtnPressed(pad, 5);                       // R 鍵
            rewind = isBtnPressed(pad, 6) || isBtnPressed(pad, 4);  // ZL 鍵
            forward = isBtnPressed(pad, 7) || isBtnPressed(pad, 5); // ZR 鍵
        } else {
            // === 標準 Xbox / XInput / 2.4G 接收器 ===
            confirm = isBtnPressed(pad, 0);     // A 鍵
            home = isBtnPressed(pad, 1);        // B 鍵 (回到首頁)
            fullscreen = isBtnPressed(pad, 2);  // X 鍵 (全螢幕)
            playPause = isBtnPressed(pad, 3);   // Y 鍵 (播放/暫停)
            back = isBtnPressed(pad, 4);        // LB 鍵 (返回上一頁)
            subtitles = isBtnPressed(pad, 5);   // RB 鍵 (字幕)

            // LT / RT 支援按鈕及軸感應 (部分 2.4G 接收器會將扳機掛在軸上)
            rewind = isBtnPressed(pad, 6) || getAxis(pad, 2) > 0.5;
            forward = isBtnPressed(pad, 7) || getAxis(pad, 5) > 0.5;

            dpadUp = isBtnPressed(pad, 12);
            dpadDown = isBtnPressed(pad, 13);
            dpadLeft = isBtnPressed(pad, 14);
            dpadRight = isBtnPressed(pad, 15);
        }

        // === 苦力帽 (Hat Switch / POV) 相容處理 (藍芽 DirectInput 常見問題) ===
        // 部分副廠 2.4G 或藍芽手把把十字鍵映射在 axes[9] 或 axes[4]
        for (let ax of [9, 8, 4]) {
            if (pad.axes && typeof pad.axes[ax] === 'number') {
                const val = pad.axes[ax];
                if (val >= -1.05 && val <= -0.75) dpadUp = true;
                else if (val >= -0.55 && val <= -0.15) dpadRight = true;
                else if (val >= 0.05 && val <= 0.35) dpadDown = true;
                else if (val >= 0.55 && val <= 0.85) dpadLeft = true;
            }
        }

        // === 左類比搖桿 (Left Stick) ===
        const lx = getAxis(pad, 0);
        const ly = getAxis(pad, 1);
        const deadzone = 0.5;
        const stickUp = ly < -deadzone;
        const stickDown = ly > deadzone;
        const stickLeft = lx < -deadzone;
        const stickRight = lx > deadzone;

        const anyAction = confirm || home || back || fullscreen || playPause ||
                          subtitles || rewind || forward ||
                          dpadUp || dpadDown || dpadLeft || dpadRight ||
                          stickUp || stickDown || stickLeft || stickRight;

        return {
            id: pad.id,
            index: pad.index,
            anyAction,
            confirm,
            home,
            back,
            fullscreen,
            playPause,
            subtitles,
            rewind,
            forward,
            up: dpadUp || stickUp,
            down: dpadDown || stickDown,
            left: dpadLeft || stickLeft,
            right: dpadRight || stickRight
        };
    }

    // ==========================================
    // 🔄 手把即時輪詢監聽 (多手把無縫支援)
    // ==========================================
    function pollGamepad() {
        try {
            const rawPads = navigator.getGamepads ? navigator.getGamepads() : [];
            let activeState = null;
            let firstValidPad = null;

            // 遍歷所有已連線的手把插槽 (徹底解決 Slot 0 幽靈設備或鍵盤霸佔插槽問題)
            for (let i = 0; i < rawPads.length; i++) {
                const pad = rawPads[i];
                if (!pad || !pad.connected) continue;

                const state = parseGamepadState(pad);
                if (!state) continue;

                if (!firstValidPad) firstValidPad = pad;

                // 若該手把在此刻有任何按鍵按下或搖桿推動，直接捕獲為活躍手把
                if (state.anyAction) {
                    activeState = state;
                    break;
                }
            }

            // 手把初次連線或喚醒時的 OSD 提示
            const detectedPad = activeState ? rawPads[activeState.index] : firstValidPad;
            if (detectedPad && detectedPad.id !== lastActivePadId) {
                lastActivePadId = detectedPad.id;
                const cleanName = detectedPad.id.split('(')[0].trim() || '遊戲控制器';
                showToast(`🎮 已偵測到手把: ${cleanName}\n(連接埠 #${detectedPad.index})`, 3000);
            }

            // 若目前聚焦在搜尋輸入框，手把輸入暫時不搶奪焦點，但允許按下返回/取消鍵解除聚焦
            if (activeState && isInputFocused()) {
                if (activeState.back || activeState.home) {
                    document.activeElement.blur();
                    showToast('已取消文字輸入焦點');
                }
            } else if (activeState && activeState.anyAction) {
                const now = Date.now();
                if (now - lastInputTime > INPUT_COOLDOWN_MS) {
                    lastInputTime = now;

                    if (activeState.confirm) clickVideo();
                    else if (activeState.back) goBack();
                    else if (activeState.home) goHome();
                    else if (activeState.fullscreen) toggleFullscreen();
                    else if (activeState.playPause) togglePlayPause();
                    else if (activeState.subtitles) toggleSubtitles();
                    else if (activeState.rewind) skipTime(SKIP_TIME_LT);
                    else if (activeState.forward) skipTime(SKIP_TIME_RT);
                    else if (activeState.up) move('up');
                    else if (activeState.down) move('down');
                    else if (activeState.left) move('left');
                    else if (activeState.right) move('right');

                    updateDebug(`手把: ${activeState.id} [埠 ${activeState.index}]\n當前選取: 第 ${selectedIndex + 1} 項\n[A]進入 [B]首頁 [X]全螢幕 [Y]暫停\n[RT]快進 [LT]倒退 [RB]字幕 [LB]返回`);
                }
            } else if (!detectedPad) {
                updateDebug('手把狀態: 尚未連接\n請按手把任意鍵喚醒連線');
            }
        } catch (e) {
            console.error("[手把腳本] 輪詢讀取錯誤:", e);
        }

        requestAnimationFrame(pollGamepad);
    }

    // ==========================================
    // 🚀 生命週期與事件監聽
    // ==========================================
    window.addEventListener("gamepadconnected", (e) => {
        const cleanName = e.gamepad.id.split('(')[0].trim() || '遊戲控制器';
        showToast(`🎮 手把已連線: ${cleanName}\n(埠號 #${e.gamepad.index})`, 3500);
        setTimeout(() => { updateItems(); highlightSelection(); }, 800);
    });

    window.addEventListener("gamepaddisconnected", (e) => {
        showToast(`⚠️ 手把已中斷連線 (埠號 #${e.gamepad.index})`, 2500);
    });

    // 點擊網頁任意處自動重新整理可選取清單
    window.addEventListener('click', () => {
        setTimeout(updateItems, 400);
    });

    // 首頁自動維持監聽最新載入的影片列
    setInterval(() => {
        if (window.location.pathname === '/' || window.location.pathname.startsWith('/results')) {
            updateItems();
        }
    }, 2500);

    // 啟動手把輪詢核心
    pollGamepad();
})();
