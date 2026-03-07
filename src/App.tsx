import { useState, useEffect, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// Course structure
interface Hour {
  id: string
  title: string
  file: string
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
      { id: 'day2-hour1', title: '第一小時：容器技術概論', file: 'day2-hour1.md' },
      { id: 'day2-hour2', title: '第二小時：Docker 架構與核心概念', file: 'day2-hour2.md' },
      { id: 'day2-hour3', title: '第三小時：Docker 安裝與環境設置', file: 'day2-hour3.md' },
      { id: 'day2-hour4', title: '第四小時：Docker 基本指令', file: 'day2-hour4.md' },
      { id: 'day2-hour5', title: '第五小時：映像檔管理', file: 'day2-hour5.md' },
      { id: 'day2-hour6', title: '第六小時：容器資料管理', file: 'day2-hour6.md' },
      { id: 'day2-hour7', title: '第七小時：Docker 網路', file: 'day2-hour7.md' },
    ]
  },
  {
    id: 'day3',
    title: 'Day 3：Docker 進階',
    hours: [
      { id: 'day3-hour8', title: '第八小時：Dockerfile 基礎', file: 'day3-hour8.md' },
      { id: 'day3-hour9', title: '第九小時：Dockerfile 進階', file: 'day3-hour9.md' },
      { id: 'day3-hour10', title: '第十小時：Docker Compose 基礎', file: 'day3-hour10.md' },
      { id: 'day3-hour11', title: '第十一小時：Docker Compose 進階', file: 'day3-hour11.md' },
      { id: 'day3-hour12', title: '第十二小時：映像檔最佳化', file: 'day3-hour12.md' },
      { id: 'day3-hour13', title: '第十三小時：Docker 安全性', file: 'day3-hour13.md' },
      { id: 'day3-hour14', title: '第十四小時：實戰演練與總結', file: 'day3-hour14.md' },
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

function App() {
  const [selectedHour, setSelectedHour] = useState<string>('day2-hour1')
  const [content, setContent] = useState<string>('')
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set(['day2']))
  const [expandedHours, setExpandedHours] = useState<Set<string>>(new Set(['day2-hour1']))

  // Load markdown content
  useEffect(() => {
    const hour = COURSE_DATA.flatMap(d => d.hours).find(h => h.id === selectedHour)
    if (hour) {
      fetch(`/docs/${hour.file}`)
        .then(res => res.text())
        .then(text => setContent(text))
        .catch(err => setContent(`# Error loading content\n\n${err.message}`))
    }
  }, [selectedHour])

  // Extract sections from current content
  const sections = useMemo(() => extractSections(content), [content])

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

  // Scroll to section
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  // Select hour and load content
  const selectHour = (hourId: string) => {
    setSelectedHour(hourId)
    setExpandedHours(prev => new Set([...prev, hourId]))
  }

  return (
    <div className="flex min-h-screen bg-slate-900">
      {/* Sidebar */}
      <nav className="w-80 bg-slate-800 border-r border-slate-700 overflow-y-auto fixed h-full">
        <div className="p-4">
          <h1 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <span className="text-2xl">🐳</span>
            Docker 課程講稿
          </h1>

          {COURSE_DATA.map(day => (
            <div key={day.id} className="mb-4">
              {/* Day Title */}
              <button
                onClick={() => toggleDay(day.id)}
                className="w-full flex items-center gap-2 text-left text-lg font-semibold text-blue-400 hover:text-blue-300 py-2"
              >
                <span className={`transition-transform ${expandedDays.has(day.id) ? 'rotate-90' : ''}`}>
                  ▶
                </span>
                {day.title}
              </button>

              {/* Hours */}
              {expandedDays.has(day.id) && (
                <div className="ml-4">
                  {day.hours.map(hour => (
                    <div key={hour.id} className="mb-2">
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
                        <div className="ml-4 mt-1 border-l border-slate-600 pl-3">
                          {sections.map(section => (
                            <button
                              key={section.id}
                              onClick={() => scrollToSection(section.id)}
                              className={`block text-left py-1 text-xs w-full truncate ${
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

      {/* Main Content */}
      <main className="ml-80 flex-1 p-8 max-w-4xl">
        <article className="markdown-body">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => <HeadingRenderer level={1}>{children}</HeadingRenderer>,
              h2: ({ children }) => <HeadingRenderer level={2}>{children}</HeadingRenderer>,
              h3: ({ children }) => <HeadingRenderer level={3}>{children}</HeadingRenderer>,
              h4: ({ children }) => <HeadingRenderer level={4}>{children}</HeadingRenderer>,
            }}
          >
            {content}
          </ReactMarkdown>
        </article>
      </main>
    </div>
  )
}

export default App
