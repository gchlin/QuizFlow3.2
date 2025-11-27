/**
 * 主題載入器 - 載入並整合主題資料
 * 支援動態主題切換
 */

class ThemeLoader {
    constructor() {
        this.currentTheme = null;
        this.loadedThemes = new Map();
    }

    /**
     * 載入主題資料
     * @param {string} themeId - 主題 ID (例如: 'wave-harmonics', 'organic-chemistry')
     * @returns {Promise<Object>} 包含 questions, config, theme 的物件
     */
    async loadTheme(themeId) {
        // 檢查是否已載入
        if (this.loadedThemes.has(themeId)) {
            console.log(`[ThemeLoader] 使用已緩存的主題: ${themeId}`);
            return this.loadedThemes.get(themeId);
        }

        console.log(`[ThemeLoader] 正在載入主題: ${themeId}...`);

        try {
            const basePath = `themes/${themeId}/`;
            
            // 並行載入三個配置文件
            const [questions, config, theme] = await Promise.all([
                this.fetchJSON(`${basePath}questions-v2.json`).catch(() => 
                    this.fetchJSON(`${basePath}questions.json`)
                ),
                this.fetchJSON(`${basePath}config-v2.json`).catch(() => 
                    this.fetchJSON(`${basePath}config.json`)
                ),
                this.fetchJSON(`${basePath}theme-v2.json`).catch(() => 
                    this.fetchJSON(`${basePath}theme.json`)
                )
            ]);

            const themeData = {
                id: themeId,
                basePath: basePath,
                questions: questions,
                config: config,
                theme: theme
            };

            // 緩存已載入的主題
            this.loadedThemes.set(themeId, themeData);
            this.currentTheme = themeData;

            console.log(`[ThemeLoader] 主題載入成功: ${theme.meta.name}`);
            console.log(`- 選項池: ${Object.keys(questions.answerPools).length} 個`);
            console.log(`- 題目集: ${Object.keys(questions.questionSets).length} 個`);
            console.log(`- 關卡: ${config.levels.length} 個`);

            // 預載入圖片
            await this.preloadImages(themeData);

            return themeData;

        } catch (error) {
            console.error(`[ThemeLoader] 載入主題失敗: ${themeId}`, error);
            throw new Error(`無法載入主題「${themeId}」: ${error.message}`);
        }
    }

    /**
     * 獲取 JSON 資料
     */
    async fetchJSON(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${url}`);
        }
        return await response.json();
    }

    /**
     * 預載入主題中的所有圖片
     */
    async preloadImages(themeData) {
        const imagePaths = new Set();

        // 從選項池收集圖片
        for (const pool of Object.values(themeData.questions.answerPools)) {
            if (pool.type === 'image') {
                pool.items.forEach(item => {
                    imagePaths.add(themeData.basePath + item.content);
                });
            }
        }

        // 從題目收集圖片
        for (const questionSet of Object.values(themeData.questions.questionSets)) {
            if (questionSet.questions) {
                questionSet.questions.forEach(q => {
                    if (q.type === 'image') {
                        imagePaths.add(themeData.basePath + q.content);
                    }
                });
            }
        }

        // 從參考表收集圖片（如果有）
        if (themeData.questions.referenceTable) {
            themeData.questions.referenceTable.forEach(row => {
                if (row.type === 'row' && row.image) {
                    imagePaths.add(themeData.basePath + row.image);
                }
            });
        }

        console.log(`[ThemeLoader] 預載入 ${imagePaths.size} 張圖片...`);

        // 創建隱藏容器
        let preloadContainer = document.getElementById('preload-container');
        if (!preloadContainer) {
            preloadContainer = document.createElement('div');
            preloadContainer.id = 'preload-container';
            preloadContainer.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;z-index:-1;';
            document.body.appendChild(preloadContainer);
        }

        // 預載入圖片
        const promises = Array.from(imagePaths).map(src => {
            return new Promise((resolve, reject) => {
                const img = document.createElement('img');
                img.onload = () => resolve(src);
                img.onerror = () => {
                    console.warn(`[ThemeLoader] 圖片載入失敗: ${src}`);
                    resolve(src); // 繼續執行，不因單張圖片失敗而中斷
                };
                img.src = src;
                preloadContainer.appendChild(img);
            });
        });

        try {
            await Promise.all(promises);
            console.log(`[ThemeLoader] 圖片預載入完成`);
        } catch (error) {
            console.warn(`[ThemeLoader] 部分圖片載入失敗:`, error);
        }
    }

    /**
     * 獲取當前主題
     */
    getCurrentTheme() {
        return this.currentTheme;
    }

    /**
     * 列出所有可用主題（需要配置文件支援）
     */
    async listAvailableThemes() {
        // 這裡需要一個 themes.json 來列出所有可用主題
        // 或者由外部配置提供
        return ['wave-harmonics', 'organic-chemistry'];
    }

    /**
     * 清除緩存
     */
    clearCache() {
        this.loadedThemes.clear();
        console.log('[ThemeLoader] 緩存已清除');
    }
}

// 導出供全域使用
if (typeof window !== 'undefined') {
    window.ThemeLoader = ThemeLoader;
}
