# 📂 文件責任與依賴關係指南
## 每個檔案做什麼？改動時會影響誰？

---

## 🎯 快速查找：用戶意見分類表

| 用戶說... | 需要改哪個文件 | 難度 |
|----------|-------------|------|
| 「顏色不好看」 | theme-v2.json | ⭐ 簡單 |
| 「勝利訊息太無聊」 | theme-v2.json | ⭐ 簡單 |
| 「想要 3x3 排版」 | theme-v2.json + style.css | ⭐⭐ 中等 |
| 「題目太簡單/太難」 | questions-v2.json | ⭐ 簡單 |
| 「想要 10 個關卡」 | config-v2.json | ⭐ 簡單 |
| 「搶答規則要改」 | config-v2.json | ⭐ 簡單 |
| 「計分方式要改」 | game-engine.js | ⭐⭐⭐ 困難 |
| 「音效太吵」 | game-engine.js | ⭐⭐ 中等 |
| 「介面配置不順手」 | index.html + style.css | ⭐⭐ 中等 |

---

## 📁 核心文件責任表

### 🎨 主題相關（使用者最常改）

#### 1. `themes/wave-harmonics/theme-v2.json`

**負責：** 主題的外觀和文字

**可以改：**
```json
✅ 玩家顏色（player1, player2）
✅ 背景顏色（background）
✅ 勝利/失敗訊息（win, lose, draw）
✅ 懲罰文字（penalty.text）
✅ COMBO 文字（combo.text）
✅ 排版設定（optionGrid: "2x2", "1x4"）
✅ 字體大小（fontSize）
✅ 間距設定（spacing）
```

**影響：**
- 遊戲的視覺外觀
- 文字訊息
- 按鈕排版方式

**不影響：**
- 遊戲邏輯
- 計分規則
- 題目內容

**修改範例：**
```json
// 改變玩家顏色
"colors": {
  "player1": "#FF0000",  // 改成紅色
  "player2": "#0000FF"   // 改成藍色
}

// 改勝利訊息
"win": [
  "你太強了！",
  "完美表現！",
  "無人能擋！"
]

// 改排版（練習模式用 1x4，其他用 2x2）
"optionGrid": {
  "practice": "1x4",
  "versus": "2x2",
  "speed": "2x2"
}
```

**驗證方式：**
- 用 theme-v2-validator.html 檢查格式
- 重新載入遊戲，看顏色/文字是否改變

---

#### 2. `themes/wave-harmonics/config-v2.json`

**負責：** 遊戲規則和關卡設定

**可以改：**
```json
✅ 遊戲模式設定（practice, versus, speed）
✅ 目標分數（targetScore）
✅ 時間限制（timeLimit）
✅ 搶答加分（firstBonus, secondBonus）
✅ 關卡列表（levels）
✅ 關卡對應的題目集（questionSet）
✅ 是否顯示對照表（showReferenceTable）
```

**影響：**
- 遊戲規則
- 勝利條件
- 關卡數量

**不影響：**
- 顏色和文字
- 題目內容
- 核心計分邏輯

**修改範例：**
```json
// 改勝利條件（20 分改成 30 分）
"modes": {
  "versus": {
    "name": "雙人搶答",
    "targetScore": 30,        // 原本是 20
    "firstBonus": 2,
    "secondBonus": 1
  }
}

// 增加新關卡
"levels": [
  {
    "id": "level7",
    "name": "超級挑戰",
    "questionSet": "superHard"
  }
]
```

**驗證方式：**
- 用 theme-v2-validator.html 檢查格式
- 玩遊戲確認規則改變

---

#### 3. `themes/wave-harmonics/questions-v2.json`

**負責：** 題目和選項內容

**可以改：**
```json
✅ 答案選項池（answerPools）
✅ 題目集（questionSets）
✅ 對照表資料（referenceTable）
✅ 題目的正確答案（correctAnswerId）
✅ 題目的選項池（answerPoolIds）
```

**影響：**
- 題目難度
- 題目數量
- 選項內容

**不影響：**
- 遊戲規則
- 外觀顏色
- 計分邏輯

**修改範例：**
```json
// 在答案池新增選項
"answerPools": {
  "overtones": {
    "category": "overtone",
    "items": [
      {"id": "o0", "text": "基音"},
      {"id": "o1", "text": "第一泛音"},
      {"id": "o8", "text": "第八泛音"}  // 新增
    ]
  }
}

// 新增題目
"questionSets": {
  "level1": [
    {
      "id": "q_new",
      "question": {"type": "image", "value": "ff_5.png"},
      "correctAnswerId": "o5",
      "answerPoolIds": ["overtones"]
    }
  ]
}
```

