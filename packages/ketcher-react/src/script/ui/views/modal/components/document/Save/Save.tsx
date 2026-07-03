

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

import * as structFormat from '../../../../../data/convert/structConverter';

import {
  type ClipboardEvent,
  type ContextType,
  type MouseEvent,
  type RefObject,
  Component,
  createRef,
} from 'react';
import { createSelector } from 'reselect';
import Form, { Field } from '../../../../../component/form/form/form';
import {
  type Struct,
  type StructService,
  type OutputFormatType,
  type StructServiceOptions,
  type GenerateImageOptions,
  type SupportedFormatProperties,
  FormatterFactory,
  KetSerializer,
  formatProperties,
  getPropertiesByFormat,
  getPropertiesByImgFormat,
  b64toBlob,
  KetcherLogger,
  Atom,
  isClipboardAPIAvailable,
  legacyCopy,
  SupportedFormat,
} from 'ketcher-core';

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

function inlineProcessBase64Svg(base64: string): string {
  try {
    const s = atob(base64);
    const p = inlineInjectChineseFont(s);
    return btoa(unescape(encodeURIComponent(p)));
  } catch { return base64; }
}

import { Dialog } from '../../../../components';
import Tabs from 'src/script/ui/component/view/Tabs';
import { ErrorsContext } from '../../../../../../../contexts';
import { SaveButton } from '../../../../../component/view/savebutton';
import { check } from '../../../../../state/server';
import classes from './Save.module.less';
import { connect } from 'react-redux';
import { saveUserTmpl } from '../../../../../state/templates';
import { updateFormState } from '../../../../../state/modal/form';
import Select from '../../../../../component/form/Select';
import { getSelectOptionsFromSchema } from '../../../../../utils';
import { LoadingCircles } from 'src/script/ui/views/components/Spinner';
import { IconButton } from 'components';
import type { ThunkDispatch } from 'redux-thunk';
import type { AnyAction } from 'redux';

const saveSchema = {
  title: 'Save',
  type: 'object',
  properties: {
    filename: {
      title: 'File name:',
      type: 'string',
      maxLength: 128,
      pattern: '^[^.<>:?"*\\\\|\\/][^<>:?"*\\\\|\\/]*$',
      invalidMessage: (res) => {
        if (!res) return 'Filename should contain at least one character';
        if (res.length > 128) return 'Filename is too long';
        return "A filename cannot contain characters: \\ / : * ? \" < > | and cannot start with '.'";
      },
    },
    format: {
      title: 'File format:',
      enum: Object.keys(formatProperties),
      enumNames: Object.keys(formatProperties).map(
        (format) => formatProperties[format].name,
      ),
    },
  },
};

// Type definitions for component props
interface LoadingStateProps {
  classes: typeof classes;
}

interface ImageContentProps {
  classes: typeof classes;
  format: string;
  imageSrc: string;
  isCleanStruct: boolean;
}

interface BinaryContentProps {
  classes: typeof classes;
  textAreaRef: RefObject<HTMLTextAreaElement | null>;
}

interface PreviewContentProps {
  classes: typeof classes;
  structStr: string;
  textAreaRef: RefObject<HTMLTextAreaElement | null>;
  handleCopy: (event: MouseEvent | ClipboardEvent) => void;
}

interface FormState {
  result: {
    filename: string;
    format: SupportedFormat | OutputFormatType | SupportedFormatProperties;
  };
  valid: boolean;
  errors: Record<string, string>;
  moleculeErrors?: Record<string, string>;
}

interface CheckState {
  checkOptions: unknown;
}

interface Editor {
  selection: () => { atoms?: number[] } | null;
  errorHandler: (message: string) => void;
  struct: () => Struct;
  render: {
    options: {
      ignoreChiralFlag: boolean;
    };
  };
}
interface SaveDialogProps {
  server: StructService | null;
  struct: Struct;
  options: StructServiceOptions;
  formState: FormState;
  moleculeErrors?: Record<string, string>;
  checkState: CheckState;
  bondThickness?: number;
  ignoreChiralFlag: boolean;
  editor: Editor;
  onCheck: (checkOptions: unknown) => void;
  onTmplSave: (struct: Struct) => void;
  onResetForm: (prevState: FormState) => void;
  onOk: (result?: unknown) => void;
  onCancel: () => void;
}

