export declare function extractParamNames(content: string): string[];
export declare function sortParamKeys(paramMap: Record<string, string>, forceLexical?: boolean): string[];
export declare function bodyParamsToComponents(bodyParams: Record<string, string>): Array<Record<string, unknown>>;
export declare function headerTextParamsComponent(headerContent: string, params: Record<string, string>, fallback: Record<string, string>): Record<string, unknown> | null;
export declare function buildTemplateComponents(bodyParams: Record<string, string>, headerType: string, headerContent: string, headerParams: Record<string, string>, headerMediaId: string, headerMediaFilename: string): Array<Record<string, unknown>>;
export declare function buttonUrlParamsToComponents(buttonParams: Record<string, string>, templateButtons?: unknown[]): Array<Record<string, unknown>>;


