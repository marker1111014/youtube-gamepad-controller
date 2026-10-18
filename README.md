# 🎮 YouTube Gamepad Controller (YouTube 手把控制器)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tampermonkey](https://img.shields.io/badge/Tampermonkey-Supported-blue.svg)](https://www.tampermonkey.net/)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-brightgreen.svg)]()

專為懶人與客廳沙發、床上觀影打造的 **YouTube 手把操控油猴腳本 (Tampermonkey UserScript)**！  
完美支援 **藍芽 (Bluetooth)** 與 **2.4G 無線手把**、**多控制器動態切換**、相容 **Xbox** 與 **Nintendo Switch Pro** 手把鍵位，附帶實時操作 OSD 浮動提示與防呆回退機制。

---

## ✨ 核心特色 (Features)

* 📶 **全方位無線支援**：完美適配藍芽連線與 2.4G 無線接收器，自動處理 DirectInput 非標準映射與苦力帽十字鍵（Hat Switch）。
* 🔀 **多手把動態偵測 (Multi-Gamepad Auto-Switch)**：徹底解決機械鍵盤（如 Keychron）或虛擬裝置霸佔 0 號插槽的問題，自動捕捉當前有操作的手把。
* 🎮 **雙手把架構適配**：原生支援 **Xbox 控制器** 與 **任天堂 Switch Pro 手把**（實體鍵位與確認/返回防呆適配）。
* 🔔 **精緻 OSD 浮動提示**：手把連線、喚醒、暫停、快進/倒退皆有現代感黑底微光提示，清楚掌握目前狀態。
* 📺 **全頁面選取導航**：支援 YouTube 首頁、搜尋結果列表、頻道影片頁面與播放頁推薦側欄。
* 🛡️ **輸入框防誤觸**：在搜尋列打字時自動暫停手把導航，按下手把 B / 返回鍵即可一鍵退出搜尋輸入焦點。

---

## 🎯 按鍵對照表 (Controls)

| 功能 | Xbox 控制器實體按鍵 | Switch Pro 實體按鍵 | 備註 |
| :--- | :---: | :---: | :--- |
| **進入 / 播放影片** | **A** | **A (右) / B (下)** | 點選當前高亮的影片 |
| **回到首頁** | **B** | **Home / B** | 快速回到 YouTube 首頁 |
| **切換全螢幕** | **X** | **X (上)** | 播放器進入／退出全螢幕 |
| **播放 / 暫停** | **Y** | **Y (左)** | 切換影片播放狀態 |
| **返回上一頁** | **LB** | **L** | 防呆回退，避免誤觸 B 鍵離開影片 |
| **切換字幕** | **RB** | **R** | 開啟／關閉影片字幕 (CC) |
| **快進 10 秒** | **RT** (扳機) | **ZR** (扳機) | 支援壓感與按鈕感應 |
| **倒退 10 秒** | **LT** (扳機) | **ZL** (扳機) | 支援壓感與按鈕感應 |
| **方向選擇** | **十字鍵 / 左類比搖桿** | **十字鍵 / 左類比搖桿** | 上下左右切換選取項目 |

---

## 🚀 安裝方式 (Installation)

1. **安裝腳本管理器擴充功能**（若尚未安裝）：
   * [Tampermonkey (篡改猴)](https://www.tampermonkey.net/)
   * 或 Violentmonkey / Scriptish
2. **安裝本腳本**：
   * 點擊此處直接安裝：[👉 安裝 YouTube 手把控制器](https://raw.githubusercontent.com/marker1111014/youtube-gamepad-controller/main/YouTube_Gamepad_Controller.user.js)
   * 或至 Greasyfork 安裝：[Greasyfork 頁面](https://greasyfork.org/zh-TW/scripts/573036)
3. 打開 [YouTube](https://www.youtube.com/)，拿起手把即可開始享受！

---

## 💡 常見問題與排查 (FAQ)

### Q1：打開網頁選手把沒反應？
* **瀏覽器安全機制**：Chrome / Edge / Firefox 要求使用者必須先用滑鼠點擊一下網頁任一處，並按下手把上的任意按鍵，瀏覽器才會喚醒 Gamepad API。喚醒後右下角會彈出「🎮 已偵測到手把」提示。

### Q2：手把一按按鍵，電腦滑鼠游標跟著亂跑？
* **Steam 桌面配置攔截**：若電腦後台開著 Steam，Steam 預設會把手把轉成滑鼠點擊。
* **解決方法**：開啟 Steam ➔ 左上角「Steam」➔「設定」➔「控制器」➔ 將「桌面配置 (Desktop Layout)」關閉或設為停用。

---

## 📄 授權條款 (License)

本專案採用 [MIT License](LICENSE) 授權開放。
