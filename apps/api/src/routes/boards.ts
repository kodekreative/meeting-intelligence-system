import { Router, Request, Response } from 'express'
import Airtable from 'airtable'

const router: Router = Router()

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY!
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!

const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID)

// GET /api/v1/boards - List all boards
router.get('/', async (req: Request, res: Response) => {
  try {
    const records = await base('Task Boards').select({
      sort: [{ field: 'Order', direction: 'asc' }],
    }).all()

    const boards = records.map((record) => ({
      id: record.id,
      name: record.get('Name') as string,
      description: record.get('Description') as string | undefined,
      order: record.get('Order') as number | undefined,
      ownerId: record.get('Owner ID') as string | undefined,
      isDefault: record.get('Is Default') as boolean | undefined,
    }))

    res.json({ success: true, data: boards })
  } catch (error) {
    console.error('Error fetching boards:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch boards' })
  }
})

// GET /api/v1/boards/:id - Get single board
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const record = await base('Task Boards').find(req.params.id)

    const board = {
      id: record.id,
      name: record.get('Name') as string,
      description: record.get('Description') as string | undefined,
      order: record.get('Order') as number | undefined,
      ownerId: record.get('Owner ID') as string | undefined,
      isDefault: record.get('Is Default') as boolean | undefined,
    }

    res.json({ success: true, data: board })
  } catch (error) {
    console.error('Error fetching board:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch board' })
  }
})

// POST /api/v1/boards - Create a new board
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, description, order, ownerId, isDefault } = req.body

    // If this is set as default, unset other defaults first
    if (isDefault) {
      const existingDefaults = await base('Task Boards').select({
        filterByFormula: '{Is Default} = TRUE()',
      }).all()

      for (const record of existingDefaults) {
        await base('Task Boards').update(record.id, { 'Is Default': false })
      }
    }

    const record = await base('Task Boards').create({
      'Name': name,
      'Description': description || '',
      'Order': order || 0,
      'Owner ID': ownerId || '',
      'Is Default': isDefault || false,
    })

    const board = {
      id: record.id,
      name: record.get('Name') as string,
      description: record.get('Description') as string | undefined,
      order: record.get('Order') as number | undefined,
      ownerId: record.get('Owner ID') as string | undefined,
      isDefault: record.get('Is Default') as boolean | undefined,
    }

    res.status(201).json({ success: true, data: board })
  } catch (error) {
    console.error('Error creating board:', error)
    res.status(500).json({ success: false, error: 'Failed to create board' })
  }
})

// PATCH /api/v1/boards/:id - Update a board
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const updates: Record<string, unknown> = {}

    if (req.body.name !== undefined) updates['Name'] = req.body.name
    if (req.body.description !== undefined) updates['Description'] = req.body.description
    if (req.body.order !== undefined) updates['Order'] = req.body.order
    if (req.body.ownerId !== undefined) updates['Owner ID'] = req.body.ownerId

    // Handle isDefault - unset others if setting this one
    if (req.body.isDefault === true) {
      const existingDefaults = await base('Task Boards').select({
        filterByFormula: '{Is Default} = TRUE()',
      }).all()

      for (const record of existingDefaults) {
        if (record.id !== req.params.id) {
          await base('Task Boards').update(record.id, { 'Is Default': false })
        }
      }
      updates['Is Default'] = true
    } else if (req.body.isDefault === false) {
      updates['Is Default'] = false
    }

    const record = await base('Task Boards').update(req.params.id, { fields: updates as any })

    const board = {
      id: record.id,
      name: (record as any).get('Name') as string,
      description: (record as any).get('Description') as string | undefined,
      order: (record as any).get('Order') as number | undefined,
      ownerId: (record as any).get('Owner ID') as string | undefined,
      isDefault: (record as any).get('Is Default') as boolean | undefined,
    }

    res.json({ success: true, data: board })
  } catch (error) {
    console.error('Error updating board:', error)
    res.status(500).json({ success: false, error: 'Failed to update board' })
  }
})

// DELETE /api/v1/boards/:id - Delete a board
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const boardId = req.params.id

    // First, unassign all lists from this board
    const listsInBoard = await base('Task Stacks').select({
      filterByFormula: `{Board ID} = "${boardId}"`,
    }).all()

    // Update lists to remove board association
    const BATCH_SIZE = 10
    for (let i = 0; i < listsInBoard.length; i += BATCH_SIZE) {
      const batch = listsInBoard.slice(i, i + BATCH_SIZE).map(record => ({
        id: record.id,
        fields: { 'Board ID': '' },
      }))
      await base('Task Stacks').update(batch)
    }

    // Delete the board
    await base('Task Boards').destroy(boardId)

    res.json({ success: true, message: 'Board deleted' })
  } catch (error) {
    console.error('Error deleting board:', error)
    res.status(500).json({ success: false, error: 'Failed to delete board' })
  }
})

// GET /api/v1/boards/:id/lists - Get lists for a specific board
router.get('/:id/lists', async (req: Request, res: Response) => {
  try {
    const boardId = req.params.id

    const records = await base('Task Stacks').select({
      filterByFormula: `{Board ID} = "${boardId}"`,
      sort: [{ field: 'Order', direction: 'asc' }],
    }).all()

    const lists = records.map((record) => ({
      id: record.id,
      name: record.get('Name') as string,
      type: record.get('Type') as string,
      boardId: record.get('Board ID') as string | undefined,
      order: record.get('Order') as number | undefined,
      color: record.get('Color') as string | undefined,
      isCollapsed: record.get('Is Collapsed') as boolean | undefined,
    }))

    res.json({ success: true, data: lists })
  } catch (error) {
    console.error('Error fetching board lists:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch board lists' })
  }
})

export default router
