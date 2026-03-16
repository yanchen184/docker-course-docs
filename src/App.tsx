import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// Course structure
interface Hour {
  id: string
  title: string
  outlineFile: string
  scriptFile: string
}

interface Day {
  id: string
  title: string
  hours: Hour[]
}

const COURSE_DATA: Day[] = [
  {
    id: 'day2',
    title: 'Day 2：Docker 基礎',
    hours: [
      { id: 'day2-hour1', title: '第一小時：容器技術概論', outlineFile: 'day2-hour1.md', scriptFile: 'day2-hour1-full.md' },
      { id: 'day2-hour2', title: '第二小時：Docker 架構與核心概念', outlineFile: 'day2-hour2.md', scriptFile: 'day2-hour2-full.md' },
      { id: 'day2-hour3', title: '第三小時：Docker 安裝與環境設置', outlineFile: 'day2-hour3.md', scriptFile: 'day2-hour3-full.md' },
      { id: 'day2-hour4', title: '第四小時：Docker 基本指令', outlineFile: 'day2-hour4.md', scriptFile: 'day2-hour4-full.md' },
      { id: 'day2-hour5', title: '第五小時：Docker 基本指令（下）', outlineFile: 'day2-hour5.md', scriptFile: 'day2-hour5-full.md' },
      { id: 'day2-hour6', title: '第六小時：Nginx 容器實戰', outlineFile: 'day2-hour6.md', scriptFile: 'day2-hour6-full.md' },
      { id: 'day2-hour7', title: '第七小時：實作練習與 Day 2 總結', outlineFile: 'day2-hour7.md', scriptFile: 'day2-hour7-full.md' },
    ]
  },
  {
    id: 'day3',
    title: 'Day 3：Docker 進階',
    hours: [
      { id: 'day3-hour8', title: '第八小時：Volume 資料持久化', outlineFile: 'day3-hour8.md', scriptFile: 'day3-hour8-full.md' },
      { id: 'day3-hour9', title: '第九小時：容器網路與 Port Mapping 進階', outlineFile: 'day3-hour9.md', scriptFile: 'day3-hour9-full.md' },
      { id: 'day3-hour10', title: '第十小時：Dockerfile 基礎', outlineFile: 'day3-hour10.md', scriptFile: 'day3-hour10-full.md' },
      { id: 'day3-hour11', title: '第十一小時：Dockerfile 進階與最佳化', outlineFile: 'day3-hour11.md', scriptFile: 'day3-hour11-full.md' },
      { id: 'day3-hour12', title: '第十二小時：Dockerfile 實戰與映像檔發佈', outlineFile: 'day3-hour12.md', scriptFile: 'day3-hour12-full.md' },
      { id: 'day3-hour13', title: '第十三小時：Docker Compose 基礎與進階', outlineFile: 'day3-hour13.md', scriptFile: 'day3-hour13-full.md' },
      { id: 'day3-hour14', title: '第十四小時：Docker Compose 實戰與課程總結', outlineFile: 'day3-hour14.md', scriptFile: 'day3-hour14-full.md' },
    ]
  }
]

// Section extracted from markdown
interface Section {
  id: string
  title: string
  level: number
}

