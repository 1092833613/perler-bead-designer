/**
 * 作品库模块
 * 负责拼豆设计作品的本地存储与管理（基于 localStorage）
 *
 * 存储结构（localStorage key: "perler_gallery"）：
 * {
 *   "works": {
 *     "uuid-1": {
 *       id: "uuid-1",
 *       name: "我的作品",
 *       gridData: [[...]],                    // 二维数组：hex 颜色字符串或 null
 *       thumbnail: "data:image/png;base64,...",
 *       metadata: {
 *         palette: "perler",                   // 色板品牌：'perler' | 'hama' | 'artkal'
 *         gridWidth: 29,
 *         gridHeight: 29,
 *         tags: ["动物", "卡通"],
 *         description: "一只小猫"
 *       },
 *       createdAt: 1234567890,
 *       updatedAt: 1234567890
 *     }
 *   },
 *   "version": "1.0"
 * }
 */

class Gallery {
  /* ============================================================
   * 配置项（只读）
   * ============================================================ */

  /**
   * localStorage 存储键名
   * @returns {string}
   */
  static get STORAGE_KEY() { return 'perler_gallery'; }

  /**
   * 数据结构版本号
   * @returns {string}
   */
  static get STORE_VERSION() { return '1.0'; }

  /**
   * 作品库容量上限（字节）。
   * localStorage 通常为 5-10MB，这里取保守值 5MB。
   * @returns {number}
   */
  static get MAX_STORAGE_BYTES() { return 5 * 1024 * 1024; }

  /* ============================================================
   * 公开接口
   * ============================================================ */

  /**
   * 保存作品到作品库
   * @param {string} name - 作品名称（不能为空）
   * @param {Array<Array<string|null>>} gridData - 网格数据，元素为 hex 颜色或 null
   * @param {Object} [metadata] - 元数据
   * @param {string} [metadata.palette] - 色板品牌 'perler'|'hama'|'artkal'，默认取当前色板
   * @param {number} [metadata.gridWidth] - 网格宽度，默认从 gridData 推断
   * @param {number} [metadata.gridHeight] - 网格高度，默认从 gridData 推断
   * @param {string[]} [metadata.tags] - 标签数组
   * @param {string} [metadata.description] - 描述
   * @returns {string} 作品 ID
   * @throws {Error} 参数非法、localStorage 不可用或超出容量上限时抛出
   */
  static save(name, gridData, metadata = {}) {
    if (typeof name !== 'string' || !name.trim()) {
      throw new Error('作品名称不能为空');
    }
    if (!this._isValidGridData(gridData)) {
      throw new Error('网格数据无效：应为非空二维数组');
    }

    const store = this._loadStore();
    const now = Date.now();
    const id = this._generateUUID();

    store.works[id] = {
      id,
      name: name.trim(),
      gridData,
      thumbnail: this.generateThumbnail(gridData),
      metadata: this._normalizeMetadata(metadata, gridData),
      createdAt: now,
      updatedAt: now
    };

    this._persistStore(store);
    return id;
  }

  /**
   * 获取所有作品列表（摘要格式，不含 gridData，按更新时间倒序）
   * @returns {Array<{id:string, name:string, thumbnail:string, metadata:Object, createdAt:number, updatedAt:number}>}
   */
  static list() {
    const store = this._loadStore();
    return Object.values(store.works)
      .map(w => ({
        id: w.id,
        name: w.name,
        thumbnail: w.thumbnail,
        metadata: w.metadata,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt
      }))
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }

  /**
   * 根据 ID 获取单个作品（含完整 gridData）
   * @param {string} id - 作品 ID
   * @returns {{id:string, name:string, gridData:Array, thumbnail:string, metadata:Object, createdAt:number, updatedAt:number} | null}
   *          作品不存在时返回 null
   */
  static get(id) {
    if (typeof id !== 'string' || !id) return null;
    const store = this._loadStore();
    return store.works[id] || null;
  }

  /**
   * 删除作品
   * @param {string} id - 作品 ID
   * @returns {boolean} 是否删除成功（作品不存在或存储失败时返回 false）
   */
  static delete(id) {
    const store = this._loadStore();
    if (!store.works[id]) return false;
    delete store.works[id];
    try {
      this._persistStore(store);
      return true;
    } catch (e) {
      console.error('[Gallery] 删除作品失败:', e.message || e);
      return false;
    }
  }

