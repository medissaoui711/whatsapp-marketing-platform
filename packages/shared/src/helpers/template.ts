const variablePattern = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*|\[\d+\])*)\s*\}\}/g;
const forLoopPattern = /\{\{for\s+(\w+)\s+in\s+(\w+(?:\.\w+)*)\}\}([\s\S]*?)\{\{endfor\}\}/g;
const ifElsePattern = /\{\{if\s+([^}]+)\}\}([\s\S]*?)\{\{endif\}\}/g;

const MAX_LOOP_ITERATIONS = 50;

function getNestedValue(data: Record<string, any>, path: string): any {
  if (!data || !path) return null;
  const parts: string[] = [];
  let currentPart = '';
  for (let i = 0; i < path.length; i++) {
    const ch = path[i];
    if (ch === '.') {
      if (currentPart) parts.push(currentPart);
      currentPart = '';
    } else {
      currentPart += ch;
    }
  }
  if (currentPart) parts.push(currentPart);

  let current: any = data;
  for (const part of parts) {
    if (current === null || current === undefined) return null;
    const match = part.match(/^(\w+)(?:\[(\d+)\])?$/);
    if (!match) return null;
    const [, field, indexStr] = match;
    if (field) current = current[field];
    if (indexStr !== undefined) {
      const index = parseInt(indexStr, 10);
      if (Array.isArray(current) && !isNaN(index) && index >= 0 && index < current.length) {
        current = current[index];
      } else {
        return null;
      }
    }
  }
  return current;
}

function formatValue(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(v => formatValue(v)).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function compareEqual(value: any, compare: string): boolean {
  if (value === null || value === undefined) return compare === '' || compare === 'null';
  return String(value) === compare;
}

function compareNumeric(value: any, compare: string): number {
  const numValue = parseFloat(String(value));
  const numCompare = parseFloat(compare);
  if (isNaN(numValue) || isNaN(numCompare)) return 0;
  return numValue < numCompare ? -1 : numValue > numCompare ? 1 : 0;
}

function evaluateCondition(condition: string, data: Record<string, any>): boolean {
  const trimmed = condition.trim();
  if (!trimmed.includes('==') && !trimmed.includes('!=') && !trimmed.includes('>') && !trimmed.includes('<')) {
    return !!getNestedValue(data, trimmed);
  }
  const operators = ['==', '!=', '>=', '<=', '>', '<'];
  for (const op of operators) {
    const idx = trimmed.indexOf(op);
    if (idx !== -1) {
      const left = trimmed.substring(0, idx).trim();
      let right = trimmed.substring(idx + op.length).trim();
      if ((right.startsWith("'") && right.endsWith("'")) || (right.startsWith('"') && right.endsWith('"'))) {
        right = right.slice(1, -1);
      }
      const leftValue = getNestedValue(data, left);
      switch (op) {
        case '==': return compareEqual(leftValue, right);
        case '!=': return !compareEqual(leftValue, right);
        case '>': return compareNumeric(leftValue, right) > 0;
        case '<': return compareNumeric(leftValue, right) < 0;
        case '>=': return compareNumeric(leftValue, right) >= 0;
        case '<=': return compareNumeric(leftValue, right) <= 0;
      }
    }
  }
  return false;
}

function processVariables(template: string, data: Record<string, any>): string {
  return template.replace(variablePattern, (_match, path) => {
    const value = getNestedValue(data, path);
    return formatValue(value);
  });
}

function processConditionals(template: string, data: Record<string, any>): string {
  return template.replace(ifElsePattern, (_match, condition, body) => {
    const elseIndex = body.indexOf('{{else}}');
    const ifPart = elseIndex !== -1 ? body.substring(0, elseIndex) : body;
    const elsePart = elseIndex !== -1 ? body.substring(elseIndex + 8) : '';
    const result = evaluateCondition(condition, data);
    const output = result ? ifPart : elsePart;
    return processVariables(output, data);
  });
}

function processForLoops(template: string, data: Record<string, any>): string {
  return template.replace(forLoopPattern, (_match, itemVar, arrayPath, loopBody) => {
    const arrayValue = getNestedValue(data, arrayPath);
    if (!Array.isArray(arrayValue)) return '';
    const iterations = Math.min(arrayValue.length, MAX_LOOP_ITERATIONS);
    let output = '';
    for (let i = 0; i < iterations; i++) {
      const loopData = { ...data, [itemVar]: arrayValue[i], [`${itemVar}_index`]: i };
      let processedBody = processConditionals(loopBody, loopData);
      processedBody = processVariables(processedBody, loopData);
      output += processedBody;
    }
    return output;
  });
}

export function processTemplate(template: string, data: Record<string, any>): string {
  if (!data) data = {};
  let result = template;
  result = processForLoops(result, data);
  result = processConditionals(result, data);
  result = processVariables(result, data);
  return result;
}

export function extractResponseMapping(
  responseData: Record<string, any>,
  mapping: Record<string, string>,
): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [varName, jsonPath] of Object.entries(mapping)) {
    const value = getNestedValue(responseData, jsonPath);
    if (value !== undefined && value !== null) {
      result[varName] = value;
    }
  }
  return result;
}


