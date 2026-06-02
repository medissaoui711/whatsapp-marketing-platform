import {
  extractParamNames,
  sortParamKeys,
  bodyParamsToComponents,
  headerTextParamsComponent,
  buildTemplateComponents,
  buttonUrlParamsToComponents,
} from '../../whatsapp/template-utils'

describe('template-utils', () => {
  describe('extractParamNames', () => {
    it('should extract parameter names from template content', () => {
      expect(extractParamNames('Hello {{1}}')).toEqual(['1'])
    })

    it('should extract named parameters', () => {
      expect(extractParamNames('Hi {{name}}')).toEqual(['name'])
    })

    it('should extract multiple parameters', () => {
      expect(extractParamNames('{{a}} and {{b}}')).toEqual(['a', 'b'])
    })

    it('should return empty array for content without parameters', () => {
      expect(extractParamNames('No params')).toEqual([])
    })

    it('should trim whitespace inside braces', () => {
      expect(extractParamNames('{{  name  }}')).toEqual(['name'])
    })

    it('should extract complex nested names', () => {
      expect(extractParamNames('{{user.name}}')).toEqual(['user.name'])
    })
  })

  describe('sortParamKeys', () => {
    it('should sort numeric keys numerically', () => {
      expect(sortParamKeys({ '2': 'b', '1': 'a', '10': 'c' })).toEqual(['1', '2', '10'])
    })

    it('should sort string keys lexically', () => {
      expect(sortParamKeys({ b: '2', a: '1' })).toEqual(['a', 'b'])
    })

    it('should force lexical sort when flag is set', () => {
      expect(sortParamKeys({ '2': 'b', '1': 'a' }, true)).toEqual(['1', '2'])
    })
  })

  describe('bodyParamsToComponents', () => {
    it('should return empty array for empty params', () => {
      expect(bodyParamsToComponents({})).toEqual([])
    })

    it('should create body component with sorted numeric params', () => {
      const result = bodyParamsToComponents({ '1': 'Alice', '2': 'Welcome' })
      expect(result).toEqual([
        {
          type: 'body',
          parameters: [
            { type: 'text', text: 'Alice' },
            { type: 'text', text: 'Welcome' },
          ],
        },
      ])
    })

    it('should add parameter_name for named params', () => {
      const result = bodyParamsToComponents({ name: 'Alice', greeting: 'Hi' })
      const params = (result[0] as any).parameters as Array<Record<string, string>>
      expect(params).toHaveLength(2)
      expect(params).toContainEqual({ type: 'text', text: 'Alice', parameter_name: 'name' })
      expect(params).toContainEqual({ type: 'text', text: 'Hi', parameter_name: 'greeting' })
    })
  })

  describe('headerTextParamsComponent', () => {
    it('should return null when header has no variables', () => {
      expect(headerTextParamsComponent('No vars', {}, {})).toBeNull()
    })

    it('should return header component with param value from params', () => {
      const result = headerTextParamsComponent('Hello {{1}}', { '1': 'Alice' }, {})
      expect(result).toEqual({
        type: 'header',
        parameters: [{ type: 'text', text: 'Alice' }],
      })
    })

    it('should fallback to bodyParams when header param not found', () => {
      const result = headerTextParamsComponent('Hello {{name}}', {}, { name: 'Bob' })
      expect(result).toEqual({
        type: 'header',
        parameters: [{ type: 'text', text: 'Bob', parameter_name: 'name' }],
      })
    })

    it('should throw when header has more than one variable', () => {
      expect(() => headerTextParamsComponent('{{a}} and {{b}}', {}, {})).toThrow(
        'Header text may contain at most one variable; found 2'
      )
    })

    it('should add parameter_name for named header param', () => {
      const result = headerTextParamsComponent('Hello {{name}}', { name: 'Charlie' }, {})
      expect((result! as any).parameters[0]).toHaveProperty('parameter_name', 'name')
    })
  })

  describe('buildTemplateComponents', () => {
    it('should build body components for text header without variables', () => {
      const result = buildTemplateComponents({ '1': 'User' }, 'TEXT', 'Header', {}, '', '')
      expect(result).toEqual([
        { type: 'body', parameters: [{ type: 'text', text: 'User' }] },
      ])
    })

    it('should include header component when header has variables', () => {
      const result = buildTemplateComponents({ '1': 'User' }, 'TEXT', 'Hello {{1}}', { '1': 'Alice' }, '', '')
      expect(result).toHaveLength(2)
      expect(result[0].type).toBe('header')
      expect(result[1].type).toBe('body')
    })

    it('should add media header for image type', () => {
      const result = buildTemplateComponents({}, 'IMAGE', '', {}, 'media123', '')
      expect(result).toEqual([
        { type: 'header', parameters: [{ type: 'image', image: { id: 'media123' } }] },
      ])
    })

    it('should add document header with filename', () => {
      const result = buildTemplateComponents({}, 'DOCUMENT', '', {}, 'doc123', 'report.pdf')
      expect(result).toEqual([
        {
          type: 'header',
          parameters: [{ type: 'document', document: { id: 'doc123', filename: 'report.pdf' } }],
        },
      ])
    })

    it('should add video header', () => {
      const result = buildTemplateComponents({}, 'VIDEO', '', {}, 'vid123', '')
      expect(result).toEqual([
        { type: 'header', parameters: [{ type: 'video', video: { id: 'vid123' } }] },
      ])
    })

    it('should handle mixed header type case', () => {
      const result = buildTemplateComponents({ '1': 'x' }, 'text', 'Hi {{1}}', { '1': 'A' }, '', '')
      expect(result[0].type).toBe('header')
    })
  })

  describe('buttonUrlParamsToComponents', () => {
    it('should return empty array for no button params', () => {
      expect(buttonUrlParamsToComponents({})).toEqual([])
    })

    it('should create button components for URL params', () => {
      const result = buttonUrlParamsToComponents({ '0': 'https://example.com' })
      expect(result).toEqual([
        {
          type: 'button',
          sub_type: 'url',
          index: '0',
          parameters: [{ type: 'text', text: 'https://example.com' }],
        },
      ])
    })

    it('should skip buttons with non-URL types (QUICK_REPLY)', () => {
      const result = buttonUrlParamsToComponents({ '0': 'val' }, [
        { type: 'QUICK_REPLY' },
      ])
      expect(result).toHaveLength(0)
    })

    it('should skip FLOW, PHONE_NUMBER, VOICE_CALL types', () => {
      const result = buttonUrlParamsToComponents(
        { '0': 'a', '1': 'b', '2': 'c' },
        [{ type: 'FLOW' }, { type: 'PHONE_NUMBER' }, { type: 'VOICE_CALL' }]
      )
      expect(result).toHaveLength(0)
    })

    it('should include URL type buttons', () => {
      const result = buttonUrlParamsToComponents({ '0': 'url' }, [{ type: 'URL' }])
      expect(result).toHaveLength(1)
    })
  })
})


