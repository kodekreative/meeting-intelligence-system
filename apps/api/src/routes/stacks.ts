import { Router, Request, Response } from 'express'
import Airtable from 'airtable'

const router: Router = Router()

function getBase() {
  const apiKey = process.env.AIRTABLE_API_KEY
  const baseId = process.env.AIRTABLE_BASE_ID
  if (!apiKey || !baseId || apiKey.includes('placeholder')) {
    throw new Error('Airtable configuration missing')
  }
  return new Airtable({ apiKey }).base(baseId)
}

// GET /api/v1/stacks - List all stacks (optionally filter by boardId)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { boardId } = req.query as { boardId?: string }

    const selectOptions: { sort: { field: string; direction: 'asc' | 'desc' }[]; filterByFormula?: string } = {
      sort: [{ field: 'Order', direction: 'asc' }],
    }

    // Filter by boardId if provided
    if (boardId) {
      selectOptions.filterByFormula = `{Board ID} = "${boardId}"`
    }

    const base = getBase()
    const records = await base('Task Stacks').select(selectOptions).all()

    const stacks = records.map((record) => ({
      id: record.id,
      name: record.get('Name') as string,
      type: record.get('Type') as string,
      parentStackId: record.get('Parent Stack ID') as string | undefined,
      order: record.get('Order') as number | undefined,
      color: record.get('Color') as string | undefined,
      isCollapsed: record.get('Is Collapsed') as boolean | undefined,
      ownerId: record.get('Owner ID') as string | undefined,
      boardId: record.get('Board ID') as string | undefined,
    }))

    res.json({ success: true, data: stacks })
  } catch (error) {
    console.error('Error fetching stacks:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch stacks' })
  }
})

// GET /api/v1/stacks/:id - Get single stack
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const base = getBase()
    const record = await base('Task Stacks').find(req.params.id)

    const stack = {
      id: record.id,
      name: record.get('Name') as string,
      type: record.get('Type') as string,
      parentStackId: record.get('Parent Stack ID') as string | undefined,
      order: record.get('Order') as number | undefined,
      color: record.get('Color') as string | undefined,
      isCollapsed: record.get('Is Collapsed') as boolean | undefined,
      ownerId: record.get('Owner ID') as string | undefined,
      boardId: record.get('Board ID') as string | undefined,
    }

    res.json({ success: true, data: stack })
  } catch (error) {
    console.error('Error fetching stack:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch stack' })
  }
})

// POST /api/v1/stacks - Create a new stack
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, type, parentStackId, order, color, isCollapsed, ownerId, boardId } = req.body

    const base = getBase()
    const record = await base('Task Stacks').create({
      'Name': name,
      'Type': type || 'Custom',
      'Parent Stack ID': parentStackId || '',
      'Order': order || 0,
      'Color': color || '',
      'Is Collapsed': isCollapsed || false,
      'Owner ID': ownerId || '',
      'Board ID': boardId || '',
    })

    const stack = {
      id: record.id,
      name: record.get('Name') as string,
      type: record.get('Type') as string,
      parentStackId: record.get('Parent Stack ID') as string | undefined,
      order: record.get('Order') as number | undefined,
      color: record.get('Color') as string | undefined,
      isCollapsed: record.get('Is Collapsed') as boolean | undefined,
      ownerId: record.get('Owner ID') as string | undefined,
      boardId: record.get('Board ID') as string | undefined,
    }

    res.status(201).json({ success: true, data: stack })
  } catch (error) {
    console.error('Error creating stack:', error)
    res.status(500).json({ success: false, error: 'Failed to create stack' })
  }
})

// PATCH /api/v1/stacks/:id - Update a stack
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const updates: Record<string, unknown> = {}

    if (req.body.name !== undefined) updates['Name'] = req.body.name
    if (req.body.type !== undefined) updates['Type'] = req.body.type
    if (req.body.parentStackId !== undefined) updates['Parent Stack ID'] = req.body.parentStackId
    if (req.body.order !== undefined) updates['Order'] = req.body.order
    if (req.body.boardId !== undefined) updates['Board ID'] = req.body.boardId
    if (req.body.color !== undefined) updates['Color'] = req.body.color
    if (req.body.isCollapsed !== undefined) updates['Is Collapsed'] = req.body.isCollapsed
    if (req.body.ownerId !== undefined) updates['Owner ID'] = req.body.ownerId

    const base = getBase()
    const record = await base('Task Stacks').update(req.params.id, { fields: updates as any })

    const stack = {
      id: (record as any).id,
      name: (record as any).get('Name') as string,
      type: (record as any).get('Type') as string,
      parentStackId: (record as any).get('Parent Stack ID') as string | undefined,
      order: (record as any).get('Order') as number | undefined,
      color: (record as any).get('Color') as string | undefined,
      isCollapsed: (record as any).get('Is Collapsed') as boolean | undefined,
      ownerId: (record as any).get('Owner ID') as string | undefined,
      boardId: (record as any).get('Board ID') as string | undefined,
    }

    res.json({ success: true, data: stack })
  } catch (error) {
    console.error('Error updating stack:', error)
    res.status(500).json({ success: false, error: 'Failed to update stack' })
  }
})

// DELETE /api/v1/stacks/:id - Delete a stack
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const base = getBase()
    await base('Task Stacks').destroy(req.params.id)
    res.json({ success: true, message: 'Stack deleted' })
  } catch (error) {
    console.error('Error deleting stack:', error)
    res.status(500).json({ success: false, error: 'Failed to delete stack' })
  }
})

