# Requisitos: Sistema de Proposta de Preços para Prestadores

**Data:** 16 Janeiro 2026
**Objetivo:** RM consegue gerar PDF de proposta de preços baseado nos serviços que o prestador selecionou no forms

---

> **⚠️ NOTA (20 Janeiro 2026):** Este documento foi o planeamento inicial. Algumas decisões mudaram durante a implementação:
> - **`provider_services_history` foi eliminada** - O histórico de alterações de serviços é agora rastreado via:
>   - `provider_forms_data` - snapshots completos de cada submissão
>   - `history_log` com `event_type='forms_submission'` para auditoria
> - Ver `02-FLUXOS-NEGOCIO.md` para a arquitectura actual implementada.

---

## ✅ **DECISÕES TOMADAS**

### 1. **Fluxo Geral**
1. Prestador preenche forms com serviços que faz
2. Sistema notificado quando forms submetido
3. Tab "Preços" fica disponível no perfil do prestador
4. RM acede à tab, vê serviços pré-selecionados (do forms)
5. RM pode selecionar/desselecionar serviços para PDF
6. RM pode editar preços individuais
7. RM gera PDF para enviar ao prestador

### 2. **Origem dos Dados**
- ✅ Usar **`angariacao_reference_prices`** como única fonte de preços de referência
- ✅ **APAGAR** lógica e referências a `reference_prices` (antiga)
- ✅ **MODIFICAR** `provider_prices` existente para acomodar novos requisitos

### 3. **Forms de Seleção de Serviços**
- ✅ RM envia forms **manualmente** (link parametrizado)
- ✅ Prestador seleciona serviços por cluster (select all + individual toggle)
- ✅ Forms **substitui completamente** `providers.services[]`
- ✅ **Guardar histórico** de alterações (antes/depois)
- ✅ Sistema recebe **notificação** quando forms submetido

### 4. **Tab de Preços no Perfil**
- ✅ Disponível **APÓS** prestador submeter forms
- ✅ Layout inspirado na tab "Preços Angariação" (configurações)
- ✅ Accordion por cluster
- ✅ Checkbox para selecionar serviços que vão para PDF
- ✅ Edição inline de preços
- ✅ Preços editados são **guardados** em `provider_prices`

### 5. **Estrutura de Dados**

#### **Modificar tabela `provider_prices`:**
```sql
-- Adaptar para guardar preços personalizados e seleções
ALTER TABLE provider_prices
  -- Campos a adicionar/modificar (TO BE DEFINED)
```

#### **Nova tabela para histórico de serviços:**
```sql
CREATE TABLE provider_services_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES providers(id) NOT NULL,
  services_before TEXT[], -- Serviços antes do forms
  services_after TEXT[], -- Serviços após forms submission
  source TEXT NOT NULL, -- 'forms_submission', 'manual_edit', etc.
  changed_by UUID REFERENCES users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### **Campo para rastrear forms submission:**
```sql
ALTER TABLE providers
  ADD COLUMN forms_submitted_at TIMESTAMPTZ,
  ADD COLUMN forms_response_id TEXT; -- ID do forms (para link com sistema externo)