interface SaveDialogState {
  disableControls: boolean;
  imageFormat: string;
  tabIndex: number;
  isLoading: boolean;
  structStr?: string;
  imageSrc?: string;
  transparentBg: boolean;
  whiteStroke: boolean;
}

interface AppState {
  options: {
    app: {
      server?: boolean;
    };
    getServerSettings: () => StructServiceOptions;
    check: CheckState;
    settings: {
      bondThickness?: number;
    };
  };
  server: StructService;
  editor: Editor;
  modal: {
    form: FormState;
  };
}

// Extracted components for better performance and React best practices
const LoadingState = ({ classes }: LoadingStateProps) => (
  <div className={classes.loadingCirclesContainer}>
    <LoadingCircles />
  </div>
);

const ImageContent = ({
  classes,
  format,
  imageSrc,
  isCleanStruct,
}: ImageContentProps) => (
  <div className={classes.imageContainer}>
    {!isCleanStruct && (
      <img
        src={`data:image/${format}+xml;base64,${imageSrc}`}
        alt={`${format} preview`}
        data-testid="preview-area"
        style={{ objectFit: 'contain', maxWidth: '100%', maxHeight: '100%' }}
      />
    )}
  </div>
);

const BinaryContent = ({ classes, textAreaRef }: BinaryContentProps) => (
  <div className={classes.previewBackground}>
    <textarea
      value="Can not display binary content"
      className={classes.previewArea}
      readOnly
      ref={textAreaRef}
      data-testid="preview-area"
    />
  </div>
);

const PreviewContent = ({
  classes,
  structStr,
  textAreaRef,
  handleCopy,
}: PreviewContentProps) => (
  <div className={classes.previewBackground}>
    <textarea
      value={structStr}
      className={classes.previewArea}
      readOnly
      ref={textAreaRef}
      data-testid="preview-area"
    />
    <IconButton
      onClick={handleCopy}
      iconName="copy"
      title="Copy to clipboard"
      testId="copy-to-clipboard"
    />
  </div>
);

class SaveDialog extends Component<SaveDialogProps, SaveDialogState> {
  static readonly contextType = ErrorsContext;
  declare context: ContextType<typeof ErrorsContext>;
  private readonly isRxn: boolean;
  private readonly textAreaRef: RefObject<HTMLTextAreaElement | null>;
  private readonly saveSchema: typeof saveSchema;

  constructor(props: SaveDialogProps) {
    super(props);
    this.state = {
      disableControls: true,
      imageFormat: 'svg',
      tabIndex: 0,
      isLoading: true,
      transparentBg: false,
      whiteStroke: false,
    };
    this.isRxn =
      this.props.struct.hasRxnArrow() || this.props.struct.hasMultitailArrow();
    this.textAreaRef = createRef();

    const formats = !this.props.server
      ? [
          SupportedFormat.ket,
          this.isRxn ? SupportedFormat.rxn : SupportedFormat.mol,
          SupportedFormat.smiles,
        ]
      : [
          SupportedFormat.ket,
          this.isRxn ? SupportedFormat.rxn : SupportedFormat.mol,
          this.isRxn ? SupportedFormat.rxnV3000 : SupportedFormat.molV3000,
          SupportedFormat.sdf,
          SupportedFormat.sdfV3000,
          SupportedFormat.rdf,
          SupportedFormat.rdfV3000,
          SupportedFormat.smarts,
          SupportedFormat.smiles,
          SupportedFormat.smilesExt,
          SupportedFormat.cml,
          '<----firstDivider--->', // for dividers in select list
          SupportedFormat.inChI,
          SupportedFormat.inChIAuxInfo,
          SupportedFormat.inChIKey,
          '<----secondDivider--->', // for dividers in select list
          'svg',
          'png',
          SupportedFormat.cdxml,
          SupportedFormat.cdx,
          SupportedFormat.binaryCdx,
        ];

    this.saveSchema = saveSchema;
    this.saveSchema.properties.format = Object.assign(
      this.saveSchema.properties.format,
      {
        enum: formats,
        enumNames: formats.map((format) => {
          const formatProps = this.isImageFormat(format)
            ? getPropertiesByImgFormat(format)
            : getPropertiesByFormat(format as SupportedFormat);
          return formatProps?.name;
        }),
      },
    );
  }

