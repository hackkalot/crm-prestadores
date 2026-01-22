'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import {
  Plus,
  Pencil,
  Trash2,
  Copy,
  Eye,
  Mail,
} from 'lucide-react'
import {
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  toggleEmailTemplateActive,
} from '@/lib/email-templates/actions'
import type { EmailTemplateWithCreator } from '@/lib/email-templates/actions'

interface EmailTemplatesSettingsProps {
  templates: EmailTemplateWithCreator[]
}

interface FormData {
  key: string
  name: string
  description: string
  subject: string
  body: string
  variables: string[]
  is_active: boolean
}

const defaultFormData: FormData = {
  key: '',
  name: '',
  description: '',
  subject: '',
  body: '',
  variables: [],
  is_active: true,
}

export function EmailTemplatesSettings({ templates: initialTemplates }: EmailTemplatesSettingsProps) {
  const [templates, setTemplates] = useState(initialTemplates)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplateWithCreator | null>(null)
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null)
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplateWithCreator | null>(null)
  const [formData, setFormData] = useState<FormData>(defaultFormData)
  const [newVariable, setNewVariable] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleOpenCreate = () => {
    setEditingTemplate(null)
    setFormData(defaultFormData)
    setIsDialogOpen(true)
  }

  const handleOpenEdit = (template: EmailTemplateWithCreator) => {
    setEditingTemplate(template)
    setFormData({
      key: template.key,
      name: template.name,
      description: template.description || '',
      subject: template.subject,
      body: template.body,
      variables: (template.variables as string[]) || [],
      is_active: template.is_active ?? true,
    })
    setIsDialogOpen(true)
  }

  const handleOpenPreview = (template: EmailTemplateWithCreator) => {
    setPreviewTemplate(template)
    setIsPreviewDialogOpen(true)
  }

  const handleOpenDelete = (id: string) => {
    setDeletingTemplateId(id)
    setIsDeleteDialogOpen(true)
  }

  const handleAddVariable = () => {
    if (newVariable.trim() && !formData.variables.includes(newVariable.trim())) {
      setFormData({
        ...formData,
        variables: [...formData.variables, newVariable.trim()],
      })
      setNewVariable('')
    }
  }

  const handleRemoveVariable = (variable: string) => {
    setFormData({
      ...formData,
      variables: formData.variables.filter((v) => v !== variable),
    })
  }

  const handleInsertSubjectVariable = (variable: string) => {
    setFormData({ ...formData, subject: formData.subject + `{{${variable}}}` })
  }

  const handleSubmit = async () => {
    if (!formData.key || !formData.name || !formData.subject || !formData.body) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    setIsSubmitting(true)

    try {
      if (editingTemplate) {
        const result = await updateEmailTemplate(editingTemplate.id, {
          key: formData.key,
          name: formData.name,
          description: formData.description || null,
          subject: formData.subject,
          body: formData.body,
          variables: formData.variables,
          is_active: formData.is_active,
        })

        if (result.success && result.data) {
          setTemplates(templates.map((t) =>
            t.id === editingTemplate.id ? { ...t, ...result.data } : t
          ))
          toast.success('Template atualizado com sucesso')
        } else {
          toast.error(result.error || 'Erro ao atualizar')
        }
      } else {
        const result = await createEmailTemplate({
          key: formData.key,
          name: formData.name,
          description: formData.description || null,
          subject: formData.subject,
          body: formData.body,
          variables: formData.variables,
          is_active: formData.is_active,
        })

        if (result.success && result.data) {
          setTemplates([...templates, result.data as EmailTemplateWithCreator])
          toast.success('Template criado com sucesso')
        } else {
          toast.error(result.error || 'Erro ao criar')
        }
      }

      setIsDialogOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingTemplateId) return

    const result = await deleteEmailTemplate(deletingTemplateId)

    if (result.success) {
      setTemplates(templates.filter((t) => t.id !== deletingTemplateId))
      toast.success('Template eliminado com sucesso')
    } else {
      toast.error(result.error || 'Erro ao eliminar')
    }

    setIsDeleteDialogOpen(false)
    setDeletingTemplateId(null)
  }

  const handleToggleActive = async (template: EmailTemplateWithCreator) => {
    const result = await toggleEmailTemplateActive(template.id)

    if (result.success) {
      setTemplates(templates.map((t) =>
        t.id === template.id ? { ...t, is_active: !t.is_active } : t
      ))
      toast.success(`Template ${template.is_active ? 'desativado' : 'ativado'}`)
    } else {
      toast.error(result.error || 'Erro ao alternar estado')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Texto copiado para a área de transferência')
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-medium">Templates de Email</h2>
          <Button onClick={handleOpenCreate} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Novo Template
          </Button>
        </div>
        <p className="text-muted-foreground text-sm">
          Configure templates de email reutilizáveis para comunicações automáticas.
          Use variáveis como {'{{nome}}'} para personalizar os emails.
        </p>
      </div>

      {templates.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhum template criado</h3>
          <p className="text-muted-foreground mb-4">
            Crie o primeiro template de email para começar.
          </p>
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Template
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Chave</TableHead>
                <TableHead>Assunto</TableHead>
                <TableHead>Variáveis</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="w-[120px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{template.name}</p>
                      {template.description && (
                        <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {template.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-sm bg-muted px-2 py-1 rounded">{template.key}</code>
                  </TableCell>
                  <TableCell>
                    <p className="truncate max-w-[200px]">{template.subject}</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {((template.variables as string[]) || []).slice(0, 3).map((v) => (
                        <Badge key={v} variant="outline" className="text-xs">
                          {v}
                        </Badge>
                      ))}
                      {((template.variables as string[]) || []).length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{((template.variables as string[]) || []).length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={template.is_active ?? true}
                      onCheckedChange={() => handleToggleActive(template)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenPreview(template)}
                        title="Pré-visualizar"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(template)}
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDelete(template.id)}
                        title="Eliminar"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Editar Template' : 'Novo Template'}
            </DialogTitle>
            <DialogDescription>
              Configure o template de email. Use {'{{variavel}}'} para inserir valores dinâmicos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="key">Chave *</Label>
                <Input
                  id="key"
                  value={formData.key}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                  placeholder="welcome_provider"
                />
                <p className="text-xs text-muted-foreground">
                  Identificador único (sem espaços, lowercase)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Boas-vindas ao Prestador"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Email enviado quando um prestador é aprovado"
              />
            </div>

            <div className="space-y-2">
              <Label>Variáveis</Label>
              <div className="flex gap-2">
                <Input
                  value={newVariable}
                  onChange={(e) => setNewVariable(e.target.value)}
                  placeholder="nome_prestador"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddVariable())}
                />
                <Button type="button" variant="outline" onClick={handleAddVariable}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {formData.variables.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.variables.map((v) => (
                    <Badge
                      key={v}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => handleRemoveVariable(v)}
                    >
                      {v}
                      <span className="ml-1 text-muted-foreground">&times;</span>
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Adicione variáveis que podem ser usadas no assunto e corpo do email
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="subject">Assunto *</Label>
                {formData.variables.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {formData.variables.map((v) => (
                      <Badge
                        key={v}
                        variant="outline"
                        className="cursor-pointer text-xs hover:bg-primary hover:text-primary-foreground"
                        onClick={() => handleInsertSubjectVariable(v)}
                      >
                        {`{{${v}}}`}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Bem-vindo à rede, {{nome_prestador}}!"
              />
            </div>

            <div className="space-y-2">
              <Label>Corpo do Email *</Label>
              <RichTextEditor
                content={formData.body}
                onChange={(content) => setFormData({ ...formData, body: content })}
                placeholder="Escreva o conteúdo do email..."
                variables={formData.variables}
                minHeight="200px"
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Template ativo</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'A guardar...' : editingTemplate ? 'Guardar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Pré-visualização: {previewTemplate?.name}
            </DialogTitle>
          </DialogHeader>

          {previewTemplate && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-muted-foreground">Assunto</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(previewTemplate.subject)}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copiar
                  </Button>
                </div>
                <div className="rounded-lg border bg-muted/50 p-3">
                  <p className="font-medium">{previewTemplate.subject}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-muted-foreground">Corpo</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(previewTemplate.body)}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copiar HTML
                  </Button>
                </div>
                <div className="rounded-lg border bg-muted/50 p-3 max-h-[300px] overflow-auto">
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: previewTemplate.body }}
                  />
                </div>
              </div>

              {((previewTemplate.variables as string[]) || []).length > 0 && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Variáveis disponíveis</Label>
                  <div className="flex flex-wrap gap-2">
                    {((previewTemplate.variables as string[]) || []).map((v) => (
                      <Badge key={v} variant="outline">
                        {`{{${v}}}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {previewTemplate.updated_by_user && (
                <p className="text-xs text-muted-foreground">
                  Última atualização por {previewTemplate.updated_by_user.name}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Template</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que deseja eliminar este template?
              Esta ação não pode ser revertida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
