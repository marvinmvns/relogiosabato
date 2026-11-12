#!/usr/bin/env bash
# Puxa o btsnoop_hci.log do celular via "adb bugreport" e salva em private/captures/.
# Pré-requisito: no celular, Opções do desenvolvedor -> "Ativar registro de
# rastreamento HCI Bluetooth", desligar/ligar o Bluetooth e usar o app antes.
# Com mais de um dispositivo no adb (ex.: USB + Wi-Fi), defina ANDROID_SERIAL.
set -euo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
ADB="${ADB:-$(command -v adb || echo "$HOME/Android/Sdk/platform-tools/adb")}"
DEST="$ROOT/private/captures"
STAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$DEST"

"$ADB" get-state >/dev/null
echo "Gerando bugreport (pode levar 1-3 minutos)..."
"$ADB" bugreport "$DEST/bugreport-$STAMP.zip"

LOG_PATH="$(unzip -Z1 "$DEST/bugreport-$STAMP.zip" | grep -E 'btsnoop_hci\.log$' | head -n1 || true)"
if [[ -z "$LOG_PATH" ]]; then
    echo "Nenhum btsnoop_hci.log no bugreport. O registro HCI está ativado?" >&2
    exit 1
fi
unzip -p "$DEST/bugreport-$STAMP.zip" "$LOG_PATH" > "$DEST/btsnoop_hci-$STAMP.log"
echo "Log: $DEST/btsnoop_hci-$STAMP.log"
echo "Analise com: .venv/bin/python tools/btsnoop_att.py $DEST/btsnoop_hci-$STAMP.log"
