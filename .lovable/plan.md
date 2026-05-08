
# Plano — Loja independente, painel polido, tema rosa e modal promo

Escopo: somente a **loja** (`/loja`), o **painel da loja** (`/loja/admin`) e dados de loja. Nada do `/admin` da barbearia ou do site `/` é alterado.

---

## 1) Loja independente e título

**Problema:** título global ainda mostra "Barbearia Premium" ao entrar em `/loja`. Usuário quer:
- "Sua barbearia" continua aparecendo no `/`
- Em `/loja`, o título principal vira **"Sua loja"** (e o "Sua barbearia" some ou aparece pequeno/abaixo).
- Index/SEO da loja independente.

**Mudanças:**
- `src/pages/StorePage.tsx`: definir `<title>` e `<meta description>` próprios via `document.title` em `useEffect` (ex.: `"{businessName} — Loja Online"`). Hero já tem `businessName`; ajustar o subtítulo para nunca herdar a string da barbearia.
- Nada em `index.html` global (continua sendo da barbearia).
- Verificar se há algum header global mostrando "Barbearia" em `/loja` — se sim, ocultar/condicionar à rota.

---

## 2) Painel `/loja/admin` — refinos por aba

Trocar tudo para o token semântico do `useThemeColors` e padronizar com a estética do `/admin` (Dashboard, Inventory, Suppliers, etc.).

### 2.1 Estoque (`StoreInventory.tsx`)
Refazer no padrão de `src/pages/admin/Inventory.tsx`:
- Header com KPIs (Total SKUs, Estoque baixo, Sem estoque, Valor estimado).
- Tabela completa de **todos** os produtos com: imagem, título, categoria, estoque atual, status (OK / Baixo / Sem estoque), botões "+", "−", "Ajustar".
- Painel lateral (drawer) "Movimentações recentes" + filtro por produto.
- Form de movimentação como Sheet/Drawer (não `position:fixed` cru).

### 2.2 Fornecedores (`StoreSuppliers.tsx`)
Mudar de cards para **tabela em modo lista** (igual `Suppliers` original):
- Colunas: Nome, Contato, Telefone, E-mail, Ativo, Ações.
- Busca + toggle ativo/inativo inline.
- Modal de edição em `Dialog` do shadcn.

### 2.3 Clientes (`StoreCustomers.tsx`)
Redesenhar:
- KPIs: Total clientes, Ticket médio global, Top cliente, Novos no mês.
- Tabela enxuta com avatar inicial, nome, contato, total de pedidos (badge), total gasto, último pedido, ações.
- Sync com `orders` em background sem bloquear render (mostrar lista atual primeiro, depois atualizar).

### 2.4 Financeiro (`StoreFinance.tsx`)
Refazer gráficos para o mesmo padrão visual do `/admin/finance`:
- 4 KPI cards com sparkline.
- Gráfico Receita (Area) + Pedidos (Bar combinados em `ComposedChart`) com grid sutil, eixos finos, tooltip glass.
- Donut "Por método de pagamento" (PieChart) substituindo a lista atual.
- Card "Top 5 dias de venda".

### 2.5 Configurações (`StoreSettings.tsx`)
Hoje está alinhado à esquerda (`max-w-2xl`). Mudar para layout "Visual + Geral + PIX + Entrega + Tema" igual `/admin/settings`:
- **Sidebar interna** vertical com categorias: **Geral**, **PIX & Pagamento**, **Entrega**, **WhatsApp**, **Visual** (← onde fica o tema rosa).
- Conteúdo ocupa toda a largura disponível à direita (sem `max-w-2xl`).
- Botão "Salvar" sticky no topo direito.

---

## 3) Performance — entrada instantânea em cada aba

Causa atual do delay de ~2s: cada rota é `lazy` + a página dispara `await supabase…` no mount sem cache, mostrando tela vazia.

**Mudanças:**
- Pré-carregar (`prefetch`) os módulos do menu da loja em idle: ao montar `StoreAdminLayout`, fazer `import("./StoreProducts")`, `Inventory`, `Customers`, etc. dentro de `requestIdleCallback` para que o `lazy` resolva instantâneo no clique.
- Migrar fetches críticos (`products`, `orders`, `store_customers`, `store_suppliers`, `store_inventory_movements`, `store_settings`) para **React Query** com `queryKey` por entidade — o `QueryClient` já tem `staleTime 5min` configurado, então a 2ª visita é instantânea.
- Mostrar **skeletons** (não tela em branco) enquanto carrega na primeira vez.
- Adicionar índices úteis se faltar (ex.: `store_inventory_movements(created_at desc)`, `store_customers(total_spent desc)`).

---

## 4) Mais produtos (seed amplo)

