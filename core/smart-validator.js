/**
 * 智能驗證器 v2.0
 * 支援：
 * - 自動清理 AI 雜訊
 * - 部分驗證
 * - 智能修復建議
 * - 選項池邏輯檢查
 */

class SmartValidator {
    constructor() {
        this.errors = [];
        this.warnings = [];
        this.fixes = [];
        this.cleaningSteps = [];
    }

    /**
     * 完整驗證流程
     */
    validate(rawInput) {
        // 階段 1: 自動清理
        const cleanResult = this.autoClean(rawInput);
        
        // 階段 2: 解析 JSON
        let data;
        try {
            data = JSON.parse(cleanResult.cleaned);
        } catch (e) {
            return {
                success: false,
                stage: 'parse',
                error: `JSON 解析失敗: ${e.message}`,
                cleaningSteps: cleanResult.steps
            };
        }
        
        // 階段 3: 部分驗證
        const validation = this.validatePartial(data);
        
        return {
            success: validation.errors.length === 0,
            stage: 'complete',
            cleaningSteps: cleanResult.steps,
            cleaned: cleanResult.cleaned,
            data: data,
            validation: validation
        };
    }

    /**
     * 階段 1: 自動清理 AI 生成的雜訊
     */
    autoClean(rawText) {
        const steps = [];
        let result = rawText;
        
        // 步驟 1: 移除 Markdown 代碼塊
        const markdownPattern = /```(?:json)?\s*\n?([\s\S]*?)\n?```/g;
        const markdownMatches = result.match(markdownPattern);
        if (markdownMatches) {
            result = result.replace(/```(?:json)?\s*\n?/g, '').replace(/```\s*\n?/g, '');
            steps.push(`移除 ${markdownMatches.length} 個 Markdown 代碼塊`);
        }
        
        // 步驟 2: 提取 JSON 主體
        const jsonStart = result.indexOf('{');
        const jsonEnd = result.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonStart < jsonEnd) {
            const beforeLength = result.length;
            const prefix = result.substring(0, jsonStart);
            const suffix = result.substring(jsonEnd + 1);
            result = result.substring(jsonStart, jsonEnd + 1);
            
            const removedChars = (prefix + suffix).trim().length;
            if (removedChars > 0) {
                steps.push(`移除前後說明文字 (${removedChars} 字)`);
            }
        }
        
        // 步驟 3: 統一變數命名
        const keyMappings = {
            '"ID"': '"id"',
            '"Id"': '"id"',
            '"Type"': '"type"',
            '"Content"': '"content"',
            '"CorrectAnswer"': '"correctAnswer"',
            '"AnswerPoolIds"': '"answerPoolIds"',
            '"QuestionSets"': '"questionSets"',
            '"AnswerPools"': '"answerPools"'
        };
        
        let normalizedCount = 0;
        for (const [wrong, correct] of Object.entries(keyMappings)) {
            const regex = new RegExp(wrong + '\\s*:', 'g');
            const matches = result.match(regex);
            if (matches) {
                result = result.replace(regex, correct + ':');
                normalizedCount += matches.length;
            }
        }
        if (normalizedCount > 0) {
            steps.push(`統一 ${normalizedCount} 個變數命名`);
        }
        
        // 步驟 4: 移除註解
        const commentPattern = /\/\*[\s\S]*?\*\/|\/\/.*/g;
        const comments = result.match(commentPattern);
        if (comments) {
            result = result.replace(commentPattern, '');
            steps.push(`移除 ${comments.length} 個註解`);
        }
        
        // 步驟 5: 修正常見格式錯誤
        let fixCount = 0;
        
