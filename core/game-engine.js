/**
 * 通用遊戲引擎 v2.0
 * 支援多主題、動態排版、主題性文字
 * 保留所有原始遊戲機制
 */

class GameEngine {
    constructor(themeData) {
        this.themeData = themeData;
        this.theme = themeData.theme;
        this.config = themeData.config;
        this.questions = themeData.questions;
        
        // 音效上下文
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        // 遊戲狀態
        this.state = {
            mode: null,              // 'practice', 'versus', 'speed'
            levelId: null,           // 當前關卡 ID
            targetScore: 0,          // 目標分數
            scores: { p1: 0, p2: 0 },
            combo: { p1: 0, p2: 0 },
            wrongStreak: { p1: 0, p2: 0 },
            wrongHistory: [],        // 錯題記錄（練習模式）
            deck: { p1: [], p2: [] },
            questions: { p1: null, p2: null },
            status: { p1: false, p2: false },
            firstSolver: null,
            timerVal: 0,
            timerInterval: null,
            currentQuestions: [],    // 當前關卡的題目
            locked: { p1: false, p2: false }
        };

        console.log('[GameEngine] 引擎初始化完成');
        console.log(`- 主題: ${this.theme.meta.name}`);
        console.log(`- 排版模式:`, this.theme.layout.optionGrid);
    }

    /**
     * 初始化遊戲
     */
    init(mode, levelId) {
        console.log(`[GameEngine] 初始化遊戲: mode=${mode}, level=${levelId}`);
        
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }

        // 重置狀態
        this.state.mode = mode;
        this.state.levelId = levelId;
        this.state.scores = { p1: 0, p2: 0 };
        this.state.combo = { p1: 0, p2: 0 };
        this.state.wrongStreak = { p1: 0, p2: 0 };
        this.state.status = { p1: false, p2: false };
        this.state.firstSolver = null;
        this.state.locked = { p1: false, p2: false };
        this.state.wrongHistory = [];

        // 獲取當前關卡配置
        const levelConfig = this.config.levels.find(l => l.id === levelId);
        if (!levelConfig) {
            throw new Error(`找不到關卡: ${levelId}`);
        }

        // 獲取題目集
        const questionSet = this.questions.questionSets[levelConfig.questionSet];
        if (!questionSet) {
            throw new Error(`找不到題目集: ${levelConfig.questionSet}`);
        }

        this.state.currentQuestions = questionSet.questions;
        
        // 初始化題目堆
        this.state.deck.p1 = [...this.state.currentQuestions];
        this.state.deck.p2 = [...this.state.currentQuestions];
        this.shuffleArray(this.state.deck.p1);
        this.shuffleArray(this.state.deck.p2);

        // 獲取模式配置
        const modeConfig = this.config.modes[mode];
        this.state.targetScore = modeConfig.targetScore || 0;

        // 套用主題樣式
        this.applyThemeStyles();
        
        // 設置 UI
        this.setupUI(mode);
        
        // 套用動態排版
        this.setupLayout(mode);

        // 隱藏選單，顯示遊戲區
        document.getElementById('main-menu').classList.add('hidden');
        document.getElementById('game-container').style.display = 'flex';

