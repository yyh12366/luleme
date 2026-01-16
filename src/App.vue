<script setup>
import { ref, reactive, computed, onMounted } from 'vue'

// --- Data & State ---
const data = reactive({
  checkins: [],
  streak: 0,
  lastCheckin: null,
  sharedItems: []
})

const activeTab = ref('home')
const currentMonth = ref(new Date())
const celebrationRef = ref(null)

const newShareType = ref('url')
const newShareContent = ref('')

// --- User Identity ---
const getUserId = () => {
  let userId = localStorage.getItem('app_user_id')
  if (!userId) {
    userId = 'user_' + Math.random().toString(36).substr(2, 9)
    localStorage.setItem('app_user_id', userId)
  }
  return userId
}

const currentUserId = getUserId()

// --- API Logic ---
const loadData = async () => {
  try {
    const response = await fetch('/api/data', {
      headers: { 'X-User-Id': currentUserId }
    })
    const remoteData = await response.json()
    Object.assign(data, remoteData)
    updateStreak()
  } catch (err) {
    console.error('Failed to load data:', err)
  }
}

const saveData = async () => {
  try {
    await fetch('/api/data', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-User-Id': currentUserId
      },
      body: JSON.stringify(data)
    })
  } catch (err) {
    console.error('Failed to save data:', err)
  }
}

const updateStreak = () => {
  const sortedDates = [...new Set(data.checkins.map(c => c.date))].sort()
  if (sortedDates.length === 0) {
    data.streak = 0
    return
  }

  const todayStr = formatDate(new Date())
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = formatDate(yesterday)

  if (!sortedDates.includes(todayStr) && !sortedDates.includes(yesterdayStr)) {
    data.streak = 0
  } else {
    let count = 0
    let tempDate = new Date()
    if (!sortedDates.includes(formatDate(tempDate))) {
      tempDate.setDate(tempDate.getDate() - 1)
    }
    while (sortedDates.includes(formatDate(tempDate))) {
      count++
      tempDate.setDate(tempDate.getDate() - 1)
    }
    data.streak = count
  }
}

const checkIn = () => {
  const now = new Date()
  const today = formatDate(now)
  data.checkins.push({ timestamp: now.getTime(), date: today, note: '' })
  updateStreak()
  saveData()
  showCelebration()
}

const addSharedItem = () => {
  if (!newShareContent.value.trim()) return
  data.sharedItems.unshift({
    id: Date.now(),
    type: newShareType.value,
    content: newShareContent.value.trim(),
    timestamp: new Date().toLocaleString()
  })
  newShareContent.value = ''
  saveData()
}

const removeSharedItem = (id) => {
  data.sharedItems = data.sharedItems.filter(item => item.id !== id)
  saveData()
}

const copyToClipboard = (text) => {
  navigator.clipboard.writeText(text).then(() => alert('复制成功！'))
}

// --- Utilities ---
const formatDate = (date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const getDateString = (date) => {
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
}

const isToday = (dateStr) => dateStr === formatDate(new Date())
const getCheckinsForDate = (dateStr) => data.checkins.filter(c => c.date === dateStr)

const todayCheckinsCount = computed(() => getCheckinsForDate(formatDate(new Date())).length)
const totalCheckinsCount = computed(() => data.checkins.length)
const calendarTitle = computed(() => `${currentMonth.value.getFullYear()}年 ${currentMonth.value.getMonth() + 1}月`)

const calendarDays = computed(() => {
  const year = currentMonth.value.getFullYear()
  const month = currentMonth.value.getMonth()
  const firstDay = new Date(year, month, 1)
  const startingDayOfWeek = firstDay.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days = []
  
  const prevMonthLastDay = new Date(year, month, 0).getDate()
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    days.push({ day: prevMonthLastDay - i, type: 'other-month', dateStr: null })
  }
  
  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = formatDate(new Date(year, month, i))
    days.push({ day: i, type: 'current', dateStr, count: getCheckinsForDate(dateStr).length, isToday: isToday(dateStr) })
  }
  
  const fill = 35 - days.length > 0 ? 35 - days.length : (42 - days.length)
  for (let i = 1; i <= fill; i++) {
    days.push({ day: i, type: 'other-month', dateStr: null })
  }
  return days
})

