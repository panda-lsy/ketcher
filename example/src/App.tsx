import { StrictMode, useEffect, useState } from 'react';
import { ButtonsConfig, Editor, InfoModal } from 'ketcher-react';
import { Ketcher, StructServiceProvider } from 'ketcher-core';

import 'ketcher-react/dist/index.css';
import './dark-theme.css';

import { getStructServiceProvider } from './utils';
import { safePostMessage } from './utils/safePostMessage';

// ★ 运行时 DOM 翻译（内联防止 webpack tree-shake）
const zhMap: Record<string, string> = {
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
  'Reaction Mapping Tool': '反应映射',
  'Reaction Auto-Mapping Tool': '自动映射',
  'Reaction Plus Tool': '反应加号',
  'Reaction Unmapping Tool': '取消映射',
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
  'Shape Rectangle': '矩形',
  'Shape Ellipse': '椭圆',
  'Shape Line': '直线',
  'Open…': '打开...',
  'Save As…': '另存为...',
  Undo: '撤销',
  Redo: '重做',
  Copy: '复制',
  Cut: '剪切',
  Paste: '粘贴',
  'Copy Image': '复制图片',
  'Copy as KET': '复制为KET',
  'Copy as MOL': '复制为MOL',
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
  'Single Bond': '单键',
  'Double Bond': '双键',
  'Triple Bond': '三键',
  Single: '单键',
  Double: '双键',
  Triple: '三键',
  Aromatic: '芳香键',
  Any: '任意键',
  Hydrogen: '氢键',
  General: '通用',
  Rendering: '渲染',
  Server: '服务器',
  'Template Library': '模板库',
  'Functional Group Templates': '官能团模板',
  'Salts and Solvents': '盐和溶剂',
  Benzene: '苯',
  Pyridine: '吡啶',
  Cyclohexane: '环己烷',
  Furan: '呋喃',
  Pyrrole: '吡咯',
  Thiophene: '噻吩',
  Naphthalene: '萘',
  Indole: '吲哚',
};

(function setupLocalization() {
  function translateAll() {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
    );
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const original = node.textContent ?? '';
      const text = original.trim();
      if (text && zhMap[text])
        node.textContent = original.replace(text, zhMap[text]);
    }
    document.querySelectorAll('[title]').forEach((el) => {
      const v = el.getAttribute('title');
      if (v && zhMap[v]) el.setAttribute('title', zhMap[v]);
    });
    document.querySelectorAll('[placeholder]').forEach((el) => {
      const v = el.getAttribute('placeholder');
      if (v && zhMap[v]) el.setAttribute('placeholder', zhMap[v]);
    });
    document.querySelectorAll('[aria-label]').forEach((el) => {
      const v = el.getAttribute('aria-label');
      if (v && zhMap[v]) el.setAttribute('aria-label', zhMap[v]);
    });
  }
  translateAll();
  new MutationObserver(() => translateAll()).observe(document.body, {
    childList: true,
    subtree: true,
  });
})();

const getHiddenButtonsConfig = (): ButtonsConfig => {
  const searchParams = new URLSearchParams(window.location.search);
  const hiddenButtons = searchParams.get('hiddenControls');
  if (!hiddenButtons) return {};
  return hiddenButtons.split(',').reduce((acc, button) => {
    if (button) acc[button] = { hidden: true };
    return acc;
  }, {} as { [val: string]: { hidden: boolean } });
};