  componentDidMount() {
    const { checkOptions } = this.props.checkState;
    this.props.onCheck(checkOptions);
    this.changeType(
      this.isRxn ? SupportedFormat.rxn : SupportedFormat.mol,
    ).then(
      (res) => res instanceof Error && this.setState({ disableControls: true }),
    );
  }

  isImageFormat = (format: string): format is OutputFormatType => {
    return !!getPropertiesByImgFormat(format);
  };

  isBinaryCdxFormat = (format: string): format is SupportedFormat.binaryCdx => {
    return format === SupportedFormat.binaryCdx;
  };

  showStructWarningMessage = (format: string): boolean => {
    const { errors } = this.props.formState;
    return format !== SupportedFormat.mol && Object.keys(errors).length > 0;
  };

  private _svgToPngDataUrl(svgString: string, transparentBg = false): Promise<string> {
    return new Promise((resolve, reject) => {
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth || 800;
        c.height = img.naturalHeight || 600;
        const ctx = c.getContext('2d');
        if (!ctx) { URL.revokeObjectURL(url); reject(new Error('no ctx')); return; }
        if (!transparentBg) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, c.width, c.height);
        }
        ctx.drawImage(img, 0, 0);
        const dataUrl = c.toDataURL('image/png');
        URL.revokeObjectURL(url);
        resolve(dataUrl);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('svg load')); };
      img.src = url;
    });
  }

  changeType = async (
    type: SupportedFormat | OutputFormatType,
  ): Promise<Error | void> => {
    const { struct, server, options, formState, ignoreChiralFlag } = this.props;

    if (!server) {
      this.setState({
        disableControls: false,
        tabIndex: 0,
        isLoading: false,
      });
      return Promise.resolve();
    }

    const errorHandler = this.context.errorHandler;
    if (this.isImageFormat(type)) {
      const ketSerialize = new KetSerializer();
      const structStr = ketSerialize.serialize(struct);
      this.setState({
        disableControls: true,
        tabIndex: 0,
        imageFormat: type,
        structStr,
        isLoading: true,
      });

      // ★ 优先序列化 SVG 元素（浏览器渲染，支持中文）
      try {
        const svgEl = document.querySelector(
          '.intermediate-canvas svg, .cliparea svg, [class*="StructEditor"] svg'
        ) as SVGSVGElement | null;
        if (svgEl) {
          const clone = svgEl.cloneNode(true) as SVGSVGElement;
          clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
          if (!clone.getAttribute('viewBox')) {
            const w = clone.getAttribute('width') || '800';
            const h = clone.getAttribute('height') || '600';
            clone.setAttribute('viewBox', `0 0 ${w} ${h}`);
          }
          let svgStr = new XMLSerializer().serializeToString(clone);

          // ★ 应用导出选项
          if (this.state.whiteStroke) {
            svgStr = svgStr.replace(/stroke="#000"/g, 'stroke="#ffffff"');
            svgStr = svgStr.replace(/stroke="black"/g, 'stroke="#ffffff"');
            svgStr = svgStr.replace(/fill="#000"/g, 'fill="#ffffff"');
            svgStr = svgStr.replace(/fill="black"/g, 'fill="#ffffff"');
          }
          if (this.state.transparentBg) {
            // 移除白色背景矩形
            svgStr = svgStr.replace(/<rect[^>]*fill="white"[^>]*\/>/g, '');
            svgStr = svgStr.replace(/<rect[^>]*fill="#fff"[^>]*\/>/g, '');
            svgStr = svgStr.replace(/<rect[^>]*fill="#ffffff"[^>]*\/>/g, '');
          }

          if (type === 'svg') {
            this.setState({
              disableControls: false, tabIndex: 0,
              imageSrc: btoa(unescape(encodeURIComponent(svgStr))),
              imageFormat: type, isLoading: false,
            });
            return Promise.resolve();
          }
          // PNG
          const pngUrl = await this._svgToPngDataUrl(svgStr, this.state.transparentBg);
          if (pngUrl) {
            this.setState({
              disableControls: false, tabIndex: 0,
              imageSrc: pngUrl.split(',')[1] || '', imageFormat: type, isLoading: false,
            });
            return Promise.resolve();
          }
        }
      } catch (_) {}

      // 回退到 Indigo
      const serverOptions = { ...options };
      serverOptions.outputFormat = type;

      return server
        .generateImageAsBase64(structStr, serverOptions as GenerateImageOptions)
        .then((base64) => {
          // ★ SVG 格式：注入中文字体支持
          const processedBase64 =
            type === 'svg' ? inlineProcessBase64Svg(base64) : base64;
          this.setState({
            disableControls: false,
            tabIndex: 0,
            imageSrc: processedBase64,
            imageFormat: type,
            isLoading: false,
          });
        })
        .catch((e) => {
          KetcherLogger.error('Save.jsx::SaveDialog::changeType', e);
          errorHandler(e);
          this.props.onResetForm(formState);
          return e;
        });
    } else {
      this.setState({ disableControls: true, isLoading: true });
      const factory = new FormatterFactory(server);
      // temporary check if query properties are used
      const queryPropertiesAreUsed = !!(
        type === SupportedFormat.mol &&
        Array.from(struct.atoms).find(
          ([_, atom]) =>
            atom.queryProperties.aromaticity ||
            atom.queryProperties.connectivity ||
            atom.queryProperties.ringMembership ||
            atom.queryProperties.ringSize ||
            atom.queryProperties.customQuery ||
            atom.implicitHCount,
        )
      );
      const service = factory.create(
        type,
        { ...options, ignoreChiralFlag },
        queryPropertiesAreUsed,
      );
      const getStructFromStringByType = () => {
        if (type === SupportedFormat.ket) {
          const selection = this.props.editor.selection();
          if (selection?.atoms?.length && selection.atoms.length > 0) {
            selection.atoms = selection.atoms.filter((selectedAtomId) => {
              return !Atom.isSuperatomLeavingGroupAtom(struct, selectedAtomId);
            });
          }
          return service.getStringFromStructureAsync(
            struct,
            undefined,
            selection || undefined,
          );
        }
        return service.getStringFromStructureAsync(struct);
      };
      return getStructFromStringByType()
        .then(
          (structStr) => {
            this.setState({
              tabIndex: 0,
              structStr,
            });
          },
          (e) => {
            errorHandler(e.message);
            this.props.onResetForm(formState);
            return e;
          },
        )
        .finally(() => {
          this.setState({
            disableControls: false,
            tabIndex: 0,
            isLoading: false,
          });
        });
    }
  };

  changeTab = (index: number): void => {
    this.setState({ tabIndex: index });
  };

  getWarnings = (format: SupportedFormat | OutputFormatType): string[] => {
    const { struct, moleculeErrors } = this.props;
    const warnings: string[] = [];
    const structWarning =
      'Structure contains errors, please check the data, otherwise you ' +
      'can lose some properties or the whole structure after saving in this format.';
    if (!this.isImageFormat(format)) {
      const saveWarning = structFormat.couldBeSaved(struct, format);
      const isStructInvalid = this.showStructWarningMessage(format);
      if (isStructInvalid) {
        warnings.push(structWarning);
      }
      if (saveWarning) {
        warnings.push(saveWarning);
      }
    }

    if (moleculeErrors) {
      const filteredMoleculeErrors = Object.values(moleculeErrors).filter(
        (error) => {
          if (
            format === SupportedFormat.smarts ||
            format === SupportedFormat.ket
          ) {
            return !error.includes('Structure contains query features');
          } else {
            return true;
          }
        },
      );
      warnings.push(...filteredMoleculeErrors);
    }
    return warnings;
  };

  isValidStringFormat = (
    format: SupportedFormat | OutputFormatType | SupportedFormatProperties,
  ): format is SupportedFormat | OutputFormatType => {
    return (
      typeof format === 'string' &&
      !format.startsWith('<----') &&
      !!(
        getPropertiesByFormat(format as SupportedFormat) ||
        getPropertiesByImgFormat(format as OutputFormatType)
      )
    );
  };

  renderForm = (): JSX.Element => {
    const formState = { ...this.props.formState };
    const { filename, format } = formState.result;
    const warnings = this.isValidStringFormat(format)
      ? this.getWarnings(format)
      : [];
    const tabs =
      warnings.length === 0
        ? [
            {
              caption: 'Preview',
              component: this.renderSaveFile,
              tabIndex: 0,
            },
          ]
        : [
            {
              caption: 'Preview',
              component: this.renderSaveFile,
              tabIndex: 0,
            },
            {
              caption: 'Warnings',
              component: this.renderWarnings,
              tabIndex: 1,
            },
          ];

    return (
      <div className={classes.formContainer}>
        <Form
          schema={this.saveSchema}
          init={{
            filename,
            format: this.isRxn ? 'rxn' : 'mol',
          }}
          {...formState}
        >
          <Field name="filename" />
          <Field
            name="format"
            onChange={(type) => {
              this.changeType(type as SupportedFormat | OutputFormatType);
            }}
            options={getSelectOptionsFromSchema(
              this.saveSchema.properties.format,
            )}
            component={Select}
            className="file-format-list"
            data-testid="file-format-list"
          />
        </Form>
        {/* ★ SVG/PNG 导出选项 */}
        {this.isImageFormat(format) && (
          <div style={{ display: 'flex', gap: '16px', padding: '8px 0', fontSize: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: 'inherit' }}>
              <input
                type="checkbox"
                checked={this.state.transparentBg}
                onChange={(e) => {
                  this.setState({ transparentBg: e.target.checked });
                  // 重新生成预览
                  setTimeout(() => this.changeType(format as SupportedFormat | OutputFormatType), 100);
                }}
              />
              透明背景
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: 'inherit' }}>
              <input
                type="checkbox"
                checked={this.state.whiteStroke}
                onChange={(e) => {
                  this.setState({ whiteStroke: e.target.checked });
                  // 重新生成预览
                  setTimeout(() => this.changeType(format as SupportedFormat | OutputFormatType), 100);
                }}
              />
              白色笔触
            </label>
          </div>
        )}
        <Tabs
          className={classes.tabs}
          captions={tabs}
          tabIndex={this.state.tabIndex}
          changeTab={this.changeTab}
          tabs={tabs}
        />
      </div>
    );
  };

  handleCopy = (event: MouseEvent | ClipboardEvent): void => {
    const { structStr } = this.state;

    try {
      if (isClipboardAPIAvailable()) {
        navigator.clipboard.writeText(structStr || '');
      } else if ('clipboardData' in event) {
        legacyCopy(event.clipboardData, {
          'text/plain': structStr,
        });
        event.preventDefault();
      }
    } catch (e) {
      KetcherLogger.error('copyAs.js::copyAs', e);
      this.props.editor.errorHandler(
        'This feature is not available in your browser',
      );
    }
  };

  renderSaveFile = (): JSX.Element | null => {
    const formState = { ...this.props.formState };
    delete formState.moleculeErrors;
    const { format } = formState.result;
    const { structStr, imageSrc, isLoading } = this.state;
    const isCleanStruct = this.props.struct.isBlank();

    if (isLoading) return <LoadingState classes={classes} />;

    if (this.isValidStringFormat(format) && this.isImageFormat(format)) {
      return (
        <ImageContent
          classes={classes}
          format={format}
          imageSrc={imageSrc || ''}
          isCleanStruct={isCleanStruct}
        />
      );
    }
    if (this.isValidStringFormat(format) && this.isBinaryCdxFormat(format)) {
      return <BinaryContent classes={classes} textAreaRef={this.textAreaRef} />;
    }
    return (
      <PreviewContent
        classes={classes}
        structStr={structStr || ''}
        textAreaRef={this.textAreaRef}
        handleCopy={this.handleCopy}
      />
    );
  };

  renderWarnings = (): JSX.Element | null => {
    const formState = { ...this.props.formState };
    const { format } = formState.result;

    if (!this.isValidStringFormat(format)) return null;

    const warnings = this.getWarnings(format);

    return warnings.length ? (
      <div className={classes.warnings}>
        {warnings.map((warning) => (
          <div className={classes.warningsContainer} key={warning}>
            <span className={classes.warningsArr} data-testid="WarningTextArea">
              {warning}
            </span>
          </div>
        ))}
      </div>
    ) : null;
  };

  getButtons = (): JSX.Element[] => {
    const { disableControls, imageFormat, isLoading, structStr } = this.state;
    const { options, formState } = this.props;
    const { filename, format } = formState.result;
    const isCleanStruct = this.props.struct.isBlank();

    options.outputFormat = imageFormat;

    const savingStruct =
      this.isValidStringFormat(format) &&
      this.isBinaryCdxFormat(format) &&
      !isLoading
        ? b64toBlob(structStr || '')
        : structStr;

    const isMoleculeContain =
      this.props.struct.atoms.size && this.props.struct.bonds.size;
    const buttons = [
      <button
        key="save-tmpl"
        className={classes.saveTmpl}
        disabled={disableControls || isCleanStruct || !isMoleculeContain}
        onClick={() => this.props.onTmplSave(this.props.struct)}
        data-testid="save-to-templates-button"
      >
        Save to Templates
      </button>,
    ];

    buttons.push(
      <button
        key="cancel"
        className={classes.cancel}
        onClick={() => this.props.onOk({})}
        type="button"
        data-testid="cancel-button"
      >
        Cancel
      </button>,
    );

    if (this.isValidStringFormat(format) && this.isImageFormat(format)) {
      buttons.push(
        <SaveButton
          mode="saveImage"
          options={options as GenerateImageOptions}
          data={structStr || ''}
          filename={filename}
          key="save-image-button"
          type={`image/${format}+xml`}
          onSave={this.props.onOk}
          testId="save-button"
          disabled={
            disableControls ||
            !formState.valid ||
            isCleanStruct ||
            !this.props.server
          }
          className={classes.ok}
        >
          Save
        </SaveButton>,
      );
    } else {
      buttons.push(
        <SaveButton
          mode="saveFile"
          data={savingStruct || ''}
          testId="save-button"
          filename={
            filename +
            (this.isValidStringFormat(format)
              ? getPropertiesByFormat(format)?.extensions[0] || ''
              : format.name)
          }
          key="save-file-button"
          type={!this.isValidStringFormat(format) ? format.mime : undefined}
          server={this.props.server}
          onSave={this.props.onOk}
          disabled={disableControls || !formState.valid || isCleanStruct}
          className={classes.ok}
        >
          Save
        </SaveButton>,
      );
    }
    return buttons;
  };

  render(): JSX.Element {
    const DialogComponent = Dialog;
    return (
      <DialogComponent
        testId="save-structure-dialog"
        className={classes.dialog}
        title="Save Structure"
        params={this.props}
        buttons={this.getButtons()}
        needMargin={false}
        withDivider={true}
      >
        {this.renderForm()}
      </DialogComponent>
    );
  }
}

const SaveDialogConnectWrapper = (props: SaveDialogProps) => (
  <SaveDialog {...props} />
);

const getOptions = (state: AppState) => state.options;
const serverSettingsSelector = createSelector([getOptions], (options) =>
  options.getServerSettings(),
);

const mapStateToProps = (state: AppState) => ({
  server: state.options.app.server ? state.server : null,
  struct: state.editor.struct(),
  options: serverSettingsSelector(state),
  formState: state.modal.form,
  moleculeErrors: state.modal.form.moleculeErrors,
  checkState: state.options.check,
  bondThickness: state.options.settings.bondThickness,
  ignoreChiralFlag: state.editor.render.options.ignoreChiralFlag,
  editor: state.editor,
});

const mapDispatchToProps = (
  dispatch: ThunkDispatch<AppState, undefined, AnyAction>,
) => ({
  onCheck: (checkOptions: unknown) => dispatch(check(checkOptions)),
  onTmplSave: (struct: Struct) => dispatch(saveUserTmpl(struct)),
  onResetForm: (prevState: FormState) => dispatch(updateFormState(prevState)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(SaveDialogConnectWrapper);