        // 物件最後一個屬性多餘的逗號
        const trailingComma = result.match(/,(\s*[}\]])/g);
        if (trailingComma) {
            result = result.replace(/,(\s*[}\]])/g, '$1');
            fixCount += trailingComma.length;
        }
        
        // 缺少逗號（兩個相鄰的 "key": 之間）
        const missingComma = result.match(/("\w+":\s*(?:"[^"]*"|[\d.]+|true|false|null|\{[^}]*\}|\[[^\]]*\]))\s+"/g);
        if (missingComma) {
            result = result.replace(/("\w+":\s*(?:"[^"]*"|[\d.]+|true|false|null|\{[^}]*\}|\[[^\]]*\]))\s+"/g, '$1,\n  "');
            fixCount += missingComma.length;
        }
        
        if (fixCount > 0) {
            steps.push(`修正 ${fixCount} 個格式錯誤`);
        }
        
        return {
            cleaned: result,
            steps: steps,
            original: rawText
        };
    }

    /**
     * 階段 2: 部分驗證
     */
    validatePartial(data) {
        const results = {
            valid: [],      // 完全正確
            fixable: [],    // 可自動修復
            warnings: [],   // 警告但可用
            errors: [],     // 嚴重錯誤
            statistics: {}
        };

        // 驗證基本結構
        this.validateStructure(data, results);
        
        // 驗證答案池
        const poolsResult = this.validateAnswerPools(data.answerPools, results);
        
        // 驗證題目集
        const setsResult = this.validateQuestionSets(data.questionSets, data.answerPools, results);
        
        // 統計資訊
        results.statistics = {
            totalPools: Object.keys(data.answerPools || {}).length,
            totalSets: Object.keys(data.questionSets || {}).length,
            totalQuestions: setsResult.totalQuestions,
            validQuestions: results.valid.length,
            fixableQuestions: results.fixable.length,
            warningQuestions: results.warnings.length,
            errorQuestions: results.errors.length
        };

        return results;
    }

    /**
     * 驗證基本結構
     */
    validateStructure(data, results) {
        if (!data.answerPools) {
            results.errors.push({
                type: 'STRUCTURE',
                severity: 'critical',
                message: '缺少 answerPools 定義',
                fix: null
            });
        }
        if (!data.questionSets) {
            results.errors.push({
                type: 'STRUCTURE',
                severity: 'critical',
                message: '缺少 questionSets 定義',
                fix: null
            });
        }
    }

    /**
     * 驗證答案池
     */
    validateAnswerPools(pools, results) {
        if (!pools) return { valid: 0, errors: 0 };

        let valid = 0, errors = 0;
        const poolIds = new Set();

        for (const [poolId, pool] of Object.entries(pools)) {
            // 檢查重複 ID
            if (poolIds.has(poolId)) {
                results.errors.push({
                    type: 'DUPLICATE_POOL_ID',
                    poolId: poolId,
                    message: `答案池 ID "${poolId}" 重複`
                });
                errors++;
                continue;
            }
            poolIds.add(poolId);

            // 檢查名稱
            if (!pool.name) {
                results.warnings.push({
                    type: 'MISSING_POOL_NAME',
                    poolId: poolId,
                    message: `答案池 "${poolId}" 缺少名稱`,
                    suggestion: poolId
                });
            }

            // 檢查類型
            if (!pool.type || !['text', 'image'].includes(pool.type)) {
                results.errors.push({
                    type: 'INVALID_POOL_TYPE',
                    poolId: poolId,
                    message: `答案池 "${poolId}" 類型錯誤或缺失`,
                    current: pool.type,
                    expected: ['text', 'image']
                });
                errors++;
                continue;
            }

            // 檢查選項數量
            if (!pool.items || pool.items.length < 2) {
                results.errors.push({
                    type: 'INSUFFICIENT_OPTIONS',
                    poolId: poolId,
                    message: `答案池 "${poolId}" 至少需要 2 個選項`,
                    current: pool.items?.length || 0,
                    minimum: 2
                });
                errors++;
                continue;
            }

            // 檢查選項 ID 唯一性
            const itemIds = new Set();
            pool.items.forEach((item, idx) => {
                if (!item.id) {
                    results.fixable.push({
                        type: 'MISSING_ITEM_ID',
                        poolId: poolId,
                        itemIndex: idx,
                        message: `答案池 "${poolId}" 的選項 ${idx} 缺少 id`,
                        suggestion: `${poolId}_${idx}`
                    });
                } else if (itemIds.has(item.id)) {
                    results.errors.push({
                        type: 'DUPLICATE_ITEM_ID',
                        poolId: poolId,
                        itemId: item.id,
                        message: `答案池 "${poolId}" 有重複的選項 ID: ${item.id}`
                    });
                } else {
                    itemIds.add(item.id);
                }

                if (!item.content) {
                    results.errors.push({
                        type: 'MISSING_ITEM_CONTENT',
                        poolId: poolId,
                        itemId: item.id,
                        message: `選項 "${item.id}" 缺少 content`
                    });
                }

                // 檢查圖片路徑
                if (pool.type === 'image' && item.content) {
                    if (!item.content.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i)) {
                        results.warnings.push({
                            type: 'INVALID_IMAGE_PATH',
                            poolId: poolId,
                            itemId: item.id,
                            message: `選項 "${item.id}" 的圖片路徑可能不正確: ${item.content}`
                        });
                    }
                }
            });

            valid++;
        }

        return { valid, errors };
    }

    /**
     * 驗證題目集
     */
    validateQuestionSets(sets, pools, results) {
        if (!sets) return { valid: 0, errors: 0, totalQuestions: 0 };

        let totalQuestions = 0;
        const setIds = new Set();

        for (const [setId, set] of Object.entries(sets)) {
            // 檢查重複 ID
            if (setIds.has(setId)) {
                results.errors.push({
                    type: 'DUPLICATE_SET_ID',
                    setId: setId,
                    message: `題目集 ID "${setId}" 重複`
                });
                continue;
            }
            setIds.add(setId);

            // 檢查名稱
            if (!set.name) {
                results.warnings.push({
                    type: 'MISSING_SET_NAME',
                    setId: setId,
                    message: `題目集 "${setId}" 缺少名稱`,
                    suggestion: setId
                });
            }

            // 檢查繼承
            if (set.inheritFrom) {
                set.inheritFrom.forEach(parentId => {
                    if (!sets[parentId]) {
                        results.errors.push({
                            type: 'INVALID_INHERIT',
                            setId: setId,
                            parentId: parentId,
                            message: `題目集 "${setId}" 繼承了不存在的題目集: ${parentId}`
                        });
                    }
                });
                continue; // 繼承的題目集不檢查 questions
            }

            // 檢查答案池關聯
            if (!set.answerPoolIds || set.answerPoolIds.length === 0) {
                results.errors.push({
                    type: 'MISSING_ANSWER_POOLS',
                    setId: setId,
                    message: `題目集 "${setId}" 必須指定 answerPoolIds`
                });
                continue;
            }

            set.answerPoolIds.forEach(poolId => {
                if (!pools || !pools[poolId]) {
                    results.errors.push({
                        type: 'POOL_NOT_FOUND',
                        setId: setId,
                        poolId: poolId,
                        message: `題目集 "${setId}" 引用了不存在的答案池: ${poolId}`
                    });
                }
            });

            // 檢查題目
            if (!set.questions || set.questions.length === 0) {
                results.errors.push({
                    type: 'NO_QUESTIONS',
                    setId: setId,
                    message: `題目集 "${setId}" 至少需要 1 個題目`
                });
                continue;
            }

            // 逐題驗證
            const questionIds = new Set();
            set.questions.forEach((q, idx) => {
                totalQuestions++;
                const qResult = this.validateQuestion(q, idx, setId, set, pools);
                
                if (qResult.id && questionIds.has(qResult.id)) {
                    qResult.issues.push({
                        type: 'DUPLICATE_QUESTION_ID',
                        message: `題目 ID "${qResult.id}" 重複`
                    });
                }
                if (qResult.id) questionIds.add(qResult.id);

                // 分類題目
                if (qResult.issues.length === 0) {
                    results.valid.push(qResult);
                } else {
                    const maxSeverity = Math.max(...qResult.issues.map(i => 
                        i.severity === 'critical' ? 3 :
                        i.severity === 'error' ? 2 :
                        i.severity === 'warning' ? 1 : 0
                    ));

                    if (maxSeverity === 3 || maxSeverity === 2) {
                        results.errors.push(qResult);
                    } else if (maxSeverity === 1) {
                        results.warnings.push(qResult);
                    } else {
                        results.fixable.push(qResult);
                    }
                }
            });
        }

        return { totalQuestions };
    }

    /**
     * 驗證單個題目
     */
    validateQuestion(q, idx, setId, set, pools) {
        const result = {
            setId: setId,
            index: idx,
            id: q.id,
            question: q,
            issues: []
        };

        // 檢查 ID
        if (!q.id) {
            result.issues.push({
                type: 'MISSING_FIELD',
                field: 'id',
                severity: 'fixable',
                message: '缺少 id',
                suggestion: `q${setId.slice(-1)}_${idx + 1}`
            });
        }

        // 檢查類型
        if (!q.type) {
            result.issues.push({
                type: 'MISSING_FIELD',
                field: 'type',
                severity: 'error',
                message: '缺少 type'
            });
        } else if (!['text', 'image'].includes(q.type)) {
            result.issues.push({
                type: 'INVALID_TYPE',
                field: 'type',
                severity: 'error',
                message: `type 必須是 'text' 或 'image'`,
                current: q.type
            });
        }

        // 檢查內容
        if (!q.content) {
            result.issues.push({
                type: 'MISSING_FIELD',
                field: 'content',
                severity: 'error',
                message: '缺少 content'
            });
        }

        // 檢查正確答案
        if (!q.correctAnswer) {
            result.issues.push({
                type: 'MISSING_FIELD',
                field: 'correctAnswer',
                severity: 'critical',
                message: '缺少 correctAnswer'
            });
        } else {
            // 檢查答案是否存在
            const answerCheck = this.checkAnswerExists(q.correctAnswer, q, set, pools);
            if (!answerCheck.exists) {
                const similar = this.findSimilarAnswers(q.correctAnswer, q, set, pools);
                result.issues.push({
                    type: 'ANSWER_NOT_FOUND',
                    field: 'correctAnswer',
                    severity: similar.length > 0 ? 'fixable' : 'error',
                    message: `答案 "${q.correctAnswer}" 不存在於指定的答案池中`,
                    suggestions: similar
                });
            } else {
                // 檢查選項池邏輯（v2.0 新增）
                const poolCheck = this.checkAnswerPoolLogic(q, set, pools);
                if (!poolCheck.valid) {
                    result.issues.push({
                        type: 'POOL_LOGIC_WARNING',
                        severity: 'warning',
                        message: poolCheck.message,
                        suggestion: poolCheck.suggestion
                    });
                }
            }
        }

        // 檢查題目層級的 answerPoolIds（v2.0 新增）
        if (q.answerPoolIds) {
            q.answerPoolIds.forEach(poolId => {
                if (!pools || !pools[poolId]) {
                    result.issues.push({
                        type: 'POOL_NOT_FOUND',
                        severity: 'error',
                        message: `題目的 answerPoolIds 包含不存在的答案池: ${poolId}`
                    });
                }
            });
        }

        return result;
    }

    /**
     * 檢查答案是否存在
     */
    checkAnswerExists(answerId, question, set, pools) {
        if (!pools) return { exists: false };

        // 決定要搜尋哪些答案池
        const poolsToSearch = question.answerPoolIds || set.answerPoolIds || [];
        
        for (const poolId of poolsToSearch) {
            const pool = pools[poolId];
            if (pool && pool.items) {
                const found = pool.items.find(item => item.id === answerId);
                if (found) {
                    return { exists: true, poolId: poolId, item: found };
                }
            }
        }

        return { exists: false };
    }

    /**
     * 檢查選項池邏輯（v2.0 新增）
     */
    checkAnswerPoolLogic(question, set, pools) {
        // 如果題目有自己的 answerPoolIds，直接使用
        if (question.answerPoolIds && question.answerPoolIds.length > 0) {
            return { valid: true };
        }

        // 如果沒有，檢查是否需要覆寫
        const answerCheck = this.checkAnswerExists(question.correctAnswer, question, set, pools);
        if (!answerCheck.exists || !answerCheck.poolId) {
            return { valid: true }; // 答案不存在的問題由其他檢查處理
        }

        const answerPool = pools[answerCheck.poolId];
        const answerCategory = answerPool.category;

        // 如果沒有 category，無法判斷
        if (!answerCategory) {
            return { valid: true };
        }

        // 檢查其他答案池是否有不同 category
        const poolsToSearch = set.answerPoolIds || [];
        const categories = new Set();
        
        for (const poolId of poolsToSearch) {
            const pool = pools[poolId];
            if (pool && pool.category) {
                categories.add(pool.category);
            }
        }

        // 如果有多個不同類別，建議使用題目層級 answerPoolIds
        if (categories.size > 1) {
            return {
                valid: false,
                message: `此題目集混合了多種類別 (${Array.from(categories).join(', ')})，建議在題目中指定 answerPoolIds`,
                suggestion: {
                    answerPoolIds: [answerCheck.poolId]
                }
            };
        }

        return { valid: true };
    }

    /**
     * 尋找相似的答案 ID（用於修復建議）
     */
    findSimilarAnswers(target, question, set, pools) {
        if (!pools) return [];

        const poolsToSearch = question.answerPoolIds || set.answerPoolIds || [];
        const similar = [];

        for (const poolId of poolsToSearch) {
            const pool = pools[poolId];
            if (pool && pool.items) {
                pool.items.forEach(item => {
                    const distance = this.levenshteinDistance(target, item.id);
                    if (distance <= 2) {
                        similar.push({
                            id: item.id,
                            content: item.content,
                            distance: distance,
                            poolId: poolId
                        });
                    }
                });
            }
        }

        return similar.sort((a, b) => a.distance - b.distance).slice(0, 5);
    }

    /**
     * 計算編輯距離（Levenshtein Distance）
     */
    levenshteinDistance(str1, str2) {
        const len1 = str1.length;
        const len2 = str2.length;
        const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));

        for (let i = 0; i <= len1; i++) matrix[i][0] = i;
        for (let j = 0; j <= len2; j++) matrix[0][j] = j;

        for (let i = 1; i <= len1; i++) {
            for (let j = 1; j <= len2; j++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j - 1] + cost
                );
            }
        }

        return matrix[len1][len2];
    }

    /**
     * 生成 HTML 報告
     */
    generateReport(validationResult) {
        if (!validationResult.validation) return '';

        const v = validationResult.validation;
        const stats = v.statistics;
        
        let html = '<div class="validation-report">';

        // 清理步驟
        if (validationResult.cleaningSteps && validationResult.cleaningSteps.length > 0) {
            html += '<div class="alert alert-info">';
            html += '<h4>🧹 自動清理完成</h4><ul>';
            validationResult.cleaningSteps.forEach(step => {
                html += `<li>${step}</li>`;
            });
            html += '</ul></div>';
        }

        // 統計資訊
        html += '<div class="stats-summary">';
        html += '<div class="stat-grid">';
        html += `<div class="stat-box valid"><div class="num">${stats.validQuestions}</div><div class="label">完全正確</div></div>`;
        html += `<div class="stat-box fixable"><div class="num">${stats.fixableQuestions}</div><div class="label">可自動修復</div></div>`;
        html += `<div class="stat-box warning"><div class="num">${stats.warningQuestions}</div><div class="label">有警告</div></div>`;
        html += `<div class="stat-box error"><div class="num">${stats.errorQuestions}</div><div class="label">嚴重錯誤</div></div>`;
        html += '</div></div>';

        // 錯誤詳情
        if (v.errors.length > 0) {
            html += '<div class="alert alert-danger">';
            html += `<h4>❌ 嚴重錯誤 (${v.errors.length} 題)</h4>`;
            html += '<div class="error-list">';
            v.errors.forEach((err, idx) => {
                html += this.renderQuestionIssues(err, idx, 'error');
            });
            html += '</div></div>';
        }

        // 可修復項目
        if (v.fixable.length > 0) {
            html += '<div class="alert alert-warning">';
            html += `<h4>🔧 可自動修復 (${v.fixable.length} 題)</h4>`;
            html += '<div class="fixable-list">';
            v.fixable.forEach((fix, idx) => {
                html += this.renderQuestionIssues(fix, idx, 'fixable');
            });
            html += '</div></div>';
        }

        // 警告項目
        if (v.warnings.length > 0) {
            html += '<div class="alert alert-info">';
            html += `<h4>⚠️ 警告 (${v.warnings.length} 題)</h4>`;
            html += '<div class="warning-list">';
            v.warnings.forEach((warn, idx) => {
                html += this.renderQuestionIssues(warn, idx, 'warning');
            });
            html += '</div></div>';
        }

        // 成功訊息
        if (v.errors.length === 0) {
            html += '<div class="alert alert-success">';
            html += '<h4>✅ 驗證通過！</h4>';
            html += `<p>題庫包含 ${stats.totalQuestions} 題，其中 ${stats.validQuestions} 題完全正確。</p>`;
            if (stats.fixableQuestions > 0) {
                html += `<p>有 ${stats.fixableQuestions} 題可以自動修復。</p>`;
            }
            html += '</div>';
        }

        html += '</div>';
        return html;
    }

    /**
     * 渲染單個題目的問題
     */
    renderQuestionIssues(result, idx, type) {
        const q = result.question;
        let html = `<div class="question-issue ${type}" data-index="${idx}">`;
        html += `<div class="issue-header">`;
        html += `<strong>題目 ${result.id || `#${result.index + 1}`}</strong> (${result.setId})`;
        html += `</div>`;
        
        if (q.content) {
            html += `<div class="issue-content">內容: ${this.truncate(q.content, 50)}</div>`;
        }

        html += '<div class="issue-list"><ul>';
        result.issues.forEach(issue => {
            html += `<li class="issue-${issue.severity}">`;
            html += `<span class="issue-type">[${issue.type}]</span> `;
            html += issue.message;
            
            if (issue.suggestions && issue.suggestions.length > 0) {
                html += '<div class="suggestions">';
                html += '<strong>建議修正:</strong><ul>';
                issue.suggestions.forEach(sug => {
                    html += `<li>${sug.id} (${sug.content}) - 相似度: ${100 - sug.distance * 10}%</li>`;
                });
                html += '</ul></div>';
            }
            
            if (issue.suggestion && typeof issue.suggestion === 'string') {
                html += `<div class="suggestion">建議: <code>${issue.suggestion}</code></div>`;
            }
            
            html += '</li>';
        });
        html += '</ul></div>';
        
        html += '</div>';
        return html;
    }

    /**
     * 截斷長文字
     */
    truncate(str, length) {
        if (str.length <= length) return str;
        return str.substring(0, length) + '...';
    }
}

// 導出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SmartValidator;
}