const changeMonth = (delta) => {
  const newDate = new Date(currentMonth.value)
  newDate.setMonth(newDate.getMonth() + delta)
  currentMonth.value = newDate
}

const showCelebration = () => {
  const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe']
  for (let i = 0; i < 50; i++) {
    setTimeout(() => {
      const confetti = document.createElement('div')
      confetti.className = 'confetti'
      confetti.style.left = Math.random() * 100 + '%'
      confetti.style.background = colors[Math.floor(Math.random() * colors.length)]
      confetti.style.animationDelay = Math.random() * 0.5 + 's'
      confetti.style.animationDuration = (Math.random() * 2 + 2) + 's'
      celebrationRef.value?.appendChild(confetti)
      setTimeout(() => confetti.remove(), 3000)
    }, i * 30)
  }
}

onMounted(async () => {
  await loadData()
})
</script>

<template>
  <div class="min-h-screen flex flex-col max-w-[500px] mx-auto bg-[#f8fafc]">
    <header class="h-[50px] px-2.5 pt-[env(safe-area-inset-top)] bg-white flex items-center border-b border-black/5 shrink-0">
      <div class="w-full flex justify-between items-center">
        <h1 class="text-[1.1rem] font-bold bg-primary-gradient bg-clip-text text-transparent">🦌了么</h1>
        <div class="bg-white px-2 py-0.5 rounded-full text-[0.9rem] border border-black/5">
          <span class="mr-1">🛫</span>
          <span class="text-[#fee140] font-bold">{{ totalCheckinsCount }}</span>
          <span class="text-slate-500 ml-0.5">次</span>
        </div>
      </div>
    </header>

    <main class="flex-1 flex flex-col p-1.5 pb-[calc(80px+env(safe-area-inset-bottom))] gap-1.5 overflow-y-auto">
      <!-- Home View -->
      <div v-if="activeTab === 'home'" class="bg-white rounded-xl border border-black/5 p-2.5 shadow-sm">
        <section class="text-center mb-2.5 text-[0.85rem] text-slate-500">
          {{ getDateString(new Date()) }}
        </section>

        <section class="flex flex-col">
          <div class="flex justify-between items-center mb-1">
            <button class="bg-slate-100 w-6 h-6 rounded flex items-center justify-center text-slate-700" @click="changeMonth(-1)">‹</button>
            <h3 class="text-[0.9rem] font-semibold">{{ calendarTitle }}</h3>
            <button class="bg-slate-100 w-6 h-6 rounded flex items-center justify-center text-slate-700" @click="changeMonth(1)">›</button>
          </div>
          <div class="grid grid-cols-7 gap-1.5 pt-1">
            <div class="aspect-square flex items-center justify-center text-[0.75rem] font-extrabold text-slate-400 uppercase" v-for="d in ['日', '一', '二', '三', '四', '五', '六']" :key="d">
              {{ d }}
            </div>
            <div 
              v-for="(day, index) in calendarDays" 
              :key="index"
              class="aspect-square flex items-center justify-center text-[1.1rem] font-semibold rounded-lg relative transition-all duration-200"
              :class="[
                day.type === 'other-month' ? 'opacity-[0.25]' : 'text-slate-800',
                day.isToday ? 'border-2 border-indigo-600 text-indigo-600 font-black' : '',
                day.count > 0 ? 'bg-primary-gradient text-white !border-none shadow-md shadow-indigo-500/20' : ''
              ]"
            >
              <template v-if="day.count > 0">
                🦌<span v-if="day.count > 1" class="absolute -top-1 -right-1 bg-rose-500 text-white text-[0.65rem] font-black px-1 rounded-lg border-2 border-white shadow-sm">{{ day.count }}</span>
              </template>
              <template v-else>{{ day.day }}</template>
            </div>
          </div>
        </section>

        <section class="py-2.5 flex flex-col items-center">
          <div class="mb-1.5 text-[0.8rem] font-semibold h-[1.2rem] text-center">
            <span v-if="todayCheckinsCount > 0" class="text-sky-400">今日已🦌 {{ todayCheckinsCount }} 次！继续加油！</span>
          </div>
          <button @click="checkIn" class="bg-primary-gradient border-4 border-white rounded-full w-[76px] h-[76px] flex flex-col items-center justify-center text-white shadow-lg shadow-indigo-500/40 active:scale-95 transition-transform">
            <span class="text-2xl leading-none">🦌</span>
            <span class="text-[0.65rem] font-black mt-0.5">已🦌</span>
          </button>
        </section>
      </div>

      <!-- Share View -->
      <div v-else-if="activeTab === 'share'" class="flex flex-col gap-2.5">
        <div class="bg-white rounded-xl border border-black/5 p-4 shadow-sm">
          <h2 class="text-[1rem] font-semibold mb-2.5 text-slate-800">资源分享</h2>
          <div class="flex flex-col gap-2.5">
            <div class="flex gap-1.5">
              <button class="flex-1 py-2 rounded-lg text-sm transition-all" :class="newShareType === 'url' ? 'bg-primary-gradient text-white shadow-md' : 'bg-slate-100 text-slate-600'" @click="newShareType = 'url'">网址</button>
              <button class="flex-1 py-2 rounded-lg text-sm transition-all" :class="newShareType === 'code' ? 'bg-primary-gradient text-white shadow-md' : 'bg-slate-100 text-slate-600'" @click="newShareType = 'code'">番号</button>
            </div>
            <textarea v-model="newShareContent" :placeholder="newShareType === 'url' ? '请输入网址...' : '请输入番号/代码...'" rows="3" class="w-full p-3 rounded-lg border border-black/5 bg-slate-50 text-[16px] resize-none focus:ring-2 focus:ring-indigo-500 outline-none select-text"></textarea>
            <button @click="addSharedItem" class="bg-primary-gradient text-white py-3.5 rounded-xl font-bold active:scale-[0.96] active:opacity-90 transition-all shadow-md">发布资源</button>
          </div>
        </div>

        <div class="flex flex-col gap-2.5">
          <div v-for="item in data.sharedItems" :key="item.id" class="bg-white rounded-xl border border-black/5 p-4 shadow-sm select-text animate-in fade-in slide-in-from-bottom-5 duration-300">
            <div class="flex justify-between items-center mb-2">
              <span class="text-[0.7rem] font-extrabold px-2 py-0.5 rounded-md" :class="item.type === 'url' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-700'">{{ item.type === 'url' ? '🔗 URL' : '🔖 CODE' }}</span>
              <span class="text-[0.7rem] text-slate-400">{{ item.timestamp }}</span>
            </div>
            <div class="text-[0.95rem] text-slate-800 break-all mb-3">{{ item.content }}</div>
            <div class="flex gap-2.5 border-t border-black/5 pt-2.5">
              <button @click="copyToClipboard(item.content)" class="flex-1 py-2 rounded bg-slate-50 text-slate-700 text-[0.85rem] font-semibold active:opacity-60 transition-opacity">复制</button>
              <button @click="removeSharedItem(item.id)" class="flex-1 py-2 rounded bg-rose-50 text-rose-600 text-[0.85rem] font-semibold active:opacity-60 transition-opacity">删除</button>
            </div>
          </div>
          <div v-if="data.sharedItems.length === 0" class="py-10 text-center text-slate-400 text-sm">暂无分享资源</div>
        </div>
      </div>
    </main>

    <nav class="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[500px] h-[70px] bg-white/80 backdrop-blur-md flex justify-around items-center border-t border-black/5 pb-[env(safe-area-inset-bottom)] z-[100]">
      <button v-for="tab in [{id:'home', icon:'✨', label:'打卡'}, {id:'share', icon:'🚀', label:'资源'}]" :key="tab.id" @click="activeTab = tab.id" class="flex flex-col items-center flex-1 py-2 transition-transform active:scale-90" :class="activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400'">
        <span class="text-[1.6rem] mb-0.5">{{ tab.icon }}</span>
        <span class="text-[0.75rem] font-bold">{{ tab.label }}</span>
      </button>
    </nav>

    <div class="fixed inset-0 pointer-events-none z-[99]" ref="celebrationRef"></div>
  </div>
</template>

<style>
/* Base overrides not easily handled by pure Tailwind or needing specific animation keyframes */
@keyframes fall {
  to { transform: translateY(100vh) rotate(360deg); }
}

.confetti {
  @apply absolute w-2.5 h-2.5 -top-2.5 opacity-80;
  animation: fall linear forwards;
}
</style>
