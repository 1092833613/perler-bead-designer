/**
 * 拼豆设计工具 - 主应用逻辑
 * 包含编辑器、工具、状态管理等核心功能
 * 同时包含移动端交互逻辑（底部Tab、更多菜单、抽屉面板）
 */

class PerlerBeadDesigner {
  constructor() {
    // 编辑器状态
    this.gridWidth = 29;
    this.gridHeight = 29;
    this.cellSize = 20; // 画布上每个格子��像素大小
    this.gridData = []; // 二维数组，存储每个格子的颜色 HEX 值或 null
    this.currentColor = BEAD_COLORS[0].hex; // 当前选中的颜色
    this.currentTool = 'brush'; // 当前工具: brush, eraser, fill, eyedropper, line
    this.showGrid = true; // 是否显示网格
    this.showCoordinates = true; // 是否显示坐标
    
    // 撤销/重做历史
    this.history = [];
    this.historyIndex = -1;
    this.maxHistory = 30;
    
    // 最近使用的颜色
    this.recentColors = [];
    this.maxRecentColors = 10;
    
    // 画线工具的状态
    this.lineStart = null;
    this.isDrawingLine = false;
    
    // 拖拽状态
    this.isDrawing = false;
    this.lastDrawnCell = null; // 防止重复绘制同一格子

    // 视图变换（缩放/平移）
    this.zoomLevel = 1.0;      // 缩放级别 (0.5 ~ 4.0)
    this.panX = 0;             // 平移偏移（画布像素）
    this.panY = 0;
    this.isPanning = false;    // 是否正在平移
    this.panStart = null;      // 平移起点 {x, y, panX, panY}
    this.spacePressed = false; // 空格键是否按住（按住可临时平移）
    this.isPinching = false;   // 是否处于双指捏合状态
    this.pinchState = null;    // 捏合状态 {dist, midX, midY}

    // 对称绘制模式: 'none'|'horizontal'|'vertical'|'both'
    this.mirrorMode = 'none';

    // 选区与剪贴板
    this.selection = null;     // {startRow, startCol, endRow, endCol}
    this.clipboard = null;     // 复制的选区数据 {data, width, height}
    this.isSelecting = false;
    this.isPasting = false;    // 粘贴模式（Ctrl+V 后点击画布粘贴）

    // 图案模板插入模式（待插入的图案名）
    this.pendingPattern = null;

    // 工具显示名称
    this.toolNames = {
      'brush': '画笔',
      'eraser': '橡皮擦',
      'fill': '填充',
      'eyedropper': '取色器',
      'line': '直线',
      'select': '选区',
      'zoom': '缩放',
      'pan': '平移'
    };

    // 预定义图案模板库（0=空白，1=填充）
    this.patterns = {
      heart: [
        [0,1,1,0,0,1,1,0],
        [1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1],
        [0,1,1,1,1,1,1,0],
        [0,0,1,1,1,1,0,0],
        [0,0,0,1,1,0,0,0]
      ],
      star: [
        [0,0,0,0,1,0,0,0,0],
        [0,0,0,1,1,1,0,0,0],
        [0,0,0,1,1,1,0,0,0],
        [1,1,1,1,1,1,1,1,1],
        [0,1,1,1,1,1,1,1,0],
        [0,0,1,1,1,1,1,0,0],
        [0,0,1,1,0,1,1,0,0],
        [0,1,1,0,0,0,1,1,0],
        [1,1,0,0,0,0,0,1,1]
      ],
      circle: [
        [0,0,0,1,1,1,0,0,0],
        [0,0,1,1,1,1,1,0,0],
        [0,1,1,1,1,1,1,1,0],
        [1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1],
        [0,1,1,1,1,1,1,1,0],
        [0,0,1,1,1,1,1,0,0],
        [0,0,0,1,1,1,0,0,0]
      ],
      square: [
        [1,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1]
      ],
      cross: [
        [0,0,0,1,1,1,0,0,0],
        [0,0,0,1,1,1,0,0,0],
        [0,0,0,1,1,1,0,0,0],
        [1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1],
        [0,0,0,1,1,1,0,0,0],
        [0,0,0,1,1,1,0,0,0],
        [0,0,0,1,1,1,0,0,0]
      ],
      arrow: [
        [0,0,0,1,0,0,0,0],
        [0,0,0,1,1,0,0,0],
        [1,1,1,1,1,1,0,0],
        [1,1,1,1,1,1,1,0],
        [1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,0],
        [1,1,1,1,1,1,0,0],
        [0,0,0,1,1,0,0,0],
        [0,0,0,1,0,0,0,0]
      ]
    };
    
    // Canvas 元素和上下文
    this.canvas = null;
    this.ctx = null;

    // 移动端状态
    this.activeDrawer = null; // 当前打开的抽屉面板: 'palette' | 'info' | 'projects' | null
    this.moreMenuOpen = false;

    // 初始化
    this.init();
  }
  
  /**
   * 初始化应用
   */
  init() {
    this.createDefaultGrid();
    this.setupCanvas();
    this.setupEventListeners();
    this.renderColorPalette();
    this.renderRecentColors();
    this.updateGridInfo();
    this.saveHistory();
    this.render();
    this.initMobileUI();
    this.updateMobileColorBar();
  }

  /**
   * 判断是否为移动端（与 CSS 768px 断点一致）
   */
  isMobile() {
    return window.innerWidth <= 768;
  }
  
  /**
   * 创建默认网格数据
   */
  createDefaultGrid() {
    this.gridData = [];
    for (let y = 0; y < this.gridHeight; y++) {
      const row = [];
      for (let x = 0; x < this.gridWidth; x++) {
        row.push(null); // null 表示空白
      }
      this.gridData.push(row);
    }
  }
  
  /**
   * 设置 Canvas
   */
  setupCanvas() {
    this.canvas = document.getElementById('editor-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();
  }
  
  /**
   * 调整 Canvas 大小以适应容器
   */
  resizeCanvas() {
    const container = document.getElementById('canvas-container');
    const maxWidth = container.clientWidth - 40;
    const maxHeight = container.clientHeight - 40;
    
    // 计算合适的 cellSize
    const suggestedSize = Math.min(
      Math.floor((maxWidth - (this.gridWidth + 1)) / this.gridWidth),
      Math.floor((maxHeight - (this.gridHeight + 1)) / this.gridHeight)
    );
    
    this.cellSize = Math.max(10, Math.min(40, suggestedSize)); // 限制在 10-40px 之间
    
    const canvasWidth = this.gridWidth * this.cellSize + (this.gridWidth + 1);
    const canvasHeight = this.gridHeight * this.cellSize + (this.gridHeight + 1);
    
    this.canvas.width = canvasWidth;
    this.canvas.height = canvasHeight;
    this.canvas.style.width = `${canvasWidth}px`;
    this.canvas.style.height = `${canvasHeight}px`;
    
    this.render();
  }
  
  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    // Canvas 鼠标事件
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('mouseleave', (e) => this.onMouseUp(e));

    // 滚轮缩放（Ctrl+滚轮，同时兼容触摸板捏合手势产生的 ctrlKey wheel）
    this.canvas.addEventListener('wheel', (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const c = this.clientToCanvasCoords(e.clientX, e.clientY);
        this.zoom(e.deltaY < 0 ? 1 : -1, c.x, c.y);
      }
    }, { passive: false });

