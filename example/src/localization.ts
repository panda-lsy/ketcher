/**
 * Ketcher 运行时 DOM 翻译
 * 在 React 渲染后通过 MutationObserver 翻译 UI 文本
 */

const zhMap: Record<string, string> = {
  // 工具栏
  'Hand tool': '手形工具',
  'Rectangle Selection': '矩形选择',
  'Lasso Selection': '套索选择',
  'Fragment Selection': '片段选择',
  'Structure Selection': '结构选择',
  Erase: '擦除',
  Chain: '链',
  'Bond Properties': '键属性',
  'Atom Properties': '原子属性',
  'Charge Plus': '正电荷',
  'Charge Minus': '负电荷',
  'Attachment Point Tool': '连接点',
  'S-Group': 'S-组',
  'R-Group Label Tool': 'R-基团标签',
  'R-Group Fragment Tool': 'R-基团片段',
  'Rotate Tool': '旋转',
  'Horizontal Flip': '水平翻转',
  'Vertical Flip': '垂直翻转',
  Stereochemistry: '立体化学',
  // 反应
  'Reaction Mapping Tool': '反应映射',
  'Reaction Auto-Mapping Tool': '自动映射',
  'Reaction Plus Tool': '反应加号',
  'Reaction Unmapping Tool': '取消映射',
  // 箭头
  'Arrow Open Angle Tool': '开放箭头',
  'Arrow Filled Triangle Tool': '实心三角箭头',
  'Arrow Filled Bow Tool': '实心弓形箭头',
  'Arrow Dashed Open Angle Tool': '虚线箭头',
  'Arrow Both Ends Filled Triangle Tool': '双端实心三角箭头',
  'Arrow Equilibrium Open Angle Tool': '平衡开放箭头',
  'Arrow Equilibrium Filled Half Bow Tool': '平衡半实心弓形箭头',
  'Arrow Equilibrium Filled Triangle Tool': '平衡实心三角箭头',
  'Arrow Unbalanced Equilibrium Filled Half Bow Tool': '非平衡半实心弓形箭头',
  'Arrow Unbalanced Equilibrium Filled Half Triangle Tool':
    '非平衡半实心三角箭头',
  'Arrow Unbalanced Equilibrium Large Filled Half Bow Tool':
    '非平衡大半实心弓形箭头',
  'Arrow Unbalanced Equilibrium Open Half Angle Tool': '非平衡半开放箭头',
  'Arrow Elliptical Arc Open Angle Tool': '椭圆弧开放箭头',
  'Arrow Elliptical Arc Filled Triangle Tool': '椭圆弧实心三角箭头',
  'Arrow Elliptical Arc Filled Bow Tool': '椭圆弧实心弓形箭头',
  'Arrow Elliptical Arc Open Half Angle Tool': '椭圆弧半开放箭头',
  'Retrosynthetic Arrow Tool': '逆合成箭头',
  'Failed Arrow Tool': '失败箭头',
  'Multi-Tailed Arrow Tool': '多尾箭头',
  // 形状
  'Shape Rectangle': '矩形',
  'Shape Ellipse': '椭圆',
  'Shape Line': '直线',
  // 菜单
  'Open…': '打开...',
  'Save As…': '另存为...',
  Undo: '撤销',
  Redo: '重做',
  Copy: '复制',
  'Copy Image': '复制图片',
  'Copy as KET': '复制为KET',
  'Copy as MOL': '复制为MOL',
  Cut: '剪切',
  Paste: '粘贴',
  'Select All': '全选',
  'Deselect All': '取消全选',
  'Clear Canvas': '清空画布',
  Aromatize: '芳香化',
  Dearomatize: '去芳香化',
  Layout: '自动布局',
  'Clean Up': '整理结构',
  'Calculate CIP': '计算CIP',
  'Calculated Values': '计算数值',
  'Check Structure': '检查结构',
  'Add/Remove explicit hydrogens': '添加/移除显式氢',
  'Add text': '添加文本',
  'Add Image': '添加图片',
  'Any atom': '任意原子',
  'Recognize Molecule': '识别分子',
  'Create a monomer': '创建单体',
  'Fullscreen mode': '全屏',
  'Functional Groups': '官能团',
  'Extended Table': '扩展元素表',
  'Periodic Table': '元素周期表',
  'Select descriptors': '选择描述符',
  '3D Viewer': '3D查看器',
  // 菜单/对话框
  Save: '保存',
  'Save Structure': '保存结构',
  'Save to File': '保存到文件',
  'Open structure': '打开结构',
  'Open from File': '从文件打开',
  'Open as New Project': '作为新项目打开',
  'Add to Canvas': '添加到画布',
  'Copy to clipboard': '复制到剪贴板',
  'Text Editor': '文本编辑器',
  'Import Structure from Image': '从图片导入结构',
  'Structure Check': '结构检查',
  'Structure Library': '结构库',
  'Click to add to canvas': '点击添加到画布',
  // 通用
  Apply: '应用',
  Cancel: '取消',
  OK: '确定',
  Close: '关闭',
  Delete: '删除',
  Settings: '设置',
  About: '关于',
  Help: '帮助',
  Warning: '警告',
  Error: '错误',
  Information: '信息',
  File: '文件',
  Edit: '编辑',
  View: '视图',
  Tools: '工具',
  Reset: '重置',
  Search: '搜索',
  // 键类型
  'Single Bond': '单键',
  'Double Bond': '双键',
  'Triple Bond': '三键',
  Single: '单键',
  Double: '双键',
  Triple: '三键',
  Aromatic: '芳香键',
  Any: '任意键',
  Hydrogen: '氢键',
  // 设置
  General: '通用',
  Rendering: '渲染',
  Server: '服务器',
  'Template Library': '模板库',
  'Functional Group Templates': '官能团模板',
  'Salts and Solvents': '盐和溶剂',
  // 模板名称
  Benzene: '苯',
  Pyridine: '吡啶',
  Cyclohexane: '环己烷',
  Furan: '呋喃',
  Pyrrole: '吡咯',
  Thiophene: '噻吩',
  Naphthalene: '萘',
  Indole: '吲哚',
};

function translateNode(node: Node) {
  if (node.nodeType === Node.TEXT_NODE) {
    const original = node.textContent ?? '';
    const text = original.trim();
    if (text && zhMap[text]) {
      node.textContent = original.replace(text, zhMap[text]);
    }
  }
}

function translateAll() {
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null,
  );
  while (walker.nextNode()) translateNode(walker.currentNode);

  // title 属性
  document.querySelectorAll('[title]').forEach((el) => {
    const v = el.getAttribute('title');
    if (v && zhMap[v]) el.setAttribute('title', zhMap[v]);
  });
  // placeholder
  document.querySelectorAll('[placeholder]').forEach((el) => {
    const v = el.getAttribute('placeholder');
    if (v && zhMap[v]) el.setAttribute('placeholder', zhMap[v]);
  });
  // aria-label
  document.querySelectorAll('[aria-label]').forEach((el) => {
    const v = el.getAttribute('aria-label');
    if (v && zhMap[v]) el.setAttribute('aria-label', zhMap[v]);
  });
}

/**
 * 启动 DOM 翻译观察器
 * 在 React 渲染后调用，持续监听 DOM 变化并翻译
 */
export function setupLocalization() {
  // 首次翻译
  translateAll();

  // 监听 DOM 变化
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.addedNodes.length > 0) {
        translateAll();
        return;
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