**驗證方式：**
- 用 question-editor-v2.html 編輯
- 用 teacher-review-v2.html 審題

---

### 🎮 遊戲界面

#### 4. `index.html`

**負責：** 遊戲的 HTML 結構

**可以改：**
```html
✅ 選單按鈕（mode-btn）
✅ 關卡名稱（mode-label）
✅ 規則說明文字（rule-text）
✅ 元素的 ID 和 class
✅ 載入哪個主題（loadTheme('wave-harmonics')）
```

**影響：**
- 選單外觀
- 按鈕文字
- 頁面結構

**不影響：**
- 遊戲邏輯
- 計分規則
- 主題顏色（那是 theme-v2.json 管的）

**修改範例：**
```html
<!-- 改關卡名稱 -->
<div class="mode-label">🔵 超級困難模式</div>

<!-- 改按鈕文字 -->
<button class="mode-btn btn-practice" 
        onclick="gameEngine.init('practice', 'level1')">
  單人練習模式
</button>

<!-- 切換到有機化學主題 -->
<script>
  const themeData = await loader.loadTheme('organic-chemistry');
</script>
```

**驗證方式：**
- 重新載入頁面
- 檢查文字和按鈕是否改變

**注意：**
- 如果改 onclick 或 ID，可能影響 game-engine.js
- 如果改 class，可能影響 style.css

---

#### 5. `style.css`

**負責：** 遊戲的樣式和動畫

**可以改：**
```css
✅ 顏色（但建議改 theme-v2.json）
✅ 字體大小
✅ 按鈕樣式
✅ 動畫效果
✅ 排版方式（grid）
✅ 間距和邊距
```

**影響：**
- 視覺外觀
- 動畫效果
- 排版方式

**不影響：**
- 遊戲邏輯
- 題目內容
- 計分規則

**修改範例：**
```css
/* 改按鈕大小 */
.option-btn {
  min-height: 100px;  /* 原本 70px */
  font-size: 2rem;    /* 原本沒設定 */
}

/* 新增 3x3 排版 */
.grid-3x3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 10px;
}

/* 改 COMBO 動畫速度 */
@keyframes comboPop {
  0% { transform: scale(0.8); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}
```

**驗證方式：**
- 按 F5 重新載入
- 按 Ctrl+Shift+R 清除快取

**注意：**
- 如果新增 grid class，要在 theme-v2.json 設定
- 動畫時間也可在 theme-v2.json 的 animations 設定

---

### ⚙️ 遊戲引擎（進階使用者改）

#### 6. `core/game-engine.js`

**負責：** 遊戲的核心邏輯

**可以改：**
```javascript
✅ 計分邏輯（handleCorrectAnswer, handleWrongAnswer）
✅ COMBO 計算方式
✅ 懲罰機制
✅ 音效產生（playSound）
✅ 時間條更新
✅ 題目產生邏輯
```

**影響：**
- 遊戲玩法
- 計分方式
- 音效
- 所有遊戲邏輯

**不影響：**
- 外觀顏色（除非改 applyThemeStyles）
- 題目內容
- HTML 結構

**修改範例：**
```javascript
// 改計分方式（答對 +3 分）
handleCorrectAnswer() {
  // ... 省略部分代碼
  
  if (this.state.mode === 'practice') {
    points = 3;  // 原本是 1
  }
  
  // ...
}

// 改 COMBO 門檻（3 連擊才觸發）
updateComboUI(player, val) {
  const threshold = 3;  // 原本是 2
  // ...
}

// 改音效頻率
playSound(type) {
  if (type === 'correct') {
    this.beep(880, 0.1);  // 原本 523
  }
}
```

**驗證方式：**
- 玩遊戲測試
- Console 看有沒有錯誤

**危險：**
- 語法錯誤會導致整個遊戲壞掉
- 建議先備份
- 用 `node -c game-engine.js` 檢查語法

---

#### 7. `core/theme-loader.js`

**負責：** 載入主題資料

**通常不需要改！**

**唯一可能要改的情況：**
- 新增主題時要修改 `availableThemes`
- 改變 JSON 檔名規則

**修改範例：**
```javascript
// 新增可用主題列表
listAvailableThemes() {
  return [
    'wave-harmonics',
    'organic-chemistry',
    'your-new-theme'  // 新增
  ];
}
```

