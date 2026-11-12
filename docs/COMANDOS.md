# Catálogo de comandos do TF37 Pro

Gerado por `tools/gen_comandos_md.mjs` a partir de `core/commands.js`, que por sua vez vem de
`tools/gen_catalog.py` (leitura textual do `CommandUtils.java` do Podsfine 1.2.3). Não editar à mão.

Evidência: **análise estática**, exceto os comandos marcados ✓, que o relógio real confirmou
(ACK `FD` com status 0 ou resposta `DF`) no "Testar tudo" de 2026-11-12.

Riscos: **seguro** (leitura ou ação transitória), **altera-config** (muda configuração persistente),
**perigoso** (OTA, fábrica, vínculo, apagar dados, transferência, códigos pessoais, desligar: nunca enviado).

Total: 209 comandos; 155 com codificador; 30 perigosos.

## Leituras (18)

| cmd/key | Comando | Método | Risco | Payload padrão | Descrição |
|---|---|---|---|---|---|
| F3/00 | Identidade do relógio ✓ | `getDeviceInfo` | seguro | (vazio) | Sem payload. |
| 00/00 | Recursos do relógio ✓ | `getDeviceFeatures` | seguro | 00 | Payload fixo: 00. |
| 02/06 | Configurações atuais ✓ | `getSettingInfo` | seguro | 01 | Payload fixo: 01. |
| 02/1F | Tempo de tela ✓ | `requestScreenTime` | seguro | 00 | Payload fixo: 00. |
| 02/46 | Opções de tempo de tela ✓ | `requestScreenTimeTypes` | seguro | 00 | Payload fixo: 00. |
| 11/00 | Bateria ✓ | `requestBattery` | seguro | 00 | Payload fixo: 00. |
| 14/00 | ID do produto ✓ | `getProductId` | seguro | 01 | Payload fixo: 01. |
| 02/17 | Nome e firmware ✓ | `getDeviceNameVersion` | seguro | (vazio) | Sem payload. |
| 02/47 | Pedir number alarms ✓ | `requestNumberAlarms` | seguro | 00 | Payload fixo: 00. |
| 02/48 | Pedir number saved álbum ✓ | `requestNumberSavedAlbum` | seguro | 00 | Payload fixo: 00. |
| 02/37 | Pedir all day lightup ✓ | `requestAllDayLightup` | seguro | 01 | Payload fixo: 01. |
| 02/34 | Pedir all day dnd ✓ | `requestAllDayDND` | seguro | 01 | Payload fixo: 01. |
| 02/3C | Pedir gaze distance ✓ | `requestGazeDistance` | seguro | 01 | Payload fixo: 01. |
| 02/3E | Pedir fitness lembrete ✓ | `requestFitnessReminder` | seguro | 01 | Payload fixo: 01. |
| 02/33 | Pedir medication lembrete ✓ | `requestMedicationReminder` | seguro | 01 | Payload fixo: 01. |
| 02/40 | Pedir reading lembrete ✓ | `requestReadingReminder` | seguro | 01 | Payload fixo: 01. |
| 02/42 | Pedir travel lembrete ✓ | `requestTravelReminder` | seguro | 01 | Payload fixo: 01. |
| 02/4A | Pedir hand wash ✓ | `requestHandWash` | seguro | 01 | Payload fixo: 01. |

## Saúde e medições (21)

