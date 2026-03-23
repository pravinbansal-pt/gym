import { getActiveSchedule, getScheduledWorkoutsForRange, getPrograms } from "./_actions"
import { CalendarView } from "./_components/calendar-view"
import { startOfMonth, endOfMonth, subMonths, addMonths, format } from "date-fns"

export default async function CalendarPage() {
  const now = new Date()
  // Fetch 3 months of data so adjacent months are visible
  const rangeStart = startOfMonth(subMonths(now, 1))
  const rangeEnd = endOfMonth(addMonths(now, 1))

  const [schedule, scheduledWorkouts, programs] = await Promise.all([
    getActiveSchedule(),
    getScheduledWorkoutsForRange(
      format(rangeStart, "yyyy-MM-dd"),
      format(rangeEnd, "yyyy-MM-dd"),
    ),
    getPrograms(),
  ])

  return (
    <CalendarView
      schedule={schedule}
      scheduledWorkouts={scheduledWorkouts}
      programs={programs}
    />
  )
}
