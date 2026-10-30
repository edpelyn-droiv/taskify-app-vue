import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useTaskStore = defineStore('task', () => {
  const dataTersimpan = localStorage.getItem('taskify-tasks')
  const tasks = ref(dataTersimpan ? JSON.parse(dataTersimpan) : [])

  watch(
    tasks,
    (dataBaru) => {
      localStorage.setItem('taskify-tasks', JSON.stringify(dataBaru))
    },
    { deep: true }
  )

  function addTask(title) {
    const newId = tasks.value.length > 0
      ? Math.max(...tasks.value.map(t => t.id)) + 1
      : 1
    tasks.value.push({ id: newId, title, status: false })
  }

  function editTask(id, newTitle) {
    const task = tasks.value.find(t => t.id === id)
    if (task) task.title = newTitle
  }

  function toggleTask(id) {
    const task = tasks.value.find(t => t.id === id)
    if (task) task.status = !task.status
  }

  function deleteTask(id) {
    const index = tasks.value.findIndex(t => t.id === id)
    if (index !== -1) tasks.value.splice(index, 1)
  }

  function clearCompleted() {
    tasks.value = tasks.value.filter(t => !t.status)
  }

  function restoreTask(task) {
    tasks.value.push(task)
  }

  return {
    tasks,
    addTask,
    editTask,
    toggleTask,
    deleteTask,
    clearCompleted,
    restoreTask,
  }
})