| cmd/key | Comando | Método | Risco | Payload padrão | Descrição |
|---|---|---|---|---|---|
| 01/00 | Sincronizar tudo ✓ | `syncData` | seguro | 01 | Payload fixo: 01. |
| 02/02 | Envio automático de esporte ✓ | `setRealtimeSport` | seguro | 01 | Um byte por parâmetro: i. |
| 02/03 | Envio automático de saúde ✓ | `setRealtimeHealth` | seguro | 01 | Um byte por parâmetro: i. |
| 01/01 | Atividade de hoje ✓ | `getTodayData` | seguro | 01 | Payload fixo: 01. |
| 06/04 | Medir frequência cardíaca ✓ | `sendRequestHeartRate` | seguro | 01 | 1 liga, 0 desliga. Log do app oficial: "发送心率测量指令". |
| 06/16 | Medir HRV ✓ | `sendRequestHRV` | seguro | 01 | 1 liga, 0 desliga. Log do app oficial: "发送HRV测量指令". |
| 06/05 | Medir pressão arterial ✓ | `sendRequestBloodPressure` | seguro | 01 | 1 liga, 0 desliga. Log do app oficial: "发送血压测量指令". |
| 06/06 | Medir oxigênio no sangue ✓ | `sendRequestBloodOxygen` | seguro | 01 | 1 liga, 0 desliga. Log do app oficial: "发送血氧测量指令". |
| 06/12 | Medir estresse ✓ | `sendRequestPressure` | seguro | 01 | 1 liga, 0 desliga. Log do app oficial: "发送压力测量指令". |
| 06/15 | Medir temperatura ✓ | `sendRequestTempre` | seguro | 01 | 1 liga, 0 desliga. Log do app oficial: "发送体温测量指令". |
| 06/15 | Medir HRV (variante com bug: igual à temperatura) ✓ | `sendRequestHrv` | seguro | 01 | 1 liga, 0 desliga. Log do app oficial: "发送HRV测量指令". |
| 19/00 | Ler ciclo menstrual ✓ | `getMenstrual` | seguro | (vazio) | Sem payload. |
| 19/01 | Definir ciclo menstrual | `setMenstrual` | altera-config | — | Payload complexo: documentado, ainda não implementado no app. Log do app oficial: "设置女性健康: ". O método tem 2 variantes; usada a primeira. |
| 19/03 | Pedir ciclo menstrual ✓ | `requestMenstrual` | seguro | (vazio) | Sem payload. |
| 19/05 | Definir ciclo menstrual switch ✓ | `setMenstrualSwitch` | altera-config | 01 | 1 liga, 0 desliga. |
| 04/0D | Configurar sport linkage ✓ | `settingSportLinkage` | altera-config | 00 00 | Um byte por parâmetro: i, i2. |
| 04/1D | Pedir has gps ✓ | `requestHasGps` | seguro | 00 | Um byte por parâmetro: i. |
| 03/08 | Reqeust FC hig low ✓ | `reqeustHrHigLow` | altera-config | 01 | Payload fixo: 01. Log do app oficial: "请求心率过高过低提醒阈值". |
| 03/0A | Enviar FC automático hig low fla ✓ | `sendHrAutoHigLowFla` | altera-config | 00 78 00 2D | Liga e valor do alerta de FC alta e baixa. Os valores aceitos vêm de 03/08 → 03/09 (faixa e passo). Log do app oficial: "设置心率过高过低提醒阈值". |
| 04/19 | Chave do algoritmo GoMore | `sendGomoreKey` | perigoso | — | Payload complexo: documentado, ainda não implementado no app. Log do app oficial: "下发Gomore算法key值". |
| 04/15 | Pedir sport linkage type ✓ | `requestSportLinkageType` | seguro | (vazio) | Sem payload. Log do app oficial: "APP请求当前支持的运动". |

## Ações (9)

| cmd/key | Comando | Método | Risco | Payload padrão | Descrição |
|---|---|---|---|---|---|
| 06/00 | Encontrar relógio ✓ | `findWatch` | seguro | 01 | Payload fixo: 01. |
| 06/01 | Abrir câmera remota ✓ | `sendCameraOpen` | seguro | 01 | Payload fixo: 01. |
| 06/02 | Tirar foto (câmera remota) ✓ | `sendPhotoCap` | seguro | 01 | Payload fixo: 01. |
| 06/03 | Fechar câmera remota ✓ | `sendCameraClose` | seguro | 00 | Um byte por parâmetro: i. |
| 06/09 | Ler fone shtudown | `getEpShtudown` | perigoso | 01 | Payload fixo: 01. Log do app oficial: "发送请求设备关机指令". |
| 06/0A | Ler fone restart ✓ | `getEpRestart` | perigoso | 01 | Payload fixo: 01. Log do app oficial: "发送请求设备重启指令". |
| 06/0B | Parar find phone ✓ | `stopFindPhone` | altera-config | 01 | Payload fixo: 01. Log do app oficial: "发送退出找手机指令". |
| 06/0F | Parar find relógio ✓ | `stopFindWatch` | altera-config | 01 | Payload fixo: 01. Log do app oficial: "发送退出找手表指令". |
| 06/09 | Desligar o relógio | `sendShutDown` | perigoso | 01 | Payload fixo: 01. Log do app oficial: "发送关机指令". |

## Notificações (7)

| cmd/key | Comando | Método | Risco | Payload padrão | Descrição |
|---|---|---|---|---|---|
| 05/00 | Clima | `sendWeatherInfo` | altera-config | — | Payload complexo: documentado, ainda não implementado no app. |
| 05/01 | Clima (2) | `sendWeatherInfo` | altera-config | — | Payload complexo: documentado, ainda não implementado no app. |
| 05/02 | Clima (novo) | `sendNewWeatherInfo` | altera-config | — | Payload complexo: documentado, ainda não implementado no app. |
| 0A/00 | Enviar notificação (protocolo antigo) | `sendMsg` | perigoso | 00 01 6A F5 E4 4A 09 53 61 62 61 74 69 6E 68 6F 05 54 65 73 74 65 00 10 50 72 6F 74 6F 63 6F 6C 6F 20 61 6E 74 69 67 6F | id(2) horário(4) tam+app tam+título tam(2)+texto, limitado a MTU-12 (protocolo sem tipo de app). |
| 0A/00 | Enviar notificação de teste ✓ | `sendMsgNewProtocol` | seguro | 00 01 6A F5 E4 4A FF 09 53 61 62 61 74 69 6E 68 6F 05 54 65 73 74 65 00 1A 4F 6C C3 A1 20 64 6F 20 52 65 6C C3 B3 67 69 6F 20 53 61 62 61 74 69 6E 68 6F | id(2) horário(4, segundos) tipo(1) tam+app tam+título tam(2)+texto, limitado a 199 bytes na plataforma 10. Log do app oficial: "发送消息推送指令 appName: ". |
| 0A/01 | Apagar notificação ✓ | `sendDeleteMsg` | seguro | 00 01 | id da notificação (u16 big-endian). Log do app oficial: "删除消息 ". |
| 0E/00 | Simular chamada recebida ✓ | `sendPhoneCallState` | seguro | 01 09 53 61 62 61 74 69 6E 68 6F 09 30 30 30 30 30 30 30 30 30 | estado, tam+nome (UTF-8), tam+número (ASCII). O app oficial manda 1 ao tocar, 5 ao atender e 4 ao encerrar. Log do app oficial: "来电信息：". |

