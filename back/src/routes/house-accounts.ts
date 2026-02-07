import { Router } from 'express';
import { z } from 'zod';
import { houseAccountService } from '../services/houseAccountService';

const router = Router();

const queryBoolean = z.preprocess((value) => {
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  if (typeof value === 'boolean') {
    return value;
  }
  return false;
}, z.boolean());

const listQuerySchema = z.object({
  hasBalance: queryBoolean.default(false),
});

const detailQuerySchema = z.object({
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
});

const statementQuerySchema = z.object({
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
});

const customerIdParamSchema = z.object({
  customerId: z.string().trim().min(1),
});

const updateSettingsSchema = z
  .object({
    terms: z.string().trim().min(1).optional(),
    notes: z.string().trim().optional().nullable(),
  })
  .refine((payload) => payload.terms !== undefined || payload.notes !== undefined, {
    message: 'Provide terms or notes',
  });

const paymentSchema = z.object({
  amount: z.preprocess((value) => Number(value), z.number().int()),
  reference: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  employeeId: z.string().optional(),
});

const adjustmentSchema = z.object({
  amount: z.preprocess((value) => Number(value), z.number().int()),
  description: z.string().trim().min(1),
  employeeId: z.string().optional(),
});

const handleError = (res: any, error: unknown, fallback: string) => {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ error: error.errors[0]?.message || 'Invalid request data' });
  }

  if (error instanceof Error && error.message === 'Customer not found') {
    return res.status(404).json({ error: 'Customer not found' });
  }

  console.error(fallback, error);
  return res.status(500).json({ error: fallback });
};

router.get('/', async (req, res) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const accounts = await houseAccountService.listAccounts(query.hasBalance);
    res.json({ accounts });
  } catch (error) {
    handleError(res, error, 'Failed to load house accounts');
  }
});

router.get('/:customerId', async (req, res) => {
  try {
    const params = customerIdParamSchema.parse(req.params);
    const query = detailQuerySchema.parse(req.query);
    const detail = await houseAccountService.getAccountDetail(params.customerId, {
      from: query.from,
      to: query.to,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 25,
    });
    res.json(detail);
  } catch (error) {
    handleError(res, error, 'Failed to load house account');
  }
});

router.put('/:customerId', async (req, res) => {
  try {
    const params = customerIdParamSchema.parse(req.params);
    const payload = updateSettingsSchema.parse(req.body ?? {});
    const updated = await houseAccountService.updateSettings(params.customerId, payload);

    res.json({
      terms: updated.houseAccountTerms || 'NET_30',
      notes: updated.houseAccountNotes || '',
      isHouseAccount: updated.isHouseAccount,
    });
  } catch (error) {
    handleError(res, error, 'Failed to update house account settings');
  }
});

router.post('/:customerId/enable', async (req, res) => {
  try {
    const params = customerIdParamSchema.parse(req.params);
    const updated = await houseAccountService.enableAccount(params.customerId);
    res.json(updated);
  } catch (error) {
    handleError(res, error, 'Failed to enable house account');
  }
});

router.post('/:customerId/disable', async (req, res) => {
  try {
    const params = customerIdParamSchema.parse(req.params);
    const updated = await houseAccountService.disableAccount(params.customerId);
    res.json(updated);
  } catch (error) {
    handleError(res, error, 'Failed to disable house account');
  }
});

router.post('/:customerId/payments', async (req, res) => {
  try {
    const params = customerIdParamSchema.parse(req.params);
    const payload = paymentSchema.parse(req.body ?? {});

    if (!payload.amount || payload.amount <= 0) {
      return res.status(400).json({ error: 'Payment amount must be greater than zero' });
    }

    const entry = await houseAccountService.applyPayment({
      customerId: params.customerId,
      amount: payload.amount,
      reference: payload.reference,
      notes: payload.notes,
      employeeId: payload.employeeId,
    });

    res.json({ entry });
  } catch (error) {
    handleError(res, error, 'Failed to apply house account payment');
  }
});

router.post('/:customerId/adjustments', async (req, res) => {
  try {
    const params = customerIdParamSchema.parse(req.params);
    const payload = adjustmentSchema.parse(req.body ?? {});

    if (!payload.amount) {
      return res.status(400).json({ error: 'Adjustment amount must be non-zero' });
    }

    const entry = await houseAccountService.addAdjustment({
      customerId: params.customerId,
      amount: payload.amount,
      description: payload.description,
      employeeId: payload.employeeId,
    });

    res.json({ entry });
  } catch (error) {
    handleError(res, error, 'Failed to add house account adjustment');
  }
});

router.get('/:customerId/statement', async (req, res) => {
  try {
    const params = customerIdParamSchema.parse(req.params);
    const query = statementQuerySchema.parse(req.query);
    const statement = await houseAccountService.generateStatement({
      customerId: params.customerId,
      from: query.from,
      to: query.to,
    });
    res.json(statement);
  } catch (error) {
    handleError(res, error, 'Failed to generate house account statement');
  }
});

export default router;