**驗證方式：**
- 載入新主題測試

---

### 🛠️ 工具（開發用，不影響遊戲）

#### 8. `manager/question-editor-v2.html`
- 用途：編輯題目
- 獨立運行，不影響遊戲

#### 9. `manager/theme-editor.html`
- 用途：編輯主題（需更新到 v2）
- 獨立運行，不影響遊戲

#### 10. `manager/teacher-review-v2.html`
- 用途：審題和驗證
- 獨立運行，不影響遊戲

---

## 🔗 依賴關係圖

### 視覺化關係

```
┌─────────────────────────────────────────┐
│           index.html (遊戲入口)          │
│  - 載入所有其他文件                      │
│  - 定義頁面結構                          │
└────────┬──────────────────────┬─────────┘
         │                      │
    ┌────▼────┐           ┌─────▼─────┐
    │style.css│           │JS 引擎層   │
    │         │           └─────┬─────┘
    │- 外觀   │                 │
    │- 動畫   │        ┌────────┴────────┐
    └─────────┘        │                 │
              ┌────────▼─────┐   ┌──────▼──────┐
              │theme-loader.js│   │game-engine.js│
              │              │   │             │
              │- 載入主題    │   │- 遊戲邏輯   │
              └────────┬─────┘   │- 計分規則   │
                       │         │- 音效       │
                       │         └──────┬──────┘
                       │                │
                ┌──────▼────────────────▼─────┐
                │      主題資料層             │
                ├────────────────────────────┤
                │ themes/wave-harmonics/     │
                │  ├─ theme-v2.json   (外觀) │
                │  ├─ config-v2.json  (規則) │
                │  └─ questions-v2.json(題目)│
                └────────────────────────────┘
```

### 文字版依賴關係

```
index.html
  ├── 依賴 → style.css
  ├── 依賴 → core/theme-loader.js
  ├── 依賴 → core/game-engine.js
  └── 引用 → theme-v2.json, config-v2.json, questions-v2.json

game-engine.js
  ├── 讀取 → theme-v2.json (顏色、文字)
  ├── 讀取 → config-v2.json (規則)
  ├── 讀取 → questions-v2.json (題目)
  └── 操作 → index.html 的 DOM 元素

style.css
  ├── 設定 → index.html 的外觀
  └── 被 → theme-v2.json 的 cssVariables 覆蓋

theme-loader.js
  └── 載入 → theme-v2.json, config-v2.json, questions-v2.json
```

---

## 🎯 改動影響分析

### 情況 1：只改一個文件就能完成

| 需求 | 改哪個文件 | 影響 |
|-----|----------|------|
| 改顏色 | theme-v2.json | 無其他影響 |
| 改勝利訊息 | theme-v2.json | 無其他影響 |
| 改題目內容 | questions-v2.json | 無其他影響 |
| 改勝利分數 | config-v2.json | 無其他影響 |
| 改選單文字 | index.html | 無其他影響 |
| 改按鈕顏色 | style.css 或 theme-v2.json | 無其他影響 |

✅ **這些是最安全的修改！**

---

### 情況 2：需要改 2 個文件

| 需求 | 要改的文件 | 原因 |
|-----|----------|------|
| 新增 3x3 排版 | theme-v2.json + style.css | CSS 要定義樣式，JSON 要設定使用 |
| 改排版間距 | theme-v2.json + style.css | 兩邊都要改才一致 |
| 新增關卡 + 題目 | config-v2.json + questions-v2.json | 關卡設定要對應題目集 |
| 切換主題 | index.html + 主題資料夾 | HTML 要指定主題名稱 |

⚠️ **要確保兩個文件設定一致！**

---

### 情況 3：需要改 3+ 個文件（複雜改動）

| 需求 | 要改的文件 | 原因 |
|-----|----------|------|
| 改變計分邏輯 | game-engine.js + config-v2.json + 可能 theme-v2.json | 邏輯、規則、顯示都要改 |
| 新增遊戲模式 | game-engine.js + config-v2.json + index.html + theme-v2.json | 全面改動 |
| 改變選項數量（4 個變 6 個） | game-engine.js + style.css + theme-v2.json | 邏輯、排版、設定 |
| 新增計時器顯示 | index.html + style.css + game-engine.js | 結構、樣式、邏輯 |

🔴 **建議：分步驟改，每改一個就測試！**

---

## 📋 改動前檢查表

### ✅ 改動前必做

```
□ 備份目前可運行的版本
□ 確認要改哪些文件
□ 了解檔案之間的依賴關係
□ 規劃改動順序
□ 準備測試方法
```

