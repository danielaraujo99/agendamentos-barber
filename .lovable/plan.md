## Objetivo
1. **Remover** os 3 temas (Dark Premium / Light Clean / Soft Beauty) e o ThemeSwitcher (FAB) — manter apenas o tema escuro original do projeto.
2. **Aprimorar a Loja pública** (`/loja`): mais performática, estruturada e profissional.
3. **Criar painel administrativo dedicado da Loja** em `/loja/admin` com login próprio, sidebar própria, ícone de sacolinha (clone visual do admin de barbearia).
4. **Isolar dados** em namespace `store_*` para não conflitar com o sistema de barbearia.

---

## Parte 1 — Remover Theme System (rápido, cirúrgico)

Arquivos a remover/limpar:
- `src/components/ThemeSwitcher.tsx` → deletar
- `src/contexts/UserThemeContext.tsx` → deletar
- `src/theme/themes.ts` → deletar
- `src/theme/tokens.css` → deletar
- `src/App.tsx` → remover `<UserThemeProvider>` e `<ThemeSwitcher />`
- `index.html` → remover script anti-flash inline
- `src/index.css` → remover import de `tokens.css` e reverter overrides para os valores literais HSL originais
- `src/hooks/useThemeColors.ts` → reverter para versão simples (sem listener `themechange`)

**Mantém intacto** o `ThemeContext.tsx` legado (admin light/dark por área) — já existia antes.

---

## Parte 2 — Loja pública aprimorada (`/loja`)

Foco em performance e estrutura sem bagunçar layout existente:

- **Lazy-load de imagens** (`loading="lazy"`, `decoding="async"`) em ProductCard
- **Virtualização leve**: paginação client-side em blocos de 12 produtos com botão "Ver mais"
- **Skeleton loaders** ao carregar produtos
- **Filtro por categoria** (chips no topo) ligado a `product_categories`
- **Busca com debounce** 200ms
- **Ordenação**: relevância, menor preço, maior preço, mais novos
- **Cache** de produtos via `react-query` (já existe no projeto) com `staleTime: 60s`
- **Memoização** de cards (`React.memo`) para evitar re-render do grid inteiro
- Manter glass-cards, layout, cores e CartDrawer atuais

---

## Parte 3 — Painel `/loja/admin` (separado e profissional)

### 3.1 Rota e estrutura
```
/loja/admin/login        → StoreAdminLogin
/loja/admin              → StoreDashboard (KPIs)
/loja/admin/products     → Produtos
/loja/admin/categories   → Categorias
/loja/admin/inventory    → Estoque (entradas/saídas, alertas mín)
/loja/admin/suppliers    → Fornecedores
/loja/admin/customers    → Clientes (extraídos de orders + tabela própria)
/loja/admin/orders       → Pedidos
/loja/admin/coupons      → Cupons
/loja/admin/finance      → Financeiro da loja (vendas, ticket médio, lucro)
/loja/admin/reviews      → Avaliações de produtos
/loja/admin/whatsapp     → Notificações WhatsApp (ChatPro/Render — reuso)
/loja/admin/settings     → Config loja (frete, pix, entrega, horários)
```

### 3.2 Componentes novos
- `src/components/store-admin/StoreAdminLayout.tsx` — sidebar com ícone `ShoppingBag` no topo (cor accent diferente: roxo/violeta para distinguir do admin de barbearia que usa indigo)
- `src/pages/store-admin/StoreAdminLogin.tsx` — login clone do AdminLogin com ícone sacolinha
- `src/pages/store-admin/StoreDashboard.tsx` — KPIs (vendas hoje/mês, ticket médio, top produtos, estoque baixo)
- `src/pages/store-admin/Customers.tsx` — lista de clientes com histórico
- `src/pages/store-admin/StoreInventory.tsx` — movimentações de estoque
- `src/pages/store-admin/StoreFinance.tsx` — financeiro exclusivo da loja
- `src/pages/store-admin/StoreSuppliers.tsx` — reuso da lógica de Suppliers atual
- Reuso direto: `Products`, `Categories`, `Orders`, `ProductReviews`, `Coupons`, `WhatsAppProviders`/`WhatsAppTemplates`

### 3.3 Autenticação
- Reaproveita `panel_users` com nova role `store_admin` (e permissões específicas da loja)
- Sessão separada em localStorage com chave `lovable.storePanelSession`
- Guard `StoreAdminGuard` redireciona para `/loja/admin/login` se sem sessão
- Super admin do sistema também tem acesso

---

## Parte 4 — Isolamento de dados

Novas tabelas (namespace `store_`):
- `store_customers` — id, name, phone, email, total_orders, total_spent, last_order_at, notes
- `store_inventory_movements` — id, product_id, type (in/out/adjust), qty, unit_cost, supplier_id?, reason, created_at
- `store_suppliers` — clone leve de `suppliers` mas exclusivo da loja (separa do uso da barbearia)
- `store_settings` — key/value para config exclusiva (pix_key, frete_modo, frete_valor, raio_entrega, horario_funcionamento)
- `store_panel_users` — usuários do painel da loja (espelha `panel_users` mas separado)

RLS:
- Todas com `has_role(auth.uid(), 'admin')` para super-admin
- Função `verify_store_panel_login(email, plain)` — espelho de `verify_panel_login`

**Não toco** nas tabelas `products`, `product_categories`, `orders`, `order_items`, `coupons`, `product_reviews` — continuam compartilhadas (são da loja por natureza).

---

## Detalhes técnicos

- **Lazy loading de rotas** com `React.lazy` + `Suspense` (igual admin atual)
- **Pré-carregamento** em idle de chunks mais usados
- **Sidebar 100% responsiva** (drawer mobile, igual admin de barbearia)
- **Ícone identificador**: `ShoppingBag` lucide com cor `hsl(280 70% 60%)` (violeta) vs barbearia `hsl(245 60% 55%)` (indigo) — diferenciação sutil
- **Sem mudanças** em rotas/admin de barbearia atual

## Riscos / pontos de atenção
- Migração cria 5 tabelas + 1 função → revisar antes
- Login da loja usa estrutura paralela: super-admin de sistema (email cadastrado) entra direto sem precisar de senha de loja
- Não bagunça: zero alteração em arquivos do `/admin` atual

## Etapas de execução
1. Migration SQL (criar tabelas + função)
2. Remover Theme System (8 arquivos)
3. Criar layout + login + guard da loja-admin
4. Criar páginas (Dashboard, Customers, Inventory, Suppliers, Finance, Settings)
5. Adicionar rotas em `App.tsx` (com lazy)
6. Aprimorar `/loja` pública (perf + filtros)
7. Verificar build

Aprovar para executar?