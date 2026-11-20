import { useState } from 'react'
import Editor, { type OnMount } from '@monaco-editor/react'
import './CodeEditor.css'

interface CodeEditorProps {
  fileName: string
  value: string
  theme: string
  onChange: (value: string) => void
}

function getLanguage(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase()

  const languages: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    py: 'python',
    html: 'html',
    css: 'css',
    json: 'json',
    md: 'markdown',
    mdx: 'markdown',
    sql: 'sql',
    xml: 'xml',
    yml: 'yaml',
    yaml: 'yaml',
    sh: 'shell',
    ps1: 'powershell',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    cs: 'csharp',
    go: 'go',
    rs: 'rust',
    php: 'php',
    rb: 'ruby',
    kt: 'kotlin',
    swift: 'swift',
    dart: 'dart',
    lua: 'lua',
    vue: 'html',
    svelte: 'html',
    graphql: 'graphql',
    toml: 'ini',
    dockerfile: 'dockerfile',
    bat: 'bat'
  }

  return languages[extension || ''] || 'plaintext'
}

export function CodeEditor({ fileName, value, theme, onChange }: CodeEditorProps) {
  const [cursor, setCursor] = useState({ line: 1, column: 1 })
  const language = getLanguage(fileName)

  const handleEditorMount: OnMount = (editor) => {
    editor.onDidChangeCursorPosition(({ position }) => {
      setCursor({
        line: position.lineNumber,
        column: position.column
      })
    })
  }

  return (
    <section className={`editor monaco-editor-shell ${theme === 'dark' ? 'monaco-dark' : 'monaco-light'}`}>
      <div className="monaco-canvas">
        <Editor
          height="100%"
          width="100%"
          language={language}
          value={value}
          theme={theme === 'dark' ? 'vs-dark' : 'light'}
          onChange={(nextValue) => onChange(nextValue ?? '')}
          onMount={handleEditorMount}
          options={{
            automaticLayout: true,
            minimap: { enabled: true, scale: 1 },
            lineNumbers: 'on',
            lineNumbersMinChars: 3,
            fontSize: 13,
            fontFamily: "'Cascadia Code', 'Consolas', monospace",
            fontLigatures: true,
            wordWrap: 'on',
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorSmoothCaretAnimation: 'on',
            cursorBlinking: 'smooth',
            padding: { top: 16, bottom: 16 },
            renderLineHighlight: 'all',
            roundedSelection: true,
            folding: true,
            foldingHighlight: true,
            bracketPairColorization: { enabled: true },
            guides: {
              indentation: true,
              bracketPairs: true,
              highlightActiveIndentation: true
            },
            stickyScroll: { enabled: true },
            formatOnPaste: true,
            formatOnType: true,
            autoIndent: 'full',
            detectIndentation: true,
            tabSize: 2,
            insertSpaces: true,
            suggestOnTriggerCharacters: true,
            quickSuggestions: {
              other: true,
              comments: false,
              strings: true
            },
            acceptSuggestionOnEnter: 'on',
            snippetSuggestions: 'inline',
            parameterHints: { enabled: true },
            autoClosingBrackets: 'always',
            autoClosingQuotes: 'always',
            multiCursorModifier: 'ctrlCmd',
            mouseWheelZoom: true,
            accessibilitySupport: 'auto',
            overviewRulerBorder: false,
            renderWhitespace: 'selection',
            scrollbar: {
              verticalScrollbarSize: 10,
              horizontalScrollbarSize: 10,
              alwaysConsumeMouseWheel: false
            }
          }}
        />
      </div>

      <footer className="code-editor-statusbar">
        <span className="editor-language">{language.toUpperCase()}</span>
        <span>Ln {cursor.line}, Col {cursor.column}</span>
        <span>Spaces: 2</span>
        <span>UTF-8</span>
        <span className="editor-status-spacer" />
        <span>{fileName}</span>
      </footer>
    </section>
  )
}