## Configurações (50)

| cmd/key | Comando | Método | Risco | Payload padrão | Descrição |
|---|---|---|---|---|---|
| 02/04 | Perfil do usuário | `setUserInfo` | altera-config | — | Payload complexo: documentado, ainda não implementado no app. |
| 02/05 | Meta de passos ✓ | `setStepTarget` | altera-config | 00 00 1F 40 | u32 big-endian. |
| 02/00 | Brilho da tela ✓ | `handBright` | altera-config | 00 | Um byte por parâmetro: i. |
| 02/00 | Levantar o pulso para acender ✓ | `raiseToWake` | altera-config | 01 01 E0 05 28 | Liga e janela de horário em minutos (u16 big-endian). |
| 02/01 | Idioma ✓ | `setLanguage` | altera-config | 00 | Um byte por parâmetro: i. |
| 02/07 | Configuração de sono ✓ | `sendSleepSetting` | altera-config | 01 05 28 01 E0 | Liga e janela do sono em minutos do dia (u16 big-endian). Igual à etiqueta 4 de 02/06. |
| 02/08 | Acertar data e hora ✓ | `sendSystemTime` | altera-config | 6A D8 D1 E6 | 4 bytes com ano-2000 (6 bits), mês, dia, hora, minuto e segundo empacotados em bits. Log do app oficial: "设置时间". |
| 02/09 | Restaurar padrão de fábrica | `sendRestoreFactory` | perigoso | 01 | Payload fixo: 01. |
| 02/0A | Pulso de uso ✓ | `sendWearing` | altera-config | 01 | Um byte por parâmetro: i. |
| 02/0B | FC automática ✓ | `sendHrAutoTestSetting` | altera-config | 01 00 00 3C 00 00 05 9F | Liga, um byte 0, intervalo em minutos e janela em minutos do dia. Igual à etiqueta 6 de 02/06. |
| 09/00 | Fuso horário ✓ | `setTimeZone` | altera-config | 01 03 | Sinal (0 = positivo, 1 = negativo) e valor absoluto em horas inteiras. Log do app oficial: "设置时区 offset: ". |
| 02/0C | Lembrete de sedentarismo ✓ | `sendSedentaryRemind` | altera-config | 00 01 00 64 3C 09 12 1F | Pausa, liga, 0, limite, tempo, hora inicial, hora final e dias. Igual à etiqueta 7 de 02/06. |
| 02/0D | Formato 24 horas ✓ | `set24Hour` | altera-config | 01 | Um byte por parâmetro: i. |
| 02/0E | Carrossel de telas ✓ | `setCarousel` | altera-config | 01 | Um byte por parâmetro: i. |
| 02/14 | Contato de SOS | `sendSosInfo` | altera-config | — | Payload complexo: documentado, ainda não implementado no app. |
| 02/1C | Definir tempo de tela ✓ | `sendScreenTime` | altera-config | 00 | Um byte por parâmetro: i. |
| 02/11 | Não perturbe | `setDND` | altera-config | 00 05 28 01 E0 | Liga e janela do não perturbe em minutos do dia. Igual à etiqueta 12 de 02/06. Log do app oficial: "发送设置勿扰指令". |
| 06/08 | Alarmes ✓ | `getAlarm` | seguro | 01 | Payload fixo: 01. Log do app oficial: "发送请求闹钟指令". |
| 02/10 | Definir alarme ✓ | `setAlarm` | altera-config | A0 00 | Alarmes (lista inteira: máximo/quantidade, toques e 5 bytes por alarme): o payload tem exatamente o formato da resposta de 06/08; a suíte regrava o que leu. Log do app oficial: "发送设置闹钟指令". |
| 02/12 | Unidades ✓ | `setUnit` | altera-config | 01 01 | Um byte por parâmetro: i, i2. |
| 13/00 | Lembretes suportados ✓ | `getSupportEventReminder` | seguro | 00 | Payload fixo: 00. |
| 13/01 | Ler event lembrete ✓ | `getEventReminder` | seguro | (vazio) | O app oficial reenvia os bytes que o relógio informou em 13/00 (lembretes suportados). |
| 02/13 | Perfil de som ✓ | `setProfile` | altera-config | 00 | Um byte por parâmetro: i. |
| 13/02 | Enviar event lembrete | `sendEventReminder` | altera-config | — | Payload complexo: documentado, ainda não implementado no app. |
| 13/03 | Enviar apagar event lembrete | `sendDeleteEventReminder` | perigoso | — | Payload complexo: documentado, ainda não implementado no app. |
| 02/20 | Configurar user name | `settingUserName` | altera-config | — | Payload complexo: documentado, ainda não implementado no app. Log do app oficial: "状态：：设置用户名". |
| 22/00 | Pedir drink lembrete ✓ | `requestDrinkReminder` | seguro | (vazio) | Sem payload. |
| 02/21 | Configurar drink water ✓ | `settingDrinkWater` | altera-config | 00 00 01 08 16 1F | Lembrete de beber água: o payload tem exatamente o formato da resposta de 22/00; a suíte regrava o que leu. Log do app oficial: "状态：：喝水提醒". |
| 02/23 | Código de pagamento | `sendPaymentCode` | perigoso | — | Payload complexo: documentado, ainda não implementado no app. |
| 02/24 | Código de rede social | `sendSocialCode` | perigoso | — | Payload complexo: documentado, ainda não implementado no app. |
| 02/26 | Definir msg red switch ✓ | `setMsgRedSwitch` | altera-config | 01 | 1 liga, 0 desliga. |
| 02/27 | Definir msg notify switch ✓ | `setMsgNotifySwitch` | altera-config | 01 | 1 liga, 0 desliga. |
| 02/28 | Definir msg notify all switch ✓ | `setMsgNotifyAllSwitch` | altera-config | 01 | 1 liga, 0 desliga. |
| 02/3A | Definir image quality ✓ | `setImageQuality` | altera-config | 00 | Um byte por parâmetro: i. |
| 02/39 | Enviar all day lightup ✓ | `sendAllDayLightup` | altera-config | 00 | Um byte por parâmetro: i. |
| 02/36 | Enviar all day dnd ✓ | `sendAllDayDND` | altera-config | 00 | Um byte por parâmetro: i. |
| 02/43 | Enviar estresse automático teste configurar ✓ | `sendPrAutoTestSetting` | altera-config | 01 00 00 3C 00 00 05 9F | Medição automática de estresse: liga, 0, intervalo em minutos e janela em minutos do dia. Igual à etiqueta 0x19 de 02/06. Log do app oficial: "发送设置压力自动测量指令". |
| 02/1D | Enviar oxigênio automático teste configurar | `sendBoAutoTestSetting` | altera-config | 01 00 00 3C 00 00 05 9F | Medição automática de oxigênio: liga, 0, intervalo em minutos e janela em minutos do dia. Igual à etiqueta 0x11 de 02/06. Log do app oficial: "发送设置血氧自动测量指令". |
| 02/4B | Enviar pressão automático teste configurar ✓ | `sendBPAutoTestSetting` | altera-config | 01 00 00 3C 00 00 05 9F | Medição automática de pressão arterial: liga, 0, intervalo em minutos e janela em minutos do dia. Igual à etiqueta 0x1A de 02/06. Log do app oficial: "发送设置血压自动测量指令". |
| 02/4C | Enviar scient sono teste configurar ✓ | `sendScientSleepTestSetting` | altera-config | 01 | Sono científico: 1 byte liga/desliga. Igual à etiqueta 0x1B de 02/06. Log do app oficial: "发送设置科学睡眠测量指令". |
| 02/4D | Enviar temperatura automático teste configurar | `sendTemperAutoTestSetting` | altera-config | 01 00 00 3C 00 00 05 9F | Medição automática de temperatura: liga, 0, intervalo em minutos e janela em minutos do dia. Igual à etiqueta 0x1C de 02/06. Log do app oficial: "发送设置体温自动测量指令". |
| 02/3B | Configurar gaze distance ✓ | `settingGazeDistance` | altera-config | 00 00 00 3C 08 00 16 00 | Lembrete de olhar longe: o payload tem exatamente o formato da resposta de 02/3C; a suíte regrava o que leu. |
| 02/3D | Configurar fitness lembrete ✓ | `settingFitnessReminder` | altera-config | 00 00 00 00 08 00 | Lembrete de exercício: o payload tem exatamente o formato da resposta de 02/3E; a suíte regrava o que leu. |
| 02/32 | Configurar medicine lembrete | `settingMedicineReminder` | altera-config | — | Payload complexo: documentado, ainda não implementado no app. |
| 02/3F | Configurar reading lembrete ✓ | `settingReadingReminder` | altera-config | 00 00 00 00 08 00 | Lembrete de leitura: o payload tem exatamente o formato da resposta de 02/40; a suíte regrava o que leu. |
| 02/41 | Configurar travel lembrete ✓ | `settingTravelReminder` | altera-config | 00 00 00 00 08 00 | Lembrete de viagem: o payload tem exatamente o formato da resposta de 02/42; a suíte regrava o que leu. |
| 02/49 | Configurar hand wash ✓ | `settingHandWash` | altera-config | 00 00 00 1E 08 00 16 00 | Lembrete de lavar as mãos: o payload tem exatamente o formato da resposta de 02/4A; a suíte regrava o que leu. |
| 02/2C | Definir calorie target | `setCalorieTarget` | altera-config | — | Payload complexo: documentado, ainda não implementado no app. Log do app oficial: "发送设置上路卡路里目标指令,值为:". |
| 02/2D | Definir distance target | `setDistanceTarget` | altera-config | — | Payload complexo: documentado, ainda não implementado no app. Log do app oficial: "发送设置距离目标指令". |
| 02/4E | Enviar hrv automático teste configurar | `sendHrvAutoTestSetting` | altera-config | 01 00 00 3C 00 00 05 9F | Medição automática de HRV: liga, 0, intervalo em minutos e janela em minutos do dia. Igual à etiqueta 0x1D de 02/06. |

