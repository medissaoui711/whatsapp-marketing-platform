export function extractParamNames(content: string): string[] {
  const regex = /\{\{([^}]+)\}\}/g;
  const matches = content.matchAll(regex);
  return Array.from(matches, m => m[1].trim());
}

export function sortParamKeys(paramMap: Record<string, string>, forceLexical = false): string[] {
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

export function bodyParamsToComponents(bodyParams: Record<string, string>): Array<Record<string, unknown>> {
  if (Object.keys(bodyParams).length === 0) return [];

  const isNamedParams = Object.keys(bodyParams).some(key => isNaN(Number(key)));
  const keys = sortParamKeys(bodyParams, isNamedParams);

  const params = keys.map(key => {
    const param: Record<string, unknown> = { type: 'text', text: bodyParams[key] };
    if (isNamedParams) {
      param.parameter_name = key;
    }
    return param;
  });

  return [{ type: 'body', parameters: params }];
}

export function headerTextParamsComponent(
  headerContent: string,
  params: Record<string, string>,
  fallback: Record<string, string>
): Record<string, unknown> | null {
  if (!headerContent.includes('{{')) return null;

  const names = extractParamNames(headerContent);
  if (names.length === 0) return null;
  if (names.length > 1) {
    throw new Error(`Header text may contain at most one variable; found ${names.length}`);
  }

  const name = names[0];
  const value = params[name] || fallback[name];

  const param: Record<string, unknown> = { type: 'text', text: value };
  if (isNaN(Number(name))) {
    param.parameter_name = name;
  }

  return {
    type: 'header',
    parameters: [param],
  };
}

export function buildTemplateComponents(
  bodyParams: Record<string, string>,
  headerType: string,
  headerContent: string,
  headerParams: Record<string, string>,
  headerMediaId: string,
  headerMediaFilename: string
): Array<Record<string, unknown>> {
  const components: Array<Record<string, unknown>> = [];

  const upperHeaderType = headerType.toUpperCase();

  if (upperHeaderType === 'TEXT') {
    try {
      const headerComp = headerTextParamsComponent(headerContent, headerParams, bodyParams);
      if (headerComp) components.push(headerComp);
    } catch {
      // continue
    }
  } else if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(upperHeaderType) && headerMediaId) {
    const mediaType = upperHeaderType.toLowerCase();
    const mediaObj: Record<string, unknown> = { id: headerMediaId };
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

export function buttonUrlParamsToComponents(
  buttonParams: Record<string, string>,
  templateButtons?: unknown[]
): Array<Record<string, unknown>> {
  if (Object.keys(buttonParams).length === 0) return [];

  const btnTypes: Record<string, string> = {};
  if (templateButtons) {
    templateButtons.forEach((btn: any, i) => {
      const t = btn.type?.toUpperCase();
      if (t) btnTypes[String(i)] = t;
    });
  }

  const keys = sortParamKeys(buttonParams, false);
  const components: Array<Record<string, unknown>> = [];

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


