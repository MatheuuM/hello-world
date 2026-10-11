# MOVVA Wellness — Correção das faces soltas da câmera 3D

Data: 2026-10-11. Site oficial: https://www.movvawellness.com.br.
Branch: `fix/movva-camera-wall-continuity-20261011`. Base de produção: `82910a7e2d1c610a50e0a969df10080092e0893b`.

## Reprodução e origem

Print do usuário: barras de metal desconectadas no lado direito do módulo, uma pequena face perto da união câmera/traseira e linha pontilhada horizontal prolongando a borda inferior da câmera.

Diagnóstico comprovado via Chromium em 940×763, progresso normalizado 0.178:
- Câmera projetada até aproximadamente x=796 px.
- Uma face de lateral em x=822–827 px.
- Outra face horizontal inferior em x=772–913 px.
- As 48 faces estavam presentes, mas algumas estavam muito longe da plataforma original.
- A geometria usava `transform-origin: center center`, mas aplicava `translate(-50%,-50%)` **depois** de `rotateZ/rotateX`, deslocando o centro na base local já rotacionada. Era a origem física dos elementos fora do celular; não uma textura do app.

## Correção cirúrgica

`phone-shell.js`: somente a ordem da composição da transformação CSS das faces de perímetro da câmera foi alterada para
`translate3d(center) translate(-50%,-50%) rotateZ(tangent) rotateX(90deg)`.

Isso posiciona a face no centro correto **antes** de girar em seu próprio centro. Plataforma elevada, três lentes, flash, LiDAR, corpo MOVVA, marca, cores, screenshots, capítulos e coreografia de scroll permanecem intactos. Não foi alterada a geometria WebGL alternativa; o site usa CSS3D como renderizador principal.

## Evidências

- Comparação visual Chromium antes/depois no mesmo viewport e mesma pose: barra vertical externa e traço pontilhado inferiores desapareceram; câmera manteve plataforma e lentes em 3D.
- Teste `qa/camera-wall-integrity.cjs`: **4 viewports × 10 ângulos = 40 poses por navegador**, tanto Chromium quanto WebKit. 48 faces da câmera; nenhuma excedeu a margem de contenção (máximo ~6.5 px em perfil); cinco controles laterais e quatro detalhes de antena permaneceram junto à carcaça.
- `qa/stage1a-shell.cjs`: Chromium **52 verificações/48 capturas**; WebKit **52 verificações/48 capturas**, sem erros de JavaScript.
- `qa/motion-composition-qa.cjs`: verificar resultado final no navegador antes do merge e documentá-lo no pós-deploy.
- Teste em navegador emulado não substitui avaliação num iPhone físico.

## Controles de publicação

1. Verificar `master` contra este branch antes de merge e preservar SHA anterior em `backup/prod-before-camera-wall-20261011`.
2. Merge com SHA esperado; esperar Vercel production `READY`.
3. Confirmar aliases `www.movvawellness.com.br` e domínio raiz; HTTP 200/TLS válido e redirect 308 para `www`.
4. Confirmar `phone-shell.js` publicado contém a transformação corrigida.
5. Smoke de navegador em Chrome e Safari no endereço oficial, incluindo cena Connected e câmera 3D visível; nenhuma falha de JavaScript.
6. Se o pós-deploy falhar, restaurar a versão de produção anterior.

**Escopo estrito:** nenhuma mudança em DNS, e-mail, Supabase, app nativo ou dados de usuários.