## Mostradores (19)

| cmd/key | Comando | Método | Risco | Payload padrão | Descrição |
|---|---|---|---|---|---|
| 0B/03 | Trocar mostrador | `setWatchFace` | altera-config | — | Payload complexo: documentado, ainda não implementado no app. Log do app oficial: "状态：设置表盘: ". |
| 0B/05 | Definir custom relógio mostrador | `setCustomWatchFace` | perigoso | — | Payload complexo: documentado, ainda não implementado no app. Log do app oficial: "状态：设置自定义表盘". |
| 0B/05 | Definir custom relógio face8 | `setCustomWatchFace8` | perigoso | — | Payload complexo: documentado, ainda não implementado no app. Log do app oficial: "状态：设置自定义表盘". |
| 32/01 | Mostradores de crachá ✓ | `getBadgeFaceInfo` | seguro | 01 | Payload fixo: 01. |
| 32/07 | Ler crachá single mostrador info ✓ | `getBadgeSingleFaceInfo` | seguro | 01 | Payload fixo: 01. |
| 32/0A | Ler crachá single image count ✓ | `getBadgeSingleImageCount` | seguro | 01 | Payload fixo: 01. |
| 32/0C | Iniciar crachá push image | `startBadgePushImage` | perigoso | 00 | Payload fixo: 00. Log do app oficial: "===下发电子吧唧多图开始推送指令===". |
| 32/0D | Parar crachá push image | `stopBadgePushImage` | perigoso | 00 | Payload fixo: 00. Log do app oficial: "==下发电子吧唧多图结束推送指令====". |
| 32/03 | Definir ele single pic mostrador | `setEleSinglePicFace` | perigoso | (vazio) | Sem payload. |
| 32/04 | Definir ele mulit pic mostrador | `setEleMulitPicFace` | perigoso | — | Payload complexo: documentado, ainda não implementado no app. |
| 32/05 | Definir ele vídeo mostrador | `setEleVideoFace` | perigoso | — | Payload complexo: documentado, ainda não implementado no app. |
| 0B/01 | Mostrador atual ✓ | `getFaceCode` | seguro | 01 | Payload fixo: 01. |
| 0B/04 | Mostrador personalizado ✓ | `getCustomizeFaceInfo` | seguro | 01 | Payload fixo: 01. |
| 2B/01 | Vídeo trans ✓ | `videoTrans` | altera-config | 01 | 1 liga, 0 desliga. Log do app oficial: "发送相机关闭视频流===". |
| 2C/01 | Enviar vídeo iniciar ✓ | `sendVideoStart` | altera-config | 00 00 00 | Um byte por parâmetro: i, i2, i3. |
| 2C/04 | Definir vídeo mostrador info8 | `setVideoFaceInfo8` | perigoso | — | Payload complexo: documentado, ainda não implementado no app. Log do app oficial: "状态：设置视频表盘信息8". |
| 2C/04 | Definir vídeo mostrador info2 | `setVideoFaceInfo2` | perigoso | — | Payload complexo: documentado, ainda não implementado no app. Log do app oficial: "状态：设置视频表盘信息8". |
| 2C/03 | Ler vídeo mostrador info ✓ | `getVideoFaceInfo` | seguro | 01 | Payload fixo: 01. |
| 2C/06 | Enviar multi iniciar ✓ | `sendMultiStart` | altera-config | 00 00 00 | Um byte por parâmetro: i, i2, i3. |

