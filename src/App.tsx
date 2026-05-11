import {
  BarChart3,
  CalendarDays,
  Check,
  CheckCircle2,
  Circle,
  ClipboardList,
  Download,
  Flame,
  LayoutDashboard,
  Pencil,
  Pin,
  PinOff,
  PlayCircle,
  Plus,
  Repeat2,
  RotateCcw,
  Save,
  Search,
  StickyNote,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import './App.css'

const STORAGE_KEY = 'life-board:data:v2'

type View = 'dashboard' | 'tasks' | 'habits' | 'notes'
type Priority = '高' | '中' | '低'
type TaskStatus = 'todo' | 'doing' | 'done'

type Task = {
  id: string
  title: string
  project: string
  priority: Priority
  due: string
  estimate: number
  status: TaskStatus
  createdAt: string
}

type Habit = {
  id: string
  title: string
  target: number
  logs: Record<string, boolean>
  createdAt: string
}

type Note = {
  id: string
  title: string
  body: string
  pinned: boolean
  createdAt: string
  updatedAt: string
}

type BoardData = {
  tasks: Task[]
  habits: Habit[]
  notes: Note[]
}

type TaskDraft = Omit<Task, 'id' | 'createdAt' | 'status'> & {
  status?: TaskStatus
}

type HabitDraft = Pick<Habit, 'title' | 'target'>
type NoteDraft = Pick<Note, 'title' | 'body'>

const statusLabels: Record<TaskStatus, string> = {
  todo: '待办',
  doing: '进行',
  done: '完成',
}

const priorityOrder: Record<Priority, number> = {
  高: 0,
  中: 1,
  低: 2,
}

const statusOptions: TaskStatus[] = ['todo', 'doing', 'done']
const priorities: Priority[] = ['高', '中', '低']

function dateKey(date = new Date()) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return localDate.toISOString().slice(0, 10)
}

function addDays(base: Date, amount: number) {
  const next = new Date(base)
  next.setDate(next.getDate() + amount)
  return next
}

function formatShortDate(key: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(`${key}T00:00:00`))
}

