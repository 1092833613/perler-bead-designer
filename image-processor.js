/**
 * 图片处理器模块
 * 负责图片上传、像素化、颜色匹配、参数调节、背景去除等功能
 */

class ImageProcessor {
  /**
   * 将上传的图片像素化到指定网格尺寸（简化版）
   * 内部调用 pixelateAdvanced 并使用默认参数
   * @param {HTMLImageElement} image - 源图片
   * @param {number} width - 目标宽度（网格列数）
   * @param {number} height - 目标高度（网格行数）
   * @param {boolean} dithering - 是否启用抖动效果（保留参数，暂未实现）
   * @returns {Array<Array<string|null>>} 二维数组，每个元素为匹配到的拼豆颜色 HEX 值或 null
   */
  static pixelate(image, width, height, dithering = false) {
    return this.pixelateAdvanced(image, width, height);
  }

  /**
   * 增强版像素化，支持调节参数和背景去除
   * @param {HTMLImageElement} image - 源图片
   * @param {number} gridWidth - 目标宽度（网格列数）
   * @param {number} gridHeight - 目标高度（网格行数）
   * @param {Object} [options] - 可选参数
   * @param {number} [options.brightness=0] - 亮度调节 (-100 ~ 100)
   * @param {number} [options.contrast=0] - 对比度调节 (-100 ~ 100)
   * @param {number} [options.saturation=0] - 饱和度调节 (-100 ~ 100)
   * @param {boolean} [options.removeBackground=false] - 是否去除背景
   * @param {number} [options.bgThreshold=240] - 背景检测阈值 (0-255，用于识别浅色背景)
   * @param {boolean} [options.autoCrop=false] - 是否自动裁剪主体
   * @returns {Array<Array<string|null>>} 二维数组，每个元素为匹配到的拼豆颜色 HEX 值或 null
   */
  static pixelateAdvanced(image, gridWidth, gridHeight, options = {}) {
    const {
      brightness = 0,
      contrast = 0,
      saturation = 0,
      removeBackground = false,
      bgThreshold = 240,
      autoCrop = false,
    } = options;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = gridWidth;
    canvas.height = gridHeight;

    // 使用高质量缩放
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 自动裁剪主体：仅绘制主体边界框区域，否则绘制全图
    let sx = 0;
    let sy = 0;
    let sw = image.naturalWidth || image.width;
    let sh = image.naturalHeight || image.height;
    if (autoCrop) {
      const bounds = this.detectSubjectBounds(image, bgThreshold);
      sx = bounds.x;
      sy = bounds.y;
      sw = bounds.width;
      sh = bounds.height;
    }
    ctx.drawImage(image, sx, sy, sw, sh, 0, 0, gridWidth, gridHeight);

    const imageData = ctx.getImageData(0, 0, gridWidth, gridHeight);
    const pixels = imageData.data;

    const result = [];

    for (let y = 0; y < gridHeight; y++) {
      const row = [];
      for (let x = 0; x < gridWidth; x++) {
        const index = (y * gridWidth + x) * 4;
        let r = pixels[index];
        let g = pixels[index + 1];
        let b = pixels[index + 2];
        const a = pixels[index + 3];

        // 透明像素处理
        if (a < 128) {
          row.push(null);
          continue;
        }

        // 按 亮度 -> 对比度 -> 饱和度 顺序应用调节
        if (brightness !== 0) {
          ({ r, g, b } = this.adjustBrightness(r, g, b, brightness));
        }
        if (contrast !== 0) {
          ({ r, g, b } = this.adjustContrast(r, g, b, contrast));
        }
        if (saturation !== 0) {
          ({ r, g, b } = this.adjustSaturation(r, g, b, saturation));
        }

        // 背景去除：半透明像素先与白色合成，再判断是否为浅色背景
        if (removeBackground) {
          const ratio = a / 255;
          const er = r * ratio + 255 * (1 - ratio);
          const eg = g * ratio + 255 * (1 - ratio);
          const eb = b * ratio + 255 * (1 - ratio);
          if (this.getLuminance(er, eg, eb) > bgThreshold) {
            row.push(null);
            continue;
          }
        }

        // 匹配到最近的拼豆颜色
        row.push(this.findNearestColor(r, g, b));
      }
      result.push(row);
    }

    return result;
  }

  /**
   * 检测图片主体边界框（简单版：基于非透明/非浅色像素的边界）
   * 用于裁剪掉多余背景，聚焦主体
   * @param {HTMLImageElement} image - 源图片
   * @param {number} [bgThreshold=240] - 背景亮度阈值 (0-255)
   * @returns {{x: number, y: number, width: number, height: number}} 主体边界框，无主体则返回全图
   */
  static detectSubjectBounds(image, bgThreshold = 240) {
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(image, 0, 0, width, height);

    const pixels = ctx.getImageData(0, 0, width, height).data;

    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        const a = pixels[index + 3];

        // 跳过透明像素
        if (a < 128) continue;

        // 半透明像素与白色合成后的有效亮度
        const ratio = a / 255;
        const r = pixels[index] * ratio + 255 * (1 - ratio);
        const g = pixels[index + 1] * ratio + 255 * (1 - ratio);
        const b = pixels[index + 2] * ratio + 255 * (1 - ratio);

        // 跳过浅色背景像素
        if (this.getLuminance(r, g, b) >= bgThreshold) continue;

        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }

    // 没有检测到主体，返回全图
    if (maxX < 0) {
      return { x: 0, y: 0, width, height };
    }

