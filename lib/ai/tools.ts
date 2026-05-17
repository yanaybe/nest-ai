import { tool } from 'ai'
import { z } from 'zod'
import { db } from '@/lib/db'
import { ExpenseCategory, Priority, TaskStatus } from '@prisma/client'

// TODO [AI]:
// The current tool set covers the basics but is missing high-value tools that would make Nest
// feel genuinely intelligent vs. just a voice interface for CRUD operations:
//
// Missing tools (high impact):
// 1. searchHouseholdContext — "Does anyone have a nut allergy?" requires searching memories
//    AND existing tasks/notes. A dedicated search tool prevents the AI from hallucinating answers.
// 2. getBills — AI can't answer "when is the electricity bill due?" without this tool
// 3. getSpendinvgInsights — complex spending analysis: "are we spending more than last month?"
//    should return trend data, not just current month totals
// 4. updateTask — AI can't mark a task done. User says "mark 'buy groceries' as done" and
//    the AI can only create new tasks, not update existing ones
// 5. deleteGroceryItem — AI can't remove items from the list ("we already bought milk")
// 6. getMealPlan — AI can't tell you what's planned for dinner tonight
// 7. getHouseholdMembers — AI currently uses hardcoded member list from system prompt, should
//    be dynamic to handle mid-conversation member changes
//
// TODO [SECURITY]:
// All tools execute database mutations using the householdId injected at call time.
// This is correct and prevents cross-household data access. However, there's no audit log
// of what actions the AI took. If the AI accidentally deletes the wrong items or creates
// duplicate tasks, there's no way to know it happened or to reverse it.
//
// Suggested fix:
// - Add an AIAction log table: { id, householdId, memberId, tool, input, output, createdAt }
// - Log every tool execution (success and failure) to this table
// - Add a "Nest actions" feed in Settings so users can see what the AI did and undo it
// - This also gives you valuable data about which tools are most used (informs product roadmap)

// TODO [PERFORMANCE]:
// createTools() is called on every API request and recreates the entire tool object from scratch.
// While the tools themselves are lightweight (just schema + function definitions), the DB calls
// inside execute() functions are not cached. If a user asks multiple questions in one session
// that all query the same data (e.g., multiple grocery questions), each call hits the DB fresh.
//
// Suggested: Add a per-request context cache using a WeakMap or simple closure so that within
// a single streaming session, repeated reads of the same data don't hit the DB multiple times.

