# Diagramas do Sistema

Esta pasta contém diagramas visuais do CRM Prestadores organizados por categoria.

---

## Estrutura

| Pasta | Conteúdo |
|-------|----------|
| [architecture/](./architecture/) | Diagramas C4 (contexto, containers, componentes) |
| [flows/](./flows/) | Fluxos de negócio e processos |
| [security/](./security/) | Diagramas de segurança e autenticação |

---

## Índice de Diagramas

### Arquitectura
- [Contexto do Sistema (C4 Level 1)](./architecture/context.md)
- [Containers (C4 Level 2)](./architecture/containers.md)
- [Componentes (C4 Level 3)](./architecture/components.md)

### Fluxos
- [Ciclo de Vida do Prestador](./flows/provider-lifecycle.md)
- [Pipeline de Onboarding](./flows/onboarding-pipeline.md)
- [Candidaturas e Duplicados](./flows/candidaturas-flow.md)
- [Formulários de Prestadores](./flows/provider-forms-flow.md)
- [Sincronização com Backoffice](./flows/sync-backoffice.md)
- [Catálogo de Serviços](./flows/catalogo-servicos.md)

### Segurança
- [Fluxo de Autenticação](./security/auth-flow.md)
- [Row Level Security (RLS)](./security/rls-policies.md)
- [Prevenção de Ataques](./security/attack-prevention.md)

---

## Tecnologia

Todos os diagramas usam **Mermaid**, que renderiza nativamente no GitHub.

Para visualizar localmente no VS Code, instalar a extensão: [Markdown Preview Mermaid Support](https://marketplace.visualstudio.com/items?itemName=bierner.markdown-mermaid)

---

*Última actualização: Janeiro 2026*
