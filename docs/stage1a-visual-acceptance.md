# MOVVA — Parecer final da Etapa 1A (carcaça 3D)

**Resultado:** validação técnica concluída, **aprovação visual pendente / BLOQUEADA**.  
**Produção:** permanece em `3741e7032aee1c357380dbe6bda92442884601c0`. Nenhum protótipo foi promovido.

## Abordagens comparadas

1. **`refine/phone-chassis-1a`**, 12px de espessura compartilhada, frentes e traseiras alinhadas e tampas laterais recuadas. GitHub Actions run 38018291027: Chromium e WebKit concluídos com PASS, 21 checks e 21 screenshots por navegador. Porém o screenshot `1440-profile.png` ainda mostra linha lateral destacada da carcaça: **não aprovado visualmente**.
2. **`prototype/3d-unibody-stage1a`**, contorno arredondado paramétrico, 45 trechos em três camadas (132 faces CSS 3D). Run 38014882147: ambos navegadores capturados sem exceções JS; 39 screenshots por motor, status `CAPTURED`, não certificação visual. O Chrome melhora o volume do perfil. **WebKit falha na pose isolada a 90° (corpo invisível)**; numa pose de scroll real, aparece a silhueta auxiliar — ainda exige acabamento e compatibilidade.

## Bloqueadores para aprovação da Etapa 1A
- Linha da lateral ainda parece peça separada no patch simples.
- Perfil exato a 90° não mantém a geometria exibida consistentemente no WebKit.
- Junção dos chanfros/bordas no modelo paramétrico ainda apresenta excesso de linhas nas vistas de três quartos; precisa unificar material e oclusão.
- A 1A só termina quando os mesmos ângulos (frontal, 30°, 55°, 85°/90°, 135° e traseira) funcionarem nos dois navegadores, em desktop e mobile, com movimento de scroll real e em pausa.

## Próxima intervenção proposta: 1A.2 (somente geometria)
Continuar a partir do protótipo paramétrico, eliminar artefatos das junções, corrigir renderização WebKit de perfil sem silhueta simplificada aparente, conferir continuação exata da frente à lateral e da lateral à traseira. Repetir as capturas do Stage 0. Nada de câmeras, textura final ou novos motion graphics nesta rodada.

A arte do app permanece em `assets/{home,training,nutrition,evolution,circle}.webp`; as capturas finais podem ser trocadas depois, com revisão de recortes e cards que mudarem de posição.
