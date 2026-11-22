# MOVVA Wellness

Site institucional estático em português. A rolagem nativa conduz sete capítulos. Na abertura, a foto de estúdio mostra a tela Início do app. O celular em CSS 3D acompanha as transições. Em Treinos, a rolagem ou o botão controla a demonstração do supino. Em Nutrição, a câmera enquadra o prato e mostra uma análise ilustrativa. A galeria após os capítulos reúne capturas atuais do aplicativo. O WebGL experimental fica disponível em desktop via `?renderer=webgl`.

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
