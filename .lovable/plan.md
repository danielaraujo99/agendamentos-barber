## O que está quebrado hoje

1. **Configurações não aplicam na loja** — o admin (`StoreSettings.tsx`) salva tudo na tabela `store_settings` com chaves `store_*` (ex.: `store_pix_key`, `store_whatsapp_number`, `store_pix_type`), mas a `StorePage.tsx` lê de `business_settings` com chaves antigas (`pix_key`, `whatsapp_number`, `pix_type`). Resultado: nada do que se ativa no admin aparece na loja.
2. **Não existe toggle "Loja ativa" nem "Modo de pedido"** dentro do novo `StoreSettings.tsx`, então o lojista não consegue ligar/desligar a vitrine ou alternar iFood/WhatsApp pelo admin próprio.
3. **Tema não reflete na loja** quando trocado — `StoreThemeContext` aplica o atributo só em `/loja*`, ok, mas só existe `default` e `pink-dark`. Não há tema claro Rosa, e vários componentes da loja ainda usam cores cruas em vez de `--store-accent*`.
4. **Campos do formulário desalinhados** — quando um campo é `cols: 2` (textarea, switch, segmented), o grid de 2 colunas força altura desigual e o switch/segmented ocupam meia linha quebrando o layout. Inputs com prefixo (`R$`) têm padding inconsistente.
5. **Modo claro global da loja** — hoje a página da loja só funciona bonita no dark; precisa suportar tema claro com cards/botões/modais 100% via tokens.

## Plano

### 1. Unificar fonte das configurações da loja (`store_settings`)
- Em `StorePage.tsx`, `CheckoutModal.tsx` e demais consumidores, ler tudo de `store_settings` com as novas chaves: `store_enabled`, `store_order_mode`, `store_whatsapp_number`, `store_pix_key`, `store_pix_type`, `store_business_name`, `store_address`, `store_open_hours`, `store_phone`, `store_delivery_*`, `store_min_order`, `store_free_shipping_above`.
- Manter fallback para as chaves antigas em `business_settings` apenas se a nova vier vazia (compatibilidade com lojas existentes).
- Adicionar canal Realtime `store_settings` na `StorePage` para refletir mudanças do admin sem reload (igual já feito no theme).

### 2. Completar `StoreSettings.tsx` (admin)
- Adicionar seção **"Geral"** os campos faltando: `store_enabled` (switch destacado no topo) e `store_order_mode` (segmented iFood ↔ WhatsApp).
- Corrigir alinhamento do form:
  - Trocar grid `sm:grid-cols-2` por grid responsivo onde cada `Field` controla seu próprio `colSpan` e altura.
  - Switch e Segmented sempre ocupam linha cheia (`cols: 2`) com altura própria (`min-h-[64px]`) para não quebrarem com inputs ao lado.
  - Padronizar input com prefix/suffix (altura 44px, padding 0.875rem; prefix dentro de span absoluto alinhado).
- Header sticky com sombra leve quando rola.

### 3. Sistema de temas — adicionar **Rosa Light**
- Em `StoreThemeContext.tsx`:
  - Novo tipo `StoreThemeName = "default" | "pink-dark" | "pink-light"`.
  - Quando `pink-light`, aplicar `data-store-theme="pink-light"` **e** classe `light-theme` no `<html>` (escopadas a `/loja*`); ao sair de `/loja`, remover ambos para não vazar para o site da barbearia.
  - Atualizar `ACCENTS` com tom rosa claro suave.
- Em `index.css`:
  - Adicionar bloco `:root[data-store-theme="pink-light"]` com `--store-accent` (rosa) + sobrescrita de tokens base (`--background`, `--foreground`, `--card`, `--muted`, `--border`, `--popover`, `--sidebar-*`, `--glass*`) com paleta clara rosada.
  - Garantir que `--store-accent-soft` e `--store-accent-border` funcionem nos dois temas claros/escuros.

### 4. Adaptar a loja inteira aos tokens
Substituir cores cruas por `hsl(var(--store-accent*))` / `hsl(var(--card))` / `hsl(var(--background))` em:
- `StorePage.tsx` (hero, chips, badges, faixas de preço, botão "Adicionar")
- `ProductCard.tsx`
- `CartDrawer.tsx`
- `CheckoutModal.tsx`
- `ProductDetailModal.tsx`
- `StoreAccountModal.tsx`, `AccountInline.tsx`
- `OrderTracker.tsx`, `AuthRequiredModal.tsx`, `PromoModal.tsx`, `StoreConfigModal.tsx`
- `Footer` da loja

Onde for necessário usar `useThemeColors`, validar que ele responde ao `light-theme` global; manter accent vindo de `useStoreTheme().accent`.

### 5. Painel "Visual & Tema"
- Mostrar 3 cartões: Indigo (padrão), Rosa Dark, **Rosa Light** — cada um com paleta de 4 swatches e badge "Ativo".
- Preview "Como vai ficar na loja" mini (botão + card) usando os tokens correntes para o lojista validar antes de salvar.

### 6. Garantir reatividade real
- `StoreThemeContext` já tem Realtime no `key=store_theme`. Adicionar Realtime análogo em `StorePage` filtrando por chaves de exibição (`store_enabled`, `store_order_mode`, `store_business_name`, promo modal etc.), revalidando o estado local.

## Arquivos afetados
- `src/contexts/StoreThemeContext.tsx`
- `src/index.css`
- `src/pages/store-admin/StoreSettings.tsx`
- `src/pages/StorePage.tsx`
- `src/components/store/PromoModal.tsx`, `CheckoutModal.tsx`, `CartDrawer.tsx`, `ProductDetailModal.tsx`, `StoreAccountModal.tsx`, `AccountInline.tsx`, `OrderTracker.tsx`, `AuthRequiredModal.tsx`, `StoreConfigModal.tsx`
- `src/components/ProductCard.tsx` (escopado a uso na loja)

## Observações
- Sem migração de banco — só leitura/escrita em chaves novas já existentes em `store_settings`.
- Nenhuma mudança no admin da barbearia ou no tema global do site principal.
- Compatibilidade preservada: fallback para `business_settings` quando `store_settings` está vazio.