## Mídia e câmera (9)

| cmd/key | Comando | Método | Risco | Payload padrão | Descrição |
|---|---|---|---|---|---|
| 2D/00 | Ler s dcard statuts ✓ | `getSDcardStatuts` | seguro | 01 | Payload fixo: 01. |
| 2E/00 | Enviar new álbum pid | `sendNewAlbumPid` | perigoso | — | Payload complexo: documentado, ainda não implementado no app. |
| 2E/01 | Enviar apagar álbum pid | `sendDelAlbumPid` | perigoso | — | Payload complexo: documentado, ainda não implementado no app. |
| 07/07 | Sincronizar áudio | `syncAudio` | perigoso | — | Payload complexo: documentado, ainda não implementado no app. Log do app oficial: "playState： ". |
| 3A/00 | Pedir barrage info ✓ | `requestBarrageInfo` | seguro | 00 | Payload fixo: 00. |
| 3A/01 | Enviar barrage info | `sendBarrageInfo` | altera-config | — | Payload complexo: documentado, ainda não implementado no app. Log do app oficial: "发送弹幕信息==". |
| 36/02 | Enviar receive gravação ✓ | `sendReceiveRecord` | altera-config | 01 | 1 liga, 0 desliga. |
| 36/04 | Apagar gravação arquivo | `deleteRecordFile` | perigoso | — | Payload complexo: documentado, ainda não implementado no app. |
| 36/04 | Apagar allow gravação arquivo | `deleteAllowRecordFile` | perigoso | 01 | 1 liga, 0 desliga. |

