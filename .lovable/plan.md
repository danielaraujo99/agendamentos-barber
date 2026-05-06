## Reorganização do Admin da Loja (`/loja/admin`)

### Problemas atuais
1. **Tema roxo/rosa** no layout (`hsl(280 70% 60%)`) — destoa do admin original (que usa indigo `hsl(245 60% 55%)`).
2. **Dashboard** simples, sem gráficos, visual inferior ao `/admin`.
3. **Páginas faltando**: Produtos, Categorias, Pedidos e Estoque/Financeiro reaproveitam de forma errada (rotas `products`, `categories`, `orders` apontam todas para `StoreDashboard` que tem tabs internas — gera UX confusa, scroll duplo, header genérico).
4. **Layout do scroll**: hoje o `<aside>` é `sticky` mas o `main` está dentro de um wrapper com `overflow-auto` próprio — em algumas resoluções todo o conteúdo desce junto. Precisa garantir que **só o painel direito role**, sidebar 100% fixa.

### Mudanças propostas (apenas no painel da loja — nada toca o `/admin` de barbearia)

#### 1. Tema — remover roxo, voltar ao padrão indigo
- Em `src/components/store-admin/StoreAdminLayout.tsx`: trocar constantes `ACCENT/ACCENT_LIGHT/ACCENT_BG/...` para o mesmo indigo do admin (`hsl(245 60% 55%)` / `hsl(245 60% 70%)`).
- Manter apenas o **ícone `ShoppingBag`** como diferenciação visual (já existe).
- Em todas as páginas `src/pages/store-admin/*` substituir referências `hsl(280 70% 60%)` por `hsl(245 60% 55%)`.

#### 2. Layout — scroll independente
- Estrutura final em `StoreAdminLayout.tsx`:
  - Wrapper raiz: `h-screen flex overflow-hidden`
  - `<aside>` desktop: `h-screen` fixo, sem rolagem na área externa (interno pode rolar via `overflow-y-auto` no `<nav>`).
  - Container direito: `flex-1 flex flex-col overflow-hidden`, com `<header sticky>` + `<main className="flex-1 overflow-y-auto">`.
- Resultado: só o `<main>` rola; sidebar e header permanecem fixos.

#### 3. Dashboard da loja — refazer no padrão do `/admin`
Reescrever `src/pages/store-admin/StoreDashboard.tsx` espelhando `Dashboard.tsx` do admin:
- 4 stat cards (Vendas Hoje, Pedidos Hoje, Ticket Médio, Clientes) com `glass-card`, ícone colorido e `framer-motion`.
- 2 gráficos `AreaChart` (recharts): **Vendas (14 dias)** e **Pedidos (14 dias)** com gradiente.
- Card **Top Produtos do Mês** (mantém lógica atual mas com visual `glass-card`).
- Card **Distribuição por Categoria** com barrinhas percentuais (mesmo padrão do admin).
- Mantém leitura de `orders` + `order_items` + `products` + `store_customers`.

#### 4. Criar páginas que faltam (cada uma com header próprio, scroll só no main)
Criar arquivos novos em `src/pages/store-admin/`:

- **`StoreProducts.tsx`** — CRUD completo de produtos da loja. Reaproveita lógica de `src/pages/admin/Products.tsx` mas como página standalone (sem tabs externas), visual `glass-card`. Lista, busca, filtro por categoria, criar/editar/excluir, upload de imagem, gerenciar galeria, estoque, preço, destaque.
- **`StoreCategories.tsx`** — CRUD de `product_categories` (label, slug, ícone, ordem, ativa). Espelha `src/pages/admin/Categories.tsx` adaptado.
- **`StoreOrders.tsx`** — Gestão de pedidos: lista com filtros (status, data, busca), detalhes do pedido (itens, endereço, valor), atualizar status (pending → confirmed → paid → delivered → completed/cancelled), envio de WhatsApp. Espelha `src/pages/admin/Orders.tsx`.
- **`StoreCoupons.tsx`** — CRUD de cupons. Espelha `src/pages/admin/Coupons.tsx`.

#### 5. Refazer páginas existentes (visual e organização)
- **`StoreInventory.tsx`** — manter funcionalidade, padronizar visual com `glass-card`, header "Estoque" com botão "Nova Movimentação", grid de estoque baixo destacado, tabela de movimentações limpa. Trocar accent.
- **`StoreFinance.tsx`** — ampliar: cards (Receita, Pedidos, Ticket Médio, Crescimento), gráfico de vendas no período (filtro dia/semana/mês como em `Finance.tsx`), top produtos, distribuição por método de pagamento. Visual no padrão `glass-card`.
- **`StoreSuppliers.tsx`** e **`StoreCustomers.tsx`** — manter, só trocar accent e padronizar header.
- **`StoreSettings.tsx`** — manter, trocar accent.

#### 6. Rotas em `src/App.tsx`
Substituir as rotas atuais por dedicadas:
```text
/loja/admin              → StoreAdminDashboard (novo)
/loja/admin/products     → StoreProducts (novo)
/loja/admin/categories   → StoreCategories (novo)
/loja/admin/orders       → StoreOrders (novo)
/loja/admin/inventory    → StoreInventory (refeito)
/loja/admin/suppliers    → StoreSuppliers
/loja/admin/customers    → StoreCustomers
/loja/admin/coupons      → StoreCoupons (novo)
/loja/admin/finance      → StoreFinance (refeito)
/loja/admin/reviews      → ProductReviews (mantém)
/loja/admin/whatsapp     → WhatsAppProviders (mantém)
/loja/admin/settings     → StoreSettings
```
Cada uma renderiza dentro do `<main>` rolável.

### Detalhes técnicos
- **Stack**: nada novo — React, Tailwind, framer-motion, recharts, supabase client, lucide-react.
- **Cores**: usar `useThemeColors()` para `cardBg`, `border`, `textPrimary` etc. Accent indigo via constante local nas páginas.
- **Sem alteração de schema** no banco. Apenas leituras/escritas nas tabelas existentes (`orders`, `order_items`, `products`, `product_categories`, `coupons`, `store_*`).
- **Sem mexer** em `/admin`, `AdminLayout.tsx`, páginas do admin de barbearia, ou outras rotas públicas.

### Riscos
- Reaproveitamento de lógica de `Products`/`Categories`/`Orders`/`Coupons`: vou criar versões standalone (sem depender do tab system de `StoreDashboard`) para isolar e evitar regressões no admin antigo.
- Trabalho grande em volume de arquivos (~10 criados/editados), mas sem mudanças estruturais ou em camada de dados.
