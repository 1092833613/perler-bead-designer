/**
 * 拼豆色板数据模块（多品牌版）
 *
 * 支持三套真实品牌色板：
 *   - Perler（美国）：色号 P01-P48
 *   - Hama（丹麦）：  色号 H01-H48
 *   - Artkal（国产）：色号 A01-A48
 *
 * 每种颜色的统一格式：
 *   { code: 'P01', name: '白色', nameEn: 'White', hex: '#FFFFFF' }
 *
 * 三套色板共享 41 个基础色（白/黑/红/蓝等，按相同顺序排列），
 * 另各有 7 个品牌独有颜色，共计 48 色。
 * 注意：同一基础色在不同品牌中的 hex 略有差异（模拟真实品牌间的色差），
 * 其中 Perler 的基础色 hex 与旧版通用色板保持一致，确保向后兼容。
 *
 * 兼容性说明：
 *   旧代码（app.js / image-processor.js / exporter.js）直接使用全局数组
 *   BEAD_COLORS。本文件保留该变量，并在 setPalette() 切换品牌时对其
 *   “原地更新”（保持数组引用不变，仅替换内容），因此所有持有旧引用的
 *   模块无需修改即可自动使用当前色板。
 */

/* ============================================================
 * Perler 色板（美国）—— 基础色 hex 沿用旧版通用色板
 * ============================================================ */
const PERLER_COLORS = [
  // ---- 基础色（与 Hama / Artkal 对齐）----
  { code: 'P01', name: '白色', nameEn: 'White', hex: '#FFFFFF' },
  { code: 'P02', name: '奶油色', nameEn: 'Cream', hex: '#F5DEB3' },
  { code: 'P03', name: '米色', nameEn: 'Beige', hex: '#F5F5DC' },
  { code: 'P04', name: '淡黄色', nameEn: 'Pastel Yellow', hex: '#FFF2A8' },
  { code: 'P05', name: '黄色', nameEn: 'Yellow', hex: '#FFFF00' },
  { code: 'P06', name: '金色', nameEn: 'Gold', hex: '#FFD700' },
  { code: 'P07', name: '橙色', nameEn: 'Orange', hex: '#FFA500' },
  { code: 'P08', name: '桃色', nameEn: 'Peach', hex: '#FFDAB9' },
  { code: 'P09', name: '肤色', nameEn: 'Skin', hex: '#FFDBAC' },
  { code: 'P10', name: '珊瑚色', nameEn: 'Coral', hex: '#FF7F50' },
  { code: 'P11', name: '鲑鱼色', nameEn: 'Salmon', hex: '#FA8072' },
  { code: 'P12', name: '粉色', nameEn: 'Pink', hex: '#FFC0CB' },
  { code: 'P13', name: '热粉色', nameEn: 'Hot Pink', hex: '#FF69B4' },
  { code: 'P14', name: '洋红色', nameEn: 'Magenta', hex: '#FF00FF' },
  { code: 'P15', name: '红色', nameEn: 'Red', hex: '#FF0000' },
  { code: 'P16', name: '深玫红', nameEn: 'Crimson', hex: '#DC143C' },
  { code: 'P17', name: '深红色', nameEn: 'Dark Red', hex: '#8B0000' },
  { code: 'P18', name: '栗色', nameEn: 'Maroon', hex: '#800000' },
  { code: 'P19', name: '李子色', nameEn: 'Plum', hex: '#DDA0DD' },
  { code: 'P20', name: '紫罗兰', nameEn: 'Violet', hex: '#EE82EE' },
  { code: 'P21', name: '薰衣草紫', nameEn: 'Lavender', hex: '#9370DB' },
  { code: 'P22', name: '紫色', nameEn: 'Purple', hex: '#800080' },
  { code: 'P23', name: '靛蓝色', nameEn: 'Indigo', hex: '#4B0082' },
  { code: 'P24', name: '深蓝色', nameEn: 'Navy', hex: '#000080' },
  { code: 'P25', name: '蓝色', nameEn: 'Blue', hex: '#0000FF' },
  { code: 'P26', name: '浅蓝色', nameEn: 'Sky Blue', hex: '#87CEEB' },
  { code: 'P27', name: '青色', nameEn: 'Cyan', hex: '#00FFFF' },
  { code: 'P28', name: '土耳其蓝', nameEn: 'Turquoise', hex: '#40E0D0' },
  { code: 'P29', name: '蓝绿色', nameEn: 'Teal', hex: '#008080' },
  { code: 'P30', name: '薄荷绿', nameEn: 'Mint', hex: '#98FB98' },
  { code: 'P31', name: '浅绿色', nameEn: 'Light Green', hex: '#90EE90' },
  { code: 'P32', name: '柠檬绿', nameEn: 'Lime', hex: '#00FF00' },
  { code: 'P33', name: '绿色', nameEn: 'Green', hex: '#008000' },
  { code: 'P34', name: '深绿色', nameEn: 'Dark Green', hex: '#006400' },
  { code: 'P35', name: '橄榄色', nameEn: 'Olive', hex: '#808000' },
  { code: 'P36', name: '浅棕色', nameEn: 'Tan', hex: '#D2B48C' },
  { code: 'P37', name: '棕色', nameEn: 'Brown', hex: '#8B4513' },
  { code: 'P38', name: '银色', nameEn: 'Silver', hex: '#C0C0C0' },
  { code: 'P39', name: '灰色', nameEn: 'Gray', hex: '#808080' },
  { code: 'P40', name: '深灰色', nameEn: 'Dark Gray', hex: '#404040' },
  { code: 'P41', name: '黑色', nameEn: 'Black', hex: '#000000' },
  // ---- Perler 独有颜色 ----
  { code: 'P42', name: '蜂蜜色', nameEn: 'Honey', hex: '#EBA937' },
  { code: 'P43', name: '切达橙', nameEn: 'Cheddar', hex: '#F15A22' },
  { code: 'P44', name: '蔓越莓红', nameEn: 'Cranapple', hex: '#A6192E' },
  { code: 'P45', name: '铁锈红', nameEn: 'Rust', hex: '#B04A2E' },
  { code: 'P46', name: '茄子紫', nameEn: 'Eggplant', hex: '#51284F' },
  { code: 'P47', name: '湖蓝色', nameEn: 'Lagoon', hex: '#00A9CE' },
  { code: 'P48', name: '奇异果绿', nameEn: 'Kiwi Lime', hex: '#A9C23F' }
];

