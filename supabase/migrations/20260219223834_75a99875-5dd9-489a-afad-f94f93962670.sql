
-- ==========================================
-- PHASE 1: Inventory Ledger (Append-Only)
-- ==========================================

CREATE TABLE public.inventory_ledger (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_id uuid NOT NULL REFERENCES public.inventory(id),
  movement_type text NOT NULL CHECK (movement_type IN ('stock_in', 'deduction', 'adjustment', 'wastage', 'return')),
  quantity numeric NOT NULL,
  reference_type text CHECK (reference_type IN ('batch_confirmation', 'manual_adjustment', 'purchase', 'wastage_report', 'return')),
  reference_id uuid,
  notes text,
  performed_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_ledger ENABLE ROW LEVEL SECURITY;

-- Admins and Super Admins can INSERT
CREATE POLICY "Admins can insert inventory ledger entries"
  ON public.inventory_ledger FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Admins and Super Admins can SELECT
CREATE POLICY "Admins can view inventory ledger"
  ON public.inventory_ledger FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Chefs can view ledger (read-only for transparency)
CREATE POLICY "Chefs can view inventory ledger"
  ON public.inventory_ledger FOR SELECT
  USING (has_role(auth.uid(), 'chef'::app_role));

-- NO UPDATE or DELETE policies — append-only

-- Trigger: Recalculate inventory.current_stock from ledger
CREATE OR REPLACE FUNCTION public.recalc_inventory_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.inventory
  SET current_stock = COALESCE((
    SELECT SUM(
      CASE 
        WHEN movement_type IN ('stock_in', 'return', 'adjustment') THEN quantity
        WHEN movement_type IN ('deduction', 'wastage') THEN -quantity
        ELSE 0
      END
    )
    FROM public.inventory_ledger
    WHERE inventory_id = NEW.inventory_id
  ), 0),
  updated_at = now()
  WHERE id = NEW.inventory_id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_recalc_inventory_stock
AFTER INSERT ON public.inventory_ledger
FOR EACH ROW
EXECUTE FUNCTION public.recalc_inventory_stock();

-- ==========================================
-- PHASE 2: Financial Ledger (Append-Only)
-- ==========================================

CREATE TABLE public.financial_ledger (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES public.profiles(id),
  enrollment_id uuid REFERENCES public.enrollments(id),
  entry_type text NOT NULL CHECK (entry_type IN ('payment', 'refund', 'adjustment', 'write_off')),
  amount numeric NOT NULL,
  reference_id uuid,
  notes text,
  performed_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_ledger ENABLE ROW LEVEL SECURITY;

-- Super Admins can INSERT and SELECT
CREATE POLICY "Super admins can insert financial ledger entries"
  ON public.financial_ledger FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can view financial ledger"
  ON public.financial_ledger FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Admins can view
CREATE POLICY "Admins can view financial ledger"
  ON public.financial_ledger FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Students can view own entries
CREATE POLICY "Students can view own financial entries"
  ON public.financial_ledger FOR SELECT
  USING (auth.uid() = student_id);

-- NO UPDATE or DELETE policies — append-only

-- ==========================================
-- PHASE 10 (partial): Fee Snapshot + Recipe Version
-- ==========================================

-- Add fee_snapshot to enrollments
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS fee_snapshot numeric;

-- Add version to recipes
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

-- Enable realtime on notifications for Phase 4
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
