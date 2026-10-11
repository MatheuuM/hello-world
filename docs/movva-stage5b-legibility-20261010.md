# MOVVA Wellness — Etapa 5B: acabamento e legibilidade dos cards

Data: 2026-10-10. Repositório: `MatheuuM/hello-world`. Destino: `www.movvawellness.com.br`.

## Escopo implementado
- `motion-studio.css`: melhoria de tipografia (eyebrows, títulos curtos, textos de apoio e etiquetas) dos cards 3D nas larguras desktop, mobile e 320px; vidro menos desfocado (12px → 5px), sombras e bordas discretamente refinadas.
- `qa/stage5b-legibility-qa.cjs`: testes de presença de 2 cards por seção, tamanhos CSS, overflow interno e externo em Connected, Training, Nutrition, Evolution e Circle, nas larguras 1440, 393 e 320.
- `.github/workflows/stage1a-qa.yml`: incluir regressão de legibilidade no pipeline Chromium/WebKit e capturas de evidência.

## Evidências
- Chrome: Stage 5B **15 amostras / 30 cards**, sem cortes internos ou regressão de largura. Safari/WebKit: mesmos resultados. Quatro capturas por navegador.
- Composição: **28 amostras por navegador**, sem interseções de cards com texto/navegação.
- Scroll cinematográfico: **32 verificações por navegador** e 11 capturas por navegador, sem perda da reversibilidade.
- Scripts não alterados, estrutura do telefone 3D e conteúdo dos cinco capítulos preservados.
- Medição de fonte CSS e teste de composição em navegador simulado não substituem avaliação perceptual em iPhone físico; ela permanece pendente.

## Publicação
Aprovado tecnicamente para merge `master` e release direto no domínio, conforme solicitação do usuário. Antes de publicar: branch de backup para o `master` vigente. Após publicar: Vercel `READY`, commit confirmado, HTTPS 200, apex 308 e arquivos CSS atualizados verificados.

## Próxima etapa
Revisão de imagens finais do aplicativo quando disponíveis, UX visual nas seções e medição do movimento num iPhone real. Não afirmar ganho de FPS por reduzir o blur sem benchmark físico.
