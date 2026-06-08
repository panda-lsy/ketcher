/****************************************************************************
 * Copyright 2021 EPAM Systems
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 ***************************************************************************/
import {
  type GenerateImageOptions,
  KetcherLogger,
  ketcherProvider,
} from 'ketcher-core';
import { saveAs } from 'file-saver';

import type { KeyboardEvent, MouseEvent, PropsWithChildren } from 'react';
import { useAppContext } from '../../../../hooks';
import { fileSaver } from './saveButton.utils';
import type { SaverType } from './saveButton.types';

// ★ 中文字体注入（内联防止 rollup tree-shake）
function inlineInjectChineseFont(svg: string): string {
  if (!svg || !svg.includes('<svg')) return svg;
  const fontDef = '<defs><style>@import url("https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700&amp;display=swap");</style></defs>';
  const ff = "font-family='Noto Sans SC, Microsoft YaHei, PingFang SC, Arial, sans-serif'";
  let r = svg.replace(/<svg([^>]*)>/, '<svg$1>' + fontDef);
  r = r.replace(/<text /g, '<text ' + ff + ' ');
  r = r.replace(/<text>/g, '<text ' + ff + '>');
  return r;
}

type Props = {
  server?: any;
  filename: string;
  data: any;
  type?: string;
  mode?: string;
  options?: GenerateImageOptions;
  onSave?: () => void;
  onError?: (err: any) => void;
  className?: string;
  title?: string;
  disabled?: boolean;
  testId?: string;
};

type SaveButtonProps = PropsWithChildren<Props>;

const SaveButton = (props: SaveButtonProps) => {
  const noop = () => null;
  const {
    server,
    filename = 'unnamed',
    data,
    type,
    mode = 'saveFile',
    options,
    onSave = noop,
    onError = noop,
    className,
    title,
    disabled,
    testId,
  } = props;
  const { ketcherId } = useAppContext();

  const saveFile = async () => {
    if (data) {
      try {
        const saver: SaverType = await fileSaver(server);
        saver(data, filename, type);
        onSave();
      } catch (e) {
        KetcherLogger.error('savebutton.tsx::SaveButton::saveFile', e);
        onError(e);
      }
    }
  };

  const saveImage = () => {
    const ketcherInstance = ketcherProvider.getKetcher(ketcherId);
    if (options?.outputFormat) {
      ketcherInstance
        .generateImage(data, options)
        .then(async (blob) => {
          // ★ SVG 格式：注入中文字体
          if (options.outputFormat === 'svg') {
            const svgText = await blob.text();
            const processed = inlineInjectChineseFont(svgText);
            blob = new Blob([processed], { type: 'image/svg+xml' });
          }
          saveAs(blob, `${filename}.${options.outputFormat}`);
          onSave();
        })
        .catch((e) => {
          KetcherLogger.error('savebutton.tsx::SaveButton::saveImage', e);
          onError(e);
        });
    }
  };

  const save = (event: KeyboardEvent | MouseEvent) => {
    event.preventDefault();
    switch (mode) {
      case 'saveImage':
        saveImage();
        break;
      case 'saveFile':
      default:
        saveFile();
    }
  };

  return (
    <button
      title={title}
      className={className}
      disabled={disabled}
      data-testid={testId}
      onClick={(event) => {
        save(event);
      }}
    >
      {props.children}
    </button>
  );
};

export { SaveButton };
