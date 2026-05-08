import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { TaskList } from '@/components/tasks/task-list'

export default async function TasksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const member = await db.householdMember.findFirst({
    where: { userId: user.id },
    include: { household: true },
  })
  if (!member) redirect('/onboarding')

  const householdId = member.householdId

  const [tasks, members] = await Promise.all([
    db.task.findMany({
      where: { householdId },
      include: { assignee: true, creator: true },
      orderBy: [{ status: 'asc' }, { priority: 'desc' }, { dueDate: 'asc' }],
    }),
    db.householdMember.findMany({
      where: { householdId },
      orderBy: { displayName: 'asc' },
    }),
  ])

  return (
    <TaskList
      initialTasks={tasks}
      members={members}
      currentMemberId={member.id}
    />
  )
}
