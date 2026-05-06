
# Theme System + Live Theme Studio — Plano Estratégico

## 1. Diagnóstico do sistema atual

**O que já existe (boa base):**
- `src/index.css` define tokens HSL via CSS variables em `:root` (dark) e `.light-theme` (light).
- `ThemeContext.tsx` aplica/remove `light-theme` no `<html>`, controlado por `business_settings.theme_mode` + `theme_areas` (admin/site/member). Configuração é **global do tenant**, não por usuário.
- `useThemeColors()` retorna ~60 valores inline duplicados (com `isLight ? a : b`) — **fonte de inconsistência**: a maioria dos componentes usa esse hook em `style={{}}` ao invés de classes Tailwind semânticas.
- Componentes Shadcn (Button, Card, Input, Badge) já consomem tokens semânticos (`bg-primary`, `text-foreground`) — esses se adaptam sozinhos.
- Header, Drawer, AdminLayout, StorePage, BookingFlow usam `useThemeColors` direto em `style` inline.

**Inconsistências detectadas:**
- Cores hard-coded espalhadas: `hsl(45 100% 50%)` (gold), `hsl(245 60% 55%)` (purple), `hsl(0 0% 100% / 0.08)` em CSS components (`.glass-card`, `.btn-primary`, `.step-active`, etc.) — **não trocam com tema**, só têm override `.light-theme`.
- `useThemeColors` mistura tokens dark e light em vez de ler CSS vars.
- Não há token semântico para "accent" do tema (gold é fixo no dark, purple aparece no light).
- Sombras só existem em light; dark depende de glassmorphism/blur.
- Backgrounds com `radial-gradient` no `body` são fixos do dark.

**Pontos que quebram em modo claro / em novos temas:**
- Qualquer `hsl(0 0% 100% / 0.X)` literal (rgba branco) em componentes inline.
- `.gold-gradient`, `.gold-text`, `.step-active` (sempre gold).
- Textos com cor literal em `style={{ color: 'hsl(...)' }}`.
- Scrollbar custom só tem 2 variantes.

## 2. Estrutura proposta do Theme System

**Princípio:** uma única fonte de verdade — CSS variables em `:root[data-theme="X"]`. Todo o resto consome via Tailwind semantic tokens ou CSS vars. Zero novos componentes; zero mudança de markup.

**Camadas de tokens (em `index.css`):**

```text
Layer 1 — Primitives (raw HSL, NÃO usadas por componentes)
  --gray-50..900, --gold-500, --purple-500, --rose-500...

Layer 2 — Semantic (consumidas por todo o app)
  Surfaces:  --background, --surface-1, --surface-2, --surface-3, --overlay
  Text:      --text-primary, --text-secondary, --text-muted, --text-subtle, --text-inverse
  Borders:   --border, --border-subtle, --border-strong
  Brand:     --brand, --brand-foreground, --brand-glow, --brand-soft
  Accent:    --accent, --accent-foreground
  Feedback:  --success, --warning, --destructive, --info (+ -foreground)
  Effects:   --shadow-sm/md/lg, --blur-glass, --glass-bg, --glass-border
  Radius:    --radius-sm/md/lg/xl
  Typography:--font-display, --font-body

Layer 3 — Component aliases (compat shadcn)
  --primary, --card, --popover, --muted, --sidebar-* → derivados dos semantic
```

**Arquitetura de aplicação:**
- `<html data-theme="dark-premium" | "light-clean" | "soft-beauty">`
- Cada tema redefine **somente Layer 2**; primitives e component aliases ficam constantes.
- `useThemeColors` é **refatorado para ler CSS vars** (`getComputedStyle` + memo) — assim não precisa duplicar mapas. Mantém a mesma API → zero mudança nos consumidores.
- `.glass-card`, `.btn-primary`, `.gold-*` em `index.css` passam a usar `var(--brand)`, `var(--surface-1)` etc., não cores literais.

## 3. Definição dos 3 temas

### Tema 1 — **Dark Premium** (default — barbearia/moderno)
- background `220 20% 6%`, surface `220 18% 10%`
- text-primary `0 0% 95%`, muted `220 10% 55%`
- brand `45 100% 50%` (gold), accent `45 100% 60%`
- border `0 0% 100% / 0.08`, glassmorphism ativo, blur 20px
- shadows: glow gold sutil

### Tema 2 — **Light Clean** (institucional/profissional)
- background `220 15% 97%`, surface `0 0% 100%`
- text-primary `220 20% 12%`, muted `220 10% 42%`
- brand `220 90% 45%` (azul corporativo) ou manter `220 20% 12%` (mono)
- accent `45 95% 50%` (gold sutil para CTA)
- border `220 12% 87%`, sem blur, **shadows reais** (sm/md/lg) para hierarquia
- scrollbar escuro sobre claro

### Tema 3 — **Soft Beauty** (estética/feminino)
- background `340 30% 97%` (rosa pó), surface `0 0% 100%`
- text-primary `340 25% 18%`, muted `340 10% 50%`
- brand `340 65% 60%` (rosa), accent `25 80% 70%` (pêssego/coral)
- border `340 20% 90%`, shadows quentes (`hsl(340 30% 30% / 0.06)`)
- radius maior (`--radius: 1.25rem`) → visual mais arredondado/orgânico
- typography: opcional swap para serif display (`Playfair`/`Cormorant`) só nos H1/H2 via `--font-display`

