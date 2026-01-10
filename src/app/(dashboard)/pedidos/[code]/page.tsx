import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Euro,
  User,
  Clock,
  CreditCard,
  Star,
  FileText,
  CheckCircle,
  XCircle,
  Hash,
  Wrench,
  Receipt,
  AlertTriangle,
  CircleDot,
  Tag,
  Phone,
  Mail,
  Building2,
  ClipboardList,
  Banknote,
  MessageSquare,
} from 'lucide-react'
import { getServiceRequest } from '@/lib/service-requests/actions'

type Params = Promise<{ code: string }>

function getStatusConfig(status: string) {
  if (status === 'Novo pedido') return { variant: 'warning' as const, icon: CircleDot }
  if (status === 'Atribuir prestador') return { variant: 'info' as const, icon: User }
  if (status === 'Prestador atribuido') return { variant: 'info' as const, icon: User }
  if (status === 'Concluido') return { variant: 'success' as const, icon: CheckCircle }
  if (status?.includes('Cancelado')) return { variant: 'destructive' as const, icon: XCircle }
  return { variant: 'secondary' as const, icon: CircleDot }
}

function getPaymentStatusVariant(status: string | null) {
  if (!status) return 'secondary' as const
  if (status.toLowerCase().includes('pago') || status.toLowerCase().includes('paid')) return 'success' as const
  if (status.toLowerCase().includes('pendente') || status.toLowerCase().includes('pending')) return 'warning' as const
  if (status.toLowerCase().includes('falha') || status.toLowerCase().includes('fail')) return 'destructive' as const
  return 'secondary' as const
}

function formatDate(date: string | null, includeTime = true) {
  if (!date) return null
  const options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }
  if (includeTime) {
    options.hour = '2-digit'
    options.minute = '2-digit'
  }
  return new Date(date).toLocaleDateString('pt-PT', options)
}

function formatCurrency(value: number | null) {
  if (value === null || value === undefined) return null
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

function InfoItem({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  if (!value) return null
  return (
    <div className={className}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-medium block">{value}</span>
    </div>
  )
}

function TimelineItem({
  label,
  date,
  icon: Icon,
  isLast = false,
  status = 'completed'
}: {
  label: string
  date: string | null
  icon: React.ElementType
  isLast?: boolean
  status?: 'completed' | 'pending' | 'current'
}) {
  if (!date && status !== 'pending') return null

  const statusStyles = {
    completed: 'bg-green-100 dark:bg-green-950 text-green-600',
    current: 'bg-blue-100 dark:bg-blue-950 text-blue-600 ring-2 ring-blue-200',
    pending: 'bg-muted text-muted-foreground',
  }

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`p-2 rounded-full ${statusStyles[status]}`}>
          <Icon className="h-4 w-4" />
        </div>
        {!isLast && (
          <div className={`w-0.5 flex-1 my-1 ${status === 'pending' ? 'bg-muted' : 'bg-green-200 dark:bg-green-900'}`} />
        )}
      </div>
      <div className="pb-4">
        <span className="font-medium block">{label}</span>
        <span className="text-sm text-muted-foreground">
          {date ? formatDate(date) : 'Pendente'}
        </span>
      </div>
    </div>
  )
}

