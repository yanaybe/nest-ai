import { tool } from 'ai'
import { z } from 'zod'
import { db } from '@/lib/db'
import { ExpenseCategory, Priority, TaskStatus } from '@prisma/client'

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
        const toUpdate = items.filter((i) =>
          itemNames.some((n) => i.name.toLowerCase().includes(n.toLowerCase()))
        )
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
  }
}