```

### 6. **PDF de Proposta (Versão Simples)**
- ✅ Incluir apenas serviços **selecionados** (checkbox)
- ✅ Layout simples com branding FIXO
- ✅ Agrupar por cluster
- ✅ Mostrar preço sem IVA + taxa IVA
- ✅ Incluir variantes (T1, T2, etc.)
- ✅ Download automático

---

## ❓ **PERGUNTAS PENDENTES (PARA VALIDAR COM EQUIPA)**

### **A. Forms de Serviços**

#### **A1. Momento de Envio**
- [ ] Em que etapa do onboarding o forms deve ser enviado?
  - Opções: Etapa 2, 3, 4, 5, ou outro momento específico?
  - Deve ser enviado automaticamente ao atingir a etapa OU RM decide quando enviar?

#### **A2. Integração do Forms**
- [ ] Que plataforma será usada para o forms? (Typeform, Google Forms, custom?)
- [ ] Como será a notificação de volta ao sistema?
  - Webhook?
  - Polling API?
  - Integração direta?

#### **A3. Bloqueios e Alertas**
- [ ] Se prestador não preencher forms:
  - Bloquear progressão para próxima etapa?
  - Mostrar alerta na dashboard da RM?
  - Enviar lembrete automático ao prestador?
  - Após quantos dias sem resposta?

#### **A4. Conteúdo do Forms**
- [ ] Além dos serviços, que outros dados capturar?
  - Horários disponíveis?
  - Zonas de atuação específicas?
  - Equipamentos próprios?
  - Certificações?

- [ ] Estrutura de seleção de serviços:
  - Mostrar TODOS os clusters ou apenas os que ele indicou na candidatura?
  - Permitir "Nenhum" (se não faz nada de um cluster)?

### **B. Tab de Preços**

#### **B1. Pré-seleção de Serviços**
- [ ] Quando RM abre a tab pela primeira vez:
  - Todos os serviços do forms já vêm com checkbox ✅?
  - Ou todos desmarcados e RM seleciona manualmente?

#### **B2. Filtros e Navegação**
- [ ] Mostrar apenas clusters que prestador selecionou no forms?
- [ ] Ou mostrar TODOS os clusters (mesmo que não tenha serviços selecionados)?
- [ ] Filtro por cluster deve ser obrigatório ou opcional?

#### **B3. Variantes de Serviços**
- [ ] Como lidar com variantes (T1, T2, T3, etc.)?
  - Checkbox individual por variante?
  - Ou selecionar serviço seleciona todas as variantes?

#### **B4. Preços Personalizados**
- [ ] Quando RM edita um preço, deve:
  - Aplicar apenas para este prestador (preço especial)?
  - Criar alerta/notificação se desvio > X% do preço de referência?
  - Pedir justificação/comentário?

#### **B5. Permissões**
- [ ] Quem pode editar preços?
  - Apenas RM atribuída ao prestador?
  - Qualquer RM?
  - Admin também?

### **C. PDF de Proposta**

#### **C1. Branding e Layout**
- [ ] Incluir logo FIXO no cabeçalho?
- [ ] Incluir informações de contacto FIXO no rodapé?
- [ ] Cores corporativas? (enviar paleta de cores)

#### **C2. Conteúdo do PDF**
- [ ] Incluir descrição detalhada de cada serviço?
- [ ] Incluir condições comerciais/termos?
- [ ] Incluir espaço para assinatura do prestador?
- [ ] Incluir data de validade da proposta?

#### **C3. Gestão de Versões**
- [ ] Guardar histórico de PDFs gerados?
  - Criar tabela `provider_price_proposals`?
  - Campos: versão, data_geração, gerado_por, services_incluidos, etc.

#### **C4. Envio do PDF**
- [ ] Apenas download OU também envio por email automático?
- [ ] Se email: template específico? CC para RM?

### **D. Dados e Histórico**

#### **D1. Auditoria**
- [ ] Que eventos guardar em `history_log`?
  - Forms submetido
  - Serviços alterados
  - Preços editados
  - PDF gerado
  - Proposta enviada

#### **D2. Notificações**
- [ ] Criar alertas quando:
  - Prestador submete forms?
  - Preço editado com desvio > X%?
  - PDF gerado?

---

## 🚀 **PLANO DE IMPLEMENTAÇÃO**

### **Fase 1: Forms Simples (DESENVOLVER AGORA)**
- [ ] Criar página pública `/forms/services/:token`
- [ ] Token parametrizado com `provider_id` encriptado
- [ ] Layout com clusters + checkboxes
- [ ] "Select All" por cluster
- [ ] Submit guarda em `providers` + `provider_services_history`
- [ ] Atualiza `forms_submitted_at`

### **Fase 2: Modificar Estrutura de Dados (DESENVOLVER AGORA)**
- [ ] Migration para `provider_services_history`
- [ ] Migration para adicionar campos ao `providers`
- [ ] Migration para modificar `provider_prices`
- [ ] Apagar referências a `reference_prices` e `service_references`

### **Fase 3: Tab de Preços (DESENVOLVER AGORA)**
- [ ] Desbloquear tab baseado em `forms_submitted_at IS NOT NULL`
- [ ] Criar componente `ProviderPricingSelection`
- [ ] Accordion por cluster (baseado em `AngariacaoPricesTable`)
- [ ] Checkbox + edição inline
- [ ] Server actions para guardar seleções e preços

### **Fase 4: PDF Simples (DESENVOLVER AGORA)**
- [ ] Botão "Gerar PDF" na tab
- [ ] Biblioteca para gerar PDF (react-pdf ou puppeteer)
- [ ] Template básico com logo FIXO (se disponível)
- [ ] Download automático

### **Fase 5: Melhorias Futuras (APÓS VALIDAÇÃO)**
- [ ] Histórico de propostas geradas
- [ ] Envio automático por email
- [ ] Validações e alertas de desvio de preço
- [ ] Analytics de propostas aceites/rejeitadas

---

## 📝 **NOTAS TÉCNICAS**

### **Bibliotecas a Usar**
- **PDF Generation**: `@react-pdf/renderer` (simples, client-side) OU `puppeteer` (servidor, mais flexível)
- **Forms**: Componentes custom (não usar plataforma externa por agora)

### **Estrutura de Ficheiros**
```
src/
├── app/
│   ├── (dashboard)/
│   │   └── providers/[id]/
│   │       └── page.tsx (modificar - desbloquear tab)
│   └── forms/
│       └── services/[token]/
│           └── page.tsx (novo - forms público)
├── components/
│   ├── providers/
│   │   ├── pricing-selection.tsx (novo - tab de preços)
│   │   └── pricing-pdf.tsx (novo - template PDF)
│   └── forms/
│       └── services-form.tsx (novo - forms de seleção)
├── lib/
│   ├── providers/
│   │   └── pricing-actions.ts (novo - server actions)
│   └── forms/
│       └── services-actions.ts (novo - submit forms)
└── supabase/
    └── migrations/
        ├── YYYYMMDDHHMMSS_provider_services_history.sql
        ├── YYYYMMDDHHMMSS_provider_forms_fields.sql
        └── YYYYMMDDHHMMSS_modify_provider_prices.sql
```

---

## ✅ **CHECKLIST DE DESENVOLVIMENTO**

### **Agora (Sessão Atual)**
- [ ] Criar forms simples de seleção de serviços
- [ ] Migration: `provider_services_history`
- [ ] Migration: campos forms em `providers`
- [ ] Migration: modificar `provider_prices`
- [ ] Apagar código de `reference_prices`
- [ ] Desbloquear tab "Preços"
- [ ] Criar componente `ProviderPricingSelection`
- [ ] Server actions para guardar seleções/preços
- [ ] Gerar PDF simples
- [ ] Testar flow completo

### **Depois (Após Validação)**
- [ ] Respostas às perguntas pendentes
- [ ] Ajustar forms baseado em feedback
- [ ] Melhorar template PDF
- [ ] Implementar histórico de propostas
- [ ] Adicionar validações e alertas
- [ ] Envio automático por email

---

**Próximo Passo:** Validar perguntas pendentes e começar desenvolvimento! 🚀