// POST /api/v1/stacks/bulk-update - Update multiple stacks at once (for drag-drop reordering)
router.post('/bulk-update', async (req: Request, res: Response) => {
  try {
    const { updates } = req.body // Array of { id, order, parentStackId }

    if (!Array.isArray(updates)) {
      res.status(400).json({ success: false, error: 'Updates must be an array' })
      return
    }

    // Process in batches of 10 (Airtable limit)
    const BATCH_SIZE = 10
    const results = []

    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const batch = updates.slice(i, i + BATCH_SIZE).map((update: { id: string; order?: number; parentStackId?: string }) => ({
        id: update.id,
        fields: {
          ...(update.order !== undefined && { 'Order': update.order }),
          ...(update.parentStackId !== undefined && { 'Parent Stack ID': update.parentStackId }),
        },
      }))

      const base = getBase()
      const records = await base('Task Stacks').update(batch)
      results.push(...records)
    }

    res.json({ success: true, data: { updated: results.length } })
  } catch (error) {
    console.error('Error bulk updating stacks:', error)
    res.status(500).json({ success: false, error: 'Failed to bulk update stacks' })
  }
})

// POST /api/v1/stacks/assign-task - Assign a task to a stack
router.post('/assign-task', async (req: Request, res: Response) => {
  try {
    const { taskId, stackId, stackOrder } = req.body

    const updates: Record<string, unknown> = {
      'Stack ID': stackId || '',
    }

    if (stackOrder !== undefined) {
      updates['Stack Order'] = stackOrder
    }

    const base = getBase()
    const record = await base('Tasks').update(taskId, updates)

    res.json({
      success: true,
      data: {
        id: (record as any).id,
        stackId: (record as any).get('Stack ID'),
        stackOrder: (record as any).get('Stack Order'),
      },
    })
  } catch (error) {
    console.error('Error assigning task to stack:', error)
    res.status(500).json({ success: false, error: 'Failed to assign task to stack' })
  }
})

// POST /api/v1/stacks/bulk-assign-tasks - Assign multiple tasks to stacks
router.post('/bulk-assign-tasks', async (req: Request, res: Response) => {
  try {
    const { assignments } = req.body // Array of { taskId, stackId, stackOrder }

    if (!Array.isArray(assignments)) {
      res.status(400).json({ success: false, error: 'Assignments must be an array' })
      return
    }

    const BATCH_SIZE = 10
    const results = []

    for (let i = 0; i < assignments.length; i += BATCH_SIZE) {
      const batch = assignments.slice(i, i + BATCH_SIZE).map((assignment: { taskId: string; stackId?: string; stackOrder?: number }) => ({
        id: assignment.taskId,
        fields: {
          'Stack ID': assignment.stackId || '',
          ...(assignment.stackOrder !== undefined && { 'Stack Order': assignment.stackOrder }),
        },
      }))

      const base = getBase()
      const records = await base('Tasks').update(batch)
      results.push(...records)
    }

    res.json({ success: true, data: { updated: results.length } })
  } catch (error) {
    console.error('Error bulk assigning tasks:', error)
    res.status(500).json({ success: false, error: 'Failed to bulk assign tasks' })
  }
})

// POST /api/v1/stacks/auto-generate - Auto-generate stacks from existing task data
router.post('/auto-generate', async (req: Request, res: Response) => {
  try {
    const { type } = req.body // 'assignee' or 'meeting'

    // Get all tasks
    const base = getBase()
    const tasks = await base('Tasks').select().all()

    // Get existing stacks
    const existingStacks = await base('Task Stacks').select().all()
    const existingStackNames = new Set(existingStacks.map(s => s.get('Name')))

    const stacksToCreate: { name: string; type: string }[] = []

    if (type === 'assignee') {
      // Get unique assignees
      const assignees = new Set<string>()
      tasks.forEach(task => {
        const assignee = task.get('Assignee Name') as string
        if (assignee && !existingStackNames.has(assignee)) {
          assignees.add(assignee)
        }
      })
      assignees.forEach(name => stacksToCreate.push({ name, type: 'Assignee' }))
    } else if (type === 'meeting') {
      // Get unique meetings
      const meetings = new Set<string>()
      tasks.forEach(task => {
        const meeting = task.get('Source Meeting Title') as string
        if (meeting && !existingStackNames.has(meeting)) {
          meetings.add(meeting)
        }
      })
      meetings.forEach(name => stacksToCreate.push({ name, type: 'Meeting' }))
    }

    // Create stacks in batches
    const BATCH_SIZE = 10
    const created = []

    for (let i = 0; i < stacksToCreate.length; i += BATCH_SIZE) {
      const batch = stacksToCreate.slice(i, i + BATCH_SIZE).map((stack, idx) => ({
        fields: {
          'Name': stack.name,
          'Type': stack.type,
          'Order': i + idx,
        },
      }))

      const records = await base('Task Stacks').create(batch)
      created.push(...records)
    }

    res.json({
      success: true,
      data: {
        created: created.length,
        stacks: created.map(r => ({
          id: r.id,
          name: r.get('Name'),
          type: r.get('Type'),
        })),
      },
    })
  } catch (error) {
    console.error('Error auto-generating stacks:', error)
    res.status(500).json({ success: false, error: 'Failed to auto-generate stacks' })
  }
})

export default router
