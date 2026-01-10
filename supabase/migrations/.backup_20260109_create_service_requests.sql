-- Migration: Create service_requests table for FIXO backoffice data
-- Date: 2026-01-09

-- Create enum for service request status
CREATE TYPE service_request_status AS ENUM (
  'novo_pedido',
  'atribuir_prestador',
  'prestador_atribuido',
  'em_execucao',
  'concluido',
  'cancelado_cliente',
  'cancelado_backoffice',
  'cancelado_prestador'
);

-- Create enum for payment status
CREATE TYPE payment_status AS ENUM (
  'pending',
  'captured',
  'refunded',
  'failed'
);

-- Create the service_requests table
CREATE TABLE IF NOT EXISTS service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Request identification
  request_code VARCHAR(20) UNIQUE NOT NULL, -- SR116919
  fid_id VARCHAR(20), -- 64/26/000914

  -- User/Client info
  user_id VARCHAR(20),
  client_town VARCHAR(100),
  client_district VARCHAR(100),

  -- Service classification
  cluster_id INTEGER,
  cluster VARCHAR(50), -- Casa
  category_id INTEGER,
  category VARCHAR(100), -- Instalação e reparação
  service_id INTEGER,
  service VARCHAR(200), -- Instalação de candeeiros

  -- Schedule
  scheduled_to TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by VARCHAR(20),
  last_update TIMESTAMP WITH TIME ZONE,
  updated_by VARCHAR(20),

  -- Location
  service_address_line_1 VARCHAR(200),
  service_address_line_2 VARCHAR(200),
  zip_code VARCHAR(20),
  city VARCHAR(100),

  -- Pricing
  cost_estimation DECIMAL(10,2),
  promocode VARCHAR(50),
  promocode_discount DECIMAL(10,2),
  final_cost_estimation DECIMAL(10,2),
  gross_additional_charges DECIMAL(10,2),
  additional_charges_discount DECIMAL(10,2),
  net_additional_charges DECIMAL(10,2),
  net_amount DECIMAL(10,2),
  fees VARCHAR(100),
  fees_amount DECIMAL(10,2),

  -- Payment
  payment_status VARCHAR(50),
  payment_method VARCHAR(50),
  paid_amount DECIMAL(10,2),
  refund_amount DECIMAL(10,2),
  refund_reason TEXT,
  refund_comment TEXT,
  used_wallet BOOLEAN DEFAULT FALSE,

  -- Provider assignment
  assigned_provider_id VARCHAR(20),
  assigned_provider_name VARCHAR(200),
  provider_cost DECIMAL(10,2),
  provider_allocation_manual BOOLEAN DEFAULT FALSE,
  provider_confirmed_timestamp TIMESTAMP WITH TIME ZONE,
  provider_request_notes TEXT,

  -- Technician
  technician_name VARCHAR(200),
  technician_rating DECIMAL(3,1),
  technician_allocation_timestamp TIMESTAMP WITH TIME ZONE,
  technician_allocation_before_service BOOLEAN DEFAULT FALSE,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'Novo pedido',
  status_updated_at TIMESTAMP WITH TIME ZONE,
  status_updated_by VARCHAR(20),
  cancellation_reason TEXT,
  cancellation_comment TEXT,

  -- Ratings
  service_rating DECIMAL(3,1),
  timestamp_rating TIMESTAMP WITH TIME ZONE,
  service_rating_comment TEXT,

  -- Source & metadata
  source VARCHAR(50), -- Web App Desktop, App, Web App Mobile
  recurrence_code VARCHAR(20),
  recurrence_type VARCHAR(50), -- Semanal, Quinzenal
  is_mgm BOOLEAN DEFAULT FALSE,
  is_new_pricing_model BOOLEAN DEFAULT FALSE,
  done_on_mbway_flow BOOLEAN DEFAULT FALSE,
  multiple_providers BOOLEAN DEFAULT FALSE,

  -- Scheduling changes
  reschedule_reason TEXT,
  reschedule_comment TEXT,
  reschedule_bo BOOLEAN DEFAULT FALSE,
  delivery_schedule_providers_app BOOLEAN DEFAULT FALSE,
  scheduled_delivery_date TIMESTAMP WITH TIME ZONE,

  -- Check-in/out
  checkin_providers_app BOOLEAN DEFAULT FALSE,
  checkin_providers_app_timestamp TIMESTAMP WITH TIME ZONE,
  checkout_providers_app BOOLEAN DEFAULT FALSE,
  checkout_providers_app_timestamp TIMESTAMP WITH TIME ZONE,

  -- Provider notes
  providers_conclusion_notes TEXT,
  providers_documents BOOLEAN DEFAULT FALSE,

  -- Contact client
  contact_client_cta BOOLEAN DEFAULT FALSE,
  contact_client_reason TEXT,
  contact_client_timestamp TIMESTAMP WITH TIME ZONE,
  contact_client_calltimes INTEGER,

  -- External references
  hubspot_deal_id VARCHAR(50),
  invoice_process_status VARCHAR(50),

  -- Visits
  number_additional_visits INTEGER DEFAULT 0,
  tasks_count INTEGER DEFAULT 0,

  -- Import metadata
  imported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  raw_data JSONB -- Store full row for reference
);

-- Create indexes for common queries
CREATE INDEX idx_service_requests_request_code ON service_requests(request_code);
CREATE INDEX idx_service_requests_status ON service_requests(status);
CREATE INDEX idx_service_requests_created_at ON service_requests(created_at DESC);
CREATE INDEX idx_service_requests_scheduled_to ON service_requests(scheduled_to);
CREATE INDEX idx_service_requests_assigned_provider_id ON service_requests(assigned_provider_id);
CREATE INDEX idx_service_requests_category ON service_requests(category);
CREATE INDEX idx_service_requests_service ON service_requests(service);
CREATE INDEX idx_service_requests_client_district ON service_requests(client_district);
CREATE INDEX idx_service_requests_fid_id ON service_requests(fid_id);

-- Enable RLS
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read all
CREATE POLICY "Users can view service requests" ON service_requests
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy for authenticated users to insert
CREATE POLICY "Users can insert service requests" ON service_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create policy for authenticated users to update
CREATE POLICY "Users can update service requests" ON service_requests
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE service_requests IS 'Service requests imported from FIXO backoffice export';
