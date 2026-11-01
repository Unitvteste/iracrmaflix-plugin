# IracemaFlix — plugin para Nuvio

Plugin no formato Kamirama/Nuvio. Ele é composto por `manifest.json` e providers JavaScript executados no runtime QuickJS do Nuvio.

## Instalação

Publique esta pasta em um repositório Git público e adicione no Nuvio a URL raw de `manifest.json`:

```text
Nuvio → Configurações → Conteúdo e descoberta → Plugins → Adicionar repositório
```

Exemplo de URL após publicar:

```text
https://raw.githubusercontent.com/SEU_USUARIO/iracemaflix-plugin/main/manifest.json
```

## Compatibilidade

Os providers exportam a interface Kamirama (`getStreams`, além dos parsers e configurações quando disponíveis). Eles não dependem de Express, Node APIs, processos filhos, `.env` ou filesystem. Segredos não são colocados no plugin, porque todo código de plugin fica disponível no dispositivo do usuário.

Os providers e seus domínios devem ser usados somente quando autorizados e de acordo com a legislação aplicável.


## Cobertura atual

O pacote inclui os 14 providers do Kamirama e o FSHD portado do adapter embutido no IracemaFlix, totalizando 17 scrapers. MegaEmbed e MyEmbed/FSHD foram portados para QuickJS. Mgeb/PlayerFlix, RedeFlix direto e resolvers de TV continuam no backend Node até serem portados e testados.

## TV ao vivo

Canais ao vivo, EPG e eventos são rotas do addon Stremio/backend. O contrato de scraper do Kamirama/Nuvio não substitui os catálogos de canais do manifesto Stremio; por isso os canais devem ser instalados pela URL do addon Stremio, não por este repositório de providers.


## Provider do backend completo

O scraper `iracemaflix-backend` é a ponte principal. Nas configurações do Nuvio, informe a URL pública do backend IracemaFlix. Ele chama as rotas `/stream/movie/...` e `/stream/series/...` e devolve os resultados agregados por todos os adapters configurados no addon. Assim os providers privados permanecem no backend e não são expostos no código do plugin.
