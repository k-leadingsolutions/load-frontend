import type { DriverAssignment } from '@/domain/models'
import { mockDriverAssignments } from '@/services/mock/data'

const DRIVER_STORAGE_KEY = 'load.driver.assignments.v1'

let memoryAssignments: DriverAssignment[] = mockDriverAssignments

const canUseStorage = () => typeof window !== 'undefined' && 'localStorage' in window

const readAssignments = () => {
  if (!canUseStorage()) {
    return memoryAssignments
  }

  const rawAssignments = window.localStorage.getItem(DRIVER_STORAGE_KEY)

  if (!rawAssignments) {
    window.localStorage.setItem(DRIVER_STORAGE_KEY, JSON.stringify(mockDriverAssignments))
    return mockDriverAssignments
  }

  try {
    return JSON.parse(rawAssignments) as DriverAssignment[]
  } catch {
    window.localStorage.removeItem(DRIVER_STORAGE_KEY)
    window.localStorage.setItem(DRIVER_STORAGE_KEY, JSON.stringify(mockDriverAssignments))
    return mockDriverAssignments
  }
}

const writeAssignments = (assignments: DriverAssignment[]) => {
  memoryAssignments = assignments

  if (!canUseStorage()) {
    return
  }

  window.localStorage.setItem(DRIVER_STORAGE_KEY, JSON.stringify(assignments))
}

export const listStoredDriverAssignments = () => readAssignments()

export const updateStoredDriverAssignment = (
  assignmentId: string,
  updater: (assignment: DriverAssignment) => DriverAssignment,
) => {
  const assignments = readAssignments()
  const targetAssignment = assignments.find((assignment) => assignment.id === assignmentId)

  if (!targetAssignment) {
    return null
  }

  const updatedAssignment = updater(targetAssignment)
  writeAssignments(assignments.map((assignment) => (assignment.id === assignmentId ? updatedAssignment : assignment)))
  return updatedAssignment
}
