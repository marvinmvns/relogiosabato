# Próximos passos

Ordem sugerida, do menos para o mais arriscado.

## 1. Captura HCI do app real (prioridade)

1. Carregar relógio e celular.
2. Celular: Configurações → Opções do desenvolvedor → **Ativar registro de
   rastreamento HCI Bluetooth**. Desligar e ligar o Bluetooth. (Sem root, o adb não
   consegue ativar isso: `setprop persist.bluetooth.btsnooplogmode` é recusado.)
3. Abrir o Podsfine, conectar o TF37 Pro e fazer ações isoladas, anotando o horário
   de cada uma: sincronizar, ver bateria, mudar hora/idioma, buscar relógio, etc.
4. `bash tools/pull_hci_log.sh`
5. `.venv/bin/python tools/btsnoop_att.py private/captures/btsnoop_hci-*.log`

Uma ação por vez facilita ligar cada comando ao seu efeito.

## 2. Descompilar o app (feito em 2026-11-12)

jadx 1.5.6 → `private/decompiled/podsfine-1.2.3/` (`--no-res`; 116 de 9.385 classes com
erro). Resultado em [PROTOCOLO.md](PROTOCOLO.md). Falta: ler `NotifyWriteUtils` (parser
das respostas) e `AckPackageConfigUtils` (ACKs) e confirmar tudo em captura.

## 3. Identificar o chip sem abrir o relógio

Buscar o FCC ID `2BD94-TF37PRO` na base da FCC (fccid.io / fcc.report): as
**fotos internas** costumam mostrar o SoC e a memória flash.

## 4. Firmware

Só depois de saber o chip. Caminhos possíveis: pacote de OTA baixado pelo app
(binário, não código-fonte) ou leitura física da flash, que exige abrir o relógio e
tem risco de inutilizá-lo. Código-fonte do firmware não é recuperável, só binário
para desmontar.

## Regras de segurança

- Não escrever bytes desconhecidos em `2AAD`/`1108`: um deles pode iniciar OTA ou reset.
- Sessões curtas e com bateria carregada.
- Guardar capturas e relatórios em `private/`/`output/`; não publicar.
