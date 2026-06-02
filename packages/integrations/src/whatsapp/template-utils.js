"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractParamNames = extractParamNames;
exports.sortParamKeys = sortParamKeys;
exports.bodyParamsToComponents = bodyParamsToComponents;
exports.headerTextParamsComponent = headerTextParamsComponent;
exports.buildTemplateComponents = buildTemplateComponents;
exports.buttonUrlParamsToComponents = buttonUrlParamsToComponents;
function extractParamNames(content) {
    const regex = /\{\{([^}]+)\}\}/g;
    const matches = content.matchAll(regex);
    return Array.from(matches, m => m[1].trim());
}
function sortParamKeys(paramMap, forceLexical = false) {
    const keys = Object.keys(paramMap);
    if (forceLexical) {
        return keys.sort();
    }
    const allNumeric = keys.every(k => !isNaN(Number(k)));
    if (allNumeric) {
        return keys.sort((a, b) => Number(a) - Number(b));
    }
    return keys.sort();
}
function bodyParamsToComponents(bodyParams) {
    if (Object.keys(bodyParams).length === 0)
        return [];
    const isNamedParams = Object.keys(bodyParams).some(key => isNaN(Number(key)));
    const keys = sortParamKeys(bodyParams, isNamedParams);
    const params = keys.map(key => {
        const param = { type: 'text', text: bodyParams[key] };
        if (isNamedParams) {
            param.parameter_name = key;
        }
        return param;
    });
    return [{ type: 'body', parameters: params }];
}
function headerTextParamsComponent(headerContent, params, fallback) {
    if (!headerContent.includes('{{'))
        return null;
    const names = extractParamNames(headerContent);
    if (names.length === 0)
        return null;
    if (names.length > 1) {
        throw new Error(`Header text may contain at most one variable; found ${names.length}`);
    }
    const name = names[0];
    const value = params[name] || fallback[name];
    const param = { type: 'text', text: value };
    if (isNaN(Number(name))) {
        param.parameter_name = name;
    }
    return {
        type: 'header',
        parameters: [param],
    };
}
function buildTemplateComponents(bodyParams, headerType, headerContent, headerParams, headerMediaId, headerMediaFilename) {
    const components = [];
    const upperHeaderType = headerType.toUpperCase();
    if (upperHeaderType === 'TEXT') {
        try {
            const headerComp = headerTextParamsComponent(headerContent, headerParams, bodyParams);
            if (headerComp)
                components.push(headerComp);
        }
        catch {
            // continue
        }
    }
    else if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(upperHeaderType) && headerMediaId) {
        const mediaType = upperHeaderType.toLowerCase();
        const mediaObj = { id: headerMediaId };
        if (mediaType === 'document' && headerMediaFilename) {
            mediaObj.filename = headerMediaFilename;
        }
        components.push({
            type: 'header',
            parameters: [{ type: mediaType, [mediaType]: mediaObj }],
        });
    }
    const bodyComponents = bodyParamsToComponents(bodyParams);
    components.push(...bodyComponents);
    return components;
}
function buttonUrlParamsToComponents(buttonParams, templateButtons) {
    if (Object.keys(buttonParams).length === 0)
        return [];
    const btnTypes = {};
    if (templateButtons) {
        templateButtons.forEach((btn, i) => {
            const t = btn.type?.toUpperCase();
            if (t)
                btnTypes[String(i)] = t;
        });
    }
    const keys = sortParamKeys(buttonParams, false);
    const components = [];
    for (const index of keys) {
        const value = buttonParams[index];
        const btnType = btnTypes[index];
        if (btnType === 'QUICK_REPLY' || btnType === 'FLOW' || btnType === 'PHONE_NUMBER' || btnType === 'VOICE_CALL') {
            continue;
        }
        components.push({
            type: 'button',
            sub_type: 'url',
            index,
            parameters: [{ type: 'text', text: value }],
        });
    }
    return components;
}
//# sourceMappingURL=template-utils.js.map