/* ============================================================
 * Hama 色板（丹麦）—— hex 为 Hama 实物色的近似值
 * ============================================================ */
const HAMA_COLORS = [
  // ---- 基础色（与 Perler / Artkal 对齐）----
  { code: 'H01', name: '白色', nameEn: 'White', hex: '#FFFFFF' },
  { code: 'H02', name: '奶油色', nameEn: 'Cream', hex: '#F3E5C0' },
  { code: 'H03', name: '米色', nameEn: 'Beige', hex: '#EFE7D0' },
  { code: 'H04', name: '淡黄色', nameEn: 'Pastel Yellow', hex: '#FDF0A6' },
  { code: 'H05', name: '黄色', nameEn: 'Yellow', hex: '#F5D600' },
  { code: 'H06', name: '金色', nameEn: 'Gold', hex: '#F2B705' },
  { code: 'H07', name: '橙色', nameEn: 'Orange', hex: '#F28C00' },
  { code: 'H08', name: '桃色', nameEn: 'Peach', hex: '#FBD0A8' },
  { code: 'H09', name: '肤色', nameEn: 'Skin', hex: '#F3D3AE' },
  { code: 'H10', name: '珊瑚色', nameEn: 'Coral', hex: '#F57F5E' },
  { code: 'H11', name: '鲑鱼色', nameEn: 'Salmon', hex: '#F08A78' },
  { code: 'H12', name: '粉色', nameEn: 'Pink', hex: '#F6BDC8' },
  { code: 'H13', name: '热粉色', nameEn: 'Hot Pink', hex: '#F0659B' },
  { code: 'H14', name: '洋红色', nameEn: 'Magenta', hex: '#E0007E' },
  { code: 'H15', name: '红色', nameEn: 'Red', hex: '#E2001A' },
  { code: 'H16', name: '深玫红', nameEn: 'Crimson', hex: '#C8123C' },
  { code: 'H17', name: '深红色', nameEn: 'Dark Red', hex: '#8F1522' },
  { code: 'H18', name: '栗色', nameEn: 'Maroon', hex: '#641E16' },
  { code: 'H19', name: '李子色', nameEn: 'Plum', hex: '#D7A1CE' },
  { code: 'H20', name: '紫罗兰', nameEn: 'Violet', hex: '#B07CC6' },
  { code: 'H21', name: '薰衣草紫', nameEn: 'Lavender', hex: '#A78BC9' },
  { code: 'H22', name: '紫色', nameEn: 'Purple', hex: '#6F3381' },
  { code: 'H23', name: '靛蓝色', nameEn: 'Indigo', hex: '#3C2A6E' },
  { code: 'H24', name: '深蓝色', nameEn: 'Navy', hex: '#16294C' },
  { code: 'H25', name: '蓝色', nameEn: 'Blue', hex: '#004F9F' },
  { code: 'H26', name: '浅蓝色', nameEn: 'Sky Blue', hex: '#8FC1E3' },
  { code: 'H27', name: '青色', nameEn: 'Cyan', hex: '#00B5CC' },
  { code: 'H28', name: '土耳其蓝', nameEn: 'Turquoise', hex: '#3DBEBD' },
  { code: 'H29', name: '蓝绿色', nameEn: 'Teal', hex: '#006F6B' },
  { code: 'H30', name: '薄荷绿', nameEn: 'Mint', hex: '#A7E4C5' },
  { code: 'H31', name: '浅绿色', nameEn: 'Light Green', hex: '#93DB8C' },
  { code: 'H32', name: '柠檬绿', nameEn: 'Lime', hex: '#57AB27' },
  { code: 'H33', name: '绿色', nameEn: 'Green', hex: '#009640' },
  { code: 'H34', name: '深绿色', nameEn: 'Dark Green', hex: '#006B3F' },
  { code: 'H35', name: '橄榄色', nameEn: 'Olive', hex: '#767B2A' },
  { code: 'H36', name: '浅棕色', nameEn: 'Tan', hex: '#CDA47C' },
  { code: 'H37', name: '棕色', nameEn: 'Brown', hex: '#7A4A21' },
  { code: 'H38', name: '银色', nameEn: 'Silver', hex: '#C4C6C8' },
  { code: 'H39', name: '灰色', nameEn: 'Gray', hex: '#888B8D' },
  { code: 'H40', name: '深灰色', nameEn: 'Dark Gray', hex: '#4C4F53' },
  { code: 'H41', name: '黑色', nameEn: 'Black', hex: '#151515' },
  // ---- Hama 独有颜色 ----
  { code: 'H42', name: '焦糖色', nameEn: 'Caramel', hex: '#C68E4E' },
  { code: 'H43', name: '杏色', nameEn: 'Apricot', hex: '#F4A950' },
  { code: 'H44', name: '酒红色', nameEn: 'Burgundy', hex: '#70263D' },
  { code: 'H45', name: '鼠尾草绿', nameEn: 'Sage Green', hex: '#9CAF88' },
  { code: 'H46', name: '雾霾蓝', nameEn: 'Dusty Blue', hex: '#6E93A8' },
  { code: 'H47', name: '玫瑰粉', nameEn: 'Rose', hex: '#E77B8C' },
  { code: 'H48', name: '深棕色', nameEn: 'Dark Brown', hex: '#4A2C17' }
];