    // 阻止右键菜单（右键拖拽用于平移画布）
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Canvas 触摸事件（移动端绘制核心；单指绘制，双指捏合缩放/平移）
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (e.touches.length === 2) {
        // 第二根手指落下：取消进行中的绘制/框选，进入捏合模式
        this.isDrawing = false;
        this.isDrawingLine = false;
        this.lineStart = null;
        this.isSelecting = false;
        this.isPinching = true;
        this.pinchState = this.getPinchInfo(e);
        return;
      }
      if (this.isPinching) return; // 捏合未结束时忽略单指事件
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      this.canvas.dispatchEvent(mouseEvent);
    }, { passive: false });
    
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches.length === 2 && this.isPinching) {
        this.handlePinchMove(e);
        return;
      }
      if (this.isPinching) return;
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      this.canvas.dispatchEvent(mouseEvent);
    }, { passive: false });
    
    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      if (this.isPinching && e.touches.length > 0) {
        // 仍有手指在屏幕上，保持捏合状态直到全部抬起
        this.pinchState = null;
        return;
      }
      this.isPinching = false;
      this.pinchState = null;
      // 直接调用 onMouseUp 逻辑，传入触摸位置
      const touch = e.changedTouches[0];
      this.onTouchEnd(touch.clientX, touch.clientY);
    }, { passive: false });

    // 阻止画布区域的双指手势（防止缩放页面）
    this.canvas.addEventListener('gesturestart', (e) => {
      e.preventDefault();
    });

    this.canvas.addEventListener('gesturechange', (e) => {
      e.preventDefault();
    });

    this.canvas.addEventListener('gestureend', (e) => {
      e.preventDefault();
    });
    
    // 窗口大小变化
    window.addEventListener('resize', () => {
      this.resizeCanvas();
      // 移动端/桌面端切换时刷新UI
      this.refreshMobileUI();
    });
    
    // 键盘快捷键
    document.addEventListener('keydown', (e) => this.onKeyDown(e));
    document.addEventListener('keyup', (e) => {
      if (e.code === 'Space') this.spacePressed = false;
    });
  }

  /**
   * 初始化移动端 UI
   */
  initMobileUI() {
    // 底部 Tab 切换
    const tabs = document.querySelectorAll('.mobile-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const panel = tab.dataset.panel;
        this.toggleDrawer(panel);
      });
    });

    // 遮罩点击关闭
    const overlay = document.getElementById('mobile-overlay');
    if (overlay) {
      overlay.addEventListener('click', () => {
        this.closeAllDrawers();
      });
    }

    // "更多"菜单按钮
    const moreBtn = document.getElementById('btn-more-menu');
    if (moreBtn) {
      moreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleMoreMenu();
      });
    }

    // 点击其他地方关闭更多菜单
    document.addEventListener('click', (e) => {
      if (this.moreMenuOpen) {
        const dropdown = document.getElementById('more-menu-dropdown');
        const moreBtn = document.getElementById('btn-more-menu');
        if (dropdown && moreBtn &&
            !dropdown.contains(e.target) &&
            !moreBtn.contains(e.target)) {
          this.closeMoreMenu();
        }
      }
    });

    // 移动端更多菜单按钮事件绑定
    this.bindMoreMenuButtons();
  }

  /**
   * 绑定移动端"更多"菜单中的按钮
   */
  bindMoreMenuButtons() {
    // 撤销
    const btnUndoM = document.getElementById('btn-undo-m');
    if (btnUndoM) btnUndoM.addEventListener('click', () => { this.undo(); });

    // 重做
    const btnRedoM = document.getElementById('btn-redo-m');
    if (btnRedoM) btnRedoM.addEventListener('click', () => { this.redo(); });

    // 网格尺寸
    const gridSelectM = document.getElementById('grid-size-select-m');
    if (gridSelectM) {
      gridSelectM.addEventListener('change', (e) => {
        const size = e.target.value;
        if (size === 'custom') {
          const width = parseInt(prompt('请输入宽度（列数）:', '29'));
          const height = parseInt(prompt('请输入高度（行数）:', '29'));
          if (width > 0 && height > 0) {
            this.resizeGrid(width, height);
          }
        } else {
          const [width, height] = size.split('x').map(Number);
          this.resizeGrid(width, height);
        }
        // 同步桌面端下拉
        const desktopSelect = document.getElementById('grid-size-select');
        if (desktopSelect) desktopSelect.value = size;
        this.closeMoreMenu();
      });
    }

    // 网格线切换
    const btnGridM = document.getElementById('btn-toggle-grid-m');
    if (btnGridM) {
      btnGridM.addEventListener('click', () => {
        this.showGrid = !this.showGrid;
        this.render();
        btnGridM.classList.toggle('active', this.showGrid);
        // 同步桌面端按钮
        const desktopBtn = document.getElementById('btn-toggle-grid');
        if (desktopBtn) desktopBtn.classList.toggle('active', this.showGrid);
      });
    }

    // 清空
    const btnClearM = document.getElementById('btn-clear-m');
    if (btnClearM) btnClearM.addEventListener('click', () => {
      this.clearCanvas();
      this.closeMoreMenu();
    });

    // 导出 PNG
    const btnExportPngM = document.getElementById('btn-export-png-m');
    if (btnExportPngM) btnExportPngM.addEventListener('click', () => {
      this.exportPNG();
      this.closeMoreMenu();
    });

    // 导出材料清单
    const btnExportMatM = document.getElementById('btn-export-materials-m');
    if (btnExportMatM) btnExportMatM.addEventListener('click', () => {
      this.exportMaterials();
      this.closeMoreMenu();
    });

    // 导出文本
    const btnExportTxtM = document.getElementById('btn-export-text-m');
    if (btnExportTxtM) btnExportTxtM.addEventListener('click', () => {
      this.exportText();
      this.closeMoreMenu();
    });

    // 保存
    const btnSaveM = document.getElementById('btn-save-project-m');
    if (btnSaveM) btnSaveM.addEventListener('click', () => {
      this.saveProject();
      this.closeMoreMenu();
    });

    // 加载
    const btnLoadM = document.getElementById('btn-load-project-m');
    if (btnLoadM) btnLoadM.addEventListener('click', () => {
      this.loadProject();
      this.closeMoreMenu();
    });

    // 导出 JSON
    const btnExportJsonM = document.getElementById('btn-export-json-m');
    if (btnExportJsonM) btnExportJsonM.addEventListener('click', () => {
      this.exportJSON();
      this.closeMoreMenu();
    });

    // 导入 JSON
    const btnImportJsonM = document.getElementById('btn-import-json-m');
    if (btnImportJsonM) btnImportJsonM.addEventListener('click', () => {
      this.importJSON();
      this.closeMoreMenu();
    });
  }

  /**
   * 切换底部抽屉面板
   */
  toggleDrawer(panel) {
    if (this.activeDrawer === panel) {
      // 同一面板，关闭
      this.closeAllDrawers();
      return;
    }

    // 关闭当前面板
    this.closeAllDrawers();

    // 打开新面板
    this.activeDrawer = panel;
    this.showDrawer(panel);

    // 更新 Tab 高亮
    document.querySelectorAll('.mobile-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.panel === panel);
    });
  }

  /**
   * 显示指定抽屉
   */
  showDrawer(panel) {
    const overlay = document.getElementById('mobile-overlay');

    if (panel === 'palette') {
      const sidebar = document.getElementById('sidebar-palette');
      if (sidebar) sidebar.classList.add('drawer-open');
    } else if (panel === 'info') {
      const sidebar = document.getElementById('sidebar-info');
      if (sidebar) sidebar.classList.add('drawer-open');
    } else if (panel === 'projects') {
      const sidebar = document.getElementById('sidebar-projects');
      if (sidebar) sidebar.classList.add('drawer-open');
    }

    // 显示遮罩
    if (overlay) overlay.classList.add('show');

    // 抽屉打开后触发画布重算（因为可视区域变了）
    setTimeout(() => this.resizeCanvas(), 350);
  }

  /**
   * 关闭所有抽屉
   */
  closeAllDrawers() {
    this.activeDrawer = null;

    // 隐藏所有抽屉
    const drawers = document.querySelectorAll('.sidebar-left.drawer-open, .sidebar-right.drawer-open');
    drawers.forEach(d => d.classList.remove('drawer-open'));

    // 隐藏遮罩
    const overlay = document.getElementById('mobile-overlay');
    if (overlay) overlay.classList.remove('show');

    // 清除 Tab 高亮
    document.querySelectorAll('.mobile-tab').forEach(t => {
      t.classList.remove('active');
    });

    // 抽屉关闭后触发画布重算
    setTimeout(() => this.resizeCanvas(), 350);
  }

  /**
   * 切换"更多"菜单
   */
  toggleMoreMenu() {
    this.moreMenuOpen = !this.moreMenuOpen;
    const dropdown = document.getElementById('more-menu-dropdown');
    if (dropdown) {
      dropdown.classList.toggle('open', this.moreMenuOpen);
    }

    // 打开更多菜单时，先同步状态
    if (this.moreMenuOpen) {
      this.syncMoreMenuState();
    }
  }

  /**
   * 关闭"更多"菜单
   */
  closeMoreMenu() {
    this.moreMenuOpen = false;
    const dropdown = document.getElementById('more-menu-dropdown');
    if (dropdown) dropdown.classList.remove('open');
  }

  /**
   * 同步更多菜单中的按钮状态
   */
  syncMoreMenuState() {
    // 同步撤销/重做状态
    const btnUndoM = document.getElementById('btn-undo-m');
    const btnRedoM = document.getElementById('btn-redo-m');
    if (btnUndoM) btnUndoM.disabled = this.historyIndex <= 0;
    if (btnRedoM) btnRedoM.disabled = this.historyIndex >= this.history.length - 1;

    // 同步网格线状态
    const btnGridM = document.getElementById('btn-toggle-grid-m');
    if (btnGridM) {
      btnGridM.classList.toggle('active', this.showGrid);
    }

    // 同步网格尺寸下拉
    const gridSelectM = document.getElementById('grid-size-select-m');
    const desktopSelect = document.getElementById('grid-size-select');
    if (gridSelectM && desktopSelect) {
      gridSelectM.value = desktopSelect.value;
    }
  }

  /**
   * 刷新移动端 UI（窗口 resize 时调用）
   */
  refreshMobileUI() {
    // 如果是桌面端，关闭所有移动端状态
    if (!this.isMobile()) {
      this.closeAllDrawers();
      this.closeMoreMenu();
    }
  }

  /**
   * 更新移动端颜色预览条
   */
  updateMobileColorBar() {
    const swatch = document.getElementById('mobile-color-swatch');
    const text = document.getElementById('mobile-color-text');
    if (!swatch || !text) return;

    swatch.style.backgroundColor = this.currentColor;
    const colorInfo = BEAD_COLORS.find(c => c.hex === this.currentColor);
    text.textContent = colorInfo
      ? `${colorInfo.name} ${this.currentColor}`
      : this.currentColor;
  }
  
  /**
   * 键盘快捷键处理
   */
  onKeyDown(e) {
    // Ctrl+Z 撤销
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      this.undo();
    }
    // Ctrl+Shift+Z 或 Ctrl+Y 重做
    if ((e.ctrlKey || e.metaKey) && (e.key === 'z' && e.shiftKey) || 
        (e.ctrlKey || e.metaKey) && e.key === 'y') {
      e.preventDefault();
      this.redo();
    }
    // 空格键按住：进入临时平移模式（在输入框中不拦截）
    if (e.code === 'Space' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const tag = (e.target && e.target.tagName || '').toLowerCase();
      if (tag !== 'input' && tag !== 'textarea') {
        e.preventDefault();
        this.spacePressed = true;
      }
    }
    // Ctrl+C 复制选区
    if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
      if (this.selection) {
        e.preventDefault();
        this.copySelection();
      }
    }
    // Ctrl+V 进入粘贴模式（点击画布粘贴，Esc 取消）
    if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
      if (this.clipboard) {
        e.preventDefault();
        this.isPasting = true;
        this.pendingPattern = null;
        this.updateToolDisplay('粘贴模式 (点击画布, Esc 取消)');
      }
    }
    // Escape 取消选区 / 粘贴模式 / 图案插入模式
    if (e.key === 'Escape') {
      let changed = false;
      if (this.isPasting) { this.isPasting = false; changed = true; }
      if (this.pendingPattern) { this.pendingPattern = null; changed = true; }
      if (this.selection) { this.clearSelection(); changed = true; }
      if (changed) this.updateToolDisplay();
    }
    // B 切换画笔
    if (e.key === 'b' && !e.ctrlKey && !e.metaKey) {
      this.setTool('brush');
    }
    // E 切换橡皮擦
    if (e.key === 'e' && !e.ctrlKey && !e.metaKey) {
      this.setTool('eraser');
    }
    // G 切换填充
    if (e.key === 'g' && !e.ctrlKey && !e.metaKey) {
      this.setTool('fill');
    }
    // I 切换吸管
    if (e.key === 'i' && !e.ctrlKey && !e.metaKey) {
      this.setTool('eyedropper');
    }
    // L 切换直线
    if (e.key === 'l' && !e.ctrlKey && !e.metaKey) {
      this.setTool('line');
    }
  }
  
  /**
   * 将屏幕坐标转换为画布内部坐标（处理 CSS 缩放）
   */
  clientToCanvasCoords(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (this.canvas.width / rect.width),
      y: (clientY - rect.top) * (this.canvas.height / rect.height)
    };
  }

  /**
   * 将画布内部坐标转换为世界坐标（逆应用平移和缩放）
   */
  canvasToWorld(x, y) {
    return {
      x: (x - this.panX) / this.zoomLevel,
      y: (y - this.panY) / this.zoomLevel
    };
  }

  /**
   * 获取鼠标在网格中的位置（考虑缩放和平移）
   */
  getGridPosition(e) {
    const c = this.clientToCanvasCoords(e.clientX, e.clientY);
    const w = this.canvasToWorld(c.x, c.y);

    const col = Math.floor((w.x - 1) / (this.cellSize + 1));
    const row = Math.floor((w.y - 1) / (this.cellSize + 1));

    if (col >= 0 && col < this.gridWidth && row >= 0 && row < this.gridHeight) {
      return { row, col };
    }
    return null;
  }

  /**
   * 获取鼠标在网格中的原始位置（不限制在网格范围内，选区拖拽出边缘时使用）
   */
  getRawGridPosition(e) {
    const c = this.clientToCanvasCoords(e.clientX, e.clientY);
    const w = this.canvasToWorld(c.x, c.y);
    return {
      col: Math.floor((w.x - 1) / (this.cellSize + 1)),
      row: Math.floor((w.y - 1) / (this.cellSize + 1))
    };
  }
  
  /**
   * 鼠标按下事件
   */
  onMouseDown(e) {
    // 平移：按住空格拖拽、右键拖拽，或当前为平移工具
    if (this.spacePressed || e.button === 2 || this.currentTool === 'pan') {
      const c = this.clientToCanvasCoords(e.clientX, e.clientY);
      this.startPan(c.x, c.y);
      return;
    }

    // 缩放工具：点击放大，Alt+点击缩小
    if (this.currentTool === 'zoom') {
      const c = this.clientToCanvasCoords(e.clientX, e.clientY);
      this.zoom(e.altKey ? -1 : 1, c.x, c.y);
      return;
    }

    const pos = this.getGridPosition(e);
    if (!pos) return;

    // 粘贴模式：点击画布粘贴剪贴板内容（可连续粘贴，Esc 退出）
    if (this.isPasting) {
      this.pasteClipboard(pos.row, pos.col);
      return;
    }

    // 图案插入模式：点击画布插入所选图案
    if (this.pendingPattern) {
      this.insertPattern(this.pendingPattern, pos.row, pos.col, this.currentColor);
      this.pendingPattern = null;
      this.updateToolDisplay();
      return;
    }

    this.isDrawing = true;
    this.lastDrawnCell = null;

    switch (this.currentTool) {
      case 'brush':
      case 'eraser':
        this.applyTool(pos.row, pos.col);
        this.lastDrawnCell = `${pos.row},${pos.col}`;
        break;

      case 'select':
        this.startSelection(pos.row, pos.col);
        break;

      case 'fill':
        this.floodFill(pos.row, pos.col, this.gridData[pos.row][pos.col], this.currentColor);
        this.saveHistory();
        break;

      case 'eyedropper':
        const color = this.gridData[pos.row][pos.col];
        if (color) {
          this.setCurrentColor(color);
        }
        break;

      case 'line':
        this.lineStart = pos;
        this.isDrawingLine = true;
        break;
    }

    this.render();
  }
  
  /**
   * 鼠标移动事件
   */
  onMouseMove(e) {
    // 平移拖拽中
    if (this.isPanning) {
      const c = this.clientToCanvasCoords(e.clientX, e.clientY);
      this.updatePan(c.x, c.y);
      this.render();
      return;
    }

    const pos = this.getGridPosition(e);
    
    // 更新坐标显示
    if (pos) {
      document.getElementById('coord-display').textContent = `(${pos.col}, ${pos.row})`;
    } else {
      document.getElementById('coord-display').textContent = '';
    }
    
    // 选区框选拖拽中（允许拖出网格边缘，终点自动夹取到网格内）
    if (this.isSelecting && this.currentTool === 'select') {
      const raw = this.getRawGridPosition(e);
      this.updateSelection(raw.row, raw.col);
      this.render();
      return;
    }

    // 拖拽绘制
    if (this.isDrawing && (this.currentTool === 'brush' || this.currentTool === 'eraser')) {
      if (pos && `${pos.row},${pos.col}` !== this.lastDrawnCell) {
        this.applyTool(pos.row, pos.col);
        this.lastDrawnCell = `${pos.row},${pos.col}`;
        this.render();
      }
    }
  }
  
  /**
   * 鼠标释放事件
   */
  onMouseUp(e) {
    // 结束平移
    if (this.isPanning) {
      this.endPan();
      return;
    }

    // 结束选区框选
    if (this.isSelecting && this.currentTool === 'select') {
      this.endSelection();
      this.render();
    }

    if (this.isDrawing) {
      if (this.currentTool === 'brush' || this.currentTool === 'eraser') {
        this.saveHistory();
      }
      this.isDrawing = false;
      this.lastDrawnCell = null;
    }
    
    // 完成直线绘制
    if (this.isDrawingLine && this.currentTool === 'line') {
      const pos = this.getGridPosition(e);
      if (pos && this.lineStart) {
        this.drawLine(this.lineStart.row, this.lineStart.col, pos.row, pos.col);
        this.saveHistory();
      }
      this.isDrawingLine = false;
      this.lineStart = null;
    }
  }
  
  /**
   * 触摸结束事件处理
   */
  onTouchEnd(clientX, clientY) {
    // 触摸结束与鼠标释放逻辑一致（涵盖绘制收尾、直线完成、选区结束、平移结束）
    this.onMouseUp({ clientX, clientY });
  }
  
  /**
   * 应用当前工具到指定格子
   */
  applyTool(row, col) {
    // 通过 drawWithMirror 绘制，镜像模式下自动绘制对称点
    if (this.currentTool === 'brush') {
      this.drawWithMirror(row, col, this.currentColor);
    } else if (this.currentTool === 'eraser') {
      this.drawWithMirror(row, col, null);
    }
  }
  
  /**
   * 洪水填充算法（油漆桶工具）
   */
  floodFill(startRow, startCol, targetColor, replacementColor) {
    if (targetColor === replacementColor) return;
    
    const stack = [[startRow, startCol]];
    const visited = new Set();
    
    while (stack.length > 0) {
      const [row, col] = stack.pop();
      const key = `${row},${col}`;
      
      if (row < 0 || row >= this.gridHeight || col < 0 || col >= this.gridWidth) continue;
      if (visited.has(key)) continue;
      if (this.gridData[row][col] !== targetColor) continue;
      
      visited.add(key);
      this.gridData[row][col] = replacementColor;
      
      stack.push([row - 1, col]);
      stack.push([row + 1, col]);
      stack.push([row, col - 1]);
      stack.push([row, col + 1]);
    }
  }
  
  /**
   * 绘制直线（Bresenham 算法）
   */
  drawLine(row1, col1, row2, col2) {
    const dx = Math.abs(col2 - col1);
    const dy = Math.abs(row2 - row1);
    const sx = (col1 < col2) ? 1 : -1;
    const sy = (row1 < row2) ? 1 : -1;
    let err = dx - dy;
    
    let x = col1;
    let y = row1;
    
    while (true) {
      this.applyTool(y, x);
      
      if (x === col2 && y === row2) break;
      
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
  }
  
  // =====================
  // 视图缩放与平移
  // =====================

  /**
   * 缩放画布视图
   * @param {number} delta - >0 放大，<0 缩小
   * @param {number} [cx] - 缩放中心（画布坐标），缺省为画布中心
   * @param {number} [cy] - 缩放中心（画布坐标）
   */
  zoom(delta, cx, cy) {
    const oldZoom = this.zoomLevel;
    const factor = delta > 0 ? 1.2 : 1 / 1.2;
    const newZoom = Math.min(4.0, Math.max(0.5, oldZoom * factor));
    if (newZoom === oldZoom) return;

    if (cx === undefined || cy === undefined) {
      cx = this.canvas.width / 2;
      cy = this.canvas.height / 2;
    }

    // 保持缩放中心处的世界坐标不动（以光标/双指中点为中心缩放）
    this.panX = cx - ((cx - this.panX) / oldZoom) * newZoom;
    this.panY = cy - ((cy - this.panY) / oldZoom) * newZoom;
    this.zoomLevel = newZoom;
    this.render();
  }

  /**
   * 开始平移（x/y 为画布内部坐标）
   */
  startPan(x, y) {
    this.isPanning = true;
    this.panStart = { x, y, panX: this.panX, panY: this.panY };
    this.canvas.style.cursor = 'grabbing';
  }

  /**
   * 更新平移偏移（跟随拖拽）
   */
  updatePan(x, y) {
    if (!this.isPanning || !this.panStart) return;
    this.panX = this.panStart.panX + (x - this.panStart.x);
    this.panY = this.panStart.panY + (y - this.panStart.y);
  }

  /**
   * 结束平移
   */
  endPan() {
    this.isPanning = false;
    this.panStart = null;
    this.updateCursor();
  }

  /**
   * 重置视图（缩放 100%，偏移归零）
   */
  resetView() {
    this.zoomLevel = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.render();
  }

  /**
   * 获取双指捏合信息（指间距离与中点，屏幕坐标）
   */
  getPinchInfo(e) {
    const t1 = e.touches[0];
    const t2 = e.touches[1];
    return {
      dist: Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY),
      midX: (t1.clientX + t2.clientX) / 2,
      midY: (t1.clientY + t2.clientY) / 2
    };
  }

  /**
   * 处理双指捏合移动：按指间距离比例缩放，并跟随中点平移
   */
  handlePinchMove(e) {
    const info = this.getPinchInfo(e);
    const prev = this.pinchState;
    if (prev && prev.dist > 0) {
      const mid = this.clientToCanvasCoords(info.midX, info.midY);
      const oldZoom = this.zoomLevel;
      const newZoom = Math.min(4.0, Math.max(0.5, oldZoom * (info.dist / prev.dist)));

      // 以双指中点为缩放中心
      this.panX = mid.x - ((mid.x - this.panX) / oldZoom) * newZoom;
      this.panY = mid.y - ((mid.y - this.panY) / oldZoom) * newZoom;
      this.zoomLevel = newZoom;

      // 双指整体滑动 => 平移画布
      const prevMid = this.clientToCanvasCoords(prev.midX, prev.midY);
      this.panX += mid.x - prevMid.x;
      this.panY += mid.y - prevMid.y;

      this.render();
    }
    this.pinchState = info;
  }

  // =====================
  // 对称绘制
  // =====================

  /**
   * 设置镜像模式: 'none'|'horizontal'|'vertical'|'both'
   */
  setMirrorMode(mode) {
    const valid = ['none', 'horizontal', 'vertical', 'both'];
    this.mirrorMode = valid.includes(mode) ? mode : 'none';

    // 同步镜像开关按钮的高亮状态
    const btnH = document.getElementById('btn-mirror-h');
    const btnV = document.getElementById('btn-mirror-v');
    if (btnH) btnH.classList.toggle('active', this.mirrorMode === 'horizontal' || this.mirrorMode === 'both');
    if (btnV) btnV.classList.toggle('active', this.mirrorMode === 'vertical' || this.mirrorMode === 'both');
  }

  /**
   * 切换某一轴的镜像开关（供 btn-mirror-h / btn-mirror-v 按钮使用）
   * @param {string} axis - 'horizontal' | 'vertical'
   */
  toggleMirror(axis) {
    const h = this.mirrorMode === 'horizontal' || this.mirrorMode === 'both';
    const v = this.mirrorMode === 'vertical' || this.mirrorMode === 'both';
    const nh = axis === 'horizontal' ? !h : h;
    const nv = axis === 'vertical' ? !v : v;
    this.setMirrorMode(nh && nv ? 'both' : nh ? 'horizontal' : nv ? 'vertical' : 'none');
  }

  /**
   * 按当前镜像模式绘制对称点
   * horizontal: (row, col) + (row, W-1-col)；vertical: + (H-1-row, col)；both: 四点
   * @param {string|null} color - null 表示擦除
   */
  drawWithMirror(row, col, color) {
    const points = [[row, col]];
    if (this.mirrorMode === 'horizontal' || this.mirrorMode === 'both') {
      points.push([row, this.gridWidth - 1 - col]);
    }
    if (this.mirrorMode === 'vertical' || this.mirrorMode === 'both') {
      points.push([this.gridHeight - 1 - row, col]);
    }
    if (this.mirrorMode === 'both') {
      points.push([this.gridHeight - 1 - row, this.gridWidth - 1 - col]);
    }
    for (const [r, c] of points) {
      if (r >= 0 && r < this.gridHeight && c >= 0 && c < this.gridWidth) {
        this.gridData[r][c] = color;
      }
    }
  }

  // =====================
  // 选区与复制粘贴
  // =====================

  /**
   * 开始框选（选区工具按下时调用）
   */
  startSelection(row, col) {
    this.isSelecting = true;
    this.selection = { startRow: row, startCol: col, endRow: row, endCol: col };
  }

  /**
   * 更新选区终点（自动夹取到网格范围内）
   */
  updateSelection(row, col) {
    if (!this.selection) return;
    this.selection.endRow = Math.max(0, Math.min(this.gridHeight - 1, row));
    this.selection.endCol = Math.max(0, Math.min(this.gridWidth - 1, col));
  }

  /**
   * 结束框选（规范化选区角点，保留选区用于复制）
   */
  endSelection() {
    this.isSelecting = false;
    if (this.selection) {
      this.selection = this.normalizedSelection();
    }
  }

  /**
   * 规范化选区（start 为左上角，end 为右下角）
   */
  normalizedSelection() {
    const s = this.selection;
    return {
      startRow: Math.min(s.startRow, s.endRow),
      startCol: Math.min(s.startCol, s.endCol),
      endRow: Math.max(s.startRow, s.endRow),
      endCol: Math.max(s.startCol, s.endCol)
    };
  }

  /**
   * 复制选区数据到剪贴板（Ctrl+C）
   */
  copySelection() {
    if (!this.selection) return;
    const n = this.normalizedSelection();
    const data = [];
    for (let r = n.startRow; r <= n.endRow; r++) {
      data.push(this.gridData[r].slice(n.startCol, n.endCol + 1));
    }
    this.clipboard = {
      data,
      width: n.endCol - n.startCol + 1,
      height: n.endRow - n.startRow + 1
    };
  }

  /**
   * 在指定位置粘贴剪贴板内容（Ctrl+V 进入粘贴模式后点击画布）
   */
  pasteClipboard(targetRow, targetCol) {
    if (!this.clipboard) return;
    const { data } = this.clipboard;
    for (let r = 0; r < data.length; r++) {
      for (let c = 0; c < data[r].length; c++) {
        const tr = targetRow + r;
        const tc = targetCol + c;
        if (tr >= 0 && tr < this.gridHeight && tc >= 0 && tc < this.gridWidth) {
          this.gridData[tr][tc] = data[r][c];
        }
      }
    }
    this.saveHistory();
    this.render();
  }

  /**
   * 清除选区（Escape）
   */
  clearSelection() {
    this.selection = null;
    this.isSelecting = false;
    this.render();
  }

  // =====================
  // 图案模板库
  // =====================

  /**
   * 在指定位置插入图案模板（用 color 填充所有 1 的位置，自动裁剪越界部分）
   * @param {string} patternName - 图案名（this.patterns 的键）
   * @param {number} row - 图案左上角所在行
   * @param {number} col - 图案左上角所在列
   * @param {string} [color] - 填充颜色，缺省为当前选中颜色
   */
  insertPattern(patternName, row, col, color) {
    const pattern = this.patterns[patternName];
    if (!pattern) return;
    const fill = color !== undefined ? color : this.currentColor;
    for (let r = 0; r < pattern.length; r++) {
      for (let c = 0; c < pattern[r].length; c++) {
        if (pattern[r][c] === 1) {
          const tr = row + r;
          const tc = col + c;
          if (tr >= 0 && tr < this.gridHeight && tc >= 0 && tc < this.gridWidth) {
            this.gridData[tr][tc] = fill;
          }
        }
      }
    }
    this.saveHistory();
    this.render();
  }

  /**
   * 显示图案选择对话框（prompt 简易版，完整 UI 由 UI 模块负责）
   * 选择后进入图案插入模式，点击画布插入，Esc 取消
   */
  showPatternDialog() {
    const labels = { heart: '心形', star: '星星', circle: '圆形', square: '方形', cross: '十字', arrow: '箭头' };
    const names = Object.keys(this.patterns);
    const list = names.map((n, i) => `${i + 1}. ${labels[n] || n}`).join('\n');
    const input = prompt(`选择图案模板:\n${list}\n\n请输入编号:`, '1');
    if (!input) return;

    let name = null;
    const idx = parseInt(input.trim(), 10);
    if (!isNaN(idx) && idx >= 1 && idx <= names.length) {
      name = names[idx - 1];
    } else if (this.patterns[input.trim()]) {
      name = input.trim();
    }
    if (!name) {
      alert('无效的图案选择！');
      return;
    }

    this.pendingPattern = name;
    this.isPasting = false; // 退出粘贴模式，避免冲突
    this.updateToolDisplay(`插入图案: ${labels[name] || name} (点击画布, Esc 取消)`);
  }

  // =====================
  // 打印导出与作品库对接
  // =====================

  /**
   * 打开打印图纸对话框（对接 Exporter 专业打印导出）
   */
  printSheet() {
    if (typeof Exporter === 'undefined' || typeof Exporter.showPrintDialog !== 'function') {
      alert('打印模块未加载！');
      return;
    }
    Exporter.showPrintDialog(this.gridData, (opts) => Exporter.generatePrintableSheet(this.gridData, opts));
  }

  /**
   * 保存当前作品到作品库（prompt 输入名称，调用 Gallery.save）
   */
  saveToGallery() {
    if (typeof Gallery === 'undefined') {
      alert('作品库模块未加载！');
      return;
    }
    const name = prompt('请输入作品名称:', `作品_${new Date().toLocaleDateString()}`);
    if (!name) return;
    try {
      const id = Gallery.save(name, this.gridData.map(row => [...row]), {
        gridWidth: this.gridWidth,
        gridHeight: this.gridHeight
      });
      alert(`作品已保存到作品库！ID: ${id}`);
    } catch (err) {
      alert('保存失败: ' + err.message);
    }
  }

  /**
   * 从作品库加载作品（prompt 简易版，完整 UI 由 UI 模块负责）
   */
  openFromGallery() {
    if (typeof Gallery === 'undefined') {
      alert('作品库模块未加载！');
      return;
    }
    const works = Gallery.list();
    if (works.length === 0) {
      alert('作品库为空。');
      return;
    }
    const list = works.map((w, i) => {
      const meta = w.metadata || {};
      return `${i + 1}. ${w.name} (${meta.gridWidth || '?'}×${meta.gridHeight || '?'})`;
    }).join('\n');
    const input = prompt(`作品库:\n${list}\n\n请输入要加载的作品编号:`, '1');
    if (!input) return;
    const idx = parseInt(input.trim(), 10);
    if (isNaN(idx) || idx < 1 || idx > works.length) {
      alert('无效的编号！');
      return;
    }
    const work = Gallery.get(works[idx - 1].id);
    if (work && work.gridData) {
      this.loadGridData(work.gridData);
      this.resetView();
      alert(`已加载作品: ${work.name}`);
    } else {
      alert('作品加载失败！');
    }
  }

  /**
   * 更新"当前工具"显示文本（可传入覆盖文本，如粘贴/图案插入提示）
   */
  updateToolDisplay(overrideText) {
    const el = document.getElementById('current-tool-display');
    if (!el) return;
    el.textContent = overrideText || this.toolNames[this.currentTool] || this.currentTool;
  }

  /**
   * 根据当前工具更新画布光标样式
   */
  updateCursor() {
    const cursors = {
      'eyedropper': 'crosshair',
      'select': 'crosshair',
      'zoom': 'zoom-in',
      'pan': 'grab'
    };
    this.canvas.style.cursor = cursors[this.currentTool] || 'pointer';
  }

  /**
   * 设置当前工具
   */
  setTool(tool) {
    this.currentTool = tool;

    // 更新工具按钮样式
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    const toolBtn = document.getElementById(`tool-${tool}`);
    if (toolBtn) toolBtn.classList.add('active');

    // 更新当前工具显示
    this.updateToolDisplay();

    // 更新画布光标
    this.updateCursor();
  }
  
  /**
   * 设置当前颜色
   */
  setCurrentColor(hex) {
    this.currentColor = hex;
    
    // 更新颜色预览
    document.getElementById('current-color-preview').style.backgroundColor = hex;
    
    // 更新颜色信息
    const colorInfo = BEAD_COLORS.find(c => c.hex === hex);
    document.getElementById('current-color-info').textContent = 
      colorInfo ? `${colorInfo.name} (${colorInfo.nameEn}) - ${hex}` : hex;
    
    // 添加到最近使用颜色
    this.addRecentColor(hex);
    
    // 高亮色板中的选中颜色
    document.querySelectorAll('.color-swatch').forEach(swatch => {
      swatch.classList.remove('selected');
      if (swatch.dataset.color === hex) {
        swatch.classList.add('selected');
      }
    });

    // 更新移动端颜色预览条
    this.updateMobileColorBar();
  }
  
  /**
   * 添加最近使用的颜色
   */
  addRecentColor(hex) {
    const index = this.recentColors.indexOf(hex);
    if (index > -1) {
      this.recentColors.splice(index, 1);
    }
    
    this.recentColors.unshift(hex);
    
    if (this.recentColors.length > this.maxRecentColors) {
      this.recentColors.pop();
    }
    
    this.renderRecentColors();
  }
  
  /**
   * 渲染色板
   */
  renderColorPalette() {
    const palette = document.getElementById('color-palette');
    palette.innerHTML = '';
    
    for (const color of BEAD_COLORS) {
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch';
      swatch.dataset.color = color.hex;
      swatch.style.backgroundColor = color.hex;
      swatch.title = `${color.name} (${color.nameEn}) - ${color.hex}`;
      
      if (color.hex === this.currentColor) {
        swatch.classList.add('selected');
      }
      
      swatch.addEventListener('click', () => {
        this.setCurrentColor(color.hex);
      });
      
      palette.appendChild(swatch);
    }
  }
  
  /**
   * 渲染最近使用的颜色
   */
  renderRecentColors() {
    const container = document.getElementById('recent-colors');
    container.innerHTML = '';
    
    for (const hex of this.recentColors) {
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch small';
      swatch.style.backgroundColor = hex;
      swatch.title = hex;
      
      swatch.addEventListener('click', () => {
        this.setCurrentColor(hex);
      });
      
      container.appendChild(swatch);
    }
  }
  
  /**
   * 渲染画布
   */
  render() {
    const ctx = this.ctx;
    const cellSize = this.cellSize;

    // 用单位矩阵清空整个画布（不受缩放/平移影响）
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#E0E0E0';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 应用缩放和平移变换
    ctx.setTransform(this.zoomLevel, 0, 0, this.zoomLevel, this.panX, this.panY);

    // 绘制网格和色块
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        const drawX = x * (cellSize + 1) + 1;
        const drawY = y * (cellSize + 1) + 1;

        // 绘制色块
        const color = this.gridData[y][x];
        ctx.fillStyle = color || '#FFFFFF';
        ctx.fillRect(drawX, drawY, cellSize, cellSize);

        // 绘制网格线（线宽随缩放补偿，保持屏幕上视觉一致）
        if (this.showGrid) {
          ctx.strokeStyle = '#CCCCCC';
          ctx.lineWidth = 0.5 / this.zoomLevel;
          ctx.strokeRect(drawX, drawY, cellSize, cellSize);
        }
      }
    }

    // 绘制选区高亮（半透明蓝色覆盖 + 边框）
    if (this.selection) {
      const n = this.normalizedSelection();
      const selX = n.startCol * (cellSize + 1) + 1;
      const selY = n.startRow * (cellSize + 1) + 1;
      const selW = (n.endCol - n.startCol + 1) * (cellSize + 1) - 1;
      const selH = (n.endRow - n.startRow + 1) * (cellSize + 1) - 1;
      ctx.fillStyle = 'rgba(0, 120, 255, 0.25)';
      ctx.fillRect(selX, selY, selW, selH);
      ctx.strokeStyle = 'rgba(0, 120, 255, 0.9)';
      ctx.lineWidth = 2 / this.zoomLevel;
      ctx.strokeRect(selX, selY, selW, selH);
    }

    // 恢复单位矩阵，避免影响后续绘制
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // 更新颜色统计
    this.updateColorStatistics();
  }
  
  /**
   * 更新颜色统计
   */
  updateColorStatistics() {
    const stats = {};
    let total = 0;
    
    for (const row of this.gridData) {
      for (const color of row) {
        if (color) {
          if (!stats[color]) {
            const colorInfo = BEAD_COLORS.find(c => c.hex === color);
            stats[color] = {
              name: colorInfo ? colorInfo.name : '未知',
              hex: color,
              count: 0
            };
          }
          stats[color].count++;
          total++;
        }
      }
    }
    
    document.getElementById('color-count').textContent = `已用颜色: ${Object.keys(stats).length}`;
    document.getElementById('bead-count').textContent = `总拼豆数: ${total}`;
    
    // 更新右侧详细颜色统计
    const statsContainer = document.getElementById('color-statistics');
    if (statsContainer) {
      statsContainer.innerHTML = '';
      
      // 按数量降序排序
      const sortedStats = Object.values(stats).sort((a, b) => b.count - a.count);
      
      for (const item of sortedStats) {
        const statItem = document.createElement('div');
        statItem.className = 'stat-item';
        statItem.innerHTML = `
          <div class="stat-color" style="background-color: ${item.hex}"></div>
          <span class="stat-name">${item.name}</span>
          <span class="stat-count">${item.count}</span>
        `;
        statsContainer.appendChild(statItem);
      }
    }
  }
  
  /**
   * 保存历史状态（撤销/重做）
   */
  saveHistory() {
    // 删除当前索引之后的历史
    this.history = this.history.slice(0, this.historyIndex + 1);
    
    // 保存当前状态
    const snapshot = this.gridData.map(row => [...row]);
    this.history.push(snapshot);
    
    // 限制历史长度
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
    
    this.historyIndex = this.history.length - 1;
    this.updateUndoRedoButtons();
  }
  
  /**
   * 撤销
   */
  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.gridData = this.history[this.historyIndex].map(row => [...row]);
      this.render();
      this.updateUndoRedoButtons();
    }
  }
  
  /**
   * 重做
   */
  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.gridData = this.history[this.historyIndex].map(row => [...row]);
      this.render();
      this.updateUndoRedoButtons();
    }
  }
  
  /**
   * 更新撤销/重做按钮状态
   */
  updateUndoRedoButtons() {
    const btnUndo = document.getElementById('btn-undo');
    const btnRedo = document.getElementById('btn-redo');
    if (btnUndo) btnUndo.disabled = this.historyIndex <= 0;
    if (btnRedo) btnRedo.disabled = this.historyIndex >= this.history.length - 1;

    // 同步更多菜单中的按钮
    const btnUndoM = document.getElementById('btn-undo-m');
    const btnRedoM = document.getElementById('btn-redo-m');
    if (btnUndoM) btnUndoM.disabled = this.historyIndex <= 0;
    if (btnRedoM) btnRedoM.disabled = this.historyIndex >= this.history.length - 1;
  }
  
  /**
   * 清空画布
   */
  clearCanvas() {
    if (confirm('确定要清空画布吗？')) {
      this.createDefaultGrid();
      this.saveHistory();
      this.render();
    }
  }
  
  /**
   * 调整网格尺寸
   */
  resizeGrid(width, height) {
    if (width === this.gridWidth && height === this.gridHeight) return;
    
    const newGrid = [];
    for (let y = 0; y < height; y++) {
      const row = [];
      for (let x = 0; x < width; x++) {
        if (y < this.gridHeight && x < this.gridWidth) {
          row.push(this.gridData[y][x]);
        } else {
          row.push(null);
        }
      }
      newGrid.push(row);
    }
    
    this.gridWidth = width;
    this.gridHeight = height;
    this.gridData = newGrid;
    
    this.resizeCanvas();
    this.saveHistory();
    this.updateGridInfo();
  }
  
  /**
   * 更新网格信息显示
   */
  updateGridInfo() {
    document.getElementById('grid-size-display').textContent = `${this.gridWidth} × ${this.gridHeight}`;
  }
  
  /**
   * 加载网格数据（用于图片导入或项目加载）
   */
  loadGridData(newGridData) {
    this.gridData = newGridData;
    this.gridHeight = newGridData.length;
    this.gridWidth = newGridData[0].length;
    
    this.resizeCanvas();
    this.saveHistory();
    this.updateGridInfo();
    this.render();
  }

  // =====================
  // 导出辅助方法（供移动端更多菜单复用）
  // =====================

  exportPNG() {
    const dataUrl = Exporter.exportPNG(this.gridData);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'perler-bead-design.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  exportMaterials() {
    const materialList = Exporter.generateMaterialList(this.gridData);
    const html = Exporter.exportMaterialListHTML(materialList);
    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  }

  exportText() {
    const materialList = Exporter.generateMaterialList(this.gridData);
    let text = `拼豆材料清单\n生成时间: ${new Date().toLocaleString()}\n`;
    text += `总计: ${materialList.reduce((sum, item) => sum + item.count, 0)} 颗拼豆\n\n`;
    text += '颜色\t名称\tHEX\t数量\n';
    for (const item of materialList) {
      text += `${item.hex}\t${item.name}\t${item.hex}\t${item.count}\n`;
    }
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'perler-bead-materials.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  saveProject() {
    const name = prompt('请输入项目名称:', `项目_${new Date().toLocaleDateString()}`);
    if (!name) return;
    const projectData = {
      gridData: this.gridData,
      width: this.gridWidth,
      height: this.gridHeight
    };
    if (Exporter.saveProject(name, projectData)) {
      alert('项目保存成功！');
      if (window.updateProjectList) window.updateProjectList();
    } else {
      alert('项目保存失败！');
    }
  }

  loadProject() {
    const projects = Exporter.getProjectList();
    const names = Object.keys(projects);
    if (names.length === 0) {
      alert('没有已保存的项目。');
      return;
    }
    const name = prompt(`已保存的项目:\n${names.map((n, i) => `${i + 1}. ${n}`).join('\n')}\n\n请输入要加载的项目名称:`);
    if (!name || !projects[name]) {
      alert('项目名称无效！');
      return;
    }
    const project = projects[name];
    this.gridWidth = project.width;
    this.gridHeight = project.height;
    this.loadGridData(project.gridData);
    alert('项目加载成功！');
  }

  exportJSON() {
    const name = prompt('请输入项目名称:', `项目_${new Date().toLocaleDateString()}`);
    if (!name) return;
    const projectData = {
      gridData: this.gridData,
      width: this.gridWidth,
      height: this.gridHeight
    };
    Exporter.exportProjectJSON(projectData, name);
  }

  importJSON() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    const self = this;
    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const project = await Exporter.importProjectJSON(file);
        if (project.gridData && project.width && project.height) {
          self.gridWidth = project.width;
          self.gridHeight = project.height;
          self.loadGridData(project.gridData);
          alert('项目导入成功！');
        } else {
          alert('无效的项目文件！');
        }
      } catch (err) {
        alert('项目导入失败: ' + err.message);
      }
    });
    input.click();
  }
}

