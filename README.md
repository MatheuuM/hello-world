# MOVVA Wellness

Site institucional estático em português. A rolagem nativa conduz sete capítulos. Na abertura, o componente IPhoneMockup mostra a tela Início do app. A posição da rolagem controla o ângulo do aparelho. O supino avança e retrocede com a rolagem. Em Nutrição, a página mostra a tela do app. A cena pode reproduzir uma tomada do enquadramento pela posição da rolagem quando o vídeo estiver configurado. A galeria após os capítulos reúne capturas atuais do aplicativo. O WebGL experimental fica disponível em desktop via `?renderer=webgl`.

A opção `/?video=local#nutrition` abre uma tomada de teste escolhida no próprio navegador. O arquivo permanece local e a rolagem controla a posição do vídeo.

## Acessibilidade

A versão `/?visual=estatico` mostra os sete capítulos sem animação por rolagem. O conteúdo também é legível sem JavaScript. O modo padrão mantém o 3D e respeita a preferência do sistema por movimento reduzido ao pular para um capítulo.

## QA

Com Node.js e Playwright (Chromium e WebKit) disponíveis, instale as dependências e sirva a versão compilada do site.

```sh
npm ci
npm run build
node qa/serve-static.cjs dist
```

Em outro terminal, rode o fluxo de lançamento. Use `QA_ENGINE=chromium` ou `QA_ENGINE=webkit` para executar um navegador por vez e `QA_OUTPUT` para escolher a pasta de capturas.

```sh
node qa/launch-browser.cjs
```

O sitemap lista o domínio oficial. As páginas de privacidade, termos e suporte têm rotas próprias.