/* ============================================================
 * Artkal 色板（国产）—— hex 为 Artkal 实物色的近似值
 * ============================================================ */
const ARTKAL_COLORS = [
  // ---- 基础色（与 Perler / Hama 对齐）----
  { code: 'A01', name: '白色', nameEn: 'White', hex: '#FFFFFF' },
  { code: 'A02', name: '奶油色', nameEn: 'Cream', hex: '#F7E9C6' },
  { code: 'A03', name: '米色', nameEn: 'Beige', hex: '#F2ECDA' },
  { code: 'A04', name: '淡黄色', nameEn: 'Pastel Yellow', hex: '#FCEFA1' },
  { code: 'A05', name: '黄色', nameEn: 'Yellow', hex: '#FFD900' },
  { code: 'A06', name: '金色', nameEn: 'Gold', hex: '#FFBF00' },
  { code: 'A07', name: '橙色', nameEn: 'Orange', hex: '#FF8A00' },
  { code: 'A08', name: '桃色', nameEn: 'Peach', hex: '#FFCFA3' },
  { code: 'A09', name: '肤色', nameEn: 'Skin', hex: '#FBD8B0' },
  { code: 'A10', name: '珊瑚色', nameEn: 'Coral', hex: '#FF8163' },
  { code: 'A11', name: '鲑鱼色', nameEn: 'Salmon', hex: '#F88B7A' },
  { code: 'A12', name: '粉色', nameEn: 'Pink', hex: '#FFB9C7' },
  { code: 'A13', name: '热粉色', nameEn: 'Hot Pink', hex: '#FF5FA8' },
  { code: 'A14', name: '洋红色', nameEn: 'Magenta', hex: '#EC008C' },
  { code: 'A15', name: '红色', nameEn: 'Red', hex: '#ED1C24' },
  { code: 'A16', name: '深玫红', nameEn: 'Crimson', hex: '#D0113C' },
  { code: 'A17', name: '深红色', nameEn: 'Dark Red', hex: '#8E1616' },
  { code: 'A18', name: '栗色', nameEn: 'Maroon', hex: '#781920' },
  { code: 'A19', name: '李子色', nameEn: 'Plum', hex: '#D8A0D2' },
  { code: 'A20', name: '紫罗兰', nameEn: 'Violet', hex: '#D986D5' },
  { code: 'A21', name: '薰衣草紫', nameEn: 'Lavender', hex: '#9472C9' },
  { code: 'A22', name: '紫色', nameEn: 'Purple', hex: '#7B2386' },
  { code: 'A23', name: '靛蓝色', nameEn: 'Indigo', hex: '#45277A' },
  { code: 'A24', name: '深蓝色', nameEn: 'Navy', hex: '#0A1F5C' },
  { code: 'A25', name: '蓝色', nameEn: 'Blue', hex: '#0645B1' },
  { code: 'A26', name: '浅蓝色', nameEn: 'Sky Blue', hex: '#8DCDEA' },
  { code: 'A27', name: '青色', nameEn: 'Cyan', hex: '#00C6D7' },
  { code: 'A28', name: '土耳其蓝', nameEn: 'Turquoise', hex: '#3CD2C7' },
  { code: 'A29', name: '蓝绿色', nameEn: 'Teal', hex: '#007F7A' },
  { code: 'A30', name: '薄荷绿', nameEn: 'Mint', hex: '#A2F2B8' },
  { code: 'A31', name: '浅绿色', nameEn: 'Light Green', hex: '#97E88F' },
  { code: 'A32', name: '柠檬绿', nameEn: 'Lime', hex: '#55D93B' },
  { code: 'A33', name: '绿色', nameEn: 'Green', hex: '#008F45' },
  { code: 'A34', name: '深绿色', nameEn: 'Dark Green', hex: '#00602E' },
  { code: 'A35', name: '橄榄色', nameEn: 'Olive', hex: '#7E7C21' },
  { code: 'A36', name: '浅棕色', nameEn: 'Tan', hex: '#CFAE84' },
  { code: 'A37', name: '棕色', nameEn: 'Brown', hex: '#8A4B1E' },
  { code: 'A38', name: '银色', nameEn: 'Silver', hex: '#C2C2C2' },
  { code: 'A39', name: '灰色', nameEn: 'Gray', hex: '#7F7F7F' },
  { code: 'A40', name: '深灰色', nameEn: 'Dark Gray', hex: '#3D3D3D' },
  { code: 'A41', name: '黑色', nameEn: 'Black', hex: '#0D0D0D' },
  // ---- Artkal 独有颜色 ----
  { code: 'A42', name: '咖啡棕', nameEn: 'Coffee', hex: '#5C3A1E' },
  { code: 'A43', name: '玫瑰红', nameEn: 'Rose Red', hex: '#E84366' },
  { code: 'A44', name: '香芋紫', nameEn: 'Taro Purple', hex: '#B48BB8' },
  { code: 'A45', name: '牛仔蓝', nameEn: 'Denim Blue', hex: '#3A5F8A' },
  { code: 'A46', name: '荧光黄绿', nameEn: 'Neon Lime', hex: '#B5E61D' },
  { code: 'A47', name: '南瓜橙', nameEn: 'Pumpkin', hex: '#E86A10' },
  { code: 'A48', name: '苔绿', nameEn: 'Moss Green', hex: '#8A9A5B' }
];