## Fones (37)

| cmd/key | Comando | Método | Risco | Payload padrão | Descrição |
|---|---|---|---|---|---|
| 25/00 | Pedir fone battery ✓ | `requestEpBattery` | seguro | (vazio) | Sem payload. |
| 25/01 | Enviar upload fone battery ✓ | `sendUploadEpBattery` | altera-config | (vazio) | Sem payload. |
| 25/02 | Pedir fone eq configurar ✓ | `requestEpEQSetting` | seguro | (vazio) | Sem payload. |
| 25/03 | Enviar fone eq configurar | `sendEpEQSetting` | altera-config | — | Payload complexo: documentado, ainda não implementado no app. |
| 25/04 | Enviar upload fone eq configurar ✓ | `sendUploadEpEQSetting` | altera-config | (vazio) | Sem payload. |
| 25/05 | Pedir fone find left ✓ | `requestEpFindLeft` | seguro | (vazio) | Sem payload. |
| 25/06 | Pedir fone find right ✓ | `requestEpFindRight` | seguro | (vazio) | Sem payload. |
| 25/07 | Pedir fone anc configurar ✓ | `requestEpANCSetting` | seguro | (vazio) | Sem payload. |
| 25/08 | Definir fone anc configurar | `setEpANCSetting` | altera-config | — | Payload complexo: documentado, ainda não implementado no app. |
| 25/09 | Upload fone anc configurar ✓ | `uploadEpANCSetting` | altera-config | (vazio) | Sem payload. |
| 25/0A | Pedir ep3 d áudio configurar ✓ | `requestEp3DAudioSetting` | seguro | (vazio) | Sem payload. |
| 25/0B | Definir ep3 d áudio configurar | `setEp3DAudioSetting` | altera-config | — | Payload complexo: documentado, ainda não implementado no app. |
| 25/0C | Upload ep3 d áudio configurar ✓ | `uploadEp3DAudioSetting` | altera-config | (vazio) | Sem payload. |
| 25/0D | Pedir fone squelch configurar ✓ | `requestEpSquelchSetting` | seguro | 01 | 1 liga, 0 desliga. |
| 25/0E | Definir fone squelch configurar | `setEpSquelchSetting` | altera-config | — | Payload complexo: documentado, ainda não implementado no app. |
| 25/0F | Upload fone squelch configurar ✓ | `uploadEpSquelchSetting` | altera-config | (vazio) | Sem payload. |
| 25/10 | Pedir fone touch wakeup switch ✓ | `requestEpTouchWakeupSwitch` | seguro | (vazio) | Sem payload. |
| 25/11 | Definir fone touch wakeup switch ✓ | `setEpTouchWakeupSwitch` | altera-config | 01 | 1 liga, 0 desliga. |
| 25/12 | Upload fone touch wakeup switch ✓ | `uploadEpTouchWakeupSwitch` | altera-config | (vazio) | Sem payload. |
| 25/13 | Pedir fone beep switch ✓ | `requestEpBeepSwitch` | seguro | (vazio) | Sem payload. |
| 25/14 | Definir fone beep switch ✓ | `setEpBeepSwitch` | altera-config | (vazio) | Sem payload. |
| 25/15 | Upload fone beep switch ✓ | `uploadEpBeepSwitch` | altera-config | (vazio) | Sem payload. |
| 25/16 | Pedir fone key fun configurar ✓ | `requestEpKeyFunSetting` | seguro | (vazio) | Sem payload. |
| 25/17 | Definir fone key fun configurar | `setEpKeyFunSetting` | altera-config | — | Payload complexo: documentado, ainda não implementado no app. O método tem 2 variantes; usada a primeira. |
| 25/18 | Upload fone key fun configurar ✓ | `uploadEpKeyFunSetting` | altera-config | (vazio) | Sem payload. |
| 25/19 | Pedir fone find left close ✓ | `requestEpFindLeftClose` | seguro | (vazio) | Sem payload. |
| 25/1A | Pedir fone find right close ✓ | `requestEpFindRightClose` | seguro | (vazio) | Sem payload. |
| 25/1B | Pedir fone device name ✓ | `requestEpDeviceName` | seguro | (vazio) | Sem payload. |
| 25/1C | Enviar fone device name | `sendEpDeviceName` | altera-config | — | Payload complexo: documentado, ainda não implementado no app. |
| 26/01 | Enviar fone world time zone | `sendEpWorldTimeZone` | altera-config | — | Payload complexo: documentado, ainda não implementado no app. |
| 26/02 | Pedir fone world time zone ✓ | `requestEpWorldTimeZone` | seguro | (vazio) | Sem payload. |
| 26/03 | Upload fone world time zone ✓ | `uploadEpWorldTimeZone` | altera-config | (vazio) | Sem payload. |
| 27/00 | Pedir fone brightness ✓ | `requestEpBrightness` | seguro | (vazio) | Sem payload. |
| 27/02 | Enviar fone brightness | `sendEpBrightness` | altera-config | — | Payload complexo: documentado, ainda não implementado no app. |
| 27/03 | Pedir fone volume ✓ | `requestEpVolume` | seguro | (vazio) | Sem payload. |
| 27/05 | Enviar fone volume | `sendEpVolume` | altera-config | — | Payload complexo: documentado, ainda não implementado no app. |
| 27/06 | Pedir fm mtu ✓ | `requestFmMtu` | seguro | (vazio) | Sem payload. |