// 初始化应用
let app;

document.addEventListener('DOMContentLoaded', () => {
  app = new PerlerBeadDesigner();
  
  // 绑定工具栏按钮事件
  document.getElementById('btn-undo').addEventListener('click', () => app.undo());
  document.getElementById('btn-redo').addEventListener('click', () => app.redo());
  document.getElementById('btn-clear').addEventListener('click', () => app.clearCanvas());
  document.getElementById('btn-toggle-grid').addEventListener('click', () => {
    app.showGrid = !app.showGrid;
    app.render();
    document.getElementById('btn-toggle-grid').classList.toggle('active', app.showGrid);
  });
  
  // 工具按钮
  document.getElementById('tool-brush').addEventListener('click', () => app.setTool('brush'));
  document.getElementById('tool-eraser').addEventListener('click', () => app.setTool('eraser'));
  document.getElementById('tool-fill').addEventListener('click', () => app.setTool('fill'));
  document.getElementById('tool-eyedropper').addEventListener('click', () => app.setTool('eyedropper'));
  document.getElementById('tool-line').addEventListener('click', () => app.setTool('line'));

  // 新增工具/功能按钮（由 UI 模块提供，存在时才绑定，保证向后兼容）
  const bindIfExists = (id, handler) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', handler);
  };
  bindIfExists('tool-select', () => app.setTool('select'));
  bindIfExists('tool-zoom', () => app.setTool('zoom'));
  bindIfExists('tool-pan', () => app.setTool('pan'));
  bindIfExists('btn-mirror-h', () => app.toggleMirror('horizontal'));
  bindIfExists('btn-mirror-v', () => app.toggleMirror('vertical'));
  bindIfExists('btn-reset-view', () => app.resetView());
  bindIfExists('btn-patterns', () => app.showPatternDialog());
  bindIfExists('btn-print-sheet', () => app.printSheet());
  bindIfExists('btn-save-gallery', () => app.saveToGallery());
  bindIfExists('btn-open-gallery', () => app.openFromGallery());
  
  // 网格尺寸切换
  document.getElementById('grid-size-select').addEventListener('change', (e) => {
    const size = e.target.value;
    if (size === 'custom') {
      const width = parseInt(prompt('请输入宽度（列数）:', '29'));
      const height = parseInt(prompt('请输入高度（行数）:', '29'));
      if (width > 0 && height > 0) {
        app.resizeGrid(width, height);
      }
    } else {
      const [width, height] = size.split('x').map(Number);
      app.resizeGrid(width, height);
    }
    // 同步移动端下拉
    const gridSelectM = document.getElementById('grid-size-select-m');
    if (gridSelectM) gridSelectM.value = size;
  });
  
  // 图片上传
  const imageUpload = document.getElementById('image-upload');
  imageUpload.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      const img = await ImageProcessor.loadImage(file);
      const pixelData = ImageProcessor.pixelate(img, app.gridWidth, app.gridHeight);
      app.loadGridData(pixelData);
      alert('图片导入成功！');
    } catch (err) {
      alert('图片导入失败: ' + err.message);
    }
    
    // 清空 input 以允许重复上传同一文件
    imageUpload.value = '';
  });
  
  // 拖拽上传
  const dropZone = document.getElementById('canvas-container');
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.style.backgroundColor = 'rgba(0, 150, 255, 0.1)';
  });
  dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.style.backgroundColor = '';
  });
  dropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.style.backgroundColor = '';
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      try {
        const img = await ImageProcessor.loadImage(file);
        const pixelData = ImageProcessor.pixelate(img, app.gridWidth, app.gridHeight);
        app.loadGridData(pixelData);
        alert('图片导入成功！');
      } catch (err) {
        alert('图片导入失败: ' + err.message);
      }
    }
  });
  
  // 导出 PNG
  document.getElementById('btn-export-png').addEventListener('click', () => {
    app.exportPNG();
  });
  
  // 导出材料清单
  document.getElementById('btn-export-materials').addEventListener('click', () => {
    app.exportMaterials();
  });
  
  // 导出材料清单为文本
  document.getElementById('btn-export-text').addEventListener('click', () => {
    app.exportText();
  });
  
  // 保存项目
  document.getElementById('btn-save-project').addEventListener('click', () => {
    app.saveProject();
  });
  
  // 加载项目
  document.getElementById('btn-load-project').addEventListener('click', () => {
    app.loadProject();
  });
  
  // 导出项目为 JSON
  document.getElementById('btn-export-json').addEventListener('click', () => {
    app.exportJSON();
  });
  
  // 从 JSON 导入项目
  document.getElementById('btn-import-json').addEventListener('click', () => {
    app.importJSON();
  });

  // ========== 移动端项目面板按钮 ==========
  const btnSaveP = document.getElementById('btn-save-project-p');
  if (btnSaveP) btnSaveP.addEventListener('click', () => app.saveProject());

  const btnLoadP = document.getElementById('btn-load-project-p');
  if (btnLoadP) btnLoadP.addEventListener('click', () => app.loadProject());

  const btnExportJsonP = document.getElementById('btn-export-json-p');
  if (btnExportJsonP) btnExportJsonP.addEventListener('click', () => app.exportJSON());

  const btnImportJsonP = document.getElementById('btn-import-json-p');
  if (btnImportJsonP) btnImportJsonP.addEventListener('click', () => app.importJSON());
  
  // 更新项目列表显示
  function updateProjectList() {
    const projects = Exporter.getProjectList();
    
    // Helper to render list items
    function renderList(listElement) {
      if (!listElement) return;
      listElement.innerHTML = '';
      for (const name of Object.keys(projects)) {
        const li = document.createElement('li');
        li.textContent = name;
        li.style.cursor = 'pointer';
        li.addEventListener('click', () => {
          const project = projects[name];
          app.gridWidth = project.width;
          app.gridHeight = project.height;
          app.loadGridData(project.gridData);
          alert(`已加载项目: ${name}`);
        });
        listElement.appendChild(li);
      }
    }
    
    // 桌面端列表
    renderList(document.getElementById('project-list'));
    // 移动端列表
    renderList(document.getElementById('project-list-mobile'));
  }
  
  updateProjectList();

  // 将 updateProjectList 暴露到全局作用域（供 app.js 内部调用）
  window.updateProjectList = updateProjectList;

  // ========== 新增功能 UI 绑定 ==========
  
  // 1. 品牌色板切换
  const paletteSelect = document.getElementById('palette-brand-select');
  if (paletteSelect) {
    paletteSelect.addEventListener('change', (e) => {
      const brand = e.target.value;
      if (window.setPalette(brand)) {
        // 切换成功，重渲染色板
        app.renderColorPalette();
        app.render();
        alert(`已切换到 ${brand.toUpperCase()} 色板`);
      }
    });
  }
  
  // 2. 图片上传对话框
  const uploadDialog = document.getElementById('image-upload-dialog');
  const btnOpenUpload = document.getElementById('btn-open-upload-dialog');
  const btnOpenUploadM = document.getElementById('btn-open-upload-dialog-m');
  const btnUploadCancel = document.getElementById('btn-upload-cancel');
  const btnUploadConfirm = document.getElementById('btn-upload-confirm');
  const imageUploadInput = document.getElementById('image-upload-input');
  const imagePreview = document.getElementById('image-preview');
  let currentUploadImage = null;
  
  // 打开上传对话框
  const openUploadDialog = () => {
    if (uploadDialog) uploadDialog.style.display = 'flex';
  };
  if (btnOpenUpload) btnOpenUpload.addEventListener('click', openUploadDialog);
  if (btnOpenUploadM) btnOpenUploadM.addEventListener('click', openUploadDialog);
  
  // 关闭上传对话框
  const closeUploadDialog = () => {
    if (uploadDialog) uploadDialog.style.display = 'none';
    if (imageUploadInput) imageUploadInput.value = '';
    if (imagePreview) imagePreview.innerHTML = '';
    currentUploadImage = null;
  };
  if (btnUploadCancel) btnUploadCancel.addEventListener('click', closeUploadDialog);
  if (uploadDialog) {
    const overlay = uploadDialog.querySelector('.modal-overlay');
    if (overlay) overlay.addEventListener('click', closeUploadDialog);
  }
  
  // 图片选择和预览
  if (imageUploadInput) {
    imageUploadInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      try {
        currentUploadImage = await ImageProcessor.loadImage(file);
        // 显示预览
        const previewImg = document.createElement('img');
        previewImg.src = URL.createObjectURL(file);
        previewImg.style.maxWidth = '100%';
        previewImg.style.maxHeight = '200px';
        previewImg.style.border = '1px solid #ddd';
        previewImg.style.borderRadius = '4px';
        if (imagePreview) {
          imagePreview.innerHTML = '';
          imagePreview.appendChild(previewImg);
        }
      } catch (err) {
        alert('图片加载失败: ' + err.message);
      }
    });
  }
  
  // 滑块值实时显示
  const sliders = [
    { id: 'brightness-slider', valueId: 'brightness-value' },
    { id: 'contrast-slider', valueId: 'contrast-value' },
    { id: 'saturation-slider', valueId: 'saturation-value' }
  ];
  sliders.forEach(({ id, valueId }) => {
    const slider = document.getElementById(id);
    const valueDisplay = document.getElementById(valueId);
    if (slider && valueDisplay) {
      slider.addEventListener('input', (e) => {
        valueDisplay.textContent = e.target.value;
      });
    }
  });
  
  // 确认上传并转换
  if (btnUploadConfirm) {
    btnUploadConfirm.addEventListener('click', () => {
      if (!currentUploadImage) {
        alert('请先选择图片');
        return;
      }
      
      try {
        const gridSizeSelect = document.getElementById('upload-grid-size');
        const [width, height] = gridSizeSelect ? gridSizeSelect.value.split('x').map(Number) : [29, 29];
        
        const brightness = parseInt(document.getElementById('brightness-slider')?.value || 0);
        const contrast = parseInt(document.getElementById('contrast-slider')?.value || 0);
        const saturation = parseInt(document.getElementById('saturation-slider')?.value || 0);
        const removeBackground = document.getElementById('remove-background')?.checked || false;
        const autoCrop = document.getElementById('auto-crop')?.checked || false;
        
        // 如果目标尺寸与当前画布不同，先调整画布
        if (width !== app.gridWidth || height !== app.gridHeight) {
          app.resizeGrid(width, height);
        }
        
        const pixelData = ImageProcessor.pixelateAdvanced(currentUploadImage, width, height, {
          brightness,
          contrast,
          saturation,
          removeBackground,
          autoCrop
        });
        
        app.loadGridData(pixelData);
        alert('图片转换成功！');
        closeUploadDialog();
      } catch (err) {
        alert('图片转换失败: ' + err.message);
        console.error(err);
      }
    });
  }
  
  // 3. 作品库对话框
  const galleryDialog = document.getElementById('gallery-dialog');
  const galleryGrid = document.getElementById('gallery-grid');
  const gallerySearch = document.getElementById('gallery-search');
  const btnGalleryClose = document.getElementById('btn-gallery-close');
  const btnGalleryExport = document.getElementById('btn-gallery-export');
  const btnGalleryImport = document.getElementById('btn-gallery-import');
  
  // 打开作品库
  const openGalleryDialog = () => {
    if (!galleryDialog) return;
    renderGalleryGrid();
    galleryDialog.style.display = 'flex';
  };
  
  // 关闭作品库
  const closeGalleryDialog = () => {
    if (galleryDialog) galleryDialog.style.display = 'none';
  };
  
  if (btnGalleryClose) btnGalleryClose.addEventListener('click', closeGalleryDialog);
  if (galleryDialog) {
    const overlay = galleryDialog.querySelector('.modal-overlay');
    if (overlay) overlay.addEventListener('click', closeGalleryDialog);
  }
  
  // 渲染作品库网格
  const renderGalleryGrid = (filter = '') => {
    if (!galleryGrid || !window.Gallery) return;
    
    const works = filter ? Gallery.search(filter) : Gallery.list();
    galleryGrid.innerHTML = '';
    
    if (works.length === 0) {
      galleryGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #999;">暂无作品</div>';
      return;
    }
    
    works.forEach(work => {
      const item = document.createElement('div');
      item.className = 'gallery-item';
      
      const img = document.createElement('img');
      img.src = work.thumbnail;
      img.alt = work.name;
      
      const info = document.createElement('div');
      info.className = 'gallery-item-info';
      
      const name = document.createElement('div');
      name.className = 'gallery-item-name';
      name.textContent = work.name;
      
      const meta = document.createElement('div');
      meta.className = 'gallery-item-meta';
      meta.textContent = `${work.metadata.gridWidth}×${work.metadata.gridHeight} | ${work.metadata.palette}`;
      
      info.appendChild(name);
      info.appendChild(meta);
      item.appendChild(img);
      item.appendChild(info);
      
      // 点击加载作品
      item.addEventListener('click', () => {
        const fullWork = Gallery.get(work.id);
        if (fullWork) {
          app.gridWidth = fullWork.metadata.gridWidth;
          app.gridHeight = fullWork.metadata.gridHeight;
          app.loadGridData(fullWork.gridData);
          alert(`已加载作品: ${fullWork.name}`);
          closeGalleryDialog();
        }
      });
      
      galleryGrid.appendChild(item);
    });
  };
  
  // 作品库搜索
  if (gallerySearch) {
    gallerySearch.addEventListener('input', (e) => {
      renderGalleryGrid(e.target.value);
    });
  }
  
  // 导出作品库
  if (btnGalleryExport) {
    btnGalleryExport.addEventListener('click', () => {
      try {
        const json = Gallery.exportAll();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `拼豆作品库_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        alert('作品库导出成功！');
      } catch (err) {
        alert('导出失败: ' + err.message);
      }
    });
  }
  
  // 导入作品库
  if (btnGalleryImport) {
    btnGalleryImport.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
          const text = await file.text();
          const count = Gallery.importAll(text);
          alert(`成功导入 ${count} 个作品！`);
          renderGalleryGrid();
        } catch (err) {
          alert('导入失败: ' + err.message);
        }
      });
      input.click();
    });
  }
  
  // 替换原有的打开作品库按钮行为
  const btnOpenGallery = document.getElementById('btn-open-gallery');
  const btnOpenGalleryM = document.getElementById('btn-open-gallery-m');
  if (btnOpenGallery) {
    btnOpenGallery.removeEventListener('click', () => app.openFromGallery());
    btnOpenGallery.addEventListener('click', openGalleryDialog);
  }
  if (btnOpenGalleryM) {
    btnOpenGalleryM.addEventListener('click', openGalleryDialog);
  }
  
  // 4. 图案库对话框
  const patternDialog = document.getElementById('pattern-dialog');
  const patternList = document.getElementById('pattern-list');
  const btnPatternCancel = document.getElementById('btn-pattern-cancel');
  
  const patterns = [
    { name: 'heart', icon: '❤️', label: '爱心' },
    { name: 'star', icon: '⭐', label: '星星' },
    { name: 'circle', icon: '⭕', label: '圆形' },
    { name: 'square', icon: '⬛', label: '方形' },
    { name: 'cross', icon: '✚', label: '十字' },
    { name: 'arrow', icon: '➡️', label: '箭头' }
  ];
  
  const openPatternDialog = () => {
    if (!patternDialog || !patternList) return;
    
    patternList.innerHTML = '';
    patterns.forEach(pattern => {
      const btn = document.createElement('button');
      btn.className = 'pattern-btn';
      btn.innerHTML = `
        <div class="pattern-btn-icon">${pattern.icon}</div>
        <div class="pattern-btn-name">${pattern.label}</div>
      `;
      btn.addEventListener('click', () => {
        alert(`请点击画布插入 ${pattern.label} 图案`);
        app.pendingPattern = pattern.name;
        patternDialog.style.display = 'none';
      });
      patternList.appendChild(btn);
    });
    
    patternDialog.style.display = 'flex';
  };
  
  const closePatternDialog = () => {
    if (patternDialog) patternDialog.style.display = 'none';
  };
  
  if (btnPatternCancel) btnPatternCancel.addEventListener('click', closePatternDialog);
  if (patternDialog) {
    const overlay = patternDialog.querySelector('.modal-overlay');
    if (overlay) overlay.addEventListener('click', closePatternDialog);
  }
  
  // 替换原有图案库按钮行为
  const btnPatterns = document.getElementById('btn-patterns');
  const btnPatternsM = document.getElementById('btn-patterns-m');
  if (btnPatterns) {
    btnPatterns.removeEventListener('click', () => app.showPatternDialog());
    btnPatterns.addEventListener('click', openPatternDialog);
  }
  if (btnPatternsM) {
    btnPatternsM.addEventListener('click', openPatternDialog);
  }
  
  // 移动端新功能按钮绑定
  const mobileButtons = [
    { id: 'btn-mirror-h-m', handler: () => app.toggleMirror('horizontal') },
    { id: 'btn-mirror-v-m', handler: () => app.toggleMirror('vertical') },
    { id: 'btn-reset-view-m', handler: () => app.resetView() },
    { id: 'btn-print-sheet-m', handler: () => app.printSheet() },
    { id: 'btn-save-gallery-m', handler: () => app.saveToGallery() }
  ];
  
  mobileButtons.forEach(({ id, handler }) => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', handler);
  });
});
