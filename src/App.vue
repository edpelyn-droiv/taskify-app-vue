<script setup>
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useTaskStore } from '@/stores/task'

const store = useTaskStore()
const newTask = ref('')

// --- Edit state (callback ref, aman di dalam v-for) ---
const editingId = ref(null)
const editText = ref('')
const editRefs = ref({})
const activeMenu = ref(null)

// --- Filter & toast ---
const currentFilter = ref('all')
const lastDeletedTask = ref(null)
const showToast = ref(false)
let toastTimeout = null

// --- Waktu (reaktif, di-refresh tiap menit) ---
const jamSekarang = ref(new Date().getHours())
let clockTimer = null

const sapaan = computed(() => {
  const j = jamSekarang.value
  if (j < 11) return 'Selamat Pagi'
  if (j < 15) return 'Selamat Siang'
  if (j < 19) return 'Selamat Sore'
  return 'Selamat Malam'
})

const tanggalHariIni = computed(
  () => new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())
)

// --- Statistik ---
const totalTasks = computed(() => store.tasks.length)
const doneTasks = computed(() => store.tasks.filter(t => t.status).length)
const undoneTasks = computed(() => store.tasks.filter(t => !t.status).length)

const persentaseSelesai = computed(() => {
  if (totalTasks.value === 0) return 0
  return Math.round((doneTasks.value / totalTasks.value) * 100)
})

const isAllDone = computed(() => totalTasks.value > 0 && totalTasks.value === doneTasks.value)

const filteredTasks = computed(() => {
  if (currentFilter.value === 'active') return store.tasks.filter(t => !t.status)
  if (currentFilter.value === 'completed') return store.tasks.filter(t => t.status)
  return store.tasks
})

// --- Aksi ---
function handleAdd() {
  const judul = newTask.value.trim()
  if (judul) {
    store.addTask(judul)
    newTask.value = ''
    currentFilter.value = 'all'
  }
}

function toggleMenu(id) {
  activeMenu.value = activeMenu.value === id ? null : id
}

function closeMenu() {
  activeMenu.value = null
}

function handleDelete(task) {
  closeMenu()
  lastDeletedTask.value = { ...task }
  store.deleteTask(task.id)

  showToast.value = true
  if (toastTimeout) clearTimeout(toastTimeout)
  toastTimeout = setTimeout(() => {
    showToast.value = false
  }, 4000)
}

function handleUndo() {
  if (lastDeletedTask.value) {
    store.restoreTask(lastDeletedTask.value)
    showToast.value = false
    lastDeletedTask.value = null
  }
}

function handleClearCompleted() {
  store.clearCompleted()
  currentFilter.value = 'all'
}

// Callback ref: simpan elemen per id task
function setEditRef(el, id) {
  if (el) editRefs.value[id] = el
  else delete editRefs.value[id]
}

async function startEdit(task) {
  closeMenu()
  editingId.value = task.id
  editText.value = task.title
  await nextTick()
  editRefs.value[task.id]?.focus()
}

function saveEdit(id) {
  const judulBaru = editText.value.trim()
  if (judulBaru !== '') {
    store.editTask(id, judulBaru)
  }
  editingId.value = null
}

function cancelEdit() {
  editingId.value = null
}

// --- Keyboard: Escape tutup menu / batal edit ---
function onKeydown(e) {
  if (e.key === 'Escape') {
    if (activeMenu.value) closeMenu()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  clockTimer = setInterval(() => {
    jamSekarang.value = new Date().getHours()
  }, 60000)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  if (clockTimer) clearInterval(clockTimer)
  if (toastTimeout) clearTimeout(toastTimeout)
})
</script>