## IA e voz (26)

| cmd/key | Comando | Método | Risco | Payload padrão | Descrição |
|---|---|---|---|---|---|
| 31/00 | Enviar IA mostrador answer | `sendAiDialAnswer` | altera-config | — | Payload complexo: documentado, ainda não implementado no app. |
| 31/04 | Notice IA mostrador speech fail ✓ | `noticeAiDialSpeechFail` | altera-config | 00 | Payload fixo: 00. |
| 31/06 | Notice enviar IA pic fail ✓ | `noticeSendAIPicFail` | altera-config | 00 | Payload fixo: 00. |
| 31/07 | Pedir IA mostrador params ✓ | `requestAiDialParams` | seguro | 00 | Payload fixo: 00. |
| 31/0A | Enviar IA mostrador style | `sendAiDialStyle` | altera-config | — | Payload complexo: documentado, ainda não implementado no app. |
| 37/06 | Enviar IA definir alarme | `sendAiSetAlarm` | altera-config | — | Payload complexo: documentado, ainda não implementado no app. |
| 37/07 | Enviar IA alarme date | `sendAiAlarmDate` | altera-config | — | Payload complexo: documentado, ainda não implementado no app. |
| 30/07 | Enviar iniciar tradução ✓ | `sendStartTranslate` | altera-config | 00 | Payload fixo: 00. |
| 30/08 | Enviar end tradução ✓ | `sendEndTranslate` | altera-config | 00 | Payload fixo: 00. |
| 30/09 | Enviar gravação fail ✓ | `sendRecordFail` | altera-config | 00 | Payload fixo: 00. |
| 30/05 | Enviar soure texto | `sendSoureText` | altera-config | — | Payload complexo: documentado, ainda não implementado no app. Log do app oficial: "发送翻译源=====text== ". |
| 30/06 | Enviar tradução texto | `sendTranslateText` | altera-config | — | Payload complexo: documentado, ainda não implementado no app. Log do app oficial: "发送翻译结果=====text== ". |
| 30/0A | Enviar language code ✓ | `sendLanguageCode` | altera-config | 00 00 | Um byte por parâmetro: i, i2. |
| 1E/00 | Enviar chat GPT quzi texto | `sendChatGptQuziText` | altera-config | — | Payload complexo: documentado, ainda não implementado no app. Log do app oficial: "AIChat 聊天 下发回答的问题：". |
| 1E/02 | Enviar chat GPT quzi iniciar | `sendChatGptQuziStart` | altera-config | — | Payload complexo: documentado, ainda não implementado no app. |
| 1E/03 | Enviar chat GPT quzi end | `sendChatGptQuziEnd` | altera-config | 00 | Payload fixo: 00. |
| 1E/01 | Enviar chat GPT asr texto | `sendChatGptAsrText` | altera-config | — | Payload complexo: documentado, ainda não implementado no app. |
| 1E/07 | Notice speech fail ✓ | `noticeSpeechFail` | altera-config | 00 | Payload fixo: 00. |
| 1E/10 | Enviar todo lembrete | `sendTODOReminder` | altera-config | — | Payload complexo: documentado, ainda não implementado no app. |
| 1E/11 | Apagar todo lembrete | `deleteTODOReminder` | perigoso | — | Payload complexo: documentado, ainda não implementado no app. |
| 3B/01 | Enviar sim t language ✓ | `sendSimTLanguage` | altera-config | 00 00 | Um byte por parâmetro: i, i2. |
| 3B/08 | Enviar sim soure texto | `sendSimSoureText` | altera-config | — | Payload complexo: documentado, ainda não implementado no app. Log do app oficial: "sim发送翻译源=====text== ". |
| 3B/09 | Enviar sim tradução texto | `sendSimTranslateText` | altera-config | — | Payload complexo: documentado, ainda não implementado no app. Log do app oficial: "sim发送翻译结果=====text== ". |
| 3B/0A | Enviar sim iniciar tradução ✓ | `sendSimStartTranslate` | altera-config | 00 | Payload fixo: 00. |
| 3B/0B | Enviar sim end tradução ✓ | `sendSimEndTranslate` | altera-config | 00 | Payload fixo: 00. |
| 3B/0C | Enviar sim gravação fail ✓ | `sendSimRecordFail` | altera-config | 00 | Payload fixo: 00. |