// ★ 在模块加载时立即应用主题（在 React 渲染之前）
(function applyThemeEarly() {
  const sp = new URLSearchParams(window.location.search);
  const theme = sp.get('theme');
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else if (theme === 'light') {
    document.documentElement.removeAttribute('data-theme');
  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();

async function fallbackExportPng(
  ketcher: Ketcher,
  post: (type: string, payload: Record<string, unknown>) => void,
) {
  try {
    if (ketcher.generateImage) {
      const blob = await ketcher.generateImage(
        (await ketcher.getSmiles()) || '',
        { outputFormat: 'png' },
      );
      const reader = new FileReader();
      reader.onload = () => {
        post('exportPngResult', { dataUrl: reader.result });
      };
      reader.readAsDataURL(blob);
    }
  } catch (err) {
    post('onError', { message: 'PNG fallback: ' + String(err) });
  }
}

function setupPostMessageBridge(ketcher: Ketcher) {
  let lastSmiles = '';
  let pollTimer: ReturnType<typeof setInterval> | null = null;

  // ★ SMILES 轮询：每 800ms 检测变化并通知 Flutter
  function startPolling() {
    if (pollTimer) return;
    pollTimer = setInterval(async () => {
      try {
        const s = await ketcher.getSmiles();
        if (s != null && s !== lastSmiles) {
          lastSmiles = s;
          window.parent.postMessage(
            { type: 'onSmilesUpdated', payload: { smiles: s } },
            '*',
          );
        }
      } catch (_) {}
    }, 800);
  }

  startPolling();

  window.addEventListener('message', async (e) => {
    const d = e.data;
    if (!d?.type || !d?.channel) return;

    const ch = d.channel;
    const post = (type: string, payload: Record<string, unknown>) => {
      window.parent.postMessage({ channel: ch, type, payload }, '*');
    };

    try {
      switch (d.type) {
        case 'setMolecule': {
          const smiles = d.payload?.data || '';
          await ketcher.setMolecule(smiles);
          await new Promise((resolve) => setTimeout(resolve, 300));
          const result = await ketcher.getSmiles();
          lastSmiles = result || '';
          post('onSetMoleculeSuccess', { smiles: result || '' });
          break;
        }
        case 'getSmiles': {
          const s = await ketcher.getSmiles();
          post('getSmilesResult', {
            requestId: d.payload?.requestId,
            smiles: s || '',
          });
          break;
        }
        case 'getRxn': {
          const r = await ketcher.getRxn();
          post('getRxnResult', {
            requestId: d.payload?.requestId,
            rxn: r || '',
          });
          break;
        }
        case 'exportSvg': {
          try {
            // ★ 使用 canvas SVG（含中文字体注入）替代 Indigo 渲染
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const canvas = (ketcher.editor as any)?.canvas as
              | SVGSVGElement
              | undefined;
            if (canvas) {
              const { getSvgFromDrawnStructures } = await import(
                'ketcher-core'
              );
              const svg = getSvgFromDrawnStructures(canvas, 'file');
              if (svg) {
                post('exportSvgResult', { svgString: svg });
                break;
              }
            }
            // 回退到 Indigo
            if (ketcher.generateImage) {
              const blob = await ketcher.generateImage(
                (await ketcher.getSmiles()) || '',
                { outputFormat: 'svg' },
              );
              post('exportSvgResult', { svgString: await blob.text() });
            }
          } catch (err) {
            post('onError', { message: 'SVG export: ' + String(err) });
          }
          break;
        }
        case 'exportPng': {
          try {
            // ★ 使用 canvas SVG 转 PNG（浏览器渲染，支持中文）
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const canvas = (ketcher.editor as any)?.canvas as
              | SVGSVGElement
              | undefined;
            if (canvas) {
              const { getSvgFromDrawnStructures } = await import(
                'ketcher-core'
              );
              const svgStr = getSvgFromDrawnStructures(canvas, 'file');
              if (svgStr) {
                // SVG → Canvas → PNG
                const img = new Image();
                const svgBlob = new Blob([svgStr], { type: 'image/svg+xml' });
                const url = URL.createObjectURL(svgBlob);
                img.onload = () => {
                  const c = document.createElement('canvas');
                  c.width = img.width * 2;
                  c.height = img.height * 2;
                  const ctx = c.getContext('2d');
                  if (ctx) {
                    ctx.scale(2, 2);
                    ctx.fillStyle = 'white';
                    ctx.fillRect(0, 0, img.width, img.height);
                    ctx.drawImage(img, 0, 0);
                    post('exportPngResult', {
                      dataUrl: c.toDataURL('image/png'),
                    });
                  }
                  URL.revokeObjectURL(url);
                };
                img.onerror = () => {
                  URL.revokeObjectURL(url);
                  // 回退到 Indigo
                  fallbackExportPng(ketcher, post);
                };
                img.src = url;
                break;
              }
            }
            fallbackExportPng(ketcher, post);
          } catch (err) {
            post('onError', { message: 'PNG export: ' + String(err) });
          }
          break;
        }
        case 'triggerSave': {
          // ★ 触发 Ketcher 内置的保存/导出对话框
          try {
            const toolbar = document.querySelector('[class*="TopToolbar"]');
            const saveBtn =
              toolbar?.querySelector('[title*="Save"]') ||
              toolbar?.querySelector('button[data-testid="save"]') ||
              document.querySelector('[data-testid="save-file-button"]');
            if (saveBtn) {
              (saveBtn as HTMLElement).click();
            } else {
              // 回退：通过键盘快捷键触发
              document.dispatchEvent(
                new KeyboardEvent('keydown', {
                  key: 's',
                  ctrlKey: true,
                  bubbles: true,
                }),
              );
            }
          } catch (err) {
            post('onError', { message: '触发保存失败: ' + String(err) });
          }
          break;
        }
        case 'setTheme': {
          if (d.payload?.mode === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
          } else {
            document.documentElement.removeAttribute('data-theme');
          }
          // 重新渲染以应用新的键线颜色
          try {
            const smiles = await ketcher.getSmiles();
            if (smiles) {
              await ketcher.setMolecule(smiles);
            }
          } catch (_) {}
          break;
        }
        case 'setReadOnly': {
          const root = document.querySelector('#root');
          if (root) {
            (root as HTMLElement).style.pointerEvents = d.payload?.readOnly
              ? 'none'
              : '';
          }
          break;
        }
      }
    } catch (err) {
      post('onError', { message: String(err) });
    }
  });
}

const App = () => {
  const hiddenButtonsConfig = getHiddenButtonsConfig();
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [structServiceProvider, setStructServiceProvider] =
    useState<StructServiceProvider | null>(null);

  useEffect(() => {
    getStructServiceProvider().then(setStructServiceProvider);
  }, []);

  if (!structServiceProvider) {
    return (
      <div
        style={{
          color: 'var(--ketcher-text-secondary, #b9c7de)',
          textAlign: 'center',
          padding: 40,
        }}
      >
        Loading...
      </div>
    );
  }

  return (
    <StrictMode>
      <Editor
        errorHandler={(message: string) => {
          setHasError(true);
          setErrorMessage(message.toString());
        }}
        buttons={hiddenButtonsConfig}
        disableMacromoleculesEditor={true}
        staticResourcesUrl={process.env.PUBLIC_URL}
        structServiceProvider={structServiceProvider}
        onInit={(ketcher: Ketcher) => {
          window.ketcher = ketcher;
          safePostMessage({ eventType: 'init' });
          setupPostMessageBridge(ketcher);
          window.scrollTo(0, 0);
        }}
      />
      {hasError && (
        <InfoModal
          message={errorMessage}
          close={() => {
            setHasError(false);
            const cliparea: HTMLElement | null =
              document.querySelector('.cliparea');
            cliparea?.focus();
          }}
        />
      )}
    </StrictMode>
  );
};

export default App;
