# MOVVA Wellness

Site institucional estático em português. A rolagem nativa conduz sete capítulos com um celular em CSS 3D, capturas do app e dados ilustrativos. O supino reto usa quadros do vídeo de demonstração oficial da MOVVA, selecionados pela posição da rolagem. A Nutrição revela recortes de fotos de refeições da tela do app. O WebGL experimental fica disponível em desktop via `?renderer=webgl`, com CSS 3D como alternativa.

## Acessibilidade

A versão `/?visual=estatico` mostra os sete capítulos sem animação por rolagem. O conteúdo também é legível sem JavaScript. O modo padrão mantém o 3D e respeita a preferência do sistema por movimento reduzido ao pular para um capítulo.

## QA

Com Node.js e Playwright (Chromium e WebKit) disponíveis, inicie o servidor na raiz do site.

```sh
node qa/serve-static.cjs .
```

Em outro terminal, rode o fluxo de lançamento. Use `QA_ENGINE=chromium` ou `QA_ENGINE=webkit` para executar um navegador por vez e `QA_OUTPUT` para escolher a pasta de capturas.

```sh
node qa/launch-browser.cjs
```

O sitemap lista o domínio oficial. As páginas de privacidade, termos e suporte têm rotas próprias.
