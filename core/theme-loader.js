/**
 * QuizFlow Theme Loader v2.0
 * 防快取版本 - 永遠載入最新檔案！
 * 
 * 功能：
 * - 載入主題 JSON 檔案（theme, config, questions）
 * - 自動加時間戳記防止瀏覽器快取
 * - 驗證 JSON 格式
 * - 合併主題資料
 */

class ThemeLoader {
  constructor() {
    this.currentTheme = null;
    this.enableCache = false; // 設為 false = 開發模式，永遠重新載入
  }

  /**
   * 載入完整主題
   * @param {string} themeName - 主題名稱（例如：'wave-harmonics'）
   * @returns {Promise<Object>} 完整主題資料
   */
  async loadTheme(themeName) {
    try {
      console.log(`🎨 載入主題：${themeName}`);
      
      // 載入三個 JSON 檔案
      const themeData = await this.loadThemeData(themeName);
      
      // 驗證資料
      this.validateThemeData(themeData);
      
      // 儲存當前主題
      this.currentTheme = {
        name: themeName,
        ...themeData
      };
      
      console.log('✅ 主題載入成功！');
      return this.currentTheme;
      
    } catch (error) {
      console.error('❌ 主題載入失敗：', error);
      throw new Error(`主題載入失敗：${error.message}`);
    }
  }

  /**
   * 載入主題資料（三個 JSON 檔案）
   * 🔥 加上時間戳記防止快取！
   */
  async loadThemeData(themeName) {
    const base = `themes/${themeName}/`;
    
    // 🔥 防快取關鍵：加上時間戳記
    const cacheBuster = this.enableCache ? '' : `?v=${new Date().getTime()}`;
    
    console.log(`📥 載入檔案（快取${this.enableCache ? '啟用' : '停用'}）...`);
    
    try {
      const [theme, config, questions] = await Promise.all([
        fetch(`${base}theme-v2.json${cacheBuster}`)
          .then(r => {
            if (!r.ok) throw new Error(`theme-v2.json 載入失敗 (${r.status})`);
            console.log('  ✓ theme-v2.json');
            return r.json();
          }),
        fetch(`${base}config-v2.json${cacheBuster}`)
          .then(r => {
            if (!r.ok) throw new Error(`config-v2.json 載入失敗 (${r.status})`);
            console.log('  ✓ config-v2.json');
            return r.json();
          }),
        fetch(`${base}questions-v2.json${cacheBuster}`)
          .then(r => {
            if (!r.ok) throw new Error(`questions-v2.json 載入失敗 (${r.status})`);
            console.log('  ✓ questions-v2.json');
            return r.json();
          })
      ]);

      return { theme, config, questions };
      
    } catch (error) {
      throw new Error(`JSON 檔案載入失敗：${error.message}`);
    }
  }

  /**
   * 驗證主題資料格式
   */
  validateThemeData(data) {
    const { theme, config, questions } = data;

    // 驗證 theme-v2.json
    if (!theme.colors) {
      throw new Error('theme-v2.json 缺少 colors 設定');
    }

    // 驗證 config-v2.json
    if (!config.modes) {
      throw new Error('config-v2.json 缺少 modes 設定');
    }
    if (!config.levels || config.levels.length === 0) {
      throw new Error('config-v2.json 缺少 levels 設定');
    }

    // 驗證 questions-v2.json
    if (!questions.answerPools) {
      throw new Error('questions-v2.json 缺少 answerPools');
    }
    if (!questions.questionSets) {
      throw new Error('questions-v2.json 缺少 questionSets');
    }

    console.log('✅ 資料格式驗證通過');
  }

  /**
   * 獲取關卡資料
   */
  getLevel(levelId) {
    if (!this.currentTheme) {
      throw new Error('請先載入主題');
    }

    const level = this.currentTheme.config.levels.find(l => l.id === levelId);
    if (!level) {
      throw new Error(`找不到關卡：${levelId}`);
    }

    return level;
  }

  /**
   * 獲取題目集
   */
  getQuestionSet(questionSetId) {
    if (!this.currentTheme) {
      throw new Error('請先載入主題');
    }

    const questionSet = this.currentTheme.questions.questionSets[questionSetId];
    if (!questionSet) {
      throw new Error(`找不到題目集：${questionSetId}`);
    }

    return questionSet;
  }

  /**
   * 獲取答案池
   */
  getAnswerPool(poolId) {
    if (!this.currentTheme) {
      throw new Error('請先載入主題');
    }

    const pool = this.currentTheme.questions.answerPools[poolId];
    if (!pool) {
      throw new Error(`找不到答案池：${poolId}`);
    }

    return pool;
  }

  /**
   * 獲取遊戲模式設定
   */
  getMode(modeId) {
    if (!this.currentTheme) {
      throw new Error('請先載入主題');
    }

    const mode = this.currentTheme.config.modes[modeId];
    if (!mode) {
      throw new Error(`找不到遊戲模式：${modeId}`);
    }

    return mode;
  }

  /**
   * 列出可用主題
   */
  listAvailableThemes() {
    return [
      'wave-harmonics',
      'organic-chemistry'
      // 新增主題時在這裡加入
    ];
  }

  /**
   * 切換快取模式（開發/發布）
   * @param {boolean} enable - true = 啟用快取（發布用），false = 停用快取（開發用）
   */
  setCacheMode(enable) {
    this.enableCache = enable;
    console.log(`🔧 快取模式：${enable ? '啟用' : '停用'}`);
  }

  /**
   * 重新載入當前主題（強制更新）
   */
  async reloadCurrentTheme() {
    if (!this.currentTheme) {
      throw new Error('沒有載入的主題可以重新載入');
    }
    
    const themeName = this.currentTheme.name;
    console.log('🔄 重新載入主題...');
    return await this.loadTheme(themeName);
  }
}

// 導出供其他檔案使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ThemeLoader;
}
