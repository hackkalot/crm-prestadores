# Guia de Import de Prestadores via CSV

## Visão Geral

O sistema permite importar prestadores do HubSpot através de ficheiros CSV ou XLSX exportados do formulário de candidatura.

## Como Usar

### 1. Exportar CSV do HubSpot

1. Aceder ao HubSpot → Forms → "FO - 2025-03 - Questionário de..."
2. Clicar em "Actions" → "Export submissions"
3. Fazer download do ficheiro CSV ou XLSX

### 2. Importar no CRM

1. Aceder à página **Prestadores** (`/prestadores`)
2. Clicar no botão **"Importar CSV"** no header (ao lado dos icons)
3. Fazer upload do ficheiro exportado
4. Aguardar parsing e preview dos prestadores

### 3. Preview e Validação

O sistema mostra:
- ✅ **Prestadores válidos** - Quantos foram parseados com sucesso
- ❌ **Erros de parsing** - Linhas com campos obrigatórios em falta
- 📋 **Preview da tabela** - Primeiros 10 prestadores para verificação

### 4. Resolução de Duplicados

Se existirem prestadores com **email duplicado**, o sistema mostra:

Para cada duplicado, podes escolher:
- **Ignorar** - Não importar (mantém o existente)
- **Atualizar** - Atualizar dados do prestador existente e incrementar `application_count`

### 5. Resultado Final

O sistema mostra:
- 🟢 **Criados** - Novos prestadores adicionados
- 🔵 **Atualizados** - Prestadores existentes atualizados
- ⚪ **Ignorados** - Duplicados que optaste por ignorar
- 🔴 **Erros** - Problemas durante o import

## Estrutura dos Campos

### Campos Condicionais

O formulário HubSpot tem campos diferentes baseado no **tipo de entidade**:

#### 🏢 Empresa
- Nome da Empresa*
- E-mail*
- Contacto telefónico*
- NIF*
- Serviços*
- Distritos*
- Site/Redes Sociais (opcional)
- Nº Técnicos
- Equipa Administrativa*
- Transporte Próprio*
- Horário Laboral

#### 🏭 ENI
- Nome do ENI ou Empresa*
- E-mail do ENI*
- Contacto telefónico do ENI*
- NIF*
- Serviços*
- Distritos*
- Site/Redes Sociais (opcional)
- Nº Técnicos
- Equipa Administrativa*
- Transporte Próprio*
- Horário Laboral

#### 👷 Técnico
- Nome do Técnico*
- E-mail do Técnico*
- Contacto telefónico do Técnico*
- Serviços*
- Distritos (opcional)
- _Não tem NIF, nem campos de equipa_

### Mapeamento para Sistema

| Campo CSV | Campo DB | Tipo | Obrigatório |
|-----------|----------|------|-------------|
| Nome (condicional) | `name` | string | ✅ |
| E-mail (condicional) | `email` | string | ✅ |
| Tipo de entidade | `entity_type` | enum | ✅ |
| Telefone | `phone` | string | ❌ |
| NIF | `nif` | string | ❌ |
| Site/Redes | `website` | string | ❌ |
| Serviços | `services` | array | ❌ |
| Distritos | `districts` | array | ❌ |
| Nº Técnicos | `num_technicians` | number | ❌ |
| Equipa Admin | `has_admin_team` | boolean | ❌ |
| Transporte | `has_own_transport` | boolean | ❌ |
| Horário | `working_hours` | string | ❌ |
| Conversion Date | `first_application_at` | datetime | ❌ |

## Comportamento do Sistema

### Status Inicial
Todos os prestadores importados entram com status **`novo`**

### Application Count
- Novo prestador: `application_count = 1`
- Atualizar existente: `application_count = count + 1`

### Validações
- **E-mail obrigatório**: Deve existir e ser válido
- **Nome obrigatório**: Deve existir e não estar vazio
- **Tipo de entidade**: Deve ser "técnico", "eni" ou "empresa"

### Parsing Especial
- **Serviços**: String separada por vírgulas → Array
- **Distritos**: String separada por vírgulas → Array
- **Sim/Não**: Convertido para boolean (`true`/`false`)
- **Datas**: ISO 8601 format

## Erros Comuns

### ❌ "Tipo de entidade inválido"
**Causa**: O campo "Escolha a opção..." não está preenchido ou tem valor inesperado

**Solução**: Verificar se CSV tem coluna e valor correto

### ❌ "Campos obrigatórios em falta"
**Causa**: Nome ou email está vazio

**Solução**: Preencher campos manualmente ou corrigir CSV

### ❌ "Email e nome são obrigatórios"
**Causa**: Validação final falhou

**Solução**: Verificar dados no CSV

## Arquitetura Técnica

### Componentes
```
src/
├── lib/import/
│   ├── csv-parser.ts        # Parser de CSV → ParsedProvider
│   └── actions.ts            # Server actions para import
└── components/import/
    └── import-providers-dialog.tsx  # UI de import
```

### Fluxo de Dados
1. **Upload** → PapaCSV parse → `RawCSVRow[]`
2. **Parse** → `parseCSVRows()` → `ParsedProvider[]`
3. **Check Duplicates** → `checkDuplicates()` → `DuplicateProvider[]`
4. **User Decision** → UI → Skip/Update selection
5. **Import** → `importProviders()` → Insert/Update DB
6. **Revalidate** → Next.js cache refresh

### Performance
- Parsing: Client-side (não bloqueia servidor)
- Verificação: Batch queries com `Promise.all()`
- Import: Sequencial com transações isoladas

## Limitações Atuais

- ❌ Não suporta edição inline do CSV após upload
- ❌ Não suporta import parcial (all-or-nothing por duplicado)
- ❌ Não suporta undo após import
- ⚠️ Imports grandes (>500 linhas) podem demorar

## Próximas Melhorias

- [ ] Suporte para Excel (.xlsx) nativo
- [ ] Preview com edição inline antes de importar
- [ ] Dry-run mode (simular import sem executar)
- [ ] Histórico de imports com rollback
- [ ] Validação de NIF (checksum)
- [ ] Validação de email (format + DNS)
- [ ] Import em background para ficheiros grandes (>1000 linhas)
