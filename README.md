# Relógio Sabatinho

Laboratório do relógio/pulseira **TF37 Pro**: protocolo Bluetooth LE extraído do app
oficial **Podsfine**, apps próprios para Android e desktop que conversam com o relógio,
medem e registram tudo, e a documentação técnica completa.

> Projeto pessoal de estudo e interoperabilidade. Material do fabricante (APK, código
> descompilado, capturas) fica em `private/`, fora do git, e não deve ser redistribuído.

## O que já se sabe

| Item | Valor | Evidência |
|---|---|---|
| Modelo | TF37PRO, FCC ID `2BD94-TF37PRO`, Shenzhen Hongsheng wang Technology | manual |
| Firmware | `V1.8`, projeto `Z16_TF37Pro_HSW[TF37Pro]_Style1_Podsfine` | relógio real |
| Chip | **Bluetrum AB569X** (autoidentificado) | relógio real |
| App oficial | Podsfine `com.lianhezhuli.podsFine` 1.2.3 | Play Store |
| GATT | `18AC` comandos (`2AAD` escrita, `2AAC` notificação), `1106` arquivos (variante 5610), `180F` bateria | relógio real |
| Quadros | DF/FD, checksum no byte 3, versão `0x04`, ACK de 10 bytes | 374 quadros em captura + sessões do app |
| Comandos | 209 extraídos; 137 codificados; 79 confirmados no relógio (6 configurações regravadas sem alterar); 30 perigosos bloqueados | [COMANDOS.md](docs/COMANDOS.md) |

## Estrutura

```
core/          núcleo compartilhado (JS puro, testado): protocolo, catálogo, medições,
               sessão, registro, "Testar tudo" e a interface
apps/mobile/   app Android (Capacitor 8)            → Relógio Sabatinho.apk
apps/desktop/  app Linux, Windows e macOS (Electron 45)
tools/         ferramentas Python (BLE com Bleak, captura HCI, decodificador DF/FD)
               e geradores do catálogo e do COMANDOS.md
docs/          documentação (comece por TECNICO.md)
tests/         testes das ferramentas Python
private/       APK, código descompilado, capturas, sessões (ignorado pelo git)
```

## Apps

Os dois apps têm as mesmas abas:

- **Relógio:** conectar, mostrador com bateria e firmware, o que o relógio informou e os recursos.
- **Medir:** frequência cardíaca sob demanda (valor ao vivo, série, mínimo, média e
  máximo), atividade de hoje, passos por hora e histórico de FC.
- **Comandos:** os 209 comandos com busca e grupos. Cada um mostra o payload, a resposta
  esperada e a última resposta. Os perigosos aparecem, mas ficam travados.
- **Testes:** "Testar tudo" com relatório por comando. Desliga o que liga, e salva o
  relatório em Markdown e JSON.
- **Registro:** cada pacote bruto, cada quadro decodificado, cada envio, ACK, medição e
  evento, gravado em JSONL por sessão.

```sh
cd core && npm test                                   # 34 testes do núcleo
cd apps/mobile && npm ci && npm run android           # APK debug
cd apps/desktop && npm ci && npm start                # desktop
```

Detalhes de compilação e plataformas: [docs/TECNICO.md](docs/TECNICO.md).

## Documentação

| Documento | Conteúdo |
|---|---|
| [TECNICO.md](docs/TECNICO.md) | Arquitetura, GATT, quadros, medições, registro, build, segurança |
| [COMANDOS.md](docs/COMANDOS.md) | Os 209 comandos com payload, risco e confirmação |
| [PROTOCOLO.md](docs/PROTOCOLO.md) | Como o protocolo foi descoberto (código + captura) |
| [CAPTURAS.md](docs/CAPTURAS.md) | Captura HCI no Realme (`*#800#`) e o que ela mostrou |
| [DISPOSITIVO.md](docs/DISPOSITIVO.md) | Perfil do relógio |
| [APP_PODSFINE.md](docs/APP_PODSFINE.md) | Análise do app oficial |
| [ENGENHARIA_REVERSA.md](docs/ENGENHARIA_REVERSA.md) | Síntese da engenharia reversa: sensores, canais, perigosos, bugs do app oficial, privacidade |
| [comandos/](docs/comandos/) | Cada comando enviado e recebido explicado byte a byte (`ENVIADOS_1/2.md`, `RECEBIDOS.md`, `SISTEMA_OTA_REDE.md`, JSON) |
| [PESQUISA_GITHUB.md](docs/PESQUISA_GITHUB.md) | Projetos e documentos relacionados |
| [REPOS_RELACIONADOS.md](docs/REPOS_RELACIONADOS.md) | Primeira busca de repositórios |
| [PROXIMOS_PASSOS.md](docs/PROXIMOS_PASSOS.md) | O que falta e os riscos |

## Ferramentas Python (PC)

```sh
python3 -m venv .venv && .venv/bin/python -m pip install -r requirements.txt
.venv/bin/python tools/scan.py                          # anúncios "TF37"
.venv/bin/python tools/gatt_discover.py <MAC>           # serviços (sem escrever)
.venv/bin/python tools/listen.py <MAC> --seconds 30     # notificações
.venv/bin/python tools/btsnoop_att.py <log.cfa> --json saida.json
python3 tools/dfdecode.py saida.json --summary          # quadros DF/FD
python3 tests/test_btsnoop_att.py && python3 tests/test_dfdecode.py
```

## Referências

- [develmts/Jieli-watch-research](https://github.com/develmts/Jieli-watch-research): mesmo
  formato DF/FD num relógio HryFine. Sem licença: consultar, não copiar.
- [kagaimiq/bluetrum-tools](https://github.com/kagaimiq/bluetrum-tools): chips Bluetrum.
- [Bleak](https://github.com/hbldh/bleak), [Capacitor](https://capacitorjs.com),
  [capacitor-community/bluetooth-le](https://github.com/capacitor-community/bluetooth-le),
  [Electron](https://www.electronjs.org).