  /**
   * 更新作品（覆盖网格数据或元数据）
   * @param {string} id - 作品 ID
   * @param {Object} updates - 待更新字段 {gridData?, name?, metadata?}
   * @param {Array<Array<string|null>>} [updates.gridData] - 新网格数据（会重新生成缩略图，并同步宽高）
   * @param {string} [updates.name] - 新名称
   * @param {Object} [updates.metadata] - 元数据增量（与现有元数据合并）
   * @returns {boolean} 是否更新成功（作品不存在、gridData 非法或存储失败时返回 false）
   */
  static update(id, updates = {}) {
    const store = this._loadStore();
    const work = store.works[id];
    if (!work) return false;

    if (updates.gridData !== undefined && !this._isValidGridData(updates.gridData)) {
      return false;
    }

    if (typeof updates.name === 'string' && updates.name.trim()) {
      work.name = updates.name.trim();
    }

    if (updates.gridData !== undefined) {
      work.gridData = updates.gridData;
      work.thumbnail = this.generateThumbnail(updates.gridData);
      // 若未显式提供宽高，则与新网格数据保持同步
      work.metadata = work.metadata || {};
      if (!updates.metadata || updates.metadata.gridWidth === undefined) {
        work.metadata.gridWidth = updates.gridData[0].length;
      }
      if (!updates.metadata || updates.metadata.gridHeight === undefined) {
        work.metadata.gridHeight = updates.gridData.length;
      }
    }

    if (updates.metadata && typeof updates.metadata === 'object') {
      work.metadata = this._normalizeMetadata({ ...(work.metadata || {}), ...updates.metadata }, work.gridData);
    } else if (work.metadata) {
      work.metadata = this._normalizeMetadata(work.metadata, work.gridData);
    }

    work.updatedAt = Date.now();

    try {
      this._persistStore(store);
      return true;
    } catch (e) {
      console.error('[Gallery] 更新作品失败:', e.message || e);
      return false;
    }
  }

  /**
   * 搜索作品（按名称或标签模糊匹配，大小写不敏感）
   * @param {string} query - 搜索关键词；空字符串返回全部作品
   * @returns {Array<{id:string, name:string, thumbnail:string, metadata:Object, createdAt:number, updatedAt:number}>}
   *          与 list() 相同的摘要格式（不含 gridData）
   */
  static search(query) {
    const q = (typeof query === 'string' ? query : '').trim().toLowerCase();
    const all = this.list();
    if (!q) return all;
    return all.filter(w => {
      if (typeof w.name === 'string' && w.name.toLowerCase().includes(q)) return true;
      const tags = (w.metadata && Array.isArray(w.metadata.tags)) ? w.metadata.tags : [];
      return tags.some(tag => typeof tag === 'string' && tag.toLowerCase().includes(q));
    });
  }

  /**
   * 导出整个作品库为 JSON 字符串
   * @returns {string} 格式化后的 JSON 字符串（含 version 与全部作品）
   */
  static exportAll() {
    const store = this._loadStore();
    store.version = this.STORE_VERSION;
    return JSON.stringify(store, null, 2);
  }

  /**
   * 从 JSON 字符串导入作品库（与现有作品合并；ID 相同会被覆盖，重复导入同一导出文件是幂等的）
   * @param {string} jsonStr - exportAll() 生成的 JSON 字符串
   * @returns {number} 成功导入的作品数量（跳过数据非法的条目）
   * @throws {Error} JSON 解析失败、数据结构不正确或存储空间不足时抛出
   */
  static importAll(jsonStr) {
    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      throw new Error('导入失败：JSON 解析错误，请确认文件由 exportAll() 导出');
    }
    if (!parsed || typeof parsed !== 'object' || !parsed.works || typeof parsed.works !== 'object') {
      throw new Error('导入失败：数据结构不正确（缺少 works 字段）');
    }

    const store = this._loadStore();
    const now = Date.now();
    let count = 0;

    for (const work of Object.values(parsed.works)) {
      if (!work || typeof work !== 'object') continue;
      if (!this._isValidGridData(work.gridData)) continue; // 跳过无有效网格数据的条目

      const id = (typeof work.id === 'string' && work.id) ? work.id : this._generateUUID();
      store.works[id] = {
        id,
        name: (typeof work.name === 'string' && work.name.trim()) ? work.name.trim() : '未命名作品',
        gridData: work.gridData,
        thumbnail: (typeof work.thumbnail === 'string' && work.thumbnail)
          ? work.thumbnail
          : this.generateThumbnail(work.gridData),
        metadata: this._normalizeMetadata(work.metadata, work.gridData),
        createdAt: Number.isFinite(work.createdAt) ? work.createdAt : now,
        updatedAt: Number.isFinite(work.updatedAt) ? work.updatedAt : now
      };
      count++;
    }