<template>
  <div
    class="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1120] text-slate-800 dark:text-slate-200 font-sans flex justify-center items-start pt-10 px-4 pb-20 relative transition-colors duration-500"
    @click="closeMenu"
  >

    <div class="fixed top-[-10%] left-[-10%] w-96 h-96 bg-blue-200 dark:bg-blue-900/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-40 dark:opacity-30 transition-colors duration-500 pointer-events-none"></div>
    <div class="fixed bottom-[-10%] right-[-10%] w-72 h-72 bg-emerald-200 dark:bg-emerald-900/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-40 dark:opacity-30 transition-colors duration-500 pointer-events-none"></div>

    <main
      class="w-full max-w-md bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl border rounded-[2rem] p-6 sm:p-7 relative z-10 transition-all duration-700"
      :class="isAllDone
        ? 'border-emerald-200/60 dark:border-emerald-500/30 shadow-[0_0_40px_rgba(52,211,153,0.15)] dark:shadow-[0_0_50px_rgba(52,211,153,0.1)]'
        : 'border-white dark:border-slate-800 shadow-[0_20px_40px_rgb(0,0,0,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)]'"
    >

      <header class="mb-6">
        <div class="mb-5">
          <div class="flex items-center gap-2 mb-1">
            <span class="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></span>
            <p class="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{{ tanggalHariIni }}</p>
          </div>
          <h1 class="text-3xl font-black tracking-tight text-slate-900 dark:text-white mb-1">Taskify Vue</h1>
          <p class="text-sm font-medium text-slate-500 dark:text-slate-400">{{ sapaan }}, mari fokus hari ini.</p>
        </div>

        <div class="flex justify-between items-end mb-4">
          <span class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Progress</span>
          <div class="flex items-center gap-1.5">
            <svg v-if="isAllDone" class="w-4 h-4 text-emerald-500 animate-[pulse_2s_ease-in-out_infinite]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span
              class="text-2xl font-black leading-none transition-colors duration-700"
              :class="isAllDone ? 'text-emerald-500' : 'text-blue-600 dark:text-blue-400'"
            >
              {{ persentaseSelesai }}<span class="text-sm" :class="isAllDone ? 'text-emerald-400' : 'text-blue-400 dark:text-blue-500'">%</span>
            </span>
          </div>
        </div>

        <div
          class="relative w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-6 shadow-inner border border-slate-200/50 dark:border-slate-700/50 transition-colors duration-500"
          role="progressbar"
          :aria-valuenow="persentaseSelesai"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <div
            class="absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out"
            :class="isAllDone ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gradient-to-r from-blue-500 via-blue-400 to-indigo-500 dark:from-blue-600 dark:via-blue-500 dark:to-indigo-500'"
            :style="{ width: persentaseSelesai + '%' }"
          >
            <div v-if="isAllDone" class="absolute inset-0 bg-white/30 w-full h-full animate-[pulse_2s_ease-in-out_infinite]"></div>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-3">
          <div class="relative overflow-hidden bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/50 rounded-2xl p-3 flex flex-col items-center justify-center shadow-sm group hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-300">
            <div class="absolute top-0 right-0 w-8 h-8 bg-slate-200/50 dark:bg-slate-700/30 rounded-bl-full translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform"></div>
            <div class="w-7 h-7 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center mb-1.5 shadow-sm text-slate-500 dark:text-slate-300">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-3.5 h-3.5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
            </div>
            <span class="text-xl font-extrabold text-slate-800 dark:text-slate-100 leading-none">{{ totalTasks }}</span>
            <span class="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1.5">Total</span>
          </div>

          <div
            class="relative overflow-hidden bg-emerald-50/50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl p-3 flex flex-col items-center justify-center shadow-sm transition-all duration-500"
            :class="{ 'ring-2 ring-emerald-400/50 shadow-emerald-200/50 dark:shadow-emerald-900/30': isAllDone }"
          >
            <div class="absolute top-0 right-0 w-8 h-8 bg-emerald-100/50 dark:bg-emerald-500/20 rounded-bl-full translate-x-2 -translate-y-2"></div>
            <div class="w-7 h-7 rounded-full bg-white dark:bg-emerald-500/20 flex items-center justify-center mb-1.5 shadow-sm text-emerald-500 dark:text-emerald-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-3.5 h-3.5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <span class="text-xl font-extrabold text-emerald-700 dark:text-emerald-400 leading-none">{{ doneTasks }}</span>
            <span class="text-[10px] font-bold text-emerald-600/80 dark:text-emerald-500/80 uppercase tracking-wider mt-1.5">Selesai</span>
          </div>

          <div class="relative overflow-hidden bg-amber-50/50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-2xl p-3 flex flex-col items-center justify-center shadow-sm transition-all duration-300" :class="{ 'opacity-50 grayscale': isAllDone }">
            <div class="absolute top-0 right-0 w-8 h-8 bg-amber-100/50 dark:bg-amber-500/20 rounded-bl-full translate-x-2 -translate-y-2"></div>
            <div class="w-7 h-7 rounded-full bg-white dark:bg-amber-500/20 flex items-center justify-center mb-1.5 shadow-sm text-amber-500 dark:text-amber-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-3.5 h-3.5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <span class="text-xl font-extrabold text-amber-700 dark:text-amber-400 leading-none">{{ undoneTasks }}</span>
            <span class="text-[10px] font-bold text-amber-600/80 dark:text-amber-500/80 uppercase tracking-wider mt-1.5">Belum</span>
          </div>
        </div>
      </header>

      <form @submit.prevent="handleAdd" class="flex gap-2 mb-6 relative group">
        <div class="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-500 dark:text-slate-400 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-5 h-5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
        </div>
        <input
          v-model="newTask"
          type="text"
          placeholder="Apa fokus utamamu sekarang?"
          aria-label="Tugas baru"
          class="flex-1 bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/20 dark:focus:ring-blue-500/30 focus:border-blue-500 transition-all"
          required
        >
        <button type="submit" aria-label="Tambah tugas" class="bg-slate-900 dark:bg-blue-600 text-white px-5 py-3.5 rounded-2xl hover:bg-slate-800 dark:hover:bg-blue-500 active:scale-95 font-bold text-sm transition-all shadow-md shadow-slate-900/20 dark:shadow-blue-900/40">
          +
        </button>
      </form>

      <div class="flex items-center justify-between mb-3 px-1">
        <div class="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl" role="tablist" aria-label="Filter tugas">
          <button @click="currentFilter = 'all'" :class="currentFilter === 'all' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'" class="px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all">Semua</button>
          <button @click="currentFilter = 'active'" :class="currentFilter === 'active' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'" class="px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all">Aktif</button>
          <button @click="currentFilter = 'completed'" :class="currentFilter === 'completed' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'" class="px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all">Selesai</button>
        </div>

        <button v-if="doneTasks > 0" @click="handleClearCompleted" class="text-[11px] font-bold text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors">
          Bersihkan
        </button>
      </div>

      <div class="space-y-1">
        <div v-if="filteredTasks.length === 0" class="flex flex-col items-center justify-center py-10 text-center bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 transition-colors duration-500">
          <div class="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mb-3 shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6 text-slate-400 dark:text-slate-500" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
          </div>
          <p class="text-slate-600 dark:text-slate-300 font-semibold text-sm">Tidak ada tugas di sini</p>
          <p class="text-slate-500 dark:text-slate-500 text-xs mt-1">Waktunya bersantai atau buat tugas baru.</p>
        </div>

        <div
          v-for="task in filteredTasks"
          :key="task.id"
          class="group flex items-center justify-between p-2 pl-3 pr-2 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-200"
          :class="{ 'bg-blue-50/80 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700/50': editingId === task.id }"
        >
          <div v-if="editingId === task.id" class="flex-1 flex items-center gap-2">
            <input
              :ref="(el) => setEditRef(el, task.id)"
              v-model="editText"
              @keyup.enter="saveEdit(task.id)"
              @keyup.esc="cancelEdit"
              type="text"
              aria-label="Edit judul tugas"
              class="flex-1 bg-white dark:bg-slate-800 border border-blue-400 dark:border-blue-500 text-slate-800 dark:text-slate-100 font-medium rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
            <button @click="saveEdit(task.id)" aria-label="Simpan" class="bg-blue-600 text-white p-1.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor" class="w-4 h-4" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
            </button>
            <button @click="cancelEdit" aria-label="Batal" class="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 p-1.5 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors shadow-sm shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor" class="w-4 h-4" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div v-else class="flex items-center justify-between w-full relative">
            <label class="flex items-center gap-3 flex-1 overflow-hidden cursor-pointer py-1">
              <div class="relative flex items-center justify-center w-5 h-5 shrink-0">
                <input
                  type="checkbox"
                  :checked="task.status"
                  @change="store.toggleTask(task.id)"
                  :aria-label="task.status ? 'Tandai belum selesai' : 'Tandai selesai'"
                  class="peer appearance-none w-5 h-5 border-2 border-slate-300 dark:border-slate-600 rounded-full checked:bg-emerald-500 checked:border-emerald-500 dark:checked:bg-emerald-500 dark:checked:border-emerald-500 transition-all cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 active:scale-90"
                >
                <svg class="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3.5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
              </div>

              <span
                class="truncate text-sm font-medium transition-all duration-300"
                :class="task.status ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400'"
                @click.prevent="startEdit(task)"
              >
                {{ task.title }}
              </span>
            </label>

            <div class="relative shrink-0 ml-1">
              <button
                type="button"
                @click.stop="toggleMenu(task.id)"
                :aria-expanded="activeMenu === task.id"
                aria-label="Opsi tugas"
                class="text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 p-1.5 rounded-lg transition-all active:scale-90"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-5 h-5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" /></svg>
              </button>

              <div v-if="activeMenu === task.id" role="menu" @click.stop class="absolute right-0 top-full mt-1 w-28 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-200/60 dark:shadow-black/60 rounded-xl z-50 py-1 overflow-hidden">
                <button role="menuitem" @click="startEdit(task)" class="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg>
                  Edit
                </button>
                <button role="menuitem" @click="handleDelete(task)" class="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3.5 h-3.5 text-red-500 dark:text-red-400" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                  Hapus
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <div
      v-if="showToast"
      role="status"
      class="fixed bottom-6 z-50 flex items-center justify-between bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-3 rounded-2xl shadow-2xl transition-all duration-300 animate-slide-up w-[90%] max-w-sm"
    >
      <span class="text-sm font-medium">Tugas dihapus.</span>
      <button @click="handleUndo" class="text-blue-400 dark:text-blue-600 font-bold text-sm hover:underline">
        Urungkan
      </button>
    </div>

  </div>
</template>

<style>
@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.animate-slide-up {
  animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
</style>   