        // 開始倒數
        this.startCountdown(() => {
            this.realStartGame();
        });
    }

    /**
     * 套用主題樣式（CSS 變數）
     */
    applyThemeStyles() {
        const root = document.documentElement;
        
        if (this.theme.cssVariables) {
            for (const [key, value] of Object.entries(this.theme.cssVariables)) {
                root.style.setProperty(key, value);
            }
        }

        // 設置基本顏色（向後兼容）
        if (this.theme.colors) {
            root.style.setProperty('--p1-color', this.theme.colors.player1);
            root.style.setProperty('--p2-color', this.theme.colors.player2);
            root.style.setProperty('--bg-color', this.theme.colors.background);
            root.style.setProperty('--correct-color', this.theme.colors.correct);
            root.style.setProperty('--wrong-color', this.theme.colors.wrong);
        }
    }

    /**
     * 設置動態排版
     */
    setupLayout(mode) {
        const gridType = this.theme.layout.optionGrid[mode];
        
        ['p1', 'p2', 'sp'].forEach(player => {
            const container = document.getElementById(`opts-${player}`);
            if (!container) return;

            // 移除所有網格類別
            container.classList.remove('grid-2x2', 'grid-1x4', 'grid-2x3', 'grid-3x2', 'single-col');
            
            // 根據配置添加對應類別
            switch(gridType) {
                case '2x2':
                    container.classList.add('grid-2x2');
                    break;
                case '1x4':
                    container.classList.add('grid-1x4');
                    container.classList.add('single-col');
                    break;
                case '2x3':
                    container.classList.add('grid-2x3');
                    break;
                case '3x2':
                    container.classList.add('grid-3x2');
                    break;
            }
        });

        // 如果是雙人模式且有切換排版需求，添加 body 類別
        if ((mode === 'versus' || mode === 'duel') && gridType === '2x2') {
            document.body.classList.add('duel-mode');
        } else {
            document.body.classList.remove('duel-mode');
        }
    }

    /**
     * 設置 UI 元素
     */
    setupUI(mode) {
        const vsContainer = document.getElementById('versus-container');
        const spArea = document.getElementById('single-player-area');
        
        // 時間條
        const barTop = document.getElementById('time-bar-top');
        const barBot = document.getElementById('time-bar-bot');
        const fillTop = document.getElementById('time-fill-top');
        const fillBot = document.getElementById('time-fill-bot');
        const warnLayer = document.getElementById('warning-layer');
        
        // 重置時間條
        if (barTop && barBot) {
            barTop.classList.add('hidden');
            barBot.classList.add('hidden');
            warnLayer.classList.add('hidden');
            fillTop.style.width = '100%';
            fillBot.style.width = '100%';
        }
        
        if (mode === 'practice') {
            // 單人模式
            if (vsContainer) vsContainer.style.display = 'none';
            if (spArea) {
                spArea.classList.remove('hidden');
                document.getElementById('sp-score').innerText = '0';
                document.getElementById('sp-combo-box').classList.add('hidden');
                document.getElementById('feedback-sp').classList.add('hidden');
            }
        } else {
            // 雙人模式
            if (vsContainer) vsContainer.style.display = 'flex';
            if (spArea) spArea.classList.add('hidden');
            this.updateScoreUI();
            
            ['p1', 'p2'].forEach(p => {
                const comboEl = document.getElementById(`combo-${p}`);
                const feedbackEl = document.getElementById(`feedback-${p}`);
                if (comboEl) comboEl.style.opacity = '0';
                if (feedbackEl) feedbackEl.classList.add('hidden');
            });
            
            // 競速模式顯示時間條
            if (mode === 'speed' && barTop && barBot) {
                barTop.classList.remove('hidden');
                barBot.classList.remove('hidden');
            }
        }
    }

    /**
     * 開始倒數
     */
    startCountdown(callback) {
        const overlay = document.getElementById('countdown-overlay');
        if (!overlay) {
            callback();
            return;
        }

        const topNum = document.getElementById('cd-num-top');
        const botNum = document.getElementById('cd-num-bot');
        
        overlay.classList.remove('hidden');
        let count = 3;

        const run = () => {
            const txt = count === 0 ? "GO" : count;
            if (topNum) topNum.innerText = txt;
            if (botNum) botNum.innerText = txt;
            
            // 動畫效果
            [topNum, botNum].forEach(el => {
                if (!el) return;
                el.style.animation = 'none';
                el.offsetHeight; // 觸發重繪
                el.style.animation = 'countPop 0.8s ease-out';
                el.style.color = count === 0 ? '#e74c3c' : '#2c3e50';
            });
            
            // 音效
            if (count === 0) {
                this.playSound('go');
            } else {
                this.playSound('count');
            }
            
            if (count < 0) {
                overlay.classList.add('hidden');
                callback();
                return;
            }
            
            count--;
            setTimeout(run, 1000);
        };
        
        run();
    }

    /**
     * 真正開始遊戲
     */
    realStartGame() {
        const timerCenter = document.getElementById('timer-display-center');
        
        if (this.state.mode === 'speed') {
            const timeLimit = this.config.modes.speed.timeLimit || 30;
            this.state.timerVal = timeLimit;
            
            if (timerCenter) {
                timerCenter.innerText = timeLimit.toString();
                timerCenter.classList.remove('hidden');
            }
            
            this.startTimer();
        } else {
            if (timerCenter) {
                timerCenter.innerText = "";
                timerCenter.classList.add('hidden');
            }
        }
        
        // 生成第一題
        if (this.state.mode === 'practice') {
            this.generateIndependentQuestion('sp');
        } else if (this.state.mode === 'versus' || this.state.mode === 'duel') {
            this.generateVersusQuestion();
        } else {
            this.generateIndependentQuestion('p1');
            this.generateIndependentQuestion('p2');
        }
    }

    /**
     * 開始計時器（競速模式）
     */
    startTimer() {
        clearInterval(this.state.timerInterval);
        const maxTime = this.config.modes.speed.timeLimit || 30;
        const warningTime = this.theme.messages.warning.triggerTime || 5;
        
        this.state.timerInterval = setInterval(() => {
            this.state.timerVal--;
            
            const timerDisplay = document.getElementById('timer-display-center');
            if (timerDisplay) {
                timerDisplay.innerText = this.state.timerVal.toString();
            }
            
            // 更新時間條
            const pct = (this.state.timerVal / maxTime) * 100;
            const fillTop = document.getElementById('time-fill-top');
            const fillBot = document.getElementById('time-fill-bot');
            if (fillTop) fillTop.style.width = pct + '%';
            if (fillBot) fillBot.style.width = pct + '%';

            // 最後 N 秒警告
            if (this.state.timerVal === warningTime) {
                const warnLayer = document.getElementById('warning-layer');
                if (warnLayer) {
                    warnLayer.classList.remove('hidden');
                    setTimeout(() => {
                        warnLayer.classList.add('hidden');
                    }, 2000);
                }
            }

            // 最後 3 秒音效
            if (this.state.timerVal <= 3 && this.state.timerVal > 0) {
                this.playSound('count');
            }

            // 時間到
            if (this.state.timerVal <= 0) {
                this.playSound('go');
                clearInterval(this.state.timerInterval);
                this.determineWinner();
            }
        }, 1000);
    }

    /**
     * 洗牌
     */
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    /**
     * 獲取下一題
     */
    getNextQuestion(player) {
        if (this.state.mode !== 'practice') {
            const deckKey = (this.state.mode === 'versus' || this.state.mode === 'duel') ? 'p1' : player;
            if (this.state.deck[deckKey].length === 0) {
                // 重新洗牌
                this.state.deck[deckKey] = [...this.state.currentQuestions];
                this.shuffleArray(this.state.deck[deckKey]);
            }
            return this.state.deck[deckKey].pop();
        } else {
            // 練習模式：50% 機率重現錯題
            if (this.state.wrongHistory.length > 0 && Math.random() < 0.5) {
                const idx = Math.floor(Math.random() * this.state.wrongHistory.length);
                return this.state.wrongHistory[idx];
            }
            const list = this.state.currentQuestions;
            return list[Math.floor(Math.random() * list.length)];
        }
    }

    /**
     * 生成搶答題（雙方同題）
     */
    generateVersusQuestion() {
        this.state.status.p1 = false;
        this.state.status.p2 = false;
        this.state.firstSolver = null;
        
        ['p1', 'p2'].forEach(p => {
            const feedback = document.getElementById(`feedback-${p}`);
            if (feedback) feedback.classList.add('hidden');
        });
        
        const q = this.getNextQuestion('p1');
        this.state.questions.p1 = q;
        this.state.questions.p2 = q;
        
        this.renderSide('p1', q);
        this.renderSide('p2', q);
    }

    /**
     * 生成獨立題目（各自不同題）
     */
    generateIndependentQuestion(player) {
        if (player !== 'sp') {
            this.state.status[player] = false;
            const feedback = document.getElementById(`feedback-${player}`);
            if (feedback) feedback.classList.add('hidden');
        } else {
            const feedbackSp = document.getElementById('feedback-sp');
            if (feedbackSp) feedbackSp.classList.add('hidden');
        }
        
        const q = this.getNextQuestion(player === 'sp' ? 'p1' : player);
        
        if (player === 'sp') {
            this.state.questions.p1 = q;
        } else {
            this.state.questions[player] = q;
        }
        
        this.renderSide(player, q);
    }

    /**
     * 渲染題目和選項
     */
    renderSide(player, qObj) {
        const isSp = (player === 'sp');
        const qEl = document.getElementById(`q-${player}`);
        const grid = document.getElementById(`opts-${player}`);
        
        if (!qEl || !grid) return;

        // 渲染題目
        this.renderContent(qEl, qObj, false, isSp);
        
        // 清空選項
        grid.innerHTML = '';
        
        // 獲取正確答案的資料
        const correctAnswer = this.getAnswerData(qObj.correctAnswer);
        if (!correctAnswer) {
            console.error(`找不到答案: ${qObj.correctAnswer}`);
            return;
        }

        // 獲取選項池
        const poolIds = qObj.answerPoolIds || this.getCurrentQuestionSet().answerPoolIds;
        if (!poolIds || poolIds.length === 0) {
            console.error('沒有指定選項池');
            return;
        }

        // 從相同類別的選項中挑選干擾項
        const category = correctAnswer.category;
        const allOptions = this.getOptionsByCategory(category, poolIds);
        
        // 過濾掉正確答案
        const distractors = allOptions.filter(opt => opt.id !== qObj.correctAnswer);
        this.shuffleArray(distractors);
        
        // 組合選項：正確答案 + 3 個干擾項
        let options = [correctAnswer, ...distractors.slice(0, 3)];
        this.shuffleArray(options);
        
        // 渲染選項按鈕
        options.forEach(opt => {
            const btn = document.createElement('div');
            btn.className = 'option-btn';
            this.renderContent(btn, opt, true);
            
            const handleInput = (e) => {
                if (e.cancelable) e.preventDefault();
                this.handleAnswer(player, opt.id, btn, e);
            };
            
            btn.addEventListener('touchstart', handleInput, { passive: false });
            btn.addEventListener('mousedown', handleInput);
            
            grid.appendChild(btn);
        });
    }

    /**
     * 渲染內容（題目或選項）
     */
    renderContent(element, dataObj, isOption = false, isSp = false) {
        element.innerHTML = '';
        
        if (!dataObj) return;

        const type = isOption ? dataObj.type : dataObj.type;
        const content = isOption ? dataObj.content : dataObj.content;
        
        if (type === 'image') {
            const img = document.createElement('img');
            img.src = this.themeData.basePath + content;
            img.className = isSp ? 'img-content sp-img-content' : 'img-content';
            element.appendChild(img);
        } else if (type === 'text') {
            const span = document.createElement('span');
            if (isOption) span.className = 'text-answer';
            span.textContent = content;
            element.appendChild(span);
        }
    }

    /**
     * 獲取答案資料
     */
    getAnswerData(answerId) {
        for (const pool of Object.values(this.questions.answerPools)) {
            const item = pool.items.find(i => i.id === answerId);
            if (item) {
                return {
                    id: item.id,
                    type: pool.type,
                    content: item.content,
                    category: pool.category
                };
            }
        }
        return null;
    }

    /**
     * 根據類別獲取選項
     */
    getOptionsByCategory(category, poolIds) {
        const options = [];
        
        for (const poolId of poolIds) {
            const pool = this.questions.answerPools[poolId];
            if (pool && pool.category === category) {
                pool.items.forEach(item => {
                    options.push({
                        id: item.id,
                        type: pool.type,
                        content: item.content,
                        category: pool.category
                    });
                });
            }
        }
        
        return options;
    }

    /**
     * 獲取當前題目集
     */
    getCurrentQuestionSet() {
        const levelConfig = this.config.levels.find(l => l.id === this.state.levelId);
        return this.questions.questionSets[levelConfig.questionSet];
    }

    /**
     * 處理答題
     */
    handleAnswer(player, answerId, btnElement, event) {
        const realPlayer = (player === 'sp') ? 'p1' : player;
        
        // 檢查是否已答題或鎖定
        if (this.state.status[realPlayer]) return;
        if (this.state.locked[realPlayer]) return;
        if (this.state.timerVal <= 0 && this.state.mode === 'speed') return;
        
        const currentQ = this.state.questions[realPlayer];
        
        // 獲取點擊位置
        let cx, cy;
        if (event.type.includes('touch')) {
            cx = event.changedTouches[0].clientX;
            cy = event.changedTouches[0].clientY;
        } else {
            cx = event.clientX;
            cy = event.clientY;
        }

        // 判斷答案是否正確
        if (answerId === currentQ.correctAnswer) {
            this.handleCorrectAnswer(player, realPlayer, btnElement, cx, cy);
        } else {
            this.handleWrongAnswer(player, realPlayer, currentQ, btnElement, cx, cy);
        }
    }

    /**
     * 處理答對
     */
    handleCorrectAnswer(player, realPlayer, btnElement, cx, cy) {
        this.playSound('correct');
        btnElement.classList.add('correct-mark');
        
        // 更新 Combo
        this.state.combo[realPlayer]++;
        this.state.wrongStreak[realPlayer] = 0;
        this.updateComboUI(player, this.state.combo[realPlayer]);
        
        // Combo 攻擊效果（雙人模式）
        const comboThreshold = this.theme.messages.combo.minCount || 2;
        if (this.state.combo[realPlayer] >= comboThreshold && player !== 'sp') {
            const target = (realPlayer === 'p1') ? 'p2' : 'p1';
            this.shootCombo(realPlayer, target);
        }

        // 計分
        let scoreAdd = 0;
        
        if (player === 'sp') {
            // 練習模式
            this.state.scores.p1 += 1;
            scoreAdd = 1;
            
            const feedbackSp = document.getElementById('feedback-sp');
            if (feedbackSp) feedbackSp.classList.remove('hidden');
            
            setTimeout(() => this.generateIndependentQuestion('sp'), 500);
            
        } else if (this.state.mode === 'versus' || this.state.mode === 'duel') {
            // 搶答模式
            this.state.status[realPlayer] = true;
            
            const feedback = document.getElementById(`feedback-${player}`);
            if (feedback) {
                feedback.classList.remove('hidden');
                const waitText = document.getElementById(`wait-text-${player}`);
                if (waitText) waitText.style.display = 'block';
            }
            
            if (this.state.firstSolver === null) {
                // 先答對
                this.state.firstSolver = realPlayer;
                const firstBonus = this.config.modes[this.state.mode].firstBonus || 2;
                this.state.scores[realPlayer] += firstBonus;
                scoreAdd = firstBonus;
            } else {
                // 後答對
                const secondBonus = this.config.modes[this.state.mode].secondBonus || 1;
                this.state.scores[realPlayer] += secondBonus;
                scoreAdd = secondBonus;
            }
            
            // 檢查是否達到目標分數
            if (this.state.scores[realPlayer] >= this.state.targetScore) {
                setTimeout(() => this.determineWinner(), 500);
            } else if (this.state.status.p1 && this.state.status.p2) {
                // 雙方都答完，出下一題
                setTimeout(() => this.generateVersusQuestion(), 1000);
            }
            
        } else {
            // 競速模式
            this.state.status[realPlayer] = true;
            this.state.scores[realPlayer]++;
            scoreAdd = 1;
            
            const feedback = document.getElementById(`feedback-${player}`);
            if (feedback) feedback.classList.remove('hidden');
            
            setTimeout(() => this.generateIndependentQuestion(player), 500);
        }
        
        this.updateScoreUI();
        
        // 顯示浮動分數
        const areaId = (player === 'sp') ? 'single-player-area' : `${player}-area`;
        this.showFloatingText(cx, cy, "+" + scoreAdd, this.theme.colors.correct, document.getElementById(areaId));
    }

    /**
     * 處理答錯
     */
    handleWrongAnswer(player, realPlayer, currentQ, btnElement, cx, cy) {
        this.playSound('wrong');
        btnElement.classList.add('shake');
        setTimeout(() => {
            btnElement.classList.remove('shake');
        }, 400);
        
        // 重置 Combo
        this.state.combo[realPlayer] = 0;
        this.updateComboUI(player, 0);
        
        // 增加錯誤連擊
        this.state.wrongStreak[realPlayer]++;
        
        // 計算扣分
        const penaltyThreshold = this.theme.messages.penalty.threshold || 2;
        let isBroken = false;
        let scoreDed = -1;
        
        if (this.state.wrongStreak[realPlayer] >= penaltyThreshold) {
            isBroken = true;
            scoreDed = this.theme.messages.penalty.scoreDeduction || -2;
        }

        // 扣分
        if (this.state.scores[realPlayer] > 0) {
            this.state.scores[realPlayer] += scoreDed;
            if (this.state.scores[realPlayer] < 0) {
                this.state.scores[realPlayer] = 0;
            }
        }

        this.updateScoreUI();
        
        // 顯示浮動分數（主題性文字）
        const areaId = (player === 'sp') ? 'single-player-area' : `${player}-area`;
        const penaltyText = isBroken ? 
            `${scoreDed} ${this.theme.messages.penalty.text}` : 
            scoreDed.toString();
        this.showFloatingText(cx, cy, penaltyText, this.theme.colors.wrong, document.getElementById(areaId), isBroken);

        // 練習模式記錄錯題
        if (player === 'sp' && !this.state.wrongHistory.includes(currentQ)) {
            this.state.wrongHistory.push(currentQ);
        }

        // 懲罰鎖定時間（錯越多鎖越久）
        let penaltyTime = 800 * Math.pow(1.5, this.state.wrongStreak[realPlayer] - 1);
        if (penaltyTime > 3000) penaltyTime = 3000;
        
        this.state.locked[realPlayer] = true;
        const grid = document.getElementById(`opts-${player}`);
        if (grid) {
            grid.style.opacity = "0.4";
            grid.style.pointerEvents = "none";
        }
        
        setTimeout(() => {
            this.state.locked[realPlayer] = false;
            if (grid) {
                grid.style.opacity = "1";
                grid.style.pointerEvents = "auto";
            }
        }, penaltyTime);
    }

    /**
     * 更新 Combo 顯示
     */
    updateComboUI(player, val) {
        const comboThreshold = this.theme.messages.combo.minCount || 2;
        const comboText = this.theme.messages.combo.text || "COMBO";
        
        if (player === 'sp') {
            const box = document.getElementById('sp-combo-box');
            const num = document.getElementById('sp-combo-val');
            if (!box || !num) return;
            
            num.innerText = val.toString();
            
            if (val >= comboThreshold) {
                box.classList.remove('hidden');
                box.style.animation = 'none';
                box.offsetHeight; // 觸發重繪
                box.style.animation = 'comboPop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            } else {
                box.classList.add('hidden');
            }
        } else {
            const el = document.getElementById(`combo-${player}`);
            if (!el) return;
            
            el.innerText = `${comboText} x${val}`;
            el.style.opacity = (val >= comboThreshold) ? '1' : '0';
            
            if (val >= comboThreshold) {
                el.style.transform = 'scale(1.2)';
                setTimeout(() => {
                    el.style.transform = 'scale(1)';
                }, 150);
            }
        }
    }

    /**
     * 更新分數顯示
     */
    updateScoreUI() {
        if (this.state.mode === 'practice') {
            const spScore = document.getElementById('sp-score');
            if (spScore) spScore.innerText = this.state.scores.p1.toString();
            return;
        }
        
        // 雙人模式
        const scoreP1 = document.getElementById('score-p1');
        const scoreP2 = document.getElementById('score-p2');
        if (scoreP1) scoreP1.innerText = this.state.scores.p1.toString();
        if (scoreP2) scoreP2.innerText = this.state.scores.p2.toString();
        
        // 更新進度條
        const barP1 = document.getElementById('bar-p1');
        const barP2 = document.getElementById('bar-p2');
        
        let max = this.state.targetScore > 0 ? this.state.targetScore : 30;
        if (this.state.mode === 'speed') max = 20;
        
        const p1Pct = Math.min((this.state.scores.p1 / max) * 100, 100);
        const p2Pct = Math.min((this.state.scores.p2 / max) * 100, 100);
        
        if (barP1) barP1.style.width = p1Pct + '%';
        if (barP2) barP2.style.width = p2Pct + '%';
    }

    /**
     * 顯示浮動文字
     */
    showFloatingText(x, y, text, color, parent, isBroken = false) {
        if (!parent) return;
        
        const el = document.createElement('div');
        el.className = 'float-score';
        if (isBroken) el.classList.add('broken-voice');
        el.textContent = text;
        el.style.color = color;
        
        const rect = parent.getBoundingClientRect();
        el.style.left = (x - rect.left) + 'px';
        el.style.top = (y - rect.top) + 'px';
        
        parent.appendChild(el);
        setTimeout(() => el.remove(), 1000);
    }

    /**
     * Combo 射擊效果
     */
    shootCombo(fromPlayer, toPlayer) {
        const projectile = document.createElement('div');
        projectile.className = `combo-shot shot-${fromPlayer}`;
        projectile.innerText = this.theme.messages.combo.text || "COMBO!";
        projectile.style.left = "50%";
        document.body.appendChild(projectile);
        setTimeout(() => projectile.remove(), 1200);
    }

    /**
     * 決定勝負
     */
    determineWinner() {
        let winner = null;
        if (this.state.scores.p1 > this.state.scores.p2) {
            winner = 'p1';
        } else if (this.state.scores.p2 > this.state.scores.p1) {
            winner = 'p2';
        } else {
            winner = 'draw';
        }
        this.endGame(winner);
    }

    /**
     * 結束遊戲
     */
    endGame(result) {
        clearInterval(this.state.timerInterval);
        
        const gameOver = document.getElementById('game-over');
        if (!gameOver) return;
        
        gameOver.classList.remove('hidden');
        
        const t1 = document.getElementById('res-title-p1');
        const t2 = document.getElementById('res-title-p2');
        const m1 = document.getElementById('res-msg-p1');
        const m2 = document.getElementById('res-msg-p2');
        const s1 = document.getElementById('res-score-p1');
        const s2 = document.getElementById('res-score-p2');
        
        if (s1) s1.innerText = `Score: ${this.state.scores.p1}`;
        if (s2) s2.innerText = `Score: ${this.state.scores.p2}`;
        
        if (t1) t1.className = "result-title";
        if (t2) t2.className = "result-title";

        if (result === 'p1') {
            if (t1) {
                t1.innerText = "WINNER!";
                t1.classList.add('win-msg');
            }
            if (m1) m1.innerText = this.getRandomMsg(this.theme.messages.win);
            if (t2) {
                t2.innerText = "LOSE...";
                t2.classList.add('lose-msg');
            }
            if (m2) m2.innerText = this.getRandomMsg(this.theme.messages.lose);
        } else if (result === 'p2') {
            if (t2) {
                t2.innerText = "WINNER!";
                t2.classList.add('win-msg');
            }
            if (m2) m2.innerText = this.getRandomMsg(this.theme.messages.win);
            if (t1) {
                t1.innerText = "LOSE...";
                t1.classList.add('lose-msg');
            }
            if (m1) m1.innerText = this.getRandomMsg(this.theme.messages.lose);
        } else {
            if (t1) t1.innerText = "DRAW";
            if (t2) t2.innerText = "DRAW";
            if (m1) m1.innerText = this.getRandomMsg(this.theme.messages.draw);
            if (m2) m2.innerText = this.getRandomMsg(this.theme.messages.draw);
        }
    }

    /**
     * 隨機獲取訊息
     */
    getRandomMsg(arr) {
        if (!arr || arr.length === 0) return "";
        return arr[Math.floor(Math.random() * arr.length)];
    }

    /**
     * 播放音效
     */
    playSound(type) {
        if (!this.theme.features.soundEffects) return;
        if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
        
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        
        if (type === 'correct') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, this.audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(659.25, this.audioCtx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.3);
            osc.start();
            osc.stop(this.audioCtx.currentTime + 0.3);
        } else if (type === 'wrong') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, this.audioCtx.currentTime);
            osc.frequency.linearRampToValueAtTime(100, this.audioCtx.currentTime + 0.2);
            gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
            gain.gain.linearRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.3);
            osc.start();
            osc.stop(this.audioCtx.currentTime + 0.3);
        } else if (type === 'count') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(440, this.audioCtx.currentTime);
            gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
            gain.gain.linearRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.1);
            osc.start();
            osc.stop(this.audioCtx.currentTime + 0.1);
        } else if (type === 'go') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(880, this.audioCtx.currentTime);
            gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
            gain.gain.linearRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.3);
            osc.start();
            osc.stop(this.audioCtx.currentTime + 0.3);
        }
        
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
    }

    /**
     * 顯示選單
     */
    showMenu() {
        clearInterval(this.state.timerInterval);
        
        document.getElementById('main-menu').classList.remove('hidden');
        document.getElementById('game-over').classList.add('hidden');
        document.getElementById('countdown-overlay').classList.add('hidden');
        
        const spArea = document.getElementById('single-player-area');
        const vsContainer = document.getElementById('versus-container');
        const warnLayer = document.getElementById('warning-layer');
        
        if (spArea) spArea.classList.add('hidden');
        if (vsContainer) vsContainer.style.display = 'flex';
        if (warnLayer) warnLayer.classList.add('hidden');
    }

    /**
     * 顯示對照表
     */
    toggleTable(show) {
        const el = document.getElementById('ref-table-overlay');
        if (!el) return;
        
        if (show) {
            const tbody = document.getElementById('math-table-body');
            if (tbody) {
                tbody.innerHTML = '';
                
                // 表頭
                const headerRow = document.createElement('tr');
                headerRow.innerHTML = '<th style="width:35%">圖</th><th style="width:15%">代號</th><th style="width:25%">泛音</th><th style="width:25%">諧音</th>';
                tbody.appendChild(headerRow);
                
                // 資料
                if (this.questions.referenceTable) {
                    this.questions.referenceTable.forEach(item => {
                        const tr = document.createElement('tr');
                        if (item.type === "header") {
                            tr.style.background = "#eee";
                            const td = document.createElement('td');
                            td.colSpan = 4;
                            td.style.fontWeight = "bold";
                            td.style.padding = "10px";
                            td.style.color = "#333";
                            td.textContent = item.title;
                            tr.appendChild(td);
                        } else {
                            const tdImg = document.createElement('td');
                            const img = document.createElement('img');
                            img.src = this.themeData.basePath + item.image;
                            img.style.maxHeight = "50px";
                            img.style.maxWidth = "100%";
                            img.style.display = "block";
                            img.style.margin = "0 auto";
                            tdImg.appendChild(img);
                            tr.appendChild(tdImg);
                            
                            const tdVal = document.createElement('td');
                            tdVal.textContent = item.value;
                            tdVal.style.fontWeight = "bold";
                            tdVal.style.color = "#e67e22";
                            tr.appendChild(tdVal);
                            
                            const tdO = document.createElement('td');
                            tdO.textContent = item.overtone;
                            tr.appendChild(tdO);
                            
                            const tdH = document.createElement('td');
                            tdH.textContent = item.harmonic;
                            tr.appendChild(tdH);
                        }
                        tbody.appendChild(tr);
                    });
                }
            }
            el.classList.remove('hidden');
        } else {
            el.classList.add('hidden');
        }
    }
}

// 導出
if (typeof window !== 'undefined') {
    window.GameEngine = GameEngine;
}
