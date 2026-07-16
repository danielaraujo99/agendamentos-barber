# Plano: PWA funcional e universal

## Objetivo
Deixar o app instalável em Android, iOS 16.4+, Windows, macOS e Linux, com ícone próprio, splash screen, tela cheia (standalone) e suporte a Web Push em background — **sem alterar design, componentes ou lógica de negócio**, e sem quebrar o preview do Lovable.

## Escopo do que muda
Apenas arquivos de infraestrutura PWA. Nenhuma tela, cor, fonte, componente ou fluxo de fila/atendimento é tocado.

## Etapas

### 1. Auditoria do que já existe
Já existem no projeto: `public/manifest.json`, `public/push-handlers.js`, `src/lib/pwa.ts`, `src/hooks/useWebPush.ts`, `send-push` edge function e `InstallAppButton`. Vou revisar cada um e consolidar, removendo duplicidades e conflitos (ex.: dois service workers registrados ao mesmo tempo).

### 2. Manifest completo e correto
Reescrever `public/manifest.json` com:
- `name`, `short_name`, `description`, `lang: pt-BR`
- `display: "standalone"`, `orientation: "portrait"`, `theme_color`, `background_color` alinhados ao tema atual
- `start_url: "/"`, `scope: "/"`, `id: "/"`
- Ícones 192, 384, 512 + **maskable** (Android adaptive icon)
- `screenshots` (form_factor wide + narrow) para install prompt rico
- `shortcuts` para "Fila" e "Agendar"

### 3. Ícones e Apple touch icons
Gerar/validar em `public/`:
- `icon-192.png`, `icon-384.png`, `icon-512.png`, `icon-maskable-512.png`
- `apple-touch-icon.png` (180x180) — iOS não lê manifest para ícone
- `favicon.ico`, `favicon.svg`

### 4. Meta tags no `index.html`
Adicionar no `<head>` (sem tocar em nada visual):
- `<link rel="manifest">`
- `<meta name="theme-color">` (light + dark)
- `<link rel="apple-touch-icon">`
- `<meta name="apple-mobile-web-app-capable" content="yes">`
- `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`
- `<meta name="apple-mobile-web-app-title">`
- `<meta name="mobile-web-app-capable" content="yes">`
- Open Graph e Twitter Card já corretos

### 5. Service Worker único e seguro
Estratégia: **um único SW** em `/sw.js` responsável por:
- Cache do app shell (NetworkFirst para HTML, CacheFirst para assets hasheados)
- Recebimento de Web Push (evento `push` + `notificationclick`)
- Auto-update (`skipWaiting` + `clients.claim`)
- Exclusão explícita de `/~oauth`, edge functions e chamadas Supabase

Uso do `vite-plugin-pwa` com `generateSW` para gerar tudo automaticamente.

### 6. Guards de registro (crítico para não quebrar preview Lovable)
Wrapper único de registro que **recusa** registrar quando:
- `!import.meta.env.PROD`
- Está dentro de iframe
- Hostname começa com `id-preview--` ou `preview--`
- Hostname termina em `.lovableproject.com`, `.lovable.app` de preview, `.lovableproject-dev.com`
- URL tem `?sw=off` (kill switch manual)

Em qualquer contexto recusado: faz `unregister()` de SWs antigos para limpar cache poluído.

### 7. Kill-switch para instalações antigas
Manter um handler que, ao detectar SW obsoleto, faz `unregister` + limpa caches próprios (sem tocar em caches de outros workers como o de push).

### 8. Web Push em background (já parcialmente pronto)
- Consolidar `push-handlers.js` dentro do SW principal (evita 2 SWs concorrentes)
- Manter `send-push` edge function (VAPID) já existente
- Fluxo: usuário aceita → salva subscription em `push_subscriptions` → edge function envia no evento da fila
- Suporte a `requireInteraction: true`, `vibrate`, `badge`, `actions` (Abrir/Dispensar)

### 9. iOS 16.4+ específico
- Só funciona push **após** instalar PWA (Adicionar à Tela de Início)
- Detectar iOS + Safari + não-standalone → mostrar tooltip discreto explicando o passo (usando o `InstallAppButton` já existente, sem redesign)

### 10. Botão de instalação (já existe)
Revisar `InstallAppButton.tsx` apenas para:
- Capturar `beforeinstallprompt` corretamente
- Mostrar instruções nativas iOS
- Esconder quando já instalado (`display-mode: standalone`)
- **Zero mudança visual**

### 11. Validação
- Lighthouse PWA audit ≥ 90
- Chrome DevTools → Application → Manifest sem erros
- Testar install: Chrome desktop, Chrome Android, Safari iOS 16.4+
- Testar push: enviar via `send-push`, verificar chegada com app fechado
- Testar preview Lovable: garantir que SW **não** registra e não polui

## Detalhes técnicos

**Arquivos que serão criados/alterados:**
```text
public/manifest.json          (reescrito)
public/icon-192.png           (novo/verificado)
public/icon-512.png           (verificado)
public/icon-maskable-512.png  (novo)
public/apple-touch-icon.png   (novo)
index.html                    (só <head>, meta tags PWA)
vite.config.ts                (config vite-plugin-pwa)
src/lib/pwa.ts                (wrapper de registro com guards)
src/main.tsx                  (chamar registro do wrapper)
public/push-handlers.js       (mesclado ao SW gerado ou mantido separado só p/ push)
```

**Arquivos que NÃO serão tocados:**
- Nenhum componente de UI (exceto ajuste mínimo no `InstallAppButton` já pedido)
- Nenhuma página, rota, hook de negócio
- `src/index.css`, tema, cores, fontes
- Edge functions da fila, agenda, WhatsApp
- Schema do banco

**Riscos mitigados:**
- SW quebrando preview Lovable → guards de hostname + `?sw=off`
- Cache antigo em usuário já instalado → kill-switch worker no mesmo path
- Dois SWs concorrentes (push + shell) → unificação em um só
- iOS sem push → detecção + orientação de instalação

## Resultado esperado
- Instalável em Android/iOS/Desktop com ícone e splash corretos
- Abre em standalone (sem barra do browser)
- Push funciona com app fechado (Android imediato, iOS após instalar)
- Preview do Lovable continua funcionando normalmente
- Zero regressão visual ou funcional