// Extract sections from markdown content
function extractSections(content: string): Section[] {
  const sections: Section[] = []
  const lines = content.split('\n')

  for (const line of lines) {
    const h2Match = line.match(/^## (.+)/)
    const h3Match = line.match(/^### (.+)/)

    if (h2Match) {
      const title = h2Match[1].trim()
      const id = title.toLowerCase().replace(/[^\w\u4e00-\u9fff]+/g, '-').replace(/^-|-$/g, '')
      sections.push({ id, title, level: 2 })
    } else if (h3Match) {
      const title = h3Match[1].trim()
      const id = title.toLowerCase().replace(/[^\w\u4e00-\u9fff]+/g, '-').replace(/^-|-$/g, '')
      sections.push({ id, title, level: 3 })
    }
  }

  return sections
}

// Custom heading renderer with anchor IDs
function HeadingRenderer({ level, children }: { level: number; children: React.ReactNode }) {
  const text = String(children)
  const id = text.toLowerCase().replace(/[^\w\u4e00-\u9fff]+/g, '-').replace(/^-|-$/g, '')

  if (level === 1) return <h1 id={id}>{children}</h1>
  if (level === 2) return <h2 id={id}>{children}</h2>
  if (level === 3) return <h3 id={id}>{children}</h3>
  if (level === 4) return <h4 id={id}>{children}</h4>
  return <h5 id={id}>{children}</h5>
}

// Markdown components config
const markdownComponents = {
  h1: ({ children }: { children?: React.ReactNode }) => <HeadingRenderer level={1}>{children}</HeadingRenderer>,
  h2: ({ children }: { children?: React.ReactNode }) => <HeadingRenderer level={2}>{children}</HeadingRenderer>,
  h3: ({ children }: { children?: React.ReactNode }) => <HeadingRenderer level={3}>{children}</HeadingRenderer>,
  h4: ({ children }: { children?: React.ReactNode }) => <HeadingRenderer level={4}>{children}</HeadingRenderer>,
}

function App() {
  const [selectedHour, setSelectedHour] = useState<string>('day2-hour1')
  const [outlineContent, setOutlineContent] = useState<string>('')
  const [scriptContent, setScriptContent] = useState<string>('')
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set(['day2']))
  const [expandedHours, setExpandedHours] = useState<Set<string>>(new Set(['day2-hour1']))

  // Load markdown content
  useEffect(() => {
    const hour = COURSE_DATA.flatMap(d => d.hours).find(h => h.id === selectedHour)
    if (hour) {
      // Load outline
      fetch(`${import.meta.env.BASE_URL}docs/${hour.outlineFile}`)
        .then(res => res.ok ? res.text() : Promise.reject('File not found'))
        .then(text => setOutlineContent(text))
        .catch(() => setOutlineContent('# 大綱尚未建立\n\n請建立檔案：`' + hour.outlineFile + '`'))

      // Load script
      fetch(`${import.meta.env.BASE_URL}docs/${hour.scriptFile}`)
        .then(res => res.ok ? res.text() : Promise.reject('File not found'))
        .then(text => setScriptContent(text))
        .catch(() => setScriptContent('# 逐字稿尚未建立\n\n請建立檔案：`' + hour.scriptFile + '`'))
    }
  }, [selectedHour])

  // Extract sections from outline content
  const sections = useMemo(() => extractSections(outlineContent), [outlineContent])

  // Calculate word count for script (Chinese characters + English words)
  const scriptWordCount = useMemo(() => {
    if (!scriptContent || scriptContent.includes('逐字稿尚未建立')) return 0
    // Remove markdown syntax
    const cleanText = scriptContent
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/`[^`]+`/g, '') // Remove inline code
      .replace(/#+\s/g, '') // Remove heading markers
      .replace(/\*\*|__/g, '') // Remove bold
      .replace(/\*|_/g, '') // Remove italic
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links, keep text
      .replace(/[-*+]\s/g, '') // Remove list markers
      .replace(/\|/g, '') // Remove table pipes
      .replace(/---+/g, '') // Remove horizontal rules

    // Count Chinese characters
    const chineseChars = (cleanText.match(/[\u4e00-\u9fff]/g) || []).length
    // Count English words
    const englishWords = (cleanText.match(/[a-zA-Z]+/g) || []).length

    return chineseChars + englishWords
  }, [scriptContent])

  // Toggle day expansion
  const toggleDay = (dayId: string) => {
    setExpandedDays(prev => {
      const next = new Set(prev)
      if (next.has(dayId)) {
        next.delete(dayId)
      } else {
        next.add(dayId)
      }
      return next
    })
  }

  // Toggle hour sections expansion
  const toggleHour = (hourId: string) => {
    setExpandedHours(prev => {
      const next = new Set(prev)
      if (next.has(hourId)) {
        next.delete(hourId)
      } else {
        next.add(hourId)
      }
      return next
    })
  }

  // Scroll to section in outline panel
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById('outline-' + sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Select hour and load content
  const selectHour = (hourId: string) => {
    setSelectedHour(hourId)
    setExpandedHours(prev => new Set([...prev, hourId]))
  }

  // Draggable divider state (percentage for outline panel width)
  const [outlineWidth, setOutlineWidth] = useState(50)
  const isDragging = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDragging.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const pct = (x / rect.width) * 100
      setOutlineWidth(Math.min(Math.max(pct, 15), 85))
    }
    const handleMouseUp = () => {
      isDragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  // Get current hour title
  const currentHour = COURSE_DATA.flatMap(d => d.hours).find(h => h.id === selectedHour)

  return (
    <div className="flex min-h-screen bg-slate-900">
      {/* Sidebar Navigation */}
      <nav className="w-72 bg-slate-800 border-r border-slate-700 overflow-y-auto fixed h-full flex-shrink-0">
        <div className="p-4">
          <h1 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <span className="text-xl">🐳</span>
            Docker 課程講稿
          </h1>

          {COURSE_DATA.map(day => (
            <div key={day.id} className="mb-3">
              {/* Day Title */}
              <button
                onClick={() => toggleDay(day.id)}
                className="w-full flex items-center gap-2 text-left text-base font-semibold text-blue-400 hover:text-blue-300 py-1.5"
              >
                <span className={`transition-transform text-sm ${expandedDays.has(day.id) ? 'rotate-90' : ''}`}>
                  ▶
                </span>
                {day.title}
              </button>

              {/* Hours */}
              {expandedDays.has(day.id) && (
                <div className="ml-3">
                  {day.hours.map(hour => (
                    <div key={hour.id} className="mb-1">
                      {/* Hour Title */}
                      <div className="flex items-center">
                        <button
                          onClick={() => toggleHour(hour.id)}
                          className="text-slate-400 hover:text-slate-300 mr-1"
                        >
                          <span className={`text-xs transition-transform inline-block ${expandedHours.has(hour.id) ? 'rotate-90' : ''}`}>
                            ▶
                          </span>
                        </button>
                        <button
                          onClick={() => selectHour(hour.id)}
                          className={`text-left py-1 text-sm ${
                            selectedHour === hour.id
                              ? 'text-emerald-400 font-medium'
                              : 'text-slate-300 hover:text-white'
                          }`}
                        >
                          {hour.title}
                        </button>
                      </div>

                      {/* Sections */}
                      {expandedHours.has(hour.id) && selectedHour === hour.id && sections.length > 0 && (
                        <div className="ml-4 mt-1 border-l border-slate-600 pl-2">
                          {sections.map(section => (
                            <button
                              key={section.id}
                              onClick={() => scrollToSection(section.id)}
                              className={`block text-left py-0.5 text-xs w-full truncate ${
                                section.level === 2
                                  ? 'text-slate-400 hover:text-white font-medium'
                                  : 'text-slate-500 hover:text-slate-300 ml-2'
                              }`}
                              title={section.title}
                            >
                              {section.title}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </nav>

      {/* Main Content Area - Two Columns */}
      <div ref={containerRef} className="ml-72 flex-1 flex relative">
        {/* Outline Panel (Left) */}
        <main style={{ width: `${outlineWidth}%` }} className="h-screen overflow-y-auto border-r border-slate-700 p-6 flex-shrink-0">
          <div className="mb-4 pb-3 border-b border-slate-700">
            <span className="text-xs font-medium text-blue-400 uppercase tracking-wider">大綱</span>
            <h2 className="text-lg font-bold text-white mt-1">{currentHour?.title}</h2>
          </div>
          <article className="markdown-body">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                ...markdownComponents,
                h1: ({ children }) => {
                  const text = String(children)
                  const id = 'outline-' + text.toLowerCase().replace(/[^\w\u4e00-\u9fff]+/g, '-').replace(/^-|-$/g, '')
                  return <h1 id={id}>{children}</h1>
                },
                h2: ({ children }) => {
                  const text = String(children)
                  const id = 'outline-' + text.toLowerCase().replace(/[^\w\u4e00-\u9fff]+/g, '-').replace(/^-|-$/g, '')
                  return <h2 id={id}>{children}</h2>
                },
                h3: ({ children }) => {
                  const text = String(children)
                  const id = 'outline-' + text.toLowerCase().replace(/[^\w\u4e00-\u9fff]+/g, '-').replace(/^-|-$/g, '')
                  return <h3 id={id}>{children}</h3>
                },
              }}
            >
              {outlineContent}
            </ReactMarkdown>
          </article>
        </main>

        {/* Draggable Divider */}
        <div
          onMouseDown={handleMouseDown}
          className="w-1.5 h-screen bg-slate-700 hover:bg-blue-500 cursor-col-resize flex-shrink-0 transition-colors"
        />

        {/* Script Panel (Right) */}
        <aside style={{ width: `${100 - outlineWidth}%` }} className="h-screen overflow-y-auto p-6 bg-slate-950 flex-shrink-0">
          <div className="mb-4 pb-3 border-b border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">逐字稿</span>
              {scriptWordCount > 0 && (
                <span className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded">
                  {scriptWordCount.toLocaleString()} 字
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-white mt-1">{currentHour?.title}</h2>
          </div>
          <article className="markdown-body">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={markdownComponents}
            >
              {scriptContent}
            </ReactMarkdown>
          </article>
        </aside>
      </div>
    </div>
  )
}

export default App
