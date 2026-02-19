
-- =============================================
-- PHASE 6: Purchase Order Workflow
-- =============================================

-- Purchase Orders table
CREATE TABLE public.purchase_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requirement_id UUID REFERENCES public.daily_inventory_requirements(id),
  vendor_name TEXT NOT NULL,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_by UUID NOT NULL,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  received_by UUID,
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage purchase orders"
  ON public.purchase_orders FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Chefs can view purchase orders"
  ON public.purchase_orders FOR SELECT
  USING (has_role(auth.uid(), 'chef'::app_role));

-- Purchase Order Items table
CREATE TABLE public.purchase_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  inventory_id UUID NOT NULL REFERENCES public.inventory(id),
  ordered_quantity NUMERIC NOT NULL DEFAULT 0,
  received_quantity NUMERIC NOT NULL DEFAULT 0,
  unit_cost NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage PO items"
  ON public.purchase_order_items FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Chefs can view PO items"
  ON public.purchase_order_items FOR SELECT
  USING (has_role(auth.uid(), 'chef'::app_role));

-- RPC: Receive PO → auto-create inventory ledger entries for stock-in
CREATE OR REPLACE FUNCTION public.receive_purchase_order(p_po_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_po RECORD;
  v_item RECORD;
BEGIN
  SELECT * INTO v_po FROM purchase_orders WHERE id = p_po_id;
  IF v_po IS NULL THEN RAISE EXCEPTION 'Purchase order not found'; END IF;
  IF v_po.status != 'approved' THEN RAISE EXCEPTION 'PO must be approved before receiving'; END IF;

  -- Mark PO as received
  UPDATE purchase_orders
  SET status = 'received', received_by = auth.uid(), received_at = now(), updated_at = now()
  WHERE id = p_po_id;

  -- Create inventory ledger entries for each item
  FOR v_item IN SELECT * FROM purchase_order_items WHERE purchase_order_id = p_po_id LOOP
    INSERT INTO inventory_ledger (inventory_id, movement_type, quantity, reference_type, reference_id, notes, performed_by)
    VALUES (
      v_item.inventory_id,
      'stock_in',
      v_item.received_quantity,
      'purchase_order',
      p_po_id,
      'Stock-in from PO',
      auth.uid()
    );
  END LOOP;
END;
$$;

-- =============================================
-- PHASE 10: System Health & Integrity
-- =============================================

-- Unique index to prevent duplicate payment schedule webhooks
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_schedules_razorpay_unique
  ON public.payment_schedules(payment_id)
  WHERE payment_id IS NOT NULL;

-- Concurrency-safe recipe slot booking with row lock
CREATE OR REPLACE FUNCTION public.book_recipe_slot_safe(
  p_student_id UUID,
  p_recipe_batch_id UUID,
  p_booking_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch RECORD;
  v_current_count INT;
BEGIN
  -- Lock the batch row to prevent race conditions
  SELECT * INTO v_batch
  FROM recipe_batches
  WHERE id = p_recipe_batch_id
  FOR UPDATE;

  IF v_batch IS NULL THEN RAISE EXCEPTION 'Batch not found'; END IF;
  IF v_batch.status != 'scheduled' THEN RAISE EXCEPTION 'Batch is not open for booking'; END IF;

  SELECT COUNT(*) INTO v_current_count
  FROM recipe_batch_memberships
  WHERE recipe_batch_id = p_recipe_batch_id;

  IF v_current_count >= v_batch.capacity THEN
    RAISE EXCEPTION 'Batch is full';
  END IF;

  INSERT INTO recipe_batch_memberships (recipe_batch_id, student_id, booking_id)
  VALUES (p_recipe_batch_id, p_student_id, p_booking_id);
END;
$$;
