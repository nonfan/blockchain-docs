import type MarkdownIt from 'markdown-it'

interface Options {
  keywords: Record<string, { file: string; lang?: string }>
}

export default function KeywordTipPlugin(md: MarkdownIt, options: Options) {
  const keys = Object.keys(options.keywords)

  if (keys.length === 0) return

  // 用正则匹配所有关键字
  const regex = new RegExp(`\\b(${keys.join('|')})\\b`, 'g')

  md.core.ruler.after('inline', 'keyword-tip', (state) => {
    state.tokens.forEach((blockToken) => {
      if (blockToken.type !== 'inline') return
      blockToken.children?.forEach((token, idx) => {
        if (token.type === 'text') {
          const text = token.content
          if (regex.test(text)) {
            const newTokens: any[] = []
            let lastIndex = 0
            text.replace(regex, (match, _p1, offset) => {
              const before = text.slice(lastIndex, offset)
              if (before) {
                newTokens.push({
                  type: 'text',
                  content: before,
                  level: token.level,
                })
              }

              const { file, lang } = options.keywords[match]

              newTokens.push({
                type: 'html_inline',
                content: `<KeywordTip keyword="${match}" file="${file}" lang="${lang || 'ts'}" />`,
                level: token.level,
              })

              lastIndex = offset + match.length
              return match
            })

            const after = text.slice(lastIndex)
            if (after) {
              newTokens.push({
                type: 'text',
                content: after,
                level: token.level,
              })
            }

            // 替换当前 token
            blockToken.children = [
              ...(blockToken.children as any).slice(0, idx),
              ...newTokens,
              ...(blockToken.children as any).slice(idx + 1),
            ]
          }
        }
      })
    })
  })
}