Todos os 3 garantem: contraste WCAG AA mínimo, todos componentes (cards, botões, inputs, modais, tabelas, badges, switches, tooltips, sidebar, drawer, chips, toasts) cobertos pelos mesmos semantic tokens.

## 4. Live Theme Studio

**Componente novo:** `<ThemeSwitcher />` — botão flutuante (FAB) discreto.

- **Posição:** canto inferior direito, `fixed bottom-4 right-4 z-40`, ícone paleta `Palette`.
- **Onde aparece:** site público `/`, loja, agendamento direto, `/vilanova`. **Não aparece** em `/admin` (admin segue config do tenant) nem em modais críticos de checkout.
- **UI:** popover/drawer pequeno com 3 cards visuais (preview de cor + nome + check no ativo), animação de transição suave.
- **Comportamento:**
  - Troca via `document.documentElement.dataset.theme = id` → CSS vars trocam → repaint nativo (sem re-render React).
  - Transição: `html { transition: background-color 250ms ease, color 250ms ease }` aplicada globalmente em propriedades de cor (whitelist para evitar lag em transform/opacity).
  - Persistência: `localStorage.setItem('theme', id)`. Lido em `main.tsx` antes do React montar (script inline em `index.html`) → **zero flash**.
  - Respeita config admin: se tenant forçou tema fixo numa área, `ThemeSwitcher` fica oculto naquela rota.

**Hook novo:** `useTheme()` → `{ theme, setTheme, themes }`. Coexiste com `ThemeContext` atual (que vira fallback p/ config tenant quando user não escolheu).

## 5. Arquitetura técnica recomendada

**Arquivos a criar:**
- `src/theme/tokens.css` — Layer 1 + Layer 2 (3 blocos `[data-theme="..."]`).
- `src/theme/themes.ts` — registro `{ id, name, preview: [hex,hex,hex], description }`.
- `src/contexts/UserThemeContext.tsx` — provider lendo localStorage; expõe `setTheme`.
- `src/components/ThemeSwitcher.tsx` — FAB + popover.
- Script inline em `index.html` (4 linhas) para set inicial pré-React.

**Arquivos a editar (mínimo, sem mudar markup):**
- `src/index.css` — substitui literais por `var(--...)` nas classes utilitárias (`.glass-card`, `.btn-*`, `.gold-*`, `.step-*`, scrollbar). Mantém nomes das classes.
- `src/hooks/useThemeColors.ts` — refatora p/ ler CSS vars (mesma API pública). Garante que **nenhum componente que usa o hook precisa mudar**.
- `src/contexts/ThemeContext.tsx` — passa a setar `data-theme` ao invés de classe `light-theme` (mantém compat: também adiciona classe).
- `tailwind.config.ts` — adiciona tokens semânticos novos como utilities (`bg-surface-1`, `text-text-muted`, etc.) para uso futuro; existentes preservados.
- `src/App.tsx` — monta `<UserThemeProvider>` e `<ThemeSwitcher />` nas rotas públicas.

**Performance:**
- Troca = ~3 propriedades CSS no `<html>`, repaint < 16ms.
- Sem React re-render (CSS vars são reativas no DOM).
- `useThemeColors` ganha `useSyncExternalStore` p/ atualizar quando `data-theme` muda (caso componentes inline precisem).

## 6. Pontos de atenção / riscos

| Risco | Mitigação |
|---|---|
| Componentes com `style={{ color: 'hsl(0 0% 100%)' }}` literais (Header, Drawer) | Passam a ler `useThemeColors()` (já fazem) — hook agora é theme-aware via CSS vars |
| `gold-gradient`/`step-active` quebram no Soft Beauty (gold em rosa fica feio) | Vira `var(--brand-gradient)` definido por tema |
| Glassmorphism (blur 20px) no Light Clean fica esquisito | `--blur-glass: 0px` no light; `.glass-card` usa `backdrop-filter: blur(var(--blur-glass))` |
| Flash de tema no load | Script inline em `index.html` antes do bundle |
| Conflito com `theme_mode` admin (light/dark global) | User theme tem precedência em rotas públicas; admin config continua valendo em `/admin` e quando user nunca escolheu |
| Sombras existem no light mas não no dark | Cada tema define `--shadow-sm/md/lg` (no dark = `none` ou glow) |
| Imagens/ilustrações com fundo fixo | Auditoria: nenhuma encontrada nos componentes core; manter check |
| Charts (recharts) com cores fixas | Já usam `tooltipBg/Border/Color` do hook → automático |
| Acessibilidade: contraste no Soft Beauty | Validar text-primary `340 25% 18%` sobre `340 30% 97%` = ratio > 12:1 ✓ |

**Não muda:** nenhum layout, hierarquia, responsividade, nenhuma lógica de negócio, nenhum componente é recriado. Apenas tokens + 1 componente novo (FAB) + 1 provider novo.

**Tempo estimado de implementação:** médio (~6-8 edições focadas, sem refactor de markup).