    this._persistStore(store);
    return count;
  }

  /**
   * 清空作品库（删除 localStorage 中的全部作品）
   * @returns {void}
   */
  static clear() {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (e) {
      console.error('[Gallery] 清空作品库失败:', e.message || e);
    }
  }

  /**
   * 获取当前作品库在 localStorage 中占用的字节数（UTF-8 估算）
   * @returns {number} 字节数；无数据或读取失败时返回 0
   */
  static getStorageSize() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? this._byteLength(raw) : 0;
    } catch (e) {
      return 0;
    }
  }

  /**
   * 生成作品缩略图（base64 data URL）
   * 空格（null 或非法颜色）绘制为白色；超过 size 的大网格自动等比缩小以控制内存占用
   * @param {Array<Array<string|null>>} gridData - 网格数据
   * @param {number} [size=200] - 缩略图最长边像素数
   * @returns {string} PNG data URL；生成失败（如无 Canvas 环境）时返回空字符串
   */
  static generateThumbnail(gridData, size = 200) {
    try {
      if (!this._isValidGridData(gridData)) return '';
      if (typeof document === 'undefined') return ''; // 非浏览器环境

      const targetSize = (Number.isFinite(size) && size > 0) ? Math.floor(size) : 200;
      const rows = gridData.length;
      const cols = gridData[0].length;
      const maxDim = Math.max(rows, cols);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext && canvas.getContext('2d');
      if (!ctx) return '';

      let cellSize;
      if (maxDim <= targetSize) {
        // 常规网格：整数倍放大，最长边不超过 targetSize，保证像素清晰
        cellSize = Math.max(1, Math.floor(targetSize / maxDim));
        canvas.width = cols * cellSize;
        canvas.height = rows * cellSize;
      } else {
        // 超大网格：等比缩小到最长边 targetSize，避免生成超大画布
        cellSize = 1;
        canvas.width = Math.max(1, Math.round(cols * targetSize / maxDim));
        canvas.height = Math.max(1, Math.round(rows * targetSize / maxDim));
        ctx.scale(canvas.width / cols, canvas.height / rows);
      }

      // 白色背景（null 格子显示为白色）
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, cols * cellSize, rows * cellSize);

      for (let y = 0; y < rows; y++) {
        const row = gridData[y];
        if (!Array.isArray(row)) continue;
        for (let x = 0; x < cols; x++) {
          const color = row[x];
          if (!this._isValidHex(color)) continue;
          ctx.fillStyle = color;
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
      }

      return canvas.toDataURL('image/png');
    } catch (e) {
      console.warn('[Gallery] 缩略图生成失败:', e.message || e);
      return '';
    }
  }

  /* ============================================================
   * 内部辅助方法
   * ============================================================ */

  /**
   * 生成 UUID v4；优先使用 crypto.randomUUID()，不支持时降级为时间戳 + 随机数
   * @private
   * @returns {string} UUID 字符串
   */
  static _generateUUID() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    // 降级方案：时间戳（高 12 位 hex）+ 随机数，拼接为 UUID v4 形态
    const ts = Date.now().toString(16).padStart(12, '0');
    const rand = (n) => {
      let s = '';
      for (let i = 0; i < n; i++) s += Math.floor(Math.random() * 16).toString(16);
      return s;
    };
    const variant = (8 + Math.floor(Math.random() * 4)).toString(16); // 变体位 8/9/a/b
    return `${ts.slice(0, 8)}-${ts.slice(8, 12)}-4${rand(3)}-${variant}${rand(3)}-${rand(12)}`;
  }

  /**
   * 校验网格数据是否为非空二维数组
   * @private
   * @param {*} gridData
   * @returns {boolean}
   */
  static _isValidGridData(gridData) {
    return Array.isArray(gridData) &&
      gridData.length > 0 &&
      Array.isArray(gridData[0]) &&
      gridData[0].length > 0;
  }

  /**
   * 校验是否为合法 hex 颜色（#RGB 或 #RRGGBB）
   * @private
   * @param {*} color
   * @returns {boolean}
   */
  static _isValidHex(color) {
    return typeof color === 'string' && /^#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color);
  }

  /**
   * 规范化元数据：补全默认值、校验 palette、推断网格宽高
   * @private
   * @param {Object} metadata - 原始元数据
   * @param {Array<Array<string|null>>} gridData - 网格数据（用于推断宽高）
   * @returns {{palette:string, gridWidth:number, gridHeight:number, tags:string[], description:string}}
   */
  static _normalizeMetadata(metadata, gridData) {
    const m = (metadata && typeof metadata === 'object') ? metadata : {};
    const hasGrid = this._isValidGridData(gridData);

    let palette = m.palette;
    if (!['perler', 'hama', 'artkal'].includes(palette)) {
      palette = this._getDefaultPalette();
    }

    return {
      palette,
      gridWidth: (Number.isInteger(m.gridWidth) && m.gridWidth > 0)
        ? m.gridWidth
        : (hasGrid ? gridData[0].length : 0),
      gridHeight: (Number.isInteger(m.gridHeight) && m.gridHeight > 0)
        ? m.gridHeight
        : (hasGrid ? gridData.length : 0),
      tags: Array.isArray(m.tags)
        ? m.tags.filter(t => typeof t === 'string' && t.trim()).map(t => t.trim())
        : [],
      description: typeof m.description === 'string' ? m.description : ''
    };
  }

  /**
   * 获取默认色板品牌：优先取 bead-colors.js 的当前色板，否则回退 'perler'
   * @private
   * @returns {string} 'perler' | 'hama' | 'artkal'
   */
  static _getDefaultPalette() {
    try {
      if (typeof getCurrentPalette === 'function') {
        const brand = getCurrentPalette();
        if (['perler', 'hama', 'artkal'].includes(brand)) return brand;
      } else if (typeof window !== 'undefined' && typeof window.getCurrentPalette === 'function') {
        const brand = window.getCurrentPalette();
        if (['perler', 'hama', 'artkal'].includes(brand)) return brand;
      }
    } catch (e) { /* 忽略，使用回退值 */ }
    return 'perler';
  }

  /**
   * 从 localStorage 读取作品库；数据缺失/损坏时返回空库（不覆盖原有数据）
   * @private
   * @returns {{works: Object, version: string}}
   */
  static _loadStore() {
    const empty = { works: {}, version: this.STORE_VERSION };
    let raw;
    try {
      raw = localStorage.getItem(this.STORAGE_KEY);
    } catch (e) {
      console.warn('[Gallery] localStorage 读取失败:', e.message || e);
      return empty;
    }
    if (!raw) return empty;

    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || !parsed.works || typeof parsed.works !== 'object') {
        console.warn('[Gallery] 作品库数据格式异常，按空库处理');
        return empty;
      }
      return parsed;
    } catch (e) {
      console.warn('[Gallery] 作品库数据损坏（JSON 解析失败），按空库处理:', e.message || e);
      return empty;
    }
  }

  /**
   * 将作品库写入 localStorage，写入前检查容量上限
   * @private
   * @param {{works: Object, version: string}} store
   * @returns {void}
   * @throws {Error} localStorage 不可用、超过容量上限或写入失败时抛出
   */
  static _persistStore(store) {
    if (!this._isStorageAvailable()) {
      throw new Error('localStorage 不可用（可能被浏览器隐私模式禁用），无法保存作品');
    }

    const json = JSON.stringify(store);
    const bytes = this._byteLength(json);
    if (bytes > this.MAX_STORAGE_BYTES) {
      const usedMB = (bytes / 1024 / 1024).toFixed(2);
      const limitMB = (this.MAX_STORAGE_BYTES / 1024 / 1024).toFixed(0);
      throw new Error(`作品库空间不足：当前约 ${usedMB}MB，已超过 ${limitMB}MB 上限。请删除部分作品，或使用 exportAll() 导出备份后清空。`);
    }

    try {
      localStorage.setItem(this.STORAGE_KEY, json);
    } catch (e) {
      if (this._isQuotaError(e)) {
        throw new Error('浏览器本地存储空间已满，保存失败。请删除部分作品或清理浏览器缓存后重试。');
      }
      throw new Error(`保存作品库失败：${(e && e.message) || e}`);
    }
  }

  /**
   * 检测 localStorage 是否可用（写测后立即清理）。
   * 注意：配额超限错误说明 localStorage 本身可用、只是已满，也视为可用，
   * 以便后续 setItem 时能给出准确的"空间已满"提示而非误报"不可用"。
   * @private
   * @returns {boolean}
   */
  static _isStorageAvailable() {
    try {
      const testKey = '__gallery_test__';
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return this._isQuotaError(e);
    }
  }

  /**
   * 判断异常是否为存储配额超限（兼容各浏览器）
   * @private
   * @param {*} e - 捕获的异常
   * @returns {boolean}
   */
  static _isQuotaError(e) {
    return !!e && (
      e.name === 'QuotaExceededError' ||
      e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || // Firefox
      e.code === 22 ||   // 旧版 Chrome
      e.code === 1014    // 旧版 Firefox
    );
  }

  /**
   * 计算字符串的字节数（UTF-8）；无 TextEncoder 时按 UTF-16 保守估算
   * @private
   * @param {string} str
   * @returns {number}
   */
  static _byteLength(str) {
    if (typeof TextEncoder !== 'undefined') {
      return new TextEncoder().encode(str).length;
    }
    return str.length * 2;
  }
}

// 挂载到 window（浏览器全局，兼容非模块化使用）
if (typeof window !== 'undefined') {
  window.Gallery = Gallery;
}

// 兼容 CommonJS（便于 Node 环境下测试）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Gallery;
}