// All tools receive householdId as context — injected at call time, not from AI
export function createTools(householdId: string, memberId: string) {
  return {
    // ── GROCERY ──────────────────────────────────────────────────────────────
    addGroceryItem: tool({
      description: 'Add one or more items to the household grocery list',
      parameters: z.object({
        items: z.array(z.object({
          name: z.string().describe('Item name'),
          quantity: z.number().optional(),
          unit: z.string().optional().describe('e.g. kg, liters, pieces'),
          category: z.string().optional().describe('e.g. dairy, produce, meat'),
          urgent: z.boolean().optional().default(false),
          estimatedCost: z.number().optional(),
        })).min(1),
      }),
      execute: async ({ items }) => {
        const created = await db.groceryItem.createMany({
          data: items.map((item) => ({
            householdId,
            addedBy: memberId,
            ...item,
          })),
        })
        return { success: true, count: created.count, items: items.map((i) => i.name) }
      },
    }),

    getGroceryList: tool({
      description: 'Get the current grocery list',
      parameters: z.object({
        includeChecked: z.boolean().optional().default(false),
      }),
      execute: async ({ includeChecked }) => {
        const items = await db.groceryItem.findMany({
          where: { householdId, checked: includeChecked ? undefined : false },
          orderBy: [{ urgent: 'desc' }, { createdAt: 'asc' }],
        })
        return { items, total: items.length }
      },
    }),

    checkGroceryItem: tool({
      description: 'Mark grocery items as checked/bought',
      parameters: z.object({
        itemNames: z.array(z.string()).describe('Names of items to mark as bought'),
      }),
      execute: async ({ itemNames }) => {
        const items = await db.groceryItem.findMany({
          where: { householdId, checked: false },
        })
        const toUpdate = items.filter((i) => {
          const name = i.name.toLowerCase()
          return itemNames.some((n) => {
            const q = n.toLowerCase()
            if (name === q) return true
            if (q.length > 4 && name.includes(q)) return true
            return false
          })
        })
        await db.groceryItem.updateMany({
          where: { id: { in: toUpdate.map((i) => i.id) } },
          data: { checked: true, checkedBy: memberId, checkedAt: new Date(), lastBoughtAt: new Date() },
        })
        return { updated: toUpdate.map((i) => i.name) }
      },
    }),

    // ── TASKS ────────────────────────────────────────────────────────────────
    createTask: tool({
      description: 'Create a task for the household',
      parameters: z.object({
        title: z.string(),
        description: z.string().optional(),
        priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('MEDIUM'),
        dueDate: z.string().optional().describe('ISO date string'),
        assigneeName: z.string().optional().describe('Name of the member to assign to'),
        category: z.string().optional(),
      }),
      execute: async ({ title, description, priority, dueDate, assigneeName, category }) => {
        let assigneeId: string | undefined
        if (assigneeName) {
          const member = await db.householdMember.findFirst({
            where: {
              householdId,
              displayName: { contains: assigneeName, mode: 'insensitive' },
            },
          })
          assigneeId = member?.id
        }
        const task = await db.task.create({
          data: {
            householdId,
            title,
            description,
            priority: (priority as Priority) ?? 'MEDIUM',
            dueDate: dueDate ? new Date(dueDate) : undefined,
            assigneeId,
            creatorId: memberId,
            category,
          },
          include: { assignee: true },
        })
        return { task: { id: task.id, title: task.title, assignee: task.assignee?.displayName } }
      },
    }),

    // TODO [AI]: Missing critical task management tools:
    // - updateTask: change status, priority, dueDate, or assignee on an existing task
    //   (Users say "mark the dentist task as done" and the AI can't do it)
    // - completeTask: shorthand for marking a specific task DONE by name
    // - deleteTask: remove a task the user no longer needs
    // Without these, the AI can CREATE tasks but never close the loop. This is a fundamental gap.
    getTasks: tool({
      description: 'Get tasks for the household',
      parameters: z.object({
        status: z.enum(['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED']).optional(),
        assigneeName: z.string().optional(),
        priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
      }),
      execute: async ({ status, assigneeName, priority }) => {
        let assigneeId: string | undefined
        if (assigneeName) {
          const member = await db.householdMember.findFirst({
            where: { householdId, displayName: { contains: assigneeName, mode: 'insensitive' } },
          })
          assigneeId = member?.id
        }
        const tasks = await db.task.findMany({
          where: {
            householdId,
            status: (status as TaskStatus) ?? { in: ['TODO', 'IN_PROGRESS'] },
            assigneeId,
            priority: priority as Priority | undefined,
          },
          include: { assignee: true },
          orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
          take: 20,
        })
        return {
          tasks: tasks.map((t) => ({
            id: t.id,
            title: t.title,
            priority: t.priority,
            status: t.status,
            dueDate: t.dueDate,
            assignee: t.assignee?.displayName,
          })),
        }
      },
    }),

    // ── CALENDAR ─────────────────────────────────────────────────────────────
    createEvent: tool({
      description: 'Add an event to the family calendar',
      parameters: z.object({
        title: z.string(),
        startAt: z.string().describe('ISO datetime string'),
        endAt: z.string().describe('ISO datetime string'),
        description: z.string().optional(),
        location: z.string().optional(),
        allDay: z.boolean().optional().default(false),
        attendeeNames: z.array(z.string()).optional(),
        category: z.string().optional(),
      }),
      execute: async ({ title, startAt, endAt, description, location, allDay, attendeeNames, category }) => {
        let attendeeIds: string[] = []
        if (attendeeNames?.length) {
          const members = await db.householdMember.findMany({
            where: {
              householdId,
              displayName: { in: attendeeNames, mode: 'insensitive' } as any,
            },
          })
          attendeeIds = members.map((m) => m.id)
        }
        const event = await db.calendarEvent.create({
          data: {
            householdId,
            title,
            description,
            location,
            startAt: new Date(startAt),
            endAt: new Date(endAt),
            allDay: allDay ?? false,
            category,
            attendees: {
              create: attendeeIds.map((id) => ({ memberId: id })),
            },
          },
        })
        return { event: { id: event.id, title: event.title, startAt: event.startAt } }
      },
    }),

    getUpcomingEvents: tool({
      description: 'Get upcoming calendar events',
      parameters: z.object({
        days: z.number().optional().default(7).describe('Number of days to look ahead'),
      }),
      execute: async ({ days }) => {
        const end = new Date()
        end.setDate(end.getDate() + (days ?? 7))
        const events = await db.calendarEvent.findMany({
          where: {
            householdId,
            startAt: { gte: new Date(), lte: end },
          },
          include: { attendees: { include: { member: true } } },
          orderBy: { startAt: 'asc' },
          take: 20,
        })
        return {
          events: events.map((e) => ({
            id: e.id,
            title: e.title,
            startAt: e.startAt,
            endAt: e.endAt,
            location: e.location,
            attendees: e.attendees.map((a) => a.member.displayName),
          })),
        }
      },
    }),

    // ── EXPENSES ─────────────────────────────────────────────────────────────
    logExpense: tool({
      description: 'Log a household expense',
      parameters: z.object({
        title: z.string(),
        amount: z.number(),
        category: z.enum([
          'GROCERIES', 'DINING', 'TRANSPORT', 'UTILITIES', 'HOUSING',
          'HEALTHCARE', 'EDUCATION', 'ENTERTAINMENT', 'CLOTHING',
          'PERSONAL_CARE', 'SUBSCRIPTIONS', 'SAVINGS', 'OTHER',
        ]),
        notes: z.string().optional(),
        paidByName: z.string().optional(),
      }),
      execute: async ({ title, amount, category, notes, paidByName }) => {
        let paidById: string | undefined
        if (paidByName) {
          const member = await db.householdMember.findFirst({
            where: { householdId, displayName: { contains: paidByName, mode: 'insensitive' } },
          })
          paidById = member?.id
        }
        const expense = await db.expense.create({
          data: {
            householdId,
            title,
            amount,
            category: category as ExpenseCategory,
            notes,
            paidById,
          },
        })
        return { expense: { id: expense.id, title: expense.title, amount: expense.amount, category: expense.category } }
      },
    }),

    getExpenseSummary: tool({
      description: 'Get expense summary for a time period',
      parameters: z.object({
        period: z.enum(['week', 'month', 'year']).optional().default('month'),
      }),
      execute: async ({ period }) => {
        const start = new Date()
        if (period === 'week') start.setDate(start.getDate() - 7)
        else if (period === 'month') start.setMonth(start.getMonth() - 1)
        else start.setFullYear(start.getFullYear() - 1)

        const expenses = await db.expense.findMany({
          where: { householdId, paidAt: { gte: start } },
        })

        const total = expenses.reduce((sum, e) => sum + e.amount, 0)
        const byCategory = expenses.reduce(
          (acc, e) => {
            acc[e.category] = (acc[e.category] ?? 0) + e.amount
            return acc
          },
          {} as Record<string, number>
        )

        return { total, byCategory, count: expenses.length, period }
      },
    }),

    // ── REMINDERS ────────────────────────────────────────────────────────────
    setReminder: tool({
      description: 'Set a reminder',
      parameters: z.object({
        title: z.string(),
        body: z.string().optional(),
        remindAt: z.string().describe('ISO datetime string for when to send the reminder'),
        forMemberName: z.string().optional(),
      }),
      execute: async ({ title, body, remindAt, forMemberName }) => {
        let forMemberId = memberId
        if (forMemberName) {
          const member = await db.householdMember.findFirst({
            where: { householdId, displayName: { contains: forMemberName, mode: 'insensitive' } },
          })
          if (member) forMemberId = member.id
        }
        const reminder = await db.reminder.create({
          data: { householdId, memberId: forMemberId, title, body, remindAt: new Date(remindAt) },
        })
        return { reminder: { id: reminder.id, title: reminder.title, remindAt: reminder.remindAt } }
      },
    }),

    // ── TASK UPDATES ─────────────────────────────────────────────────────────
    updateTask: tool({
      description: 'Update an existing task — change its status, priority, due date, or assignee',
      parameters: z.object({
        taskTitle: z.string().describe('Title or partial title of the task to update'),
        updates: z.object({
          status: z.enum(['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED']).optional(),
          priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
          dueDate: z.string().optional().describe('ISO date string or null to clear'),
          assigneeName: z.string().optional(),
        }),
      }),
      execute: async ({ taskTitle, updates }) => {
        const tasks = await db.task.findMany({
          where: { householdId, title: { contains: taskTitle, mode: 'insensitive' }, status: { not: 'CANCELLED' } },
          take: 5,
        })
        if (tasks.length === 0) return { error: `No task found matching "${taskTitle}"` }
        const task = tasks[0]

        let assigneeId: string | undefined
        if (updates.assigneeName) {
          const m = await db.householdMember.findFirst({
            where: { householdId, displayName: { contains: updates.assigneeName, mode: 'insensitive' } },
          })
          assigneeId = m?.id
        }

        const updated = await db.task.update({
          where: { id: task.id },
          data: {
            ...(updates.status && { status: updates.status as TaskStatus }),
            ...(updates.priority && { priority: updates.priority as Priority }),
            ...(updates.dueDate !== undefined && { dueDate: updates.dueDate ? new Date(updates.dueDate) : null }),
            ...(assigneeId && { assigneeId }),
            ...(updates.status === 'DONE' && { completedAt: new Date() }),
          },
          include: { assignee: true },
        })
        return { updated: { id: updated.id, title: updated.title, status: updated.status, assignee: updated.assignee?.displayName } }
      },
    }),

    // ── GROCERY DELETION ──────────────────────────────────────────────────────
    deleteGroceryItem: tool({
      description: 'Remove one or more items from the grocery list',
      parameters: z.object({
        itemNames: z.array(z.string()).describe('Names of items to remove'),
      }),
      execute: async ({ itemNames }) => {
        const items = await db.groceryItem.findMany({ where: { householdId } })
        const toDelete = items.filter(i =>
          itemNames.some(n => i.name.toLowerCase() === n.toLowerCase() ||
            (i.name.toLowerCase().includes(n.toLowerCase()) && n.length > 3))
        )
        if (toDelete.length === 0) return { error: 'No matching items found' }
        await db.groceryItem.deleteMany({ where: { id: { in: toDelete.map(i => i.id) } } })
        return { deleted: toDelete.map(i => i.name) }
      },
    }),

    // ── BILLS ─────────────────────────────────────────────────────────────────
    getBillsSummary: tool({
      description: 'Get a summary of household bills — upcoming, overdue, and monthly total',
      parameters: z.object({}),
      execute: async () => {
        const bills = await db.bill.findMany({
          where: { householdId },
          orderBy: { dueDay: 'asc' },
        })
        const today = new Date().getDate()
        const upcoming = bills.filter(b => b.dueDay >= today && b.dueDay <= today + 7)
        const overdue = bills.filter(b => b.dueDay < today && !b.isAutoPay)
        const monthlyTotal = bills.reduce((sum, b) => sum + b.amount, 0)
        return {
          bills: bills.map(b => ({ name: b.name, amount: b.amount, dueDay: b.dueDay, isAutoPay: b.isAutoPay })),
          upcoming: upcoming.length,
          overdue: overdue.length,
          monthlyTotal,
        }
      },
    }),
  }
}