### ✅ 改動中必做

```
□ 一次只改一個文件
□ 改完立即測試
□ 記錄改了什麼
□ 如果出錯，立即還原
□ 確認沒問題才改下一個
```

### ✅ 改動後必做

```
□ 完整測試所有功能
□ 檢查 Console 沒錯誤
□ 在不同瀏覽器測試
□ 請別人測試
□ 備份成功版本
```

---

## 🎓 實戰案例

### 案例 1：用戶說「顏色太難看」

**分析：**
- 問題類型：外觀
- 影響範圍：顏色
- 改動難度：⭐ 簡單

**解決方案：**
```
改 1 個文件：theme-v2.json

步驟：
1. 打開 theme-v2.json
2. 找到 "colors" 區塊
3. 改 player1, player2, background 等
4. 儲存
5. 重新載入遊戲測試
```

**驗證：**
- 用 theme-v2-validator.html 檢查 JSON 格式
- 遊戲中顏色是否改變

---

### 案例 2：用戶說「想要 1x4 直向排列」

**分析：**
- 問題類型：排版
- 影響範圍：CSS 和主題設定
- 改動難度：⭐⭐ 中等

**解決方案：**
```
改 2 個文件：style.css + theme-v2.json

步驟 1：確認 CSS 已定義 grid-1x4（已經有了）
  
步驟 2：修改 theme-v2.json
{
  "layout": {
    "optionGrid": {
      "practice": "1x4",  // 改這裡
      "versus": "2x2",
      "speed": "1x4"      // 或這裡
    }
  }
}

步驟 3：測試
- 開啟練習模式
- 確認排列是 1x4
```

**注意：**
- 如果 CSS 沒有 grid-1x4，先加到 style.css
- 兩個文件要一致

---

### 案例 3：用戶說「答對要加 3 分不是 1 分」

**分析：**
- 問題類型：遊戲邏輯
- 影響範圍：計分系統
- 改動難度：⭐⭐⭐ 困難

**解決方案：**
```
改 1 個文件：game-engine.js（但很複雜）

步驟：
1. 備份 game-engine.js
2. 找到 handleCorrectAnswer 方法
3. 找到計分邏輯：
   if (this.state.mode === 'practice') {
     points = 3;  // 改這裡，原本是 1
   }
4. 儲存
5. 用 node -c game-engine.js 檢查語法
6. 測試遊戲
```

**風險：**
- 語法錯誤會破壞遊戲
- 建議請工程師協助

---

### 案例 4：用戶說「要新增第 7 關」

**分析：**
- 問題類型：內容擴充
- 影響範圍：關卡和題目
- 改動難度：⭐⭐ 中等

**解決方案：**
```
改 3 個文件：config-v2.json + questions-v2.json + index.html

步驟 1：在 questions-v2.json 新增題目集
{
  "questionSets": {
    "level7": [
      // 新題目...
    ]
  }
}

步驟 2：在 config-v2.json 新增關卡
{
  "levels": [
    {
      "id": "level7",
      "name": "終極挑戰",
      "questionSet": "level7"
    }
  ]
}

步驟 3：在 index.html 新增按鈕
<div class="mode-section">
  <div class="mode-label">🔵 終極挑戰</div>
  <button onclick="gameEngine.init('practice', 'level7')">
    自己練習
  </button>
</div>

步驟 4：測試每個步驟
```

**檢查：**
- 三個文件的 ID 要一致（都是 level7）

---

## 💡 最佳實踐

### 原則 1：改動前先分類

```
問自己 3 個問題：
1. 這是外觀問題還是邏輯問題？
2. 影響幾個文件？
3. 我有能力改嗎？

然後決定：
- 外觀 + 1 個文件 → 自己改
- 邏輯 + 1 個文件 → 小心改（要懂一點代碼）
- 多個文件 → 規劃好順序
- 核心邏輯 → 找工程師
```

### 原則 2：記錄所有改動

**建立改動日誌：**
```markdown
## 2025-11-27 改動記錄

### 改動 1：改變 P1 顏色
- 文件：theme-v2.json
- 位置：colors.player1
- 原值：#FF6B6B
- 新值：#FF0000
- 原因：用戶反應顏色太淡
- 測試：✅ 通過

### 改動 2：新增 level7
- 文件：config-v2.json, questions-v2.json, index.html
- 詳細：...
```

### 原則 3：使用工具驗證