## Sistema (5)

| cmd/key | Comando | Método | Risco | Payload padrão | Descrição |
|---|---|---|---|---|---|
| 0D/00 | QR code do relógio ✓ | `getQrCodeInfo` | seguro | 00 | Payload fixo: 00. |
| 0D/01 | Redefinir QR code | `resetQrCode` | perigoso | 00 | Um byte por parâmetro: i. |
| 10/00 | Enviar system version | `sendSystemVersion` | perigoso | — | Payload complexo: documentado, ainda não implementado no app. |
| 17/02 | Enviar logo value | `sendLogoValue` | altera-config | — | Payload complexo: documentado, ainda não implementado no app. |
| 18/06 | Enviar localização (GPS) | `sendGPS` | altera-config | — | Payload complexo: documentado, ainda não implementado no app. |

## Vínculo (2)

| cmd/key | Comando | Método | Risco | Payload padrão | Descrição |
|---|---|---|---|---|---|
| 08/00 | Vincular relógio | `sendBindDevice` | perigoso | — | Payload complexo: documentado, ainda não implementado no app. |
| 08/01 | Desvincular relógio | `sendUnbindDevice` | perigoso | 01 | Payload fixo: 01. |

## Atualização (OTA) (6)

| cmd/key | Comando | Método | Risco | Payload padrão | Descrição |
|---|---|---|---|---|---|
| 0C/00 | Código único de OTA ✓ | `getOtaUniqueCode` | seguro | 01 | Payload fixo: 01. |
| 0C/01 | Código de produto OTA ✓ | `getOtaProductCode` | seguro | 01 | Payload fixo: 01. |
| 0C/02 | Enviar version info | `sendVersionInfo` | perigoso | — | Payload complexo: documentado, ainda não implementado no app. |
| 0C/03 | Estado de OTA ✓ | `getDeviceOtaStatus` | seguro | 01 | Payload fixo: 01. |
| 20/01 | Informações de OTA e chip ✓ | `requestOTAInfo` | seguro | (vazio) | Sem payload. |
| 20/02 | Iniciar atualização de firmware | `requestStartOTA` | perigoso | 01 | Payload fixo: 01. |

## Respostas interpretadas pelo app

| cmd/key | Nome | Formato |
|---|---|---|
| 00/00 | recursos | Bloco de recursos (bits por função) e plataforma. |
| 02/17 | nome e firmware | [tam][versão][tam][projeto]. |
| 20/01 | OTA e chip | prefixo(4) tam+versão tam+chip. |
| 20/02 | resposta de OTA | 1 bateria baixa, 2 música, 3 chamada; outro valor: atualização começa. |
| 11/00 | bateria | Porcentagem no último byte. |
| 11/01 | bateria (relato) | Porcentagem no último byte. |
| 11/03 | modo economia | Estado do modo economia. |
| 11/05 | carregando | Estado de carga. |
| 11/06 | bateria baixa | 1 = abaixo de 20%, outro = abaixo de 10%. |
| 14/00 | produto | "cliente-produto" em texto. |
| 01/02 | sincronização: início | O relógio começou a enviar dados. |
| 01/03 | sincronização: fim | O relógio terminou de enviar dados. |
| 03/00 | histórico de FC | data(2) qtd(2) + registros de 8 bytes. |
| 03/09 | limites de alerta de FC | Alto: liga, máx, mín, passo, atual; baixo: idem. |
| 03/0F | estado da medição de FC | 1 medindo, 0 parado. |
| 03/12 | estado da medição de SpO2 | 1 medindo, 0 parado. |
| 03/15 | estado da medição de pressão | 1 medindo, 0 parado. |
| 03/29 | estado da medição de estresse | 1 medindo, 0 parado. |
| 03/2A | valor ao vivo | [tipo, valor]: 1 = bpm, 2 = SpO2 %. |
| 04/00 | atividade de hoje | passos, metros e calorias (u32). |
| 04/01 | passos por hora | data(2) qtd(2) + 12 bytes por hora. |
| 04/02 | sono | data(2) qtd(2) início(2) + segmentos. |
| 06/08 | alarmes | máx/atual, toque e 5 bytes por alarme. |

## OTA (só documentado)

O Podsfine atualiza o firmware por `ble/ota/*` (`OTAUtils`, `Cus5610OTAUtils`, `MultipleOTAUtils`).
Neste relógio o bloco de recursos marca a variante 5610, então o OTA usaria o serviço `1106`
(`1107` notificação, `1108` escrita), depois de `20/02` (iniciar). A resposta de `20/02`: 1 bateria
baixa, 2 música tocando, 3 em chamada; outro valor, a atualização começa. Nada disso é implementado
ou enviado pelo Relógio Sabatinho.