/* ============================================================
 * 色板集合与当前色板状态
 * ============================================================ */
const BEAD_PALETTES = {
  perler: { label: 'Perler', colors: PERLER_COLORS },
  hama:   { label: 'Hama',   colors: HAMA_COLORS },
  artkal: { label: 'Artkal', colors: ARTKAL_COLORS }
};

// 当前色板品牌 key：'perler' | 'hama' | 'artkal'
let CURRENT_PALETTE = 'perler';

/**
 * 向后兼容的全局颜色数组。
 * 始终保存“当前色板”的颜色内容（初始为 Perler）。
 * 注意：这是独立数组，不能直接用 BEAD_PALETTES.perler.colors 赋值，
 * 否则 setPalette 原地更新时会污染 Perler 的原始数据。
 * setPalette() 通过 length = 0 + push 原地替换内容，保持引用不变，
 * 使旧代码中所有直接引用 BEAD_COLORS 的地方自动跟随当前色板。
 */
const BEAD_COLORS = [...BEAD_PALETTES.perler.colors];

/* ============================================================
 * 接口函数
 * ============================================================ */

/**
 * 获取当前色板的颜色数组
 * @returns {Array<{code:string, name:string, nameEn:string, hex:string}>}
 */
function getBeadColors() {
  return BEAD_PALETTES[CURRENT_PALETTE].colors;
}