**改完就驗證：**
```
theme-v2.json 改完
  → theme-v2-validator.html 驗證

questions-v2.json 改完
  → teacher-review-v2.html 審題

game-engine.js 改完
  → node -c game-engine.js 檢查語法

任何改動後
  → test-js-loading.html 測試載入
```

---

## 🚨 危險區域警告

### 🔴 非常危險（容易搞壞）

```
❌ game-engine.js 的核心邏輯
   → 語法錯誤 = 整個遊戲壞掉

❌ theme-loader.js
   → 載入失敗 = 遊戲無法啟動

❌ index.html 的 script 部分
   → 初始化失敗 = 空白頁面
```

**建議：**
- 一定要備份
- 改完用工具檢查
- 請工程師協助

### 🟡 中等風險（可能出錯）

```
⚠️ style.css
   → 語法錯誤 = 排版跑掉

⚠️ config-v2.json
   → 格式錯誤 = 規則失效

⚠️ index.html 的結構
   → ID/class 錯誤 = 功能失效
```

**建議：**
- 小心修改
- 立即測試

### 🟢 安全區域（不太會出錯）

```
✅ theme-v2.json 的顏色和文字
✅ questions-v2.json 的內容
✅ config-v2.json 的數值
```

**建議：**
- 放心修改
- 用工具驗證就好

---

## 📞 決策樹：我該改哪個文件？

```
用戶的需求是...
    │
    ├─ 外觀相關？
    │   ├─ 顏色/文字 → theme-v2.json
    │   ├─ 排版 → theme-v2.json + style.css
    │   └─ 按鈕/介面 → index.html + style.css
    │
    ├─ 內容相關？
    │   ├─ 題目 → questions-v2.json
    │   ├─ 關卡 → config-v2.json + questions-v2.json
    │   └─ 規則 → config-v2.json
    │
    ├─ 邏輯相關？
    │   ├─ 計分 → game-engine.js
    │   ├─ 音效 → game-engine.js
    │   └─ 流程 → game-engine.js
    │
    └─ 不確定？
        → 看「用戶意見分類表」
```

---

## 📊 常見需求快速索引

### A. 視覺類

| 需求 | 文件 | 行數/位置 |
|-----|------|----------|
| 改 P1/P2 顏色 | theme-v2.json | colors.player1/2 |
| 改背景色 | theme-v2.json | colors.background |
| 改按鈕大小 | style.css | .option-btn |
| 改字體 | theme-v2.json | layout.fontSize |
| 改動畫 | style.css 或 theme-v2.json | animations |

### B. 文字類

| 需求 | 文件 | 行數/位置 |
|-----|------|----------|
| 改勝利訊息 | theme-v2.json | messages.win |
| 改失敗訊息 | theme-v2.json | messages.lose |
| 改懲罰文字 | theme-v2.json | messages.penalty.text |
| 改 COMBO 文字 | theme-v2.json | messages.combo.text |
| 改選單文字 | index.html | mode-label, mode-btn |

### C. 規則類

| 需求 | 文件 | 行數/位置 |
|-----|------|----------|
| 改勝利分數 | config-v2.json | modes.versus.targetScore |
| 改時間限制 | config-v2.json | modes.speed.timeLimit |
| 改搶答加分 | config-v2.json | firstBonus/secondBonus |
| 改懲罰扣分 | theme-v2.json | messages.penalty.scoreDeduction |

### D. 內容類

| 需求 | 文件 | 行數/位置 |
|-----|------|----------|
| 改題目 | questions-v2.json | questionSets |
| 改選項 | questions-v2.json | answerPools |
| 改對照表 | questions-v2.json | referenceTable |
| 新增關卡 | config-v2.json + questions-v2.json + index.html | 多處 |

---

## 🎯 總結：黃金法則

### ✅ DO（應該做的）

```
1. 改動前備份
2. 一次改一個文件
3. 改完立即測試
4. 使用驗證工具
5. 記錄所有改動
6. 從簡單到困難
7. 不確定就問
```

### ❌ DON'T（不要做的）

```
1. 同時改多個文件
2. 不測試就繼續改
3. 不備份就修改核心文件
4. 改完不驗證格式
5. 忘記自己改了什麼
6. 直接改困難的部分
7. 遇到問題不尋求協助
```

---

**現在你可以根據用戶意見，快速找到要改哪個文件了！** 🎉

**記住：大部分用戶意見（80%）只需要改 theme-v2.json、config-v2.json 或 questions-v2.json 這三個檔案，而且都很安全！** ✅
