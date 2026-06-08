/**
 * Ketcher 本地化系统 - 保留接口兼容
 * 实际翻译由 index.html 内联脚本处理（rollup/webpack 无法 tree-shake HTML 内联脚本）
 */

type LocaleMap = Record<string, string>;

export function registerLocale(_name: string, _map: LocaleMap) {}
export function setLocale(_name: string) {}
export function getLocale(): string { return 'zh'; }
export function autoDetectLocale() {}
export function t(key: string): string { return key; }