/**
 * 切换色板品牌
 * @param {string} brand - 'perler' | 'hama' | 'artkal'
 * @returns {boolean} 切换成功返回 true；品牌不存在时保持原色板并返回 false
 */
function setPalette(brand) {
  if (!Object.prototype.hasOwnProperty.call(BEAD_PALETTES, brand)) {
    console.warn(`[bead-colors] 未知色板品牌: ${brand}，保持当前色板 ${CURRENT_PALETTE}`);
    return false;
  }
  CURRENT_PALETTE = brand;
  // 同步 window 上的状态副本（window.CURRENT_PALETTE 是按值拷贝的）
  if (typeof window !== 'undefined') {
    window.CURRENT_PALETTE = brand;
  }
  // 原地更新兼容数组 BEAD_COLORS：引用不变，内容替换为当前色板
  BEAD_COLORS.length = 0;
  BEAD_COLORS.push(...BEAD_PALETTES[brand].colors);
  return true;
}

/**
 * 获取当前品牌 key
 * @returns {string} 'perler' | 'hama' | 'artkal'
 */
function getCurrentPalette() {
  return CURRENT_PALETTE;
}

/**
 * 获取所有品牌列表（供 UI 渲染色板切换器）
 * @returns {Array<{key:string, label:string}>} 如 [{key:'perler', label:'Perler'}, ...]
 */
function getPaletteList() {
  return Object.keys(BEAD_PALETTES).map(key => ({
    key,
    label: BEAD_PALETTES[key].label
  }));
}

/**
 * 将 hex 字符串解析为 {r, g, b}
 * 支持 '#RRGGBB' / 'RRGGBB' / '#RGB' / 'RGB'，非法输入返回 null
 * @param {string} hex
 * @returns {{r:number, g:number, b:number}|null}
 */
function hexToRgb(hex) {
  if (typeof hex !== 'string') return null;
  let h = hex.trim().replace(/^#/, '');
  // 3 位简写展开为 6 位，如 'F00' -> 'FF0000'
  if (/^[0-9A-Fa-f]{3}$/.test(h)) {
    h = h.split('').map(ch => ch + ch).join('');
  }
  if (!/^[0-9A-Fa-f]{6}$/.test(h)) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16)
  };
}

/**
 * 在当前色板中查找与给定 hex 最接近的颜色（RGB 欧氏距离）
 * 供图片像素匹配使用，返回值带品牌色号信息
 * @param {string} hex - 目标颜色，如 '#FF2000'
 * @returns {{code:string, name:string, nameEn:string, hex:string, distance:number}|null}
 *          输入非法时返回 null；distance 为 RGB 欧氏距离（0 表示完全匹配）
 */
function findNearestColor(hex) {
  const target = hexToRgb(hex);
  if (!target) return null;

  let best = null;
  let bestDistance = Infinity;
  for (const color of getBeadColors()) {
    const rgb = hexToRgb(color.hex);
    if (!rgb) continue; // 跳过数据异常项，不中断匹配
    const dr = target.r - rgb.r;
    const dg = target.g - rgb.g;
    const db = target.b - rgb.b;
    const distance = Math.sqrt(dr * dr + dg * dg + db * db);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = color;
    }
  }
  if (!best) return null;

  return {
    code: best.code,
    name: best.name,
    nameEn: best.nameEn,
    hex: best.hex,
    distance: bestDistance
  };
}

/* ============================================================
 * 挂载到 window（浏览器全局，兼容非模块化使用）
 * ============================================================ */
if (typeof window !== 'undefined') {
  window.BEAD_COLORS = BEAD_COLORS;            // 向后兼容：旧代码直接使用的数组
  window.BEAD_PALETTES = BEAD_PALETTES;
  window.CURRENT_PALETTE = CURRENT_PALETTE;
  window.getBeadColors = getBeadColors;
  window.setPalette = setPalette;
  window.getCurrentPalette = getCurrentPalette;
  window.getPaletteList = getPaletteList;
  window.findNearestColor = findNearestColor;
}