    // 加 5% padding，避免裁切太紧，并限制在图片范围内
    const padX = Math.round(width * 0.05);
    const padY = Math.round(height * 0.05);
    const x = Math.max(0, minX - padX);
    const y = Math.max(0, minY - padY);
    const right = Math.min(width - 1, maxX + padX);
    const bottom = Math.min(height - 1, maxY + padY);

    return { x, y, width: right - x + 1, height: bottom - y + 1 };
  }

  /**
   * 调节亮度（乘法因子，value 为 0 时不变）
   * @param {number} r - 红色分量 (0-255)
   * @param {number} g - 绿色分量 (0-255)
   * @param {number} b - 蓝色分量 (0-255)
   * @param {number} value - 调节量 (-100 ~ 100)
   * @returns {{r: number, g: number, b: number}} 调节后的 RGB
   */
  static adjustBrightness(r, g, b, value) {
    const factor = 1 + value / 100;
    return {
      r: this._clampColor(r * factor),
      g: this._clampColor(g * factor),
      b: this._clampColor(b * factor),
    };
  }

  /**
   * 调节对比度（标准 259 公式，以 128 为中点缩放）
   * @param {number} r - 红色分量 (0-255)
   * @param {number} g - 绿色分量 (0-255)
   * @param {number} b - 蓝色分量 (0-255)
   * @param {number} value - 调节量 (-100 ~ 100)
   * @returns {{r: number, g: number, b: number}} 调节后的 RGB
   */
  static adjustContrast(r, g, b, value) {
    const amount = Math.max(-255, Math.min(255, value * 2.55));
    const factor = (259 * (amount + 255)) / (255 * (259 - amount));
    const apply = (c) => this._clampColor(factor * (c - 128) + 128);
    return { r: apply(r), g: apply(g), b: apply(b) };
  }

  /**
   * 调节饱和度（以灰度亮度为基准缩放色彩偏离量）
   * @param {number} r - 红色分量 (0-255)
   * @param {number} g - 绿色分量 (0-255)
   * @param {number} b - 蓝色分量 (0-255)
   * @param {number} value - 调节量 (-100 ~ 100)
   * @returns {{r: number, g: number, b: number}} 调节后的 RGB
   */
  static adjustSaturation(r, g, b, value) {
    const gray = this.getLuminance(r, g, b);
    const factor = 1 + value / 100;
    const apply = (c) => this._clampColor(gray + (c - gray) * factor);
    return { r: apply(r), g: apply(g), b: apply(b) };
  }

  /**
   * 计算感知亮度
   * @param {number} r - 红色分量 (0-255)
   * @param {number} g - 绿色分量 (0-255)
   * @param {number} b - 蓝色分量 (0-255)
   * @returns {number} 亮度值 (0-255)
   */
  static getLuminance(r, g, b) {
    return 0.299 * r + 0.587 * g + 0.114 * b;
  }

  /**
   * 将 HEX 颜色字符串转换为 RGB 分量
   * @param {string} hex - 形如 '#RRGGBB' 的颜色字符串
   * @returns {{r: number, g: number, b: number}} RGB 分量
   */
  static hexToRgb(hex) {
    return {
      r: parseInt(hex.slice(1, 3), 16),
      g: parseInt(hex.slice(3, 5), 16),
      b: parseInt(hex.slice(5, 7), 16),
    };
  }

  /**
   * 在 RGB 空间中找到距离最近的拼豆颜色（findNearestColor 别名，保持向后兼容）
   * @param {number} r - 红色分量 (0-255)
   * @param {number} g - 绿色分量 (0-255)
   * @param {number} b - 蓝色分量 (0-255)
   * @returns {string} 匹配到的颜色 HEX 值
   */
  static findNearestColor(r, g, b) {
    return this.matchColor(r, g, b);
  }

  /**
   * 在 RGB 空间中找到距离最近的拼豆颜色
   * 使用欧氏距离计算颜色差异
   * @param {number} r - 红色分量 (0-255)
   * @param {number} g - 绿色分量 (0-255)
   * @param {number} b - 蓝色分量 (0-255)
   * @returns {string} 匹配到的颜色 HEX 值
   */
  static matchColor(r, g, b) {
    let minDistance = Infinity;
    let closestColor = BEAD_COLORS[0].hex;

    for (const color of BEAD_COLORS) {
      const { r: cr, g: cg, b: cb } = this.hexToRgb(color.hex);

      // 欧氏距离
      const distance = Math.sqrt(
        (r - cr) ** 2 +
        (g - cg) ** 2 +
        (b - cb) ** 2
      );

      if (distance < minDistance) {
        minDistance = distance;
        closestColor = color.hex;
      }
    }

    return closestColor;
  }

  /**
   * 将颜色分量值限制在 0-255 并取整
   * @param {number} value - 原始分量值
   * @returns {number} 限制后的分量值 (0-255)
   */
  static _clampColor(value) {
    return Math.max(0, Math.min(255, Math.round(value)));
  }

  /**
   * 处理图片文件上传
   * @param {File} file - 图片文件
   * @returns {Promise<HTMLImageElement>} 加载完成的图片元素
   */
  static loadImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('图片加载失败'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * 将像素化数据转换为网格数据
   * @param {Array<Array<string|null>>} pixelData - 像素化后的颜色数据
   * @returns {Array<Array<string|null>>} 网格数据
   */
  static toGridData(pixelData) {
    return pixelData;
  }
}

// 导出为全局变量
window.ImageProcessor = ImageProcessor;