Inserir ~30 produtos novos no `products` cobrindo: roupas (camisetas, regatas, moletons), bermudas, tênis, **acessórios masculinos** (cordões, pulseiras, anéis, óculos, relógios, pochetes, gorros, bonés), perfumes, kits. Categorias inseridas em `product_categories` se ainda não existirem (`acessorios`, `cordoes`, `pulseiras`, `oculos`, `relogios`, `bones`, `moletons`, `bermudas`, `tenis`, `perfumes`).
- `image_url` apontando para imagens públicas (Unsplash / placeholders) — sem upload.
- `stock` aleatório razoável (5–50), `sort_order` incremental.

---

## 5) Tema **Rosa Dark** (apenas loja)

**Conceito:** dark base mantém-se, accent passa de indigo (`hsl(245 60% 55%)`) para rosa magenta (`hsl(330 80% 60%)`). Cards, contornos, botões CTAs, badges, gráficos e sliders adaptam.

**Implementação (sem bagunçar nada existente):**
1. Em `store_settings`, usar a chave **`store_theme`** com valor `"default" | "pink-dark"`.
2. Criar `src/contexts/StoreThemeContext.tsx` que:
   - Lê `store_theme` (uma vez, com cache em `localStorage` para zero-flash).
   - Aplica classe `data-store-theme="pink-dark"` no `<html>` **somente** quando rota começa com `/loja` ou `/loja/admin`.
   - Subscreve realtime em `store_settings` (filtro `key=eq.store_theme`) → muda no mesmo segundo.
3. Em `src/index.css`, adicionar bloco escopado:
   ```css
   :root[data-store-theme="pink-dark"] {
     --store-accent: 330 80% 60%;
     --store-accent-light: 330 80% 72%;
     --store-accent-bg: 330 80% 60% / 0.12;
     --store-accent-border: 330 80% 60% / 0.25;
   }
   :root { --store-accent: 245 60% 55%; ... }
   ```
4. Substituir nos componentes da loja e do painel da loja todas as ocorrências hardcoded `hsl(245 60% 55%)` por `hsl(var(--store-accent))`. Mesma substituição em `ProductCard`, `CartDrawer`, `CheckoutModal`, `OrderTracker`, badges, hero CTA, gráficos (`ACCENT` constante).
5. Em `StoreSettings.tsx` aba **Visual**: card "Tema da loja" com 2 opções (Default Indigo / Rosa Dark) em `visual_choice` style com swatch de cor. Salvar em `store_settings.store_theme` → aplica em tempo real via realtime.

Cuidados:
- O tema **não** afeta `/admin`, `/`, ou qualquer rota fora de `/loja*`.
- Tokens neutros (background, foreground, border) ficam idênticos — só o accent muda.

---

## 6) Modal de promoção ao entrar em `/loja`

Componente novo `src/components/store/PromoModal.tsx`:
- Aparece 1 vez por sessão (`sessionStorage` flag) ao entrar em `/loja`.
- Layout profissional: ícone grande no topo (`Sparkles`/`Tag`/`Gift`), título grande, subtítulo, badge de cupom, CTA "Aproveitar agora", botão "Fechar".
- Conteúdo vindo de `store_settings`: `promo_modal_enabled`, `promo_modal_title`, `promo_modal_subtitle`, `promo_modal_cta`, `promo_modal_coupon`, `promo_modal_image`.
- Animação `framer-motion` (scale + fade), backdrop blur.
- Adapta automaticamente ao tema rosa via `var(--store-accent)`.
- Em `StoreSettings.tsx`, nova aba **Promoção** para editar esses campos e ativar/desativar.

Não aparece em `/`, somente `/loja`.

---

## 7) Detalhes técnicos

- **Stack:** React + Tailwind, shadcn (Dialog/Sheet/Table), framer-motion, recharts, lucide-react, Supabase realtime.
- **Tabelas afetadas:** `store_settings` (novas chaves: `store_theme`, `promo_modal_*`), `products` (inserts), `product_categories` (inserts).
- **Sem alteração** em RLS/funções existentes.
- **Sem alteração** em `/admin`, `/`, tenants `/s/:slug`.
- Cleanup de constantes `ACCENT` hardcoded substituídas por CSS var.

---

## 8) Pontos de atenção

- O usuário rejeitou "tema claro/multi-tema" antes; o tema rosa fica isolado **apenas para a loja** e **default mantém-se idêntico**. Não tocar em `useThemeColors`.
- Realtime do tema precisa do publication `supabase_realtime` na tabela `store_settings` (verificar; se não, adicionar).
- Pré-carregamento das rotas deve ser opt-in (`requestIdleCallback`) para não brigar com a interação inicial.

---

**Sem código aplicado ainda — aguardando aprovação para executar o plano.**