function makeId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`
}

function getWeekKeys() {
  return Array.from({ length: 7 }, (_, index) => dateKey(addDays(new Date(), index - 6)))
}

function clampTarget(target: number) {
  return Math.max(1, Math.min(7, Number.isFinite(target) ? target : 3))
}

function getStreak(logs: Record<string, boolean>) {
  let streak = 0

  for (let offset = 0; offset < 365; offset += 1) {
    if (!logs[dateKey(addDays(new Date(), -offset))]) {
      break
    }
    streak += 1
  }

  return streak
}

function createEmptyData(): BoardData {
  return {
    tasks: [],
    habits: [],
    notes: [],
  }
}

function readStoredData(): BoardData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return createEmptyData()
    }

    const parsed = JSON.parse(raw) as Partial<BoardData>

    if (!Array.isArray(parsed.tasks) || !Array.isArray(parsed.habits) || !Array.isArray(parsed.notes)) {
      return createEmptyData()
    }

    return {
      tasks: parsed.tasks,
      habits: parsed.habits,
      notes: parsed.notes,
    }
  } catch {
    return createEmptyData()
  }
}

function App() {
  const [view, setView] = useState<View>('dashboard')
  const [data, setData] = useState<BoardData>(readStoredData)
  const [taskDraft, setTaskDraft] = useState<TaskDraft>({
    title: '',
    project: '个人',
    priority: '中',
    due: dateKey(),
    estimate: 30,
  })
  const [habitDraft, setHabitDraft] = useState<HabitDraft>({
    title: '',
    target: 5,
  })
  const [noteDraft, setNoteDraft] = useState<NoteDraft>({
    title: '',
    body: '',
  })
  const [taskSearch, setTaskSearch] = useState('')
  const [taskStatus, setTaskStatus] = useState<'all' | TaskStatus>('all')
  const [taskProject, setTaskProject] = useState('全部')
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editingTask, setEditingTask] = useState<TaskDraft | null>(null)
  const [noteSearch, setNoteSearch] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingNote, setEditingNote] = useState<NoteDraft | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const today = dateKey()
  const weekKeys = useMemo(() => getWeekKeys(), [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [data])

  const projects = useMemo(() => {
    const names = new Set(data.tasks.map((task) => task.project.trim()).filter(Boolean))
    return ['全部', ...Array.from(names).sort((a, b) => a.localeCompare(b, 'zh-CN'))]
  }, [data.tasks])

  const filteredTasks = useMemo(() => {
    const query = taskSearch.trim().toLowerCase()

    return data.tasks
      .filter((task) => {
        const matchesSearch =
          !query ||
          task.title.toLowerCase().includes(query) ||
          task.project.toLowerCase().includes(query)
        const matchesStatus = taskStatus === 'all' || task.status === taskStatus
        const matchesProject = taskProject === '全部' || task.project === taskProject

        return matchesSearch && matchesStatus && matchesProject
      })
      .sort((a, b) => {
        if (a.status !== b.status) {
          return statusOptions.indexOf(a.status) - statusOptions.indexOf(b.status)
        }

        if (a.due !== b.due) {
          return a.due.localeCompare(b.due)
        }

        return priorityOrder[a.priority] - priorityOrder[b.priority]
      })
  }, [data.tasks, taskProject, taskSearch, taskStatus])

  const filteredNotes = useMemo(() => {
    const query = noteSearch.trim().toLowerCase()

    return data.notes
      .filter((note) => {
        return !query || note.title.toLowerCase().includes(query) || note.body.toLowerCase().includes(query)
      })
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt))
  }, [data.notes, noteSearch])

  const stats = useMemo(() => {
    const total = data.tasks.length
    const done = data.tasks.filter((task) => task.status === 'done').length
    const active = data.tasks.filter((task) => task.status !== 'done').length
    const overdue = data.tasks.filter((task) => task.status !== 'done' && task.due < today).length
    const dueToday = data.tasks.filter((task) => task.status !== 'done' && task.due === today).length
    const focusMinutes = data.tasks
      .filter((task) => task.status === 'done')
      .reduce((sum, task) => sum + Number(task.estimate || 0), 0)
    const habitChecks = data.habits.reduce((sum, habit) => sum + weekKeys.filter((key) => habit.logs[key]).length, 0)
    const habitTarget = data.habits.reduce((sum, habit) => sum + habit.target, 0)

    return {
      total,
      done,
      active,
      overdue,
      dueToday,
      focusMinutes,
      habitChecks,
      habitTarget,
      completion: total ? Math.round((done / total) * 100) : 0,
      habitRate: habitTarget ? Math.min(100, Math.round((habitChecks / habitTarget) * 100)) : 0,
    }
  }, [data.habits, data.tasks, today, weekKeys])

  const upcomingTasks = useMemo(() => {
    return data.tasks
      .filter((task) => task.status !== 'done')
      .sort((a, b) => a.due.localeCompare(b.due) || priorityOrder[a.priority] - priorityOrder[b.priority])
      .slice(0, 5)
  }, [data.tasks])

  const statusBars = useMemo(() => {
    const max = Math.max(
      1,
      ...statusOptions.map((status) => data.tasks.filter((task) => task.status === status).length),
    )

    return statusOptions.map((status) => {
      const count = data.tasks.filter((task) => task.status === status).length
      return {
        status,
        count,
        height: `${Math.max(12, (count / max) * 100)}%`,
      }
    })
  }, [data.tasks])

  function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const title = taskDraft.title.trim()

    if (!title) {
      return
    }

    const task: Task = {
      id: makeId('task'),
      title,
      project: taskDraft.project.trim() || '个人',
      priority: taskDraft.priority,
      due: taskDraft.due || today,
      estimate: Math.max(5, Number(taskDraft.estimate) || 30),
      status: taskDraft.status ?? 'todo',
      createdAt: new Date().toISOString(),
    }

    setData((current) => ({
      ...current,
      tasks: [task, ...current.tasks],
    }))
    setTaskDraft({
      title: '',
      project: task.project,
      priority: '中',
      due: today,
      estimate: 30,
    })
  }

  function beginEditTask(task: Task) {
    setEditingTaskId(task.id)
    setEditingTask({
      title: task.title,
      project: task.project,
      priority: task.priority,
      due: task.due,
      estimate: task.estimate,
      status: task.status,
    })
  }

  function saveTask(taskId: string) {
    if (!editingTask) {
      return
    }

    const title = editingTask.title.trim()

    if (!title) {
      return
    }

    setData((current) => ({
      ...current,
      tasks: current.tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              title,
              project: editingTask.project.trim() || '个人',
              priority: editingTask.priority,
              due: editingTask.due || today,
              estimate: Math.max(5, Number(editingTask.estimate) || 30),
              status: editingTask.status ?? task.status,
            }
          : task,
      ),
    }))
    setEditingTaskId(null)
    setEditingTask(null)
  }

  function deleteTask(taskId: string) {
    setData((current) => ({
      ...current,
      tasks: current.tasks.filter((task) => task.id !== taskId),
    }))
  }

  function updateTaskStatus(taskId: string, status: TaskStatus) {
    setData((current) => ({
      ...current,
      tasks: current.tasks.map((task) => (task.id === taskId ? { ...task, status } : task)),
    }))
  }

  function addHabit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const title = habitDraft.title.trim()

    if (!title) {
      return
    }

    const habit: Habit = {
      id: makeId('habit'),
      title,
      target: clampTarget(Number(habitDraft.target)),
      logs: {},
      createdAt: new Date().toISOString(),
    }

    setData((current) => ({
      ...current,
      habits: [habit, ...current.habits],
    }))
    setHabitDraft({ title: '', target: 5 })
  }

  function toggleHabit(habitId: string, key: string) {
    setData((current) => ({
      ...current,
      habits: current.habits.map((habit) => {
        if (habit.id !== habitId) {
          return habit
        }

        const nextLogs = { ...habit.logs }

        if (nextLogs[key]) {
          delete nextLogs[key]
        } else {
          nextLogs[key] = true
        }

        return { ...habit, logs: nextLogs }
      }),
    }))
  }

  function deleteHabit(habitId: string) {
    setData((current) => ({
      ...current,
      habits: current.habits.filter((habit) => habit.id !== habitId),
    }))
  }

  function addNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const title = noteDraft.title.trim()
    const body = noteDraft.body.trim()

    if (!title && !body) {
      return
    }

    const now = new Date().toISOString()
    const note: Note = {
      id: makeId('note'),
      title: title || '未命名笔记',
      body,
      pinned: false,
      createdAt: now,
      updatedAt: now,
    }

    setData((current) => ({
      ...current,
      notes: [note, ...current.notes],
    }))
    setNoteDraft({ title: '', body: '' })
  }

  function beginEditNote(note: Note) {
    setEditingNoteId(note.id)
    setEditingNote({ title: note.title, body: note.body })
  }

  function saveNote(noteId: string) {
    if (!editingNote) {
      return
    }

    const title = editingNote.title.trim()
    const body = editingNote.body.trim()

    if (!title && !body) {
      return
    }

    setData((current) => ({
      ...current,
      notes: current.notes.map((note) =>
        note.id === noteId
          ? {
              ...note,
              title: title || '未命名笔记',
              body,
              updatedAt: new Date().toISOString(),
            }
          : note,
      ),
    }))
    setEditingNoteId(null)
    setEditingNote(null)
  }

  function togglePinned(noteId: string) {
    setData((current) => ({
      ...current,
      notes: current.notes.map((note) =>
        note.id === noteId
          ? {
              ...note,
              pinned: !note.pinned,
              updatedAt: new Date().toISOString(),
            }
          : note,
      ),
    }))
  }

  function deleteNote(noteId: string) {
    setData((current) => ({
      ...current,
      notes: current.notes.filter((note) => note.id !== noteId),
    }))
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `life-board-${today}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  function importData(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const reader = new FileReader()

    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Partial<BoardData>

        if (!Array.isArray(parsed.tasks) || !Array.isArray(parsed.habits) || !Array.isArray(parsed.notes)) {
          alert('文件格式不正确')
          return
        }

        setData({
          tasks: parsed.tasks,
          habits: parsed.habits,
          notes: parsed.notes,
        })
      } catch {
        alert('无法读取这个文件')
      } finally {
        event.target.value = ''
      }
    }

    reader.readAsText(file)
  }

  function resetData() {
    if (!confirm('确定清空本地数据吗？当前任务、习惯和笔记都会被删除。')) {
      return
    }

    setData(createEmptyData())
    setTaskSearch('')
    setTaskStatus('all')
    setTaskProject('全部')
    setNoteSearch('')
  }

  const views: Array<{ id: View; label: string; icon: typeof LayoutDashboard }> = [
    { id: 'dashboard', label: '总览', icon: LayoutDashboard },
    { id: 'tasks', label: '任务', icon: ClipboardList },
    { id: 'habits', label: '习惯', icon: Repeat2 },
    { id: 'notes', label: '笔记', icon: StickyNote },
  ]

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="主导航">
        <div className="brand">
          <div className="brand-mark">
            <Check />
          </div>
          <div>
            <p className="eyebrow">LifeBoard</p>
            <h1>生活看板</h1>
          </div>
        </div>

        <nav className="nav-list">
          {views.map(({ id, label, icon: Icon }) => (
            <button
              type="button"
              className={view === id ? 'nav-item active' : 'nav-item'}
              onClick={() => setView(id)}
              key={id}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-actions">
          <input
            ref={fileInputRef}
            className="file-input"
            type="file"
            accept="application/json"
            onChange={importData}
          />
          <button type="button" className="icon-action" onClick={exportData} title="导出数据" aria-label="导出数据">
            <Download size={18} />
          </button>
          <button
            type="button"
            className="icon-action"
            onClick={() => fileInputRef.current?.click()}
            title="导入数据"
            aria-label="导入数据"
          >
            <Upload size={18} />
          </button>
          <button type="button" className="icon-action danger" onClick={resetData} title="清空数据" aria-label="清空数据">
            <RotateCcw size={18} />
          </button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">{formatShortDate(today)}</p>
            <h2>{views.find((item) => item.id === view)?.label}</h2>
          </div>
          <div className="topbar-metrics" aria-label="今日概况">
            <span>{stats.dueToday} 今日</span>
            <span>{stats.overdue} 逾期</span>
            <span>{stats.completion}% 完成</span>
          </div>
        </header>

        {view === 'dashboard' && (
          <div className="screen dashboard-screen">
            <section className="metric-grid" aria-label="关键数据">
              <article className="metric-card accent-coral">
                <ClipboardList />
                <div>
                  <span>进行中</span>
                  <strong>{stats.active}</strong>
                </div>
              </article>
              <article className="metric-card accent-green">
                <CheckCircle2 />
                <div>
                  <span>完成率</span>
                  <strong>{stats.completion}%</strong>
                </div>
              </article>
              <article className="metric-card accent-yellow">
                <Flame />
                <div>
                  <span>习惯进度</span>
                  <strong>{stats.habitRate}%</strong>
                </div>
              </article>
              <article className="metric-card accent-blue">
                <CalendarDays />
                <div>
                  <span>完成分钟</span>
                  <strong>{stats.focusMinutes}</strong>
                </div>
              </article>
            </section>

            <section className="dashboard-grid">
              <article className="panel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Next</p>
                    <h3>近期任务</h3>
                  </div>
                  <button type="button" className="ghost-button" onClick={() => setView('tasks')}>
                    任务
                  </button>
                </div>

                <div className="timeline">
                  {upcomingTasks.length ? (
                    upcomingTasks.map((task) => (
                      <div className="timeline-item" key={task.id}>
                        <span className={`priority-dot priority-${task.priority}`}></span>
                        <div>
                          <strong>{task.title}</strong>
                          <span>
                            {task.project} · {formatShortDate(task.due)}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="icon-action"
                          onClick={() => updateTaskStatus(task.id, 'done')}
                          title="标记完成"
                          aria-label={`完成 ${task.title}`}
                        >
                          <Check size={17} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="empty-state">没有未完成任务</p>
                  )}
                </div>
              </article>

              <article className="panel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Status</p>
                    <h3>任务状态</h3>
                  </div>
                  <BarChart3 size={20} />
                </div>

                <div className="bar-chart" aria-label="任务状态统计">
                  {statusBars.map((bar) => (
                    <div className="bar-column" key={bar.status}>
                      <div className="bar-track">
                        <span className={`bar-fill bar-${bar.status}`} style={{ height: bar.height }}></span>
                      </div>
                      <strong>{bar.count}</strong>
                      <span>{statusLabels[bar.status]}</span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="panel wide-panel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Habits</p>
                    <h3>七日打卡</h3>
                  </div>
                  <button type="button" className="ghost-button" onClick={() => setView('habits')}>
                    习惯
                  </button>
                </div>

                <div className="habit-strip">
                  {data.habits.length ? (
                    data.habits.map((habit) => (
                      <div className="habit-row compact" key={habit.id}>
                        <div>
                          <strong>{habit.title}</strong>
                          <span>{getStreak(habit.logs)} 天连续</span>
                        </div>
                        <div className="day-dots">
                          {weekKeys.map((key) => (
                            <span
                              className={habit.logs[key] ? 'day-dot checked' : 'day-dot'}
                              title={formatShortDate(key)}
                              key={key}
                            ></span>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="empty-state">还没有习惯</p>
                  )}
                </div>
              </article>
            </section>
          </div>
        )}

        {view === 'tasks' && (
          <div className="screen split-screen">
            <section className="panel form-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Create</p>
                  <h3>新任务</h3>
                </div>
                <Plus size={20} />
              </div>

              <form className="stack-form" onSubmit={addTask}>
                <label>
                  <span>标题</span>
                  <input
                    value={taskDraft.title}
                    onChange={(event) => setTaskDraft((draft) => ({ ...draft, title: event.target.value }))}
                    placeholder="输入任务"
                  />
                </label>
                <div className="form-row">
                  <label>
                    <span>项目</span>
                    <input
                      value={taskDraft.project}
                      onChange={(event) => setTaskDraft((draft) => ({ ...draft, project: event.target.value }))}
                    />
                  </label>
                  <label>
                    <span>优先级</span>
                    <select
                      value={taskDraft.priority}
                      onChange={(event) =>
                        setTaskDraft((draft) => ({ ...draft, priority: event.target.value as Priority }))
                      }
                    >
                      {priorities.map((priority) => (
                        <option key={priority}>{priority}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="form-row">
                  <label>
                    <span>截止</span>
                    <input
                      type="date"
                      value={taskDraft.due}
                      onChange={(event) => setTaskDraft((draft) => ({ ...draft, due: event.target.value }))}
                    />
                  </label>
                  <label>
                    <span>分钟</span>
                    <input
                      type="number"
                      min="5"
                      step="5"
                      value={taskDraft.estimate}
                      onChange={(event) =>
                        setTaskDraft((draft) => ({ ...draft, estimate: Number(event.target.value) }))
                      }
                    />
                  </label>
                </div>
                <button type="submit" className="primary-button">
                  <Plus size={17} />
                  添加任务
                </button>
              </form>
            </section>

            <section className="panel list-panel">
              <div className="list-tools">
                <label className="search-box">
                  <Search size={17} />
                  <input
                    value={taskSearch}
                    onChange={(event) => setTaskSearch(event.target.value)}
                    placeholder="搜索任务或项目"
                  />
                </label>
                <select value={taskStatus} onChange={(event) => setTaskStatus(event.target.value as 'all' | TaskStatus)}>
                  <option value="all">全部状态</option>
                  {statusOptions.map((status) => (
                    <option value={status} key={status}>
                      {statusLabels[status]}
                    </option>
                  ))}
                </select>
                <select value={taskProject} onChange={(event) => setTaskProject(event.target.value)}>
                  {projects.map((project) => (
                    <option value={project} key={project}>
                      {project}
                    </option>
                  ))}
                </select>
              </div>

              <div className="task-list">
                {filteredTasks.length ? (
                  filteredTasks.map((task) => {
                    const isEditing = editingTaskId === task.id && editingTask

                    return (
                      <article className={task.status === 'done' ? 'task-card done' : 'task-card'} key={task.id}>
                        {isEditing ? (
                          <div className="edit-grid">
                            <input
                              value={editingTask.title}
                              onChange={(event) =>
                                setEditingTask((draft) => (draft ? { ...draft, title: event.target.value } : draft))
                              }
                            />
                            <input
                              value={editingTask.project}
                              onChange={(event) =>
                                setEditingTask((draft) => (draft ? { ...draft, project: event.target.value } : draft))
                              }
                            />
                            <select
                              value={editingTask.priority}
                              onChange={(event) =>
                                setEditingTask((draft) =>
                                  draft ? { ...draft, priority: event.target.value as Priority } : draft,
                                )
                              }
                            >
                              {priorities.map((priority) => (
                                <option key={priority}>{priority}</option>
                              ))}
                            </select>
                            <input
                              type="date"
                              value={editingTask.due}
                              onChange={(event) =>
                                setEditingTask((draft) => (draft ? { ...draft, due: event.target.value } : draft))
                              }
                            />
                            <input
                              type="number"
                              min="5"
                              step="5"
                              value={editingTask.estimate}
                              onChange={(event) =>
                                setEditingTask((draft) =>
                                  draft ? { ...draft, estimate: Number(event.target.value) } : draft,
                                )
                              }
                            />
                            <select
                              value={editingTask.status}
                              onChange={(event) =>
                                setEditingTask((draft) =>
                                  draft ? { ...draft, status: event.target.value as TaskStatus } : draft,
                                )
                              }
                            >
                              {statusOptions.map((status) => (
                                <option value={status} key={status}>
                                  {statusLabels[status]}
                                </option>
                              ))}
                            </select>
                            <div className="row-actions">
                              <button
                                type="button"
                                className="icon-action success"
                                onClick={() => saveTask(task.id)}
                                title="保存"
                                aria-label="保存任务"
                              >
                                <Save size={17} />
                              </button>
                              <button
                                type="button"
                                className="icon-action"
                                onClick={() => {
                                  setEditingTaskId(null)
                                  setEditingTask(null)
                                }}
                                title="取消"
                                aria-label="取消编辑"
                              >
                                <X size={17} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="task-main">
                              <button
                                type="button"
                                className={`status-toggle status-${task.status}`}
                                onClick={() =>
                                  updateTaskStatus(
                                    task.id,
                                    task.status === 'todo' ? 'doing' : task.status === 'doing' ? 'done' : 'todo',
                                  )
                                }
                                title="切换状态"
                                aria-label={`切换 ${task.title} 状态`}
                              >
                                {task.status === 'todo' && <Circle size={19} />}
                                {task.status === 'doing' && <PlayCircle size={19} />}
                                {task.status === 'done' && <CheckCircle2 size={19} />}
                              </button>
                              <div>
                                <h4>{task.title}</h4>
                                <p>
                                  {task.project} · {formatShortDate(task.due)} · {task.estimate} 分钟
                                </p>
                              </div>
                            </div>
                            <div className="task-meta">
                              <span className={`badge priority-${task.priority}`}>{task.priority}</span>
                              <span className={`badge status-badge-${task.status}`}>{statusLabels[task.status]}</span>
                              <button
                                type="button"
                                className="icon-action"
                                onClick={() => beginEditTask(task)}
                                title="编辑"
                                aria-label={`编辑 ${task.title}`}
                              >
                                <Pencil size={17} />
                              </button>
                              <button
                                type="button"
                                className="icon-action danger"
                                onClick={() => deleteTask(task.id)}
                                title="删除"
                                aria-label={`删除 ${task.title}`}
                              >
                                <Trash2 size={17} />
                              </button>
                            </div>
                          </>
                        )}
                      </article>
                    )
                  })
                ) : (
                  <p className="empty-state">没有匹配的任务</p>
                )}
              </div>
            </section>
          </div>
        )}

        {view === 'habits' && (
          <div className="screen habit-screen">
            <section className="panel form-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Track</p>
                  <h3>新习惯</h3>
                </div>
                <Repeat2 size={20} />
              </div>
              <form className="stack-form" onSubmit={addHabit}>
                <label>
                  <span>名称</span>
                  <input
                    value={habitDraft.title}
                    onChange={(event) => setHabitDraft((draft) => ({ ...draft, title: event.target.value }))}
                    placeholder="输入习惯"
                  />
                </label>
                <label>
                  <span>每周目标</span>
                  <input
                    type="number"
                    min="1"
                    max="7"
                    value={habitDraft.target}
                    onChange={(event) =>
                      setHabitDraft((draft) => ({ ...draft, target: clampTarget(Number(event.target.value)) }))
                    }
                  />
                </label>
                <button type="submit" className="primary-button">
                  <Plus size={17} />
                  添加习惯
                </button>
              </form>
            </section>

            <section className="panel habit-list-panel">
              <div className="week-header" aria-hidden="true">
                <span></span>
                {weekKeys.map((key) => (
                  <span key={key}>{formatShortDate(key)}</span>
                ))}
                <span></span>
              </div>

              <div className="habit-list">
                {data.habits.length ? (
                  data.habits.map((habit) => {
                    const checks = weekKeys.filter((key) => habit.logs[key]).length

                    return (
                      <article className="habit-card" key={habit.id}>
                        <div className="habit-title">
                          <strong>{habit.title}</strong>
                          <span>
                            {checks}/{habit.target} · 连续 {getStreak(habit.logs)} 天
                          </span>
                        </div>
                        <div className="habit-days">
                          {weekKeys.map((key) => (
                            <button
                              type="button"
                              className={habit.logs[key] ? 'day-button checked' : 'day-button'}
                              onClick={() => toggleHabit(habit.id, key)}
                              aria-label={`${habit.title} ${formatShortDate(key)}`}
                              title={formatShortDate(key)}
                              key={key}
                            >
                              {habit.logs[key] && <Check size={16} />}
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          className="icon-action danger"
                          onClick={() => deleteHabit(habit.id)}
                          title="删除"
                          aria-label={`删除 ${habit.title}`}
                        >
                          <Trash2 size={17} />
                        </button>
                      </article>
                    )
                  })
                ) : (
                  <p className="empty-state">还没有习惯</p>
                )}
              </div>
            </section>
          </div>
        )}

        {view === 'notes' && (
          <div className="screen notes-screen">
            <section className="panel form-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Capture</p>
                  <h3>新笔记</h3>
                </div>
                <StickyNote size={20} />
              </div>
              <form className="stack-form" onSubmit={addNote}>
                <label>
                  <span>标题</span>
                  <input
                    value={noteDraft.title}
                    onChange={(event) => setNoteDraft((draft) => ({ ...draft, title: event.target.value }))}
                    placeholder="输入标题"
                  />
                </label>
                <label>
                  <span>内容</span>
                  <textarea
                    value={noteDraft.body}
                    onChange={(event) => setNoteDraft((draft) => ({ ...draft, body: event.target.value }))}
                    placeholder="记录想法"
                  ></textarea>
                </label>
                <button type="submit" className="primary-button">
                  <Plus size={17} />
                  添加笔记
                </button>
              </form>
            </section>

            <section className="panel list-panel">
              <div className="list-tools">
                <label className="search-box wide-search">
                  <Search size={17} />
                  <input
                    value={noteSearch}
                    onChange={(event) => setNoteSearch(event.target.value)}
                    placeholder="搜索笔记"
                  />
                </label>
              </div>

              <div className="note-grid">
                {filteredNotes.length ? (
                  filteredNotes.map((note) => {
                    const isEditing = editingNoteId === note.id && editingNote

                    return (
                      <article className={note.pinned ? 'note-card pinned' : 'note-card'} key={note.id}>
                        {isEditing ? (
                          <div className="note-edit">
                            <input
                              value={editingNote.title}
                              onChange={(event) =>
                                setEditingNote((draft) => (draft ? { ...draft, title: event.target.value } : draft))
                              }
                            />
                            <textarea
                              value={editingNote.body}
                              onChange={(event) =>
                                setEditingNote((draft) => (draft ? { ...draft, body: event.target.value } : draft))
                              }
                            ></textarea>
                            <div className="row-actions">
                              <button
                                type="button"
                                className="icon-action success"
                                onClick={() => saveNote(note.id)}
                                title="保存"
                                aria-label="保存笔记"
                              >
                                <Save size={17} />
                              </button>
                              <button
                                type="button"
                                className="icon-action"
                                onClick={() => {
                                  setEditingNoteId(null)
                                  setEditingNote(null)
                                }}
                                title="取消"
                                aria-label="取消编辑"
                              >
                                <X size={17} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="note-card-header">
                              <h4>{note.title}</h4>
                              <button
                                type="button"
                                className="icon-action"
                                onClick={() => togglePinned(note.id)}
                                title={note.pinned ? '取消置顶' : '置顶'}
                                aria-label={note.pinned ? `取消置顶 ${note.title}` : `置顶 ${note.title}`}
                              >
                                {note.pinned ? <PinOff size={17} /> : <Pin size={17} />}
                              </button>
                            </div>
                            <p>{note.body || '空笔记'}</p>
                            <div className="note-actions">
                              <span>{new Date(note.updatedAt).toLocaleDateString('zh-CN')}</span>
                              <div className="row-actions">
                                <button
                                  type="button"
                                  className="icon-action"
                                  onClick={() => beginEditNote(note)}
                                  title="编辑"
                                  aria-label={`编辑 ${note.title}`}
                                >
                                  <Pencil size={17} />
                                </button>
                                <button
                                  type="button"
                                  className="icon-action danger"
                                  onClick={() => deleteNote(note.id)}
                                  title="删除"
                                  aria-label={`删除 ${note.title}`}
                                >
                                  <Trash2 size={17} />
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </article>
                    )
                  })
                ) : (
                  <p className="empty-state">没有匹配的笔记</p>
                )}
              </div>
            </section>
          </div>
        )}
      </section>
    </main>
  )
}

export default App
