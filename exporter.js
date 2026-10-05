/**
 * 导出器模块
 * 负责导出 PNG 图纸、材料清单、项目保存/加载等功能
 */

class Exporter {
  /**
   * 导出高清 PNG 图纸
   * @param {Array<Array<string|null>>} gridData - 网格数据
   * @param {number} cellSize - 每个格子在导出图片中的像素大小（默认 20px）
   * @param {boolean} showGrid - 是否显示网格线
   * @returns {string} 图片的 data URL
   */
  static exportPNG(gridData, cellSize = 20, showGrid = true) {
    const rows = gridData.length;
    const cols = gridData[0].length;
    const padding = 1; // 网格线宽度
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = cols * cellSize + (showGrid ? (cols + 1) * padding : 0);
    canvas.height = rows * cellSize + (showGrid ? (rows + 1) * padding : 0);
    
    // 白色背景
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 绘制网格线和色块
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const drawX = showGrid ? x * cellSize + (x + 1) * padding : x * cellSize;
        const drawY = showGrid ? y * cellSize + (y + 1) * padding : y * cellSize;
        
        // 绘制色块
        const color = gridData[y][x];
        ctx.fillStyle = color || '#FFFFFF';
        ctx.fillRect(drawX, drawY, cellSize, cellSize);
        
        // 绘制网格线
        if (showGrid) {
          ctx.strokeStyle = '#CCCCCC';
          ctx.lineWidth = padding;
          ctx.strokeRect(drawX, drawY, cellSize, cellSize);
        }
      }
    }
    
    return canvas.toDataURL('image/png');
  }
  
  /**
   * 获取当前色板数组（优先 window.BEAD_COLORS，兼容旧版全局 BEAD_COLORS）
   * @returns {Array<{code:string, name:string, nameEn:string, hex:string}>}
   * @private
   */
  static _getPalette() {
    if (typeof window !== 'undefined' && Array.isArray(window.BEAD_COLORS)) {
      return window.BEAD_COLORS;
    }
    if (typeof BEAD_COLORS !== 'undefined' && Array.isArray(BEAD_COLORS)) {
      return BEAD_COLORS;
    }
    return [];
  }

  /**
   * 在当前色板中按 hex 查找颜色（大小写不敏感）
   * @param {string} hex - 颜色 hex 值
   * @returns {Object|undefined} 颜色对象 { code, name, nameEn, hex }
   * @private
   */
  static _findColorInfo(hex) {
    if (!hex) return undefined;
    const upper = String(hex).toUpperCase();
    return this._getPalette().find(c => c.hex && c.hex.toUpperCase() === upper);
  }

  /**
   * 生成材料清单（增强版：包含品牌色号）
   * @param {Array<Array<string|null>>} gridData - 网格数据
   * @returns {Array<{code:string|null, name:string, nameEn:string, hex:string, count:number}>}
   *   按数量降序排列；code 为当前色板中的品牌色号，颜色不在当前色板时为 null
   */
  static generateMaterialList(gridData) {
    const colorCount = {};

    for (const row of gridData) {
      for (const color of row) {
        if (color) {
          if (!colorCount[color]) {
            const colorInfo = this._findColorInfo(color);
            colorCount[color] = {
              code: colorInfo && colorInfo.code ? colorInfo.code : null,
              name: colorInfo ? colorInfo.name : '未知颜色',
              nameEn: colorInfo ? colorInfo.nameEn : 'Unknown',
              hex: color,
              count: 0
            };
          }
          colorCount[color].count++;
        }
      }
    }

    // 按数量降序排序
    const sorted = Object.values(colorCount).sort((a, b) => b.count - a.count);
    return sorted;
  }

  /**
   * 根据当前色板给 gridData 中用到的 hex 颜色分配编号
   * @param {Array<Array<string|null>>} gridData - 网格数据
   * @returns {Map<string, string>} hex -> 色号的映射；
   *   在当前色板中找到时使用其 code（如 "P01"），
   *   未找到（如旧的通用色板数据）时按出现顺序分配 "C01", "C02"...
   */
  static buildColorCodeMap(gridData) {
    const map = new Map();
    let fallbackIndex = 1;

    for (const row of gridData) {
      for (const hex of row) {
        if (!hex || map.has(hex)) continue;
        const info = this._findColorInfo(hex);
        if (info && info.code) {
          map.set(hex, info.code);
        } else {
          map.set(hex, `C${String(fallbackIndex++).padStart(2, '0')}`);
        }
      }
    }

    return map;
  }
  
  /**
   * 导出材料清单为 HTML（可打印）
   * @param {Array} materialList - 材料清单数组
   * @returns {string} HTML 字符串
   */
  static exportMaterialListHTML(materialList) {
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>拼豆材料清单</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; }
          table { border-collapse: collapse; width: 100%; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background-color: #f2f2f2; }
          .color-swatch { 
            display: inline-block; 
            width: 30px; 
            height: 30px; 
            border: 1px solid #333;
            vertical-align: middle;
            margin-right: 8px;
          }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <h1>拼豆材料清单</h1>
        <p>生成时间: ${new Date().toLocaleString()}</p>
        <p>总计: ${materialList.reduce((sum, item) => sum + item.count, 0)} 颗拼豆</p>
        <table>
          <tr>
            <th>颜色</th>
            <th>名称</th>
            <th>英文名称</th>
            <th>HEX</th>
            <th>数量</th>
          </tr>
    `;
    
    for (const item of materialList) {
      html += `
        <tr>
          <td><span class="color-swatch" style="background-color: ${item.hex}"></span></td>
          <td>${item.name}</td>
          <td>${item.nameEn}</td>
          <td>${item.hex}</td>
          <td><strong>${item.count}</strong></td>
        </tr>
      `;
    }
    
    html += `
        </table>
      </body>
      </html>
    `;
    
    return html;
  }
  
  /**
   * 保存项目到 localStorage
   * @param {string} name - 项目名称
   * @param {Object} projectData - 项目数据 { gridData, width, height, name }
   * @returns {boolean} 是否保存成功
   */
  static saveProject(name, projectData) {
    try {
      const projects = this.getProjectList();
      projects[name] = {
        ...projectData,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem('perler-bead-projects', JSON.stringify(projects));
      return true;
    } catch (e) {
      console.error('保存项目失败:', e);
      return false;
    }
  }
  
  /**
   * 从 localStorage 加载项目
   * @param {string} name - 项目名称
   * @returns {Object|null} 项目数据
   */
  static loadProject(name) {
    try {
      const projects = this.getProjectList();
      return projects[name] || null;
    } catch (e) {
      console.error('加载项目失败:', e);
      return null;
    }
  }
  
  /**
   * 获取所有已保存的项目列表
   * @returns {Object} 项目字典
   */
  static getProjectList() {
    try {
      const data = localStorage.getItem('perler-bead-projects');
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  }
  
  /**
   * 删除项目
   * @param {string} name - 项目名称
   * @returns {boolean} 是否删除成功
   */
  static deleteProject(name) {
    try {
      const projects = this.getProjectList();
      delete projects[name];
      localStorage.setItem('perler-bead-projects', JSON.stringify(projects));
      return true;
    } catch (e) {
      return false;
    }
  }
  
  /**
   * 导出项目为 JSON 文件
   * @param {Object} projectData - 项目数据
   * @param {string} name - 项目名称
   */
  static exportProjectJSON(projectData, name) {
    const dataStr = JSON.stringify({ name, ...projectData }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name || 'perler-bead-project'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  
  /**
   * 从 JSON 文件导入项目
   * @param {File} file - JSON 文件
   * @returns {Promise<Object>} 项目数据
   */
  static async importProjectJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          resolve(data);
        } catch (err) {
          reject(new Error('JSON 解析失败'));
        }
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsText(file);
    });
  }

  /* ============================================================
   * 专业打印图纸导出
   * ============================================================ */

  /**
   * 转义 HTML 特殊字符（用于把用户输入的标题等安全地插入生成的 HTML）
   * @param {*} str - 任意值
   * @returns {string} 转义后的字符串
   * @private
   */
  static _escapeHTML(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * 解析 #RRGGBB 颜色
   * @param {string} hex
   * @returns {{r:number, g:number, b:number}|null}
   * @private
   */
  static _parseHex(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
    if (!m) return null;
    const v = parseInt(m[1], 16);
    return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
  }

  /**
   * 计算颜色的灰度值（0-255，ITU-R BT.601 权重）
   * @param {string} hex
   * @returns {number} 无法解析时返回 255（白）
   * @private
   */
  static _grayOf(hex) {
    const c = this._parseHex(hex);
    if (!c) return 255;
    return Math.round(0.299 * c.r + 0.587 * c.g + 0.114 * c.b);
  }

  /**
   * 根据背景色选择可辨识的前景色（黑/白）
   * @param {string} hex - 背景色
   * @returns {string} '#000000' 或 '#FFFFFF'
   * @private
   */
  static _contrastTextColor(hex) {
    return this._grayOf(hex) > 140 ? '#000000' : '#FFFFFF';
  }

  /**
   * 获取当前色板品牌显示名（用于页脚署名）
   * @returns {string}
   * @private
   */
  static _getBrandLabel() {
    try {
      const key = typeof window !== 'undefined' ? window.CURRENT_PALETTE : null;
      const palettes = typeof window !== 'undefined' ? window.BEAD_PALETTES : null;
      if (key && palettes && palettes[key] && palettes[key].label) {
        return palettes[key].label;
      }
    } catch (e) { /* 忽略，使用默认值 */ }
    return '';
  }

  /**
   * 计算格子在屏幕 / 打印下的尺寸，保证图纸尽量铺满一页且清晰可读
   * @param {number} cols - 块内列数
   * @param {number} rows - 块内行数
   * @returns {{px:number, mm:number}}
   * @private
   */
  static _calcCellSize(cols, rows) {
    const safeCols = Math.max(1, cols);
    const safeRows = Math.max(1, rows);
    // 屏幕：图纸区域按约 860px 宽 / 640px 高估算
    const px = Math.max(8, Math.min(20, Math.floor(Math.min(860 / safeCols, 640 / safeRows))));
    // 打印：A4/Letter 去边距后按约 180mm 宽 / 240mm 高估算（含坐标与页眉余量）
    const mm = Math.max(2.5, Math.min(6, Math.floor(Math.min(180 / safeCols, 240 / safeRows) * 10) / 10));
    return { px, mm };
  }

  /**
   * 生成单个网格块（一页）的表格 HTML
   * @param {Array<Array<string|null>>} gridData - 完整网格数据
   * @param {{x0:number, y0:number, x1:number, y1:number}} block - 块范围 [x0,x1) × [y0,y1)
   * @param {Object} opts - 打印选项（已合并默认值）
   * @param {Map<string, string>} codeMap - hex -> 色号映射
   * @returns {string} 表格 HTML
   * @private
   */
  static _buildGridTableHTML(gridData, block, opts, codeMap) {
    const isBW = opts.colorMode === 'bw';
    // 黑白模式必须显示编号才能区分颜色
    const showNums = opts.showColorNumbers || isBW;
    const blockCols = block.x1 - block.x0;
    const blockRows = block.y1 - block.y0;
    const { px, mm } = this._calcCellSize(blockCols, blockRows);
    const borderCss = opts.showGridLines ? '' : ' grid-table--no-lines';

    let html = `<table class="grid-table${borderCss}" style="--cell-px:${px}px;--cell-mm:${mm}mm">`;

    // 顶部列坐标
    if (opts.showCoordinates) {
      html += '<tr><td class="coord-cell coord-corner"></td>';
      for (let x = block.x0; x < block.x1; x++) {
        html += `<td class="coord-cell coord-col">${x + 1}</td>`;
      }
      html += '</tr>';
    }

    for (let y = block.y0; y < block.y1; y++) {
      html += '<tr>';
      // 左侧行坐标
      if (opts.showCoordinates) {
        html += `<td class="coord-cell coord-row">${y + 1}</td>`;
      }
      for (let x = block.x0; x < block.x1; x++) {
        const hex = gridData[y][x];
        if (!hex) {
          html += '<td class="grid-cell grid-cell--empty"></td>';
          continue;
        }
        let bg;
        let fg;
        if (isBW) {
          const g = this._grayOf(hex);
          bg = `rgb(${g},${g},${g})`;
          fg = g > 140 ? '#000000' : '#FFFFFF';
        } else {
          bg = hex;
          fg = this._contrastTextColor(hex);
        }
        const num = showNums ? this._escapeHTML(codeMap.get(hex) || '') : '';
        html += `<td class="grid-cell" style="background-color:${bg};color:${fg}">${num}</td>`;
      }
      html += '</tr>';
    }

    html += '</table>';
    return html;
  }

  /**
   * 生成打印页面中的颜色用量清单 HTML
   * @param {Array} materialList - generateMaterialList 的结果
   * @param {Map<string, string>} codeMap - hex -> 色号映射（用于回退编号显示）
   * @returns {string}
   * @private
   */
  static _buildPrintMaterialHTML(materialList, codeMap) {
    let rowsHtml = '';
    let total = 0;
    for (const item of materialList) {
      total += item.count;
      const code = item.code || codeMap.get(item.hex) || '—';
      rowsHtml += `
        <tr>
          <td><span class="swatch" style="background-color:${this._escapeHTML(item.hex)}"></span></td>
          <td><strong>${this._escapeHTML(code)}</strong></td>
          <td>${this._escapeHTML(item.name)}</td>
          <td>${this._escapeHTML(item.nameEn)}</td>
          <td class="hex-cell">${this._escapeHTML(item.hex)}</td>
          <td class="count-cell"><strong>${item.count}</strong></td>
        </tr>`;
    }

    return `
      <section class="material-section">
        <h2 class="material-title">颜色用量清单</h2>
        <table class="material-table">
          <thead>
            <tr><th>色块</th><th>色号</th><th>名称</th><th>英文名称</th><th>HEX</th><th>数量</th></tr>
          </thead>
          <tbody>${rowsHtml}
            <tr class="total-row">
              <td colspan="5">总计</td>
              <td class="count-cell"><strong>${total}</strong></td>
            </tr>
          </tbody>
        </table>
      </section>`;
  }

  /**
   * 生成完整的打印图纸 HTML 文档
   * @param {Array<Array<string|null>>} gridData - 网格数据
   * @param {Object} opts - 已合并默认值的打印选项
   * @returns {string} 完整 HTML 文档字符串
   * @private
   */
  static _buildPrintableHTML(gridData, opts) {
    const rows = gridData.length;
    const cols = gridData[0].length;
    const codeMap = this.buildColorCodeMap(gridData);
    const materialList = this.generateMaterialList(gridData);
    const totalBeads = materialList.reduce((sum, item) => sum + item.count, 0);
    const brandLabel = this._getBrandLabel();
    const dateStr = new Date().toLocaleString();
    const title = this._escapeHTML(opts.title);

    // 划分打印块
    const blocks = [];
    if (opts.splitPages) {
      const per = Math.max(1, Math.floor(opts.cellsPerPage) || 29);
      for (let by = 0; by < rows; by += per) {
        for (let bx = 0; bx < cols; bx += per) {
          blocks.push({ x0: bx, y0: by, x1: Math.min(bx + per, cols), y1: Math.min(by + per, rows) });
        }
      }
    } else {
      blocks.push({ x0: 0, y0: 0, x1: cols, y1: rows });
    }
    const totalPages = blocks.length;

    // 网格页
    let pagesHtml = '';
    blocks.forEach((block, i) => {
      const pageLabel = totalPages > 1
        ? `<div class="page-meta">第 ${i + 1} 页 / 共 ${totalPages} 页 · 区域：列 ${block.x0 + 1}-${block.x1}，行 ${block.y0 + 1}-${block.y1}</div>`
        : '';
      pagesHtml += `
        <section class="print-page${totalPages > 1 ? ' page-break' : ''}">
          <header class="page-header">
            <h1 class="page-title">${title}</h1>
            ${pageLabel}
          </header>
          ${this._buildGridTableHTML(gridData, block, opts, codeMap)}
        </section>`;
    });

    const paperCss = opts.paperSize === 'Letter' ? 'letter' : 'A4';

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>${title} - 打印图纸</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Helvetica Neue", Arial, "PingFang SC", "Microsoft YaHei", sans-serif; color: #222; background: #f0f0f0; }
  .toolbar { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; gap: 12px; padding: 10px 16px; background: #2d2d3a; color: #fff; }
  .toolbar button { padding: 8px 22px; font-size: 14px; border: none; border-radius: 4px; background: #4f8cff; color: #fff; cursor: pointer; }
  .toolbar button:hover { background: #3d76e0; }
  .toolbar .hint { font-size: 12px; color: #bbb; }
  .sheet { max-width: 960px; margin: 16px auto; padding: 24px; background: #fff; box-shadow: 0 1px 6px rgba(0,0,0,.15); }
  .doc-header { text-align: center; margin-bottom: 16px; }
  .doc-header h1 { font-size: 22px; margin-bottom: 6px; }
  .doc-header .doc-meta { font-size: 12px; color: #666; }
  .page-header { text-align: center; margin-bottom: 8px; }
  .page-title { font-size: 16px; }
  .page-meta { font-size: 11px; color: #666; margin-top: 2px; }
  .print-page { padding: 8px 0 16px; }
  .page-break { page-break-after: always; break-after: page; }
  .grid-table { border-collapse: collapse; margin: 0 auto; }
  .grid-table td { padding: 0; }
  .grid-cell { width: var(--cell-px, 16px); height: var(--cell-px, 16px); min-width: var(--cell-px, 16px); border: 1px solid #999; text-align: center; vertical-align: middle; font-size: 8px; line-height: 1; overflow: hidden; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .grid-table--no-lines .grid-cell { border-color: transparent; }
  .grid-cell--empty { background: #fff; }
  .coord-cell { font-size: 9px; color: #555; text-align: center; vertical-align: middle; padding: 0 2px; white-space: nowrap; }
  .coord-col { height: 16px; }
  .coord-row { min-width: 22px; }
  .material-section { margin-top: 24px; page-break-inside: avoid; break-inside: avoid; }
  .material-title { font-size: 16px; margin-bottom: 8px; }
  .material-table { border-collapse: collapse; width: 100%; font-size: 13px; }
  .material-table th, .material-table td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; }
  .material-table th { background: #f2f2f2; }
  .swatch { display: inline-block; width: 22px; height: 22px; border: 1px solid #333; vertical-align: middle; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .hex-cell { font-family: Consolas, monospace; font-size: 12px; }
  .count-cell { text-align: right; }
  .total-row td { background: #fafafa; font-weight: bold; }
  .doc-footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid #ddd; text-align: center; font-size: 11px; color: #888; }
  @page { size: ${paperCss}; margin: 10mm; }
  @media print {
    body { background: #fff; }
    .toolbar { display: none; }
    .sheet { max-width: none; margin: 0; padding: 0; box-shadow: none; }
    .grid-cell { width: var(--cell-mm, 5mm); height: var(--cell-mm, 5mm); min-width: var(--cell-mm, 5mm); font-size: 5pt; border-color: #666; }
    .grid-table--no-lines .grid-cell { border-color: transparent; }
    .coord-cell { font-size: 6pt; color: #333; }
    .doc-header h1 { font-size: 16pt; }
    .material-table th, .material-table td { padding: 4px 8px; font-size: 9pt; }
  }
</style>
</head>
<body>
  <div class="toolbar">
    <button type="button" onclick="window.print()">打印</button>
    <span class="hint">提示：在打印对话框中可选择“另存为 PDF”。如颜色未打印，请勾选“背景图形/背景颜色”选项。</span>
  </div>
  <div class="sheet">
    <header class="doc-header">
      <h1>${title}</h1>
      <div class="doc-meta">生成日期：${this._escapeHTML(dateStr)} · 图纸尺寸：${cols} × ${rows} 格 · 总拼豆数：${totalBeads} 颗</div>
    </header>
    ${pagesHtml}
    ${this._buildPrintMaterialHTML(materialList, codeMap)}
    <footer class="doc-footer">
      ${brandLabel ? `色板品牌：${this._escapeHTML(brandLabel)} · ` : ''}总拼豆数：${totalBeads} 颗 · 由 拼豆设计工具 Perler Bead Designer 生成
    </footer>
  </div>
  <script>window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 300); });</script>
</body>
</html>`;
  }

  /**
   * 生成可打印的 HTML 图纸（在新窗口/新标签页中打开，并自动弹出打印对话框）
   * @param {Array<Array<string|null>>} gridData - 网格数据
   * @param {Object} [options] - 打印选项
   * @param {string}  [options.title='拼豆图纸'] - 图纸标题
   * @param {boolean} [options.showGridLines=true] - 是否显示网格线
   * @param {boolean} [options.showCoordinates=true] - 是否显示坐标
   * @param {boolean} [options.showColorNumbers=false] - 是否在每个格子显示颜色编号（黑白模式下强制显示）
   * @param {string}  [options.colorMode='color'] - 'color' 彩色 / 'bw' 黑白（灰度+编号）
   * @param {string}  [options.paperSize='A4'] - 'A4' / 'Letter'
   * @param {boolean} [options.splitPages=false] - 是否分块打印（大图纸分成多页）
   * @param {number}  [options.cellsPerPage=29] - 分块时每页每边的格子数
   * @returns {Window|null} 新打开的窗口对象；窗口被拦截或数据无效时返回 null
   */
  static generatePrintableSheet(gridData, options = {}) {
    if (!Array.isArray(gridData) || gridData.length === 0 || !Array.isArray(gridData[0]) || gridData[0].length === 0) {
      console.error('[Exporter] generatePrintableSheet: gridData 无效');
      return null;
    }

    const opts = {
      title: options.title != null && options.title !== '' ? String(options.title) : '拼豆图纸',
      showGridLines: options.showGridLines !== false,
      showCoordinates: options.showCoordinates !== false,
      showColorNumbers: options.showColorNumbers === true,
      colorMode: options.colorMode === 'bw' ? 'bw' : 'color',
      paperSize: options.paperSize === 'Letter' ? 'Letter' : 'A4',
      splitPages: options.splitPages === true,
      cellsPerPage: Number.isFinite(options.cellsPerPage) && options.cellsPerPage > 0
        ? Math.floor(options.cellsPerPage)
        : 29
    };

    const html = this._buildPrintableHTML(gridData, opts);

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      console.error('[Exporter] 无法打开打印窗口，可能被浏览器拦截。请允许弹出窗口后重试。');
      return null;
    }
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    // window.print() 由生成页面中的 load 脚本自动触发
    return printWindow;
  }

  /**
   * 显示打印预览对话框（包含设置选项）
   * 创建覆盖全屏的模态对话框（类名使用 print-dialog-* 前缀，样式由 UI 模块提供），
   * 用户确认后调用 onConfirm(options) 并关闭对话框。
   * @param {Array<Array<string|null>>} gridData - 网格数据
   * @param {Function} [onConfirm] - 用户点击“打印”后的回调，接收 options 参数
   * @returns {HTMLElement} 对话框遮罩元素
   */
  static showPrintDialog(gridData, onConfirm) {
    // 避免重复打开
    const existing = document.querySelector('.print-dialog-overlay');
    if (existing) existing.remove();

    const rows = Array.isArray(gridData) ? gridData.length : 0;
    const cols = rows > 0 && Array.isArray(gridData[0]) ? gridData[0].length : 0;
    let totalBeads = 0;
    if (rows > 0) {
      for (const row of gridData) {
        for (const cell of row) {
          if (cell) totalBeads++;
        }
      }
    }

    const overlay = document.createElement('div');
    overlay.className = 'print-dialog-overlay';
    overlay.innerHTML = `
      <div class="print-dialog" role="dialog" aria-modal="true" aria-labelledby="print-dialog-heading">
        <div class="print-dialog-header">
          <h3 class="print-dialog-title" id="print-dialog-heading">打印图纸设置</h3>
          <button type="button" class="print-dialog-close" aria-label="关闭">×</button>
        </div>
        <div class="print-dialog-body">
          <div class="print-dialog-info">图纸尺寸：${cols} × ${rows} 格 · 共 ${totalBeads} 颗拼豆</div>
          <div class="print-dialog-field">
            <label class="print-dialog-label" for="print-opt-title">图纸标题</label>
            <input type="text" id="print-opt-title" class="print-dialog-input" value="拼豆图纸" maxlength="60">
          </div>
          <div class="print-dialog-field">
            <label class="print-dialog-checkbox-label">
              <input type="checkbox" id="print-opt-gridlines" class="print-dialog-checkbox" checked>
              显示网格线
            </label>
          </div>
          <div class="print-dialog-field">
            <label class="print-dialog-checkbox-label">
              <input type="checkbox" id="print-opt-coords" class="print-dialog-checkbox" checked>
              显示坐标
            </label>
          </div>
          <div class="print-dialog-field">
            <label class="print-dialog-checkbox-label">
              <input type="checkbox" id="print-opt-codes" class="print-dialog-checkbox">
              在格子中显示颜色编号
            </label>
          </div>
          <div class="print-dialog-field">
            <span class="print-dialog-label">颜色模式</span>
            <label class="print-dialog-radio-label">
              <input type="radio" name="print-opt-colormode" class="print-dialog-radio" value="color" checked>
              彩色
            </label>
            <label class="print-dialog-radio-label">
              <input type="radio" name="print-opt-colormode" class="print-dialog-radio" value="bw">
              黑白（灰度 + 编号）
            </label>
          </div>
          <div class="print-dialog-field">
            <label class="print-dialog-label" for="print-opt-paper">纸张大小</label>
            <select id="print-opt-paper" class="print-dialog-select">
              <option value="A4" selected>A4</option>
              <option value="Letter">Letter</option>
            </select>
          </div>
          <div class="print-dialog-field">
            <label class="print-dialog-checkbox-label">
              <input type="checkbox" id="print-opt-split" class="print-dialog-checkbox">
              分块打印（大图纸分成多页）
            </label>
          </div>
          <div class="print-dialog-field">
            <label class="print-dialog-label" for="print-opt-cells">每页格子数</label>
            <input type="number" id="print-opt-cells" class="print-dialog-input print-dialog-input-number" value="29" min="5" max="100" step="1" disabled>
          </div>
        </div>
        <div class="print-dialog-footer">
          <button type="button" class="print-dialog-btn print-dialog-btn-cancel">取消</button>
          <button type="button" class="print-dialog-btn print-dialog-btn-print">打印</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    const $ = (selector) => overlay.querySelector(selector);
    const splitCheckbox = $('#print-opt-split');
    const cellsInput = $('#print-opt-cells');

    // 分块开关联动“每页格子数”输入框
    splitCheckbox.addEventListener('change', () => {
      cellsInput.disabled = !splitCheckbox.checked;
    });

    const close = () => {
      document.removeEventListener('keydown', onKeyDown);
      overlay.remove();
    };

    const onKeyDown = (e) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKeyDown);

    // 点击遮罩空白处关闭
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
    $('.print-dialog-close').addEventListener('click', close);
    $('.print-dialog-btn-cancel').addEventListener('click', close);

    $('.print-dialog-btn-print').addEventListener('click', () => {
      const colorModeInput = overlay.querySelector('input[name="print-opt-colormode"]:checked');
      const options = {
        title: $('#print-opt-title').value.trim() || '拼豆图纸',
        showGridLines: $('#print-opt-gridlines').checked,
        showCoordinates: $('#print-opt-coords').checked,
        showColorNumbers: $('#print-opt-codes').checked,
        colorMode: colorModeInput && colorModeInput.value === 'bw' ? 'bw' : 'color',
        paperSize: $('#print-opt-paper').value === 'Letter' ? 'Letter' : 'A4',
        splitPages: splitCheckbox.checked,
        cellsPerPage: Math.max(1, parseInt(cellsInput.value, 10) || 29)
      };
      close();
      if (typeof onConfirm === 'function') {
        onConfirm(options);
      }
    });

    return overlay;
  }
}

// 导出为全局变量
window.Exporter = Exporter;