export default async function PedidoDetailPage({ params }: { params: Params }) {
  const { code } = await params
  const pedido = await getServiceRequest(code)

  if (!pedido) {
    notFound()
  }

  const statusConfig = getStatusConfig(pedido.status)
  const StatusIcon = statusConfig.icon
  const isCancelled = pedido.status?.includes('Cancelado')
  const isCompleted = pedido.status === 'Concluido'

  return (
    <div className="flex flex-col h-full">
      <Header
        title={`Pedido ${pedido.request_code}`}
        description={pedido.service || 'Detalhe do pedido'}
        backButton={
          <Link href="/pedidos">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
        }
      />

      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Banner Card - Inspired by Provider Page */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-start gap-6">
              {/* Left: Service Info */}
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
                  <Wrench className="h-8 w-8 text-primary" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h2 className="text-xl font-bold truncate">{pedido.service}</h2>
                    <Badge variant={statusConfig.variant}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {pedido.status}
                    </Badge>
                  </div>

                  <p className="text-sm text-muted-foreground mb-3">
                    {pedido.cluster} • {pedido.category}
                    {pedido.fid_id && ` • FID: ${pedido.fid_id}`}
                  </p>

                  {/* Contact/Location Info */}
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {pedido.city || pedido.client_district || 'Sem localização'}
                    </span>
                    {pedido.zip_code && (
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Hash className="h-4 w-4" />
                        {pedido.zip_code}
                      </span>
                    )}
                    {pedido.source && (
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Tag className="h-4 w-4" />
                        {pedido.source}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Price & Schedule */}
              <div className="flex items-center gap-4 lg:border-l lg:pl-6">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Euro className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <span className="text-2xl font-bold block">
                    {formatCurrency(pedido.final_cost_estimation) || formatCurrency(pedido.cost_estimation) || '-'}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {pedido.payment_status || 'Sem info pagamento'}
                  </span>
                </div>
              </div>
            </div>

            {/* Meta Info Bar */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-4 pt-4 border-t text-sm">
              {pedido.scheduled_to && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Agendado:</span>
                  <Badge variant="outline">
                    <Calendar className="h-3 w-3 mr-1" />
                    {formatDate(pedido.scheduled_to)}
                  </Badge>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Prestador:</span>
                <span className="font-medium">
                  {pedido.assigned_provider_name || 'Não atribuído'}
                </span>
              </div>
              {pedido.created_at && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Criado:</span>
                  <span>{formatDate(pedido.created_at)}</span>
                </div>
              )}
              {pedido.promocode && (
                <Badge variant="secondary">
                  <Tag className="h-3 w-3 mr-1" />
                  {pedido.promocode}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="detalhes" className="space-y-4">
          <TabsList>
            <TabsTrigger value="detalhes">
              <ClipboardList className="h-4 w-4 mr-2" />
              Detalhes
            </TabsTrigger>
            <TabsTrigger value="pagamento">
              <Banknote className="h-4 w-4 mr-2" />
              Pagamento
            </TabsTrigger>
            <TabsTrigger value="timeline">
              <Clock className="h-4 w-4 mr-2" />
              Timeline
            </TabsTrigger>
            {(pedido.service_rating || pedido.technician_rating || pedido.provider_request_notes || pedido.providers_conclusion_notes) && (
              <TabsTrigger value="feedback">
                <MessageSquare className="h-4 w-4 mr-2" />
                Feedback
              </TabsTrigger>
            )}
          </TabsList>

          {/* Detalhes Tab */}
          <TabsContent value="detalhes" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Location Card */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold">Localização</h3>
                  </div>

                  <div className="space-y-3">
                    <InfoItem
                      label="Morada"
                      value={
                        <>
                          {pedido.service_address_line_1}
                          {pedido.service_address_line_2 && (
                            <span className="text-muted-foreground block text-sm">{pedido.service_address_line_2}</span>
                          )}
                        </>
                      }
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <InfoItem label="Código Postal" value={pedido.zip_code} />
                      <InfoItem label="Cidade" value={pedido.city} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <InfoItem label="Localidade" value={pedido.client_town} />
                      <InfoItem label="Distrito" value={pedido.client_district} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Provider Card */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-950 flex items-center justify-center">
                      <User className="h-5 w-5 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold">Prestador</h3>
                  </div>

                  {pedido.assigned_provider_name ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-lg font-bold">
                          {pedido.assigned_provider_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-semibold block">{pedido.assigned_provider_name}</span>
                          <span className="text-sm text-muted-foreground">ID: {pedido.assigned_provider_id}</span>
                        </div>
                      </div>

                      {pedido.technician_name && (
                        <InfoItem label="Técnico" value={pedido.technician_name} />
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 rounded-lg bg-muted/50 text-center">
                          <span className="text-xs text-muted-foreground block">Atribuição</span>
                          <span className="font-semibold">
                            {pedido.provider_allocation_manual ? 'Manual' : 'Automática'}
                          </span>
                        </div>
                        {pedido.provider_confirmed_timestamp && (
                          <div className="p-3 rounded-lg bg-muted/50 text-center">
                            <span className="text-xs text-muted-foreground block">Confirmado</span>
                            <span className="font-semibold">{formatDate(pedido.provider_confirmed_timestamp, false)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                        <User className="h-6 w-6" />
                      </div>
                      <span className="font-medium">Prestador não atribuído</span>
                      <span className="text-sm">A aguardar atribuição</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Service Details Card */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-lg bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center">
                      <Wrench className="h-5 w-5 text-indigo-600" />
                    </div>
                    <h3 className="text-lg font-semibold">Serviço</h3>
                  </div>

                  <div className="space-y-3">
                    <InfoItem label="Cluster" value={pedido.cluster} />
                    <InfoItem label="Categoria" value={pedido.category} />
                    <InfoItem label="Serviço" value={pedido.service} />
                    <InfoItem label="Fonte" value={pedido.source} />
                    {pedido.recurrence_type && (
                      <InfoItem label="Recorrência" value={pedido.recurrence_type} />
                    )}
                    {pedido.hubspot_deal_id && (
                      <InfoItem label="HubSpot Deal" value={pedido.hubspot_deal_id} />
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* IDs Card */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <Hash className="h-5 w-5 text-gray-600" />
                    </div>
                    <h3 className="text-lg font-semibold">Identificadores</h3>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <span className="text-xs text-muted-foreground block">Request Code</span>
                      <span className="font-mono font-medium">{pedido.request_code}</span>
                    </div>
                    {pedido.fid_id && (
                      <div className="p-3 rounded-lg bg-muted/50">
                        <span className="text-xs text-muted-foreground block">FID ID</span>
                        <span className="font-mono font-medium">{pedido.fid_id}</span>
                      </div>
                    )}
                    {pedido.user_id && (
                      <div className="p-3 rounded-lg bg-muted/50">
                        <span className="text-xs text-muted-foreground block">User ID</span>
                        <span className="font-mono font-medium">{pedido.user_id}</span>
                      </div>
                    )}
                    {pedido.recurrence_code && (
                      <div className="p-3 rounded-lg bg-muted/50">
                        <span className="text-xs text-muted-foreground block">Recurrence Code</span>
                        <span className="font-mono font-medium">{pedido.recurrence_code}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Cancellation Card */}
            {isCancelled && (
              <Card className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-lg bg-red-100 dark:bg-red-950 flex items-center justify-center">
                      <XCircle className="h-5 w-5 text-red-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-red-700 dark:text-red-400">Pedido Cancelado</h3>
                  </div>

                  <div className="space-y-3">
                    {pedido.cancellation_reason && (
                      <InfoItem label="Motivo" value={pedido.cancellation_reason} />
                    )}
                    {pedido.cancellation_comment && (
                      <InfoItem label="Comentário" value={pedido.cancellation_comment} />
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Pagamento Tab */}
          <TabsContent value="pagamento" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Price Breakdown */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-950 flex items-center justify-center">
                      <Receipt className="h-5 w-5 text-amber-600" />
                    </div>
                    <h3 className="text-lg font-semibold">Breakdown de Preços</h3>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2">
                      <span className="text-muted-foreground">Estimativa inicial</span>
                      <span className="font-medium">{formatCurrency(pedido.cost_estimation) || '-'}</span>
                    </div>

                    {pedido.promocode && (
                      <div className="flex justify-between items-center py-2 text-green-600">
                        <span className="flex items-center gap-2">
                          <Tag className="h-4 w-4" />
                          Promocode ({pedido.promocode})
                        </span>
                        <span>-{formatCurrency(pedido.promocode_discount)}</span>
                      </div>
                    )}

                    {pedido.gross_additional_charges !== null && pedido.gross_additional_charges > 0 && (
                      <div className="flex justify-between items-center py-2">
                        <span className="text-muted-foreground">Custos adicionais</span>
                        <span>{formatCurrency(pedido.gross_additional_charges)}</span>
                      </div>
                    )}

                    {pedido.fees_amount && (
                      <div className="flex justify-between items-center py-2">
                        <span className="text-muted-foreground">{pedido.fees || 'Taxas'}</span>
                        <span>{formatCurrency(pedido.fees_amount)}</span>
                      </div>
                    )}

                    <div className="border-t pt-3 flex justify-between items-center">
                      <span className="font-semibold">Valor Final</span>
                      <span className="text-xl font-bold text-primary">
                        {formatCurrency(pedido.final_cost_estimation) || '-'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Status */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                      <CreditCard className="h-5 w-5 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold">Estado do Pagamento</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border text-center">
                      <span className="text-xs text-muted-foreground block mb-2">Estado</span>
                      <Badge variant={getPaymentStatusVariant(pedido.payment_status)}>
                        {pedido.payment_status || 'N/A'}
                      </Badge>
                    </div>
                    <div className="p-4 rounded-lg border text-center">
                      <span className="text-xs text-muted-foreground block mb-2">Método</span>
                      <span className="font-medium">{pedido.payment_method || '-'}</span>
                    </div>
                    <div className="p-4 rounded-lg border text-center">
                      <span className="text-xs text-muted-foreground block mb-2">Valor Pago</span>
                      <span className="font-medium text-green-600">{formatCurrency(pedido.paid_amount) || '-'}</span>
                    </div>
                    <div className="p-4 rounded-lg border text-center">
                      <span className="text-xs text-muted-foreground block mb-2">Valor Líquido</span>
                      <span className="font-medium">{formatCurrency(pedido.net_amount) || '-'}</span>
                    </div>
                  </div>

                  {pedido.provider_cost && (
                    <div className="mt-4 p-4 rounded-lg bg-muted/50">
                      <span className="text-xs text-muted-foreground block mb-1">Custo do Prestador</span>
                      <span className="text-lg font-semibold">{formatCurrency(pedido.provider_cost)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Refund Info */}
              {pedido.refund_amount && pedido.refund_amount > 0 && (
                <Card className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 lg:col-span-2">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-10 w-10 rounded-lg bg-red-100 dark:bg-red-950 flex items-center justify-center">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-red-700 dark:text-red-400">Reembolso</h3>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <span className="text-sm text-muted-foreground block">Valor</span>
                        <span className="font-semibold text-red-600">{formatCurrency(pedido.refund_amount)}</span>
                      </div>
                      {pedido.refund_reason && (
                        <div>
                          <span className="text-sm text-muted-foreground block">Motivo</span>
                          <span className="font-medium">{pedido.refund_reason}</span>
                        </div>
                      )}
                      {pedido.refund_comment && (
                        <div className="col-span-2">
                          <span className="text-sm text-muted-foreground block">Comentário</span>
                          <span className="text-sm">{pedido.refund_comment}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-950 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold">Timeline do Pedido</h3>
                </div>

                <div className="max-w-md">
                  <TimelineItem
                    label="Pedido criado"
                    date={pedido.created_at}
                    icon={FileText}
                  />
                  <TimelineItem
                    label="Prestador atribuído"
                    date={pedido.provider_confirmed_timestamp}
                    icon={User}
                    status={pedido.provider_confirmed_timestamp ? 'completed' : 'pending'}
                  />
                  {pedido.checkin_providers_app && (
                    <TimelineItem
                      label="Check-in"
                      date={pedido.checkin_providers_app_timestamp}
                      icon={CircleDot}
                    />
                  )}
                  {pedido.checkout_providers_app && (
                    <TimelineItem
                      label="Check-out"
                      date={pedido.checkout_providers_app_timestamp}
                      icon={CheckCircle}
                    />
                  )}
                  <TimelineItem
                    label={isCancelled ? 'Cancelado' : isCompleted ? 'Concluído' : 'Conclusão'}
                    date={pedido.status_updated_at}
                    icon={isCancelled ? XCircle : CheckCircle}
                    isLast
                    status={isCompleted || isCancelled ? 'completed' : 'pending'}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Feedback Tab */}
          {(pedido.service_rating || pedido.technician_rating || pedido.provider_request_notes || pedido.providers_conclusion_notes) && (
            <TabsContent value="feedback" className="space-y-4">
              {/* Ratings */}
              {(pedido.service_rating || pedido.technician_rating) && (
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="h-10 w-10 rounded-lg bg-yellow-100 dark:bg-yellow-950 flex items-center justify-center">
                        <Star className="h-5 w-5 text-yellow-600" />
                      </div>
                      <h3 className="text-lg font-semibold">Avaliações</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {pedido.service_rating && (
                        <div className="text-center p-6 rounded-xl bg-muted/50">
                          <div className="flex justify-center mb-3">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-8 w-8 ${
                                  star <= pedido.service_rating!
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-200'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-3xl font-bold block">{pedido.service_rating}</span>
                          <span className="text-muted-foreground">Rating do Serviço</span>
                        </div>
                      )}
                      {pedido.technician_rating && (
                        <div className="text-center p-6 rounded-xl bg-muted/50">
                          <div className="flex justify-center mb-3">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-8 w-8 ${
                                  star <= pedido.technician_rating!
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-200'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-3xl font-bold block">{pedido.technician_rating}</span>
                          <span className="text-muted-foreground">Rating do Técnico</span>
                        </div>
                      )}
                    </div>

                    {pedido.service_rating_comment && (
                      <div className="mt-6 p-4 rounded-lg bg-muted/50">
                        <span className="text-sm text-muted-foreground block mb-2">Comentário do cliente</span>
                        <p className="italic">&ldquo;{pedido.service_rating_comment}&rdquo;</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Notes */}
              {(pedido.provider_request_notes || pedido.providers_conclusion_notes) && (
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="h-10 w-10 rounded-lg bg-orange-100 dark:bg-orange-950 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-orange-600" />
                      </div>
                      <h3 className="text-lg font-semibold">Notas</h3>
                    </div>

                    <div className="space-y-4">
                      {pedido.provider_request_notes && (
                        <div>
                          <span className="text-sm text-muted-foreground block mb-2">Notas do Pedido</span>
                          <div className="p-4 rounded-lg bg-muted/50">
                            {pedido.provider_request_notes}
                          </div>
                        </div>
                      )}
                      {pedido.providers_conclusion_notes && (
                        <div>
                          <span className="text-sm text-muted-foreground block mb-2">Notas de Conclusão</span>
                          <div className="p-4 rounded-lg bg-muted/50">
                            {pedido.providers_conclusion_notes}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  )
}
