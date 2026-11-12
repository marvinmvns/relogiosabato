// GERADO por tools/gen_catalog.py a partir do CommandUtils.java do Podsfine 1.2.3.
// Não editar à mão: rode o gerador de novo. Metadados apenas (sem código do fabricante).
export const CATALOG = [
 {
  "method": "getDeviceInfo",
  "line": 245,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 243,
  "key": 0,
  "kind": "empty",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "getDeviceFeatures",
  "line": 249,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 0,
  "key": 0,
  "kind": "fixed",
  "fixed": [
   0
  ],
  "paramOrder": []
 },
 {
  "method": "setUserInfo",
  "line": 253,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 2,
  "key": 4,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "setStepTarget",
  "line": 273,
  "params": [
   {
    "javaType": "int",
    "name": "i"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 2,
  "key": 5,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "getSettingInfo",
  "line": 277,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 2,
  "key": 6,
  "kind": "fixed",
  "fixed": [
   1
  ],
  "paramOrder": []
 },
 {
  "method": "syncData",
  "line": 281,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 1,
  "key": 0,
  "kind": "fixed",
  "fixed": [
   1
  ],
  "paramOrder": []
 },
 {
  "method": "handBright",
  "line": 285,
  "params": [
   {
    "javaType": "int",
    "name": "i"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 2,
  "key": 0,
  "kind": "u8",
  "fixed": [],
  "paramOrder": [
   "i"
  ]
 },
 {
  "method": "raiseToWake",
  "line": 289,
  "params": [
   {
    "javaType": "int",
    "name": "i"
   },
   {
    "javaType": "int",
    "name": "i2"
   },
   {
    "javaType": "int",
    "name": "i3"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 2,
  "key": 0,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "setLanguage",
  "line": 293,
  "params": [
   {
    "javaType": "int",
    "name": "i"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 2,
  "key": 1,
  "kind": "u8",
  "fixed": [],
  "paramOrder": [
   "i"
  ]
 },
 {
  "method": "setRealtimeSport",
  "line": 297,
  "params": [
   {
    "javaType": "int",
    "name": "i"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 2,
  "key": 2,
  "kind": "u8",
  "fixed": [],
  "paramOrder": [
   "i"
  ]
 },
 {
  "method": "setRealtimeHealth",
  "line": 301,
  "params": [
   {
    "javaType": "int",
    "name": "i"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 2,
  "key": 3,
  "kind": "u8",
  "fixed": [],
  "paramOrder": [
   "i"
  ]
 },
 {
  "method": "findWatch",
  "line": 305,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 6,
  "key": 0,
  "kind": "fixed",
  "fixed": [
   1
  ],
  "paramOrder": []
 },
 {
  "method": "getTodayData",
  "line": 309,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 1,
  "key": 1,
  "kind": "fixed",
  "fixed": [
   1
  ],
  "paramOrder": []
 },
 {
  "method": "sendCameraOpen",
  "line": 313,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 6,
  "key": 1,
  "kind": "fixed",
  "fixed": [
   1
  ],
  "paramOrder": []
 },
 {
  "method": "sendPhotoCap",
  "line": 317,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 6,
  "key": 2,
  "kind": "fixed",
  "fixed": [
   1
  ],
  "paramOrder": []
 },
 {
  "method": "sendCameraClose",
  "line": 321,
  "params": [
   {
    "javaType": "int",
    "name": "i"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 6,
  "key": 3,
  "kind": "u8",
  "fixed": [],
  "paramOrder": [
   "i"
  ]
 },
 {
  "method": "sendRequestHeartRate",
  "line": 325,
  "params": [
   {
    "javaType": "boolean",
    "name": "z"
   }
  ],
  "hint": "发送心率测量指令",
  "variants": 1,
  "cmd": 6,
  "key": 4,
  "kind": "bool",
  "fixed": [],
  "paramOrder": [
   "z"
  ]
 },
 {
  "method": "sendRequestHRV",
  "line": 330,
  "params": [
   {
    "javaType": "boolean",
    "name": "z"
   }
  ],
  "hint": "发送HRV测量指令",
  "variants": 1,
  "cmd": 6,
  "key": 22,
  "kind": "bool",
  "fixed": [],
  "paramOrder": [
   "z"
  ]
 },
 {
  "method": "sendRequestBloodPressure",
  "line": 335,
  "params": [
   {
    "javaType": "boolean",
    "name": "z"
   }
  ],
  "hint": "发送血压测量指令",
  "variants": 1,
  "cmd": 6,
  "key": 5,
  "kind": "bool",
  "fixed": [],
  "paramOrder": [
   "z"
  ]
 },
 {
  "method": "sendRequestBloodOxygen",
  "line": 340,
  "params": [
   {
    "javaType": "boolean",
    "name": "z"
   }
  ],
  "hint": "发送血氧测量指令",
  "variants": 1,
  "cmd": 6,
  "key": 6,
  "kind": "bool",
  "fixed": [],
  "paramOrder": [
   "z"
  ]
 },
 {
  "method": "sendRequestPressure",
  "line": 345,
  "params": [
   {
    "javaType": "boolean",
    "name": "z"
   }
  ],
  "hint": "发送压力测量指令",
  "variants": 1,
  "cmd": 6,
  "key": 18,
  "kind": "bool",
  "fixed": [],
  "paramOrder": [
   "z"
  ]
 },
 {
  "method": "sendRequestTempre",
  "line": 350,
  "params": [
   {
    "javaType": "boolean",
    "name": "z"
   }
  ],
  "hint": "发送体温测量指令",
  "variants": 1,
  "cmd": 6,
  "key": 21,
  "kind": "bool",
  "fixed": [],
  "paramOrder": [
   "z"
  ]
 },
 {
  "method": "sendRequestHrv",
  "line": 355,
  "params": [
   {
    "javaType": "boolean",
    "name": "z"
   }
  ],
  "hint": "发送HRV测量指令",
  "variants": 1,
  "cmd": 6,
  "key": 21,
  "kind": "bool",
  "fixed": [],
  "paramOrder": [
   "z"
  ]
 },
 {
  "method": "sendWeatherInfo",
  "line": 360,
  "params": [
   {
    "javaType": "String",
    "name": "str"
   },
   {
    "javaType": "int",
    "name": "i"
   },
   {
    "javaType": "int",
    "name": "i2"
   },
   {
    "javaType": "int",
    "name": "i3"
   },
   {
    "javaType": "int",
    "name": "i4"
   },
   {
    "javaType": "int",
    "name": "i5"
   },
   {
    "javaType": "int",
    "name": "i6"
   },
   {
    "javaType": "byte",
    "name": "b"
   },
   {
    "javaType": "String",
    "name": "str2"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 5,
  "key": 0,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "sendWeatherInfo",
  "line": 399,
  "params": [
   {
    "javaType": "List<NetWeatherBean.DayWeatherBean>",
    "name": "list"
   },
   {
    "javaType": "String",
    "name": "str"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 5,
  "key": 1,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "sendNewWeatherInfo",
  "line": 441,
  "params": [
   {
    "javaType": "NetWeatherBean.DayWeatherBean",
    "name": "dayWeatherBean"
   },
   {
    "javaType": "String",
    "name": "str"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 5,
  "key": 2,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "sendSleepSetting",
  "line": 495,
  "params": [
   {
    "javaType": "SleepSettingBean",
    "name": "sleepSettingBean"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 2,
  "key": 7,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "sendSystemTime",
  "line": 501,
  "params": [],
  "hint": "设置时间",
  "variants": 1,
  "cmd": 2,
  "key": 8,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "sendRestoreFactory",
  "line": 512,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 2,
  "key": 9,
  "kind": "fixed",
  "fixed": [
   1
  ],
  "paramOrder": []
 },
 {
  "method": "sendWearing",
  "line": 516,
  "params": [
   {
    "javaType": "int",
    "name": "i"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 2,
  "key": 10,
  "kind": "u8",
  "fixed": [],
  "paramOrder": [
   "i"
  ]
 },
 {
  "method": "sendBindDevice",
  "line": 520,
  "params": [
   {
    "javaType": "byte[]",
    "name": "bArr"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 8,
  "key": 0,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "sendUnbindDevice",
  "line": 524,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 8,
  "key": 1,
  "kind": "fixed",
  "fixed": [
   1
  ],
  "paramOrder": []
 },
 {
  "method": "sendHrAutoTestSetting",
  "line": 528,
  "params": [
   {
    "javaType": "HrAutoTestBean",
    "name": "hrAutoTestBean"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 2,
  "key": 11,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "setTimeZone",
  "line": 534,
  "params": [
   {
    "javaType": "int",
    "name": "i"
   }
  ],
  "hint": "设置时区 offset: ",
  "variants": 1,
  "cmd": 9,
  "key": 0,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "sendSedentaryRemind",
  "line": 539,
  "params": [
   {
    "javaType": "SedentaryRemindBean",
    "name": "sedentaryRemindBean"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 2,
  "key": 12,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "sendMsg",
  "line": 543,
  "params": [
   {
    "javaType": "int",
    "name": "i"
   },
   {
    "javaType": "long",
    "name": "j"
   },
   {
    "javaType": "String",
    "name": "str"
   },
   {
    "javaType": "String",
    "name": "str2"
   },
   {
    "javaType": "String",
    "name": "str3"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 10,
  "key": 0,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "sendMsgNewProtocol",
  "line": 588,
  "params": [
   {
    "javaType": "int",
    "name": "i"
   },
   {
    "javaType": "int",
    "name": "i2"
   },
   {
    "javaType": "long",
    "name": "j"
   },
   {
    "javaType": "String",
    "name": "str"
   },
   {
    "javaType": "String",
    "name": "str2"
   },
   {
    "javaType": "String",
    "name": "str3"
   }
  ],
  "hint": "发送消息推送指令 appName: ",
  "variants": 1,
  "cmd": 10,
  "key": 0,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "sendDeleteMsg",
  "line": 623,
  "params": [
   {
    "javaType": "int",
    "name": "i"
   }
  ],
  "hint": "删除消息 ",
  "variants": 1,
  "cmd": 10,
  "key": 1,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "setWatchFace",
  "line": 628,
  "params": [
   {
    "javaType": "String",
    "name": "str"
   }
  ],
  "hint": "状态：设置表盘: ",
  "variants": 1,
  "cmd": 11,
  "key": 3,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "setCustomWatchFace",
  "line": 633,
  "params": [
   {
    "javaType": "CustomizeWatchFaceBean",
    "name": "customizeWatchFaceBean"
   }
  ],
  "hint": "状态：设置自定义表盘",
  "variants": 1,
  "cmd": 11,
  "key": 5,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "setCustomWatchFace8",
  "line": 640,
  "params": [
   {
    "javaType": "CustomizeWatchFaceBean",
    "name": "customizeWatchFaceBean"
   }
  ],
  "hint": "状态：设置自定义表盘",
  "variants": 1,
  "cmd": 11,
  "key": 5,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "getBadgeFaceInfo",
  "line": 647,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 50,
  "key": 1,
  "kind": "fixed",
  "fixed": [
   1
  ],
  "paramOrder": []
 },
 {
  "method": "getBadgeSingleFaceInfo",
  "line": 651,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 50,
  "key": 7,
  "kind": "fixed",
  "fixed": [
   1
  ],
  "paramOrder": []
 },
 {
  "method": "getBadgeSingleImageCount",
  "line": 655,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 50,
  "key": 10,
  "kind": "fixed",
  "fixed": [
   1
  ],
  "paramOrder": []
 },
 {
  "method": "startBadgePushImage",
  "line": 659,
  "params": [],
  "hint": "===下发电子吧唧多图开始推送指令===",
  "variants": 1,
  "cmd": 50,
  "key": 12,
  "kind": "fixed",
  "fixed": [
   0
  ],
  "paramOrder": []
 },
 {
  "method": "stopBadgePushImage",
  "line": 664,
  "params": [],
  "hint": "==下发电子吧唧多图结束推送指令====",
  "variants": 1,
  "cmd": 50,
  "key": 13,
  "kind": "fixed",
  "fixed": [
   0
  ],
  "paramOrder": []
 },
 {
  "method": "setEleSinglePicFace",
  "line": 669,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 50,
  "key": 3,
  "kind": "empty",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "setEleMulitPicFace",
  "line": 673,
  "params": [
   {
    "javaType": "BadgeCustomeFaceBean",
    "name": "badgeCustomeFaceBean"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 50,
  "key": 4,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "setEleVideoFace",
  "line": 677,
  "params": [
   {
    "javaType": "BadgeCustomeFaceBean",
    "name": "badgeCustomeFaceBean"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 50,
  "key": 5,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "getFaceCode",
  "line": 681,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 11,
  "key": 1,
  "kind": "fixed",
  "fixed": [
   1
  ],
  "paramOrder": []
 },
 {
  "method": "getCustomizeFaceInfo",
  "line": 685,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 11,
  "key": 4,
  "kind": "fixed",
  "fixed": [
   1
  ],
  "paramOrder": []
 },
 {
  "method": "set24Hour",
  "line": 689,
  "params": [
   {
    "javaType": "int",
    "name": "i"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 2,
  "key": 13,
  "kind": "u8",
  "fixed": [],
  "paramOrder": [
   "i"
  ]
 },
 {
  "method": "setCarousel",
  "line": 693,
  "params": [
   {
    "javaType": "int",
    "name": "i"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 2,
  "key": 14,
  "kind": "u8",
  "fixed": [],
  "paramOrder": [
   "i"
  ]
 },
 {
  "method": "getOtaUniqueCode",
  "line": 697,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 12,
  "key": 0,
  "kind": "fixed",
  "fixed": [
   1
  ],
  "paramOrder": []
 },
 {
  "method": "getOtaProductCode",
  "line": 701,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 12,
  "key": 1,
  "kind": "fixed",
  "fixed": [
   1
  ],
  "paramOrder": []
 },
 {
  "method": "sendVersionInfo",
  "line": 705,
  "params": [
   {
    "javaType": "byte[]",
    "name": "bArr"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 12,
  "key": 2,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "getDeviceOtaStatus",
  "line": 709,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 12,
  "key": 3,
  "kind": "fixed",
  "fixed": [
   1
  ],
  "paramOrder": []
 },
 {
  "method": "getQrCodeInfo",
  "line": 713,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 13,
  "key": 0,
  "kind": "fixed",
  "fixed": [
   0
  ],
  "paramOrder": []
 },
 {
  "method": "resetQrCode",
  "line": 717,
  "params": [
   {
    "javaType": "int",
    "name": "i"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 13,
  "key": 1,
  "kind": "u8",
  "fixed": [],
  "paramOrder": [
   "i"
  ]
 },
 {
  "method": "sendSystemVersion",
  "line": 721,
  "params": [
   {
    "javaType": "int",
    "name": "i"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 16,
  "key": 0,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "sendSosInfo",
  "line": 725,
  "params": [
   {
    "javaType": "String",
    "name": "str"
   },
   {
    "javaType": "String",
    "name": "str2"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 2,
  "key": 20,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "sendScreenTime",
  "line": 738,
  "params": [
   {
    "javaType": "int",
    "name": "i"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 2,
  "key": 28,
  "kind": "u8",
  "fixed": [],
  "paramOrder": [
   "i"
  ]
 },
 {
  "method": "requestScreenTime",
  "line": 742,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 2,
  "key": 31,
  "kind": "fixed",
  "fixed": [
   0
  ],
  "paramOrder": []
 },
 {
  "method": "requestScreenTimeTypes",
  "line": 746,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 2,
  "key": 70,
  "kind": "fixed",
  "fixed": [
   0
  ],
  "paramOrder": []
 },
 {
  "method": "requestBattery",
  "line": 750,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 17,
  "key": 0,
  "kind": "fixed",
  "fixed": [
   0
  ],
  "paramOrder": []
 },
 {
  "method": "sendPhoneCallState",
  "line": 754,
  "params": [
   {
    "javaType": "int",
    "name": "i"
   },
   {
    "javaType": "String",
    "name": "str"
   },
   {
    "javaType": "String",
    "name": "str2"
   }
  ],
  "hint": "来电信息：",
  "variants": 1,
  "cmd": 14,
  "key": 0,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "setDND",
  "line": 773,
  "params": [
   {
    "javaType": "DNDRaiseBean",
    "name": "dNDRaiseBean"
   }
  ],
  "hint": "发送设置勿扰指令",
  "variants": 1,
  "cmd": 2,
  "key": 17,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "getAlarm",
  "line": 778,
  "params": [],
  "hint": "发送请求闹钟指令",
  "variants": 1,
  "cmd": 6,
  "key": 8,
  "kind": "fixed",
  "fixed": [
   1
  ],
  "paramOrder": []
 },
 {
  "method": "setAlarm",
  "line": 783,
  "params": [
   {
    "javaType": "AlarmBean",
    "name": "alarmBean"
   }
  ],
  "hint": "发送设置闹钟指令",
  "variants": 1,
  "cmd": 2,
  "key": 16,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "setUnit",
  "line": 800,
  "params": [
   {
    "javaType": "int",
    "name": "i"
   },
   {
    "javaType": "int",
    "name": "i2"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 2,
  "key": 18,
  "kind": "u8",
  "fixed": [],
  "paramOrder": [
   "i",
   "i2"
  ]
 },
 {
  "method": "getSupportEventReminder",
  "line": 804,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 19,
  "key": 0,
  "kind": "fixed",
  "fixed": [
   0
  ],
  "paramOrder": []
 },
 {
  "method": "getEventReminder",
  "line": 808,
  "params": [
   {
    "javaType": "byte[]",
    "name": "bArr"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 19,
  "key": 1,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "setProfile",
  "line": 812,
  "params": [
   {
    "javaType": "int",
    "name": "i"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 2,
  "key": 19,
  "kind": "u8",
  "fixed": [],
  "paramOrder": [
   "i"
  ]
 },
 {
  "method": "sendEventReminder",
  "line": 816,
  "params": [
   {
    "javaType": "EventReminderBean",
    "name": "eventReminderBean"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 19,
  "key": 2,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "sendDeleteEventReminder",
  "line": 837,
  "params": [
   {
    "javaType": "int",
    "name": "i"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 19,
  "key": 3,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "getProductId",
  "line": 841,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 20,
  "key": 0,
  "kind": "fixed",
  "fixed": [
   1
  ],
  "paramOrder": []
 },
 {
  "method": "getDeviceNameVersion",
  "line": 845,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 2,
  "key": 23,
  "kind": "empty",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "requestOTAInfo",
  "line": 849,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 32,
  "key": 1,
  "kind": "empty",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "requestStartOTA",
  "line": 853,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 32,
  "key": 2,
  "kind": "fixed",
  "fixed": [
   1
  ],
  "paramOrder": []
 },
 {
  "method": "settingUserName",
  "line": 857,
  "params": [],
  "hint": "状态：：设置用户名",
  "variants": 1,
  "cmd": 2,
  "key": 32,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "requestDrinkReminder",
  "line": 873,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 34,
  "key": 0,
  "kind": "empty",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "settingDrinkWater",
  "line": 877,
  "params": [
   {
    "javaType": "DrinkWaterBean",
    "name": "drinkWaterBean"
   }
  ],
  "hint": "状态：：喝水提醒",
  "variants": 1,
  "cmd": 2,
  "key": 33,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "sendPaymentCode",
  "line": 882,
  "params": [
   {
    "javaType": "int",
    "name": "i"
   },
   {
    "javaType": "String",
    "name": "str"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 2,
  "key": 35,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "sendSocialCode",
  "line": 895,
  "params": [
   {
    "javaType": "int",
    "name": "i"
   },
   {
    "javaType": "String",
    "name": "str"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 2,
  "key": 36,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "setMsgRedSwitch",
  "line": 908,
  "params": [
   {
    "javaType": "boolean",
    "name": "z"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 2,
  "key": 38,
  "kind": "bool",
  "fixed": [],
  "paramOrder": [
   "z"
  ]
 },
 {
  "method": "setMsgNotifySwitch",
  "line": 912,
  "params": [
   {
    "javaType": "boolean",
    "name": "z"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 2,
  "key": 39,
  "kind": "bool",
  "fixed": [],
  "paramOrder": [
   "z"
  ]
 },
 {
  "method": "setMsgNotifyAllSwitch",
  "line": 916,
  "params": [
   {
    "javaType": "boolean",
    "name": "z"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 2,
  "key": 40,
  "kind": "bool",
  "fixed": [],
  "paramOrder": [
   "z"
  ]
 },
 {
  "method": "getEpShtudown",
  "line": 920,
  "params": [],
  "hint": "发送请求设备关机指令",
  "variants": 1,
  "cmd": 6,
  "key": 9,
  "kind": "fixed",
  "fixed": [
   1
  ],
  "paramOrder": []
 },
 {
  "method": "getEpRestart",
  "line": 925,
  "params": [],
  "hint": "发送请求设备重启指令",
  "variants": 1,
  "cmd": 6,
  "key": 10,
  "kind": "fixed",
  "fixed": [
   1
  ],
  "paramOrder": []
 },
 {
  "method": "requestEpBattery",
  "line": 930,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 37,
  "key": 0,
  "kind": "empty",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "sendUploadEpBattery",
  "line": 934,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 37,
  "key": 1,
  "kind": "empty",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "requestEpEQSetting",
  "line": 938,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 37,
  "key": 2,
  "kind": "empty",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "sendEpEQSetting",
  "line": 942,
  "params": [
   {
    "javaType": "EpEQSettingBean",
    "name": "epEQSettingBean"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 37,
  "key": 3,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "sendUploadEpEQSetting",
  "line": 969,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 37,
  "key": 4,
  "kind": "empty",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "requestEpFindLeft",
  "line": 973,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 37,
  "key": 5,
  "kind": "empty",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "requestEpFindRight",
  "line": 977,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 37,
  "key": 6,
  "kind": "empty",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "requestEpANCSetting",
  "line": 981,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 37,
  "key": 7,
  "kind": "empty",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "setEpANCSetting",
  "line": 985,
  "params": [
   {
    "javaType": "EpANCSettingBean",
    "name": "epANCSettingBean"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 37,
  "key": 8,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "uploadEpANCSetting",
  "line": 999,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 37,
  "key": 9,
  "kind": "empty",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "requestEp3DAudioSetting",
  "line": 1003,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 37,
  "key": 10,
  "kind": "empty",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "setEp3DAudioSetting",
  "line": 1007,
  "params": [
   {
    "javaType": "Ep3DAudioSetBean",
    "name": "ep3DAudioSetBean"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 37,
  "key": 11,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "uploadEp3DAudioSetting",
  "line": 1021,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 37,
  "key": 12,
  "kind": "empty",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "requestEpSquelchSetting",
  "line": 1025,
  "params": [
   {
    "javaType": "boolean",
    "name": "z"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 37,
  "key": 13,
  "kind": "bool",
  "fixed": [],
  "paramOrder": [
   "z"
  ]
 },
 {
  "method": "setEpSquelchSetting",
  "line": 1029,
  "params": [
   {
    "javaType": "EpSquelchSetBean",
    "name": "epSquelchSetBean"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 37,
  "key": 14,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "uploadEpSquelchSetting",
  "line": 1044,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 37,
  "key": 15,
  "kind": "empty",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "requestEpTouchWakeupSwitch",
  "line": 1048,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 37,
  "key": 16,
  "kind": "empty",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "setEpTouchWakeupSwitch",
  "line": 1052,
  "params": [
   {
    "javaType": "boolean",
    "name": "z"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 37,
  "key": 17,
  "kind": "bool",
  "fixed": [],
  "paramOrder": [
   "z"
  ]
 },
 {
  "method": "uploadEpTouchWakeupSwitch",
  "line": 1056,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 37,
  "key": 18,
  "kind": "empty",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "requestEpBeepSwitch",
  "line": 1060,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 37,
  "key": 19,
  "kind": "empty",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "setEpBeepSwitch",
  "line": 1064,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 37,
  "key": 20,
  "kind": "empty",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "uploadEpBeepSwitch",
  "line": 1068,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 37,
  "key": 21,
  "kind": "empty",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "requestEpKeyFunSetting",
  "line": 1072,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 37,
  "key": 22,
  "kind": "empty",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "setEpKeyFunSetting",
  "line": 1076,
  "params": [
   {
    "javaType": "EpKeyFunBean",
    "name": "epKeyFunBean"
   }
  ],
  "hint": "",
  "variants": 2,
  "cmd": 37,
  "key": 23,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "uploadEpKeyFunSetting",
  "line": 1102,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 37,
  "key": 24,
  "kind": "empty",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "requestEpFindLeftClose",
  "line": 1106,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 37,
  "key": 25,
  "kind": "empty",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "requestEpFindRightClose",
  "line": 1110,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 37,
  "key": 26,
  "kind": "empty",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "requestEpDeviceName",
  "line": 1114,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 37,
  "key": 27,
  "kind": "empty",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "sendEpDeviceName",
  "line": 1118,
  "params": [
   {
    "javaType": "String",
    "name": "str"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 37,
  "key": 28,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "sendEpWorldTimeZone",
  "line": 1126,
  "params": [
   {
    "javaType": "EpWorldTimeZoneBean",
    "name": "epWorldTimeZoneBean"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 38,
  "key": 1,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "requestEpWorldTimeZone",
  "line": 1152,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 38,
  "key": 2,
  "kind": "empty",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "uploadEpWorldTimeZone",
  "line": 1156,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 38,
  "key": 3,
  "kind": "empty",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "requestEpBrightness",
  "line": 1160,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 39,
  "key": 0,
  "kind": "empty",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "sendEpBrightness",
  "line": 1164,
  "params": [
   {
    "javaType": "EpBrightnessBean",
    "name": "epBrightnessBean"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 39,
  "key": 2,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "requestEpVolume",
  "line": 1168,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 39,
  "key": 3,
  "kind": "empty",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "sendEpVolume",
  "line": 1172,
  "params": [
   {
    "javaType": "EpVolumeBean",
    "name": "epVolumeBean"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 39,
  "key": 5,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "sendLogoValue",
  "line": 1176,
  "params": [
   {
    "javaType": "LogoFunBean",
    "name": "logoFunBean"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 23,
  "key": 2,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "getSDcardStatuts",
  "line": 1187,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 45,
  "key": 0,
  "kind": "fixed",
  "fixed": [
   1
  ],
  "paramOrder": []
 },
 {
  "method": "sendNewAlbumPid",
  "line": 1191,
  "params": [
   {
    "javaType": "int",
    "name": "i"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 46,
  "key": 0,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "sendDelAlbumPid",
  "line": 1195,
  "params": [
   {
    "javaType": "int",
    "name": "i"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 46,
  "key": 1,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "videoTrans",
  "line": 1199,
  "params": [
   {
    "javaType": "boolean",
    "name": "z"
   }
  ],
  "hint": "发送相机关闭视频流===",
  "variants": 1,
  "cmd": 43,
  "key": 1,
  "kind": "bool",
  "fixed": [],
  "paramOrder": [
   "z"
  ]
 },
 {
  "method": "requestFmMtu",
  "line": 1204,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 39,
  "key": 6,
  "kind": "empty",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "sendVideoStart",
  "line": 1208,
  "params": [
   {
    "javaType": "int",
    "name": "i"
   },
   {
    "javaType": "int",
    "name": "i2"
   },
   {
    "javaType": "int",
    "name": "i3"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 44,
  "key": 1,
  "kind": "u8",
  "fixed": [],
  "paramOrder": [
   "i",
   "i2",
   "i3"
  ]
 },
 {
  "method": "setVideoFaceInfo8",
  "line": 1212,
  "params": [
   {
    "javaType": "CustomizeWatchFaceBean",
    "name": "customizeWatchFaceBean"
   }
  ],
  "hint": "状态：设置视频表盘信息8",
  "variants": 1,
  "cmd": 44,
  "key": 4,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "setVideoFaceInfo2",
  "line": 1219,
  "params": [
   {
    "javaType": "CustomizeWatchFaceBean",
    "name": "customizeWatchFaceBean"
   }
  ],
  "hint": "状态：设置视频表盘信息8",
  "variants": 1,
  "cmd": 44,
  "key": 4,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "getVideoFaceInfo",
  "line": 1226,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 44,
  "key": 3,
  "kind": "fixed",
  "fixed": [
   1
  ],
  "paramOrder": []
 },
 {
  "method": "syncAudio",
  "line": 1230,
  "params": [
   {
    "javaType": "int",
    "name": "i"
   },
   {
    "javaType": "int",
    "name": "i2"
   },
   {
    "javaType": "int",
    "name": "i3"
   },
   {
    "javaType": "String",
    "name": "str"
   }
  ],
  "hint": "playState： ",
  "variants": 1,
  "cmd": 7,
  "key": 7,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "getMenstrual",
  "line": 1252,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 25,
  "key": 0,
  "kind": "empty",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "setMenstrual",
  "line": 1256,
  "params": [
   {
    "javaType": "MenstrualCycleBean",
    "name": "menstrualCycleBean"
   }
  ],
  "hint": "设置女性健康: ",
  "variants": 2,
  "cmd": 25,
  "key": 1,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "requestMenstrual",
  "line": 1285,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 25,
  "key": 3,
  "kind": "empty",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "setMenstrualSwitch",
  "line": 1289,
  "params": [
   {
    "javaType": "boolean",
    "name": "z"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 25,
  "key": 5,
  "kind": "bool",
  "fixed": [],
  "paramOrder": [
   "z"
  ]
 },
 {
  "method": "setImageQuality",
  "line": 1293,
  "params": [
   {
    "javaType": "int",
    "name": "i"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 2,
  "key": 58,
  "kind": "u8",
  "fixed": [],
  "paramOrder": [
   "i"
  ]
 },
 {
  "method": "requestBarrageInfo",
  "line": 1297,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 58,
  "key": 0,
  "kind": "fixed",
  "fixed": [
   0
  ],
  "paramOrder": []
 },
 {
  "method": "sendBarrageInfo",
  "line": 1301,
  "params": [
   {
    "javaType": "BarrageInfo",
    "name": "barrageInfo"
   }
  ],
  "hint": "发送弹幕信息==",
  "variants": 1,
  "cmd": 58,
  "key": 1,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "requestNumberAlarms",
  "line": 1314,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 2,
  "key": 71,
  "kind": "fixed",
  "fixed": [
   0
  ],
  "paramOrder": []
 },
 {
  "method": "requestNumberSavedAlbum",
  "line": 1318,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 2,
  "key": 72,
  "kind": "fixed",
  "fixed": [
   0
  ],
  "paramOrder": []
 },
 {
  "method": "stopFindPhone",
  "line": 1322,
  "params": [],
  "hint": "发送退出找手机指令",
  "variants": 1,
  "cmd": 6,
  "key": 11,
  "kind": "fixed",
  "fixed": [
   1
  ],
  "paramOrder": []
 },
 {
  "method": "sendGPS",
  "line": 1327,
  "params": [
   {
    "javaType": "double",
    "name": "d"
   },
   {
    "javaType": "double",
    "name": "d2"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 24,
  "key": 6,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "settingSportLinkage",
  "line": 1339,
  "params": [
   {
    "javaType": "int",
    "name": "i"
   },
   {
    "javaType": "int",
    "name": "i2"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 4,
  "key": 13,
  "kind": "u8",
  "fixed": [],
  "paramOrder": [
   "i",
   "i2"
  ]
 },
 {
  "method": "requestHasGps",
  "line": 1343,
  "params": [
   {
    "javaType": "int",
    "name": "i"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 4,
  "key": 29,
  "kind": "u8",
  "fixed": [],
  "paramOrder": [
   "i"
  ]
 },
 {
  "method": "stopFindWatch",
  "line": 1347,
  "params": [],
  "hint": "发送退出找手表指令",
  "variants": 1,
  "cmd": 6,
  "key": 15,
  "kind": "fixed",
  "fixed": [
   1
  ],
  "paramOrder": []
 },
 {
  "method": "sendShutDown",
  "line": 1352,
  "params": [],
  "hint": "发送关机指令",
  "variants": 1,
  "cmd": 6,
  "key": 9,
  "kind": "fixed",
  "fixed": [
   1
  ],
  "paramOrder": []
 },
 {
  "method": "requestAllDayLightup",
  "line": 1357,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 2,
  "key": 55,
  "kind": "fixed",
  "fixed": [
   1
  ],
  "paramOrder": []
 },
 {
  "method": "sendAllDayLightup",
  "line": 1361,
  "params": [
   {
    "javaType": "int",
    "name": "i"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 2,
  "key": 57,
  "kind": "u8",
  "fixed": [],
  "paramOrder": [
   "i"
  ]
 },
 {
  "method": "requestAllDayDND",
  "line": 1365,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 2,
  "key": 52,
  "kind": "fixed",
  "fixed": [
   1
  ],
  "paramOrder": []
 },
 {
  "method": "sendAllDayDND",
  "line": 1369,
  "params": [
   {
    "javaType": "int",
    "name": "i"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 2,
  "key": 54,
  "kind": "u8",
  "fixed": [],
  "paramOrder": [
   "i"
  ]
 },
 {
  "method": "sendPrAutoTestSetting",
  "line": 1373,
  "params": [
   {
    "javaType": "PrAutoTestBean",
    "name": "prAutoTestBean"
   }
  ],
  "hint": "发送设置压力自动测量指令",
  "variants": 1,
  "cmd": 2,
  "key": 67,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "sendBoAutoTestSetting",
  "line": 1380,
  "params": [
   {
    "javaType": "BoAutoTestBean",
    "name": "boAutoTestBean"
   }
  ],
  "hint": "发送设置血氧自动测量指令",
  "variants": 1,
  "cmd": 2,
  "key": 29,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "sendBPAutoTestSetting",
  "line": 1387,
  "params": [
   {
    "javaType": "BPAutoTestBean",
    "name": "bPAutoTestBean"
   }
  ],
  "hint": "发送设置血压自动测量指令",
  "variants": 1,
  "cmd": 2,
  "key": 75,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "sendScientSleepTestSetting",
  "line": 1394,
  "params": [
   {
    "javaType": "SleepAutoTestBean",
    "name": "sleepAutoTestBean"
   }
  ],
  "hint": "发送设置科学睡眠测量指令",
  "variants": 1,
  "cmd": 2,
  "key": 76,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "sendTemperAutoTestSetting",
  "line": 1399,
  "params": [
   {
    "javaType": "TemperAutoTestBean",
    "name": "temperAutoTestBean"
   }
  ],
  "hint": "发送设置体温自动测量指令",
  "variants": 1,
  "cmd": 2,
  "key": 77,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "requestGazeDistance",
  "line": 1406,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 2,
  "key": 60,
  "kind": "fixed",
  "fixed": [
   1
  ],
  "paramOrder": []
 },
 {
  "method": "settingGazeDistance",
  "line": 1410,
  "params": [
   {
    "javaType": "GazeDistanceBean",
    "name": "gazeDistanceBean"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 2,
  "key": 59,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "requestFitnessReminder",
  "line": 1414,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 2,
  "key": 62,
  "kind": "fixed",
  "fixed": [
   1
  ],
  "paramOrder": []
 },
 {
  "method": "settingFitnessReminder",
  "line": 1418,
  "params": [
   {
    "javaType": "FitnessReminderBean",
    "name": "fitnessReminderBean"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 2,
  "key": 61,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "requestMedicationReminder",
  "line": 1422,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 2,
  "key": 51,
  "kind": "fixed",
  "fixed": [
   1
  ],
  "paramOrder": []
 },
 {
  "method": "settingMedicineReminder",
  "line": 1426,
  "params": [
   {
    "javaType": "MedicineReminderBean",
    "name": "medicineReminderBean"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 2,
  "key": 50,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "requestReadingReminder",
  "line": 1455,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 2,
  "key": 64,
  "kind": "fixed",
  "fixed": [
   1
  ],
  "paramOrder": []
 },
 {
  "method": "settingReadingReminder",
  "line": 1459,
  "params": [
   {
    "javaType": "ReadingReminderBean",
    "name": "readingReminderBean"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 2,
  "key": 63,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "requestTravelReminder",
  "line": 1463,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 2,
  "key": 66,
  "kind": "fixed",
  "fixed": [
   1
  ],
  "paramOrder": []
 },
 {
  "method": "settingTravelReminder",
  "line": 1467,
  "params": [
   {
    "javaType": "TravelReminderBean",
    "name": "travelReminderBean"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 2,
  "key": 65,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "requestHandWash",
  "line": 1471,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 2,
  "key": 74,
  "kind": "fixed",
  "fixed": [
   1
  ],
  "paramOrder": []
 },
 {
  "method": "settingHandWash",
  "line": 1475,
  "params": [
   {
    "javaType": "HandWashBean",
    "name": "handWashBean"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 2,
  "key": 73,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "reqeustHrHigLow",
  "line": 1479,
  "params": [],
  "hint": "请求心率过高过低提醒阈值",
  "variants": 1,
  "cmd": 3,
  "key": 8,
  "kind": "fixed",
  "fixed": [
   1
  ],
  "paramOrder": []
 },
 {
  "method": "sendHrAutoHigLowFla",
  "line": 1484,
  "params": [
   {
    "javaType": "HrAutoTestBean",
    "name": "hrAutoTestBean"
   }
  ],
  "hint": "设置心率过高过低提醒阈值",
  "variants": 1,
  "cmd": 3,
  "key": 10,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "sendGomoreKey",
  "line": 1489,
  "params": [
   {
    "javaType": "String",
    "name": "str"
   }
  ],
  "hint": "下发Gomore算法key值",
  "variants": 1,
  "cmd": 4,
  "key": 25,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "setCalorieTarget",
  "line": 1499,
  "params": [
   {
    "javaType": "int",
    "name": "i"
   }
  ],
  "hint": "发送设置上路卡路里目标指令,值为:",
  "variants": 1,
  "cmd": 2,
  "key": 44,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "setDistanceTarget",
  "line": 1505,
  "params": [
   {
    "javaType": "int",
    "name": "i"
   }
  ],
  "hint": "发送设置距离目标指令",
  "variants": 1,
  "cmd": 2,
  "key": 45,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "sendAiDialAnswer",
  "line": 1510,
  "params": [
   {
    "javaType": "String",
    "name": "str"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 49,
  "key": 0,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "noticeAiDialSpeechFail",
  "line": 1514,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 49,
  "key": 4,
  "kind": "fixed",
  "fixed": [
   0
  ],
  "paramOrder": []
 },
 {
  "method": "noticeSendAIPicFail",
  "line": 1518,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 49,
  "key": 6,
  "kind": "fixed",
  "fixed": [
   0
  ],
  "paramOrder": []
 },
 {
  "method": "requestAiDialParams",
  "line": 1522,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 49,
  "key": 7,
  "kind": "fixed",
  "fixed": [
   0
  ],
  "paramOrder": []
 },
 {
  "method": "sendAiDialStyle",
  "line": 1526,
  "params": [
   {
    "javaType": "String",
    "name": "str"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 49,
  "key": 10,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "sendAiSetAlarm",
  "line": 1531,
  "params": [
   {
    "javaType": "int",
    "name": "i"
   },
   {
    "javaType": "int",
    "name": "i2"
   },
   {
    "javaType": "int",
    "name": "i3"
   },
   {
    "javaType": "String",
    "name": "str"
   },
   {
    "javaType": "String",
    "name": "str2"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 55,
  "key": 6,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "sendAiAlarmDate",
  "line": 1542,
  "params": [
   {
    "javaType": "long",
    "name": "j"
   },
   {
    "javaType": "int",
    "name": "i"
   },
   {
    "javaType": "String",
    "name": "str"
   },
   {
    "javaType": "String",
    "name": "str2"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 55,
  "key": 7,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "sendStartTranslate",
  "line": 1561,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 48,
  "key": 7,
  "kind": "fixed",
  "fixed": [
   0
  ],
  "paramOrder": []
 },
 {
  "method": "sendEndTranslate",
  "line": 1565,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 48,
  "key": 8,
  "kind": "fixed",
  "fixed": [
   0
  ],
  "paramOrder": []
 },
 {
  "method": "sendRecordFail",
  "line": 1569,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 48,
  "key": 9,
  "kind": "fixed",
  "fixed": [
   0
  ],
  "paramOrder": []
 },
 {
  "method": "sendSoureText",
  "line": 1573,
  "params": [
   {
    "javaType": "int",
    "name": "i"
   },
   {
    "javaType": "byte[]",
    "name": "bArr"
   }
  ],
  "hint": "发送翻译源=====text== ",
  "variants": 1,
  "cmd": 48,
  "key": 5,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "sendTranslateText",
  "line": 1579,
  "params": [
   {
    "javaType": "int",
    "name": "i"
   },
   {
    "javaType": "byte[]",
    "name": "bArr"
   }
  ],
  "hint": "发送翻译结果=====text== ",
  "variants": 1,
  "cmd": 48,
  "key": 6,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "sendLanguageCode",
  "line": 1585,
  "params": [
   {
    "javaType": "int",
    "name": "i"
   },
   {
    "javaType": "int",
    "name": "i2"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 48,
  "key": 10,
  "kind": "u8",
  "fixed": [],
  "paramOrder": [
   "i",
   "i2"
  ]
 },
 {
  "method": "sendMultiStart",
  "line": 1589,
  "params": [
   {
    "javaType": "int",
    "name": "i"
   },
   {
    "javaType": "int",
    "name": "i2"
   },
   {
    "javaType": "int",
    "name": "i3"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 44,
  "key": 6,
  "kind": "u8",
  "fixed": [],
  "paramOrder": [
   "i",
   "i2",
   "i3"
  ]
 },
 {
  "method": "sendChatGptQuziText",
  "line": 1593,
  "params": [
   {
    "javaType": "String",
    "name": "str"
   }
  ],
  "hint": "AIChat 聊天 下发回答的问题：",
  "variants": 1,
  "cmd": 30,
  "key": 0,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "sendChatGptQuziStart",
  "line": 1599,
  "params": [
   {
    "javaType": "int",
    "name": "i"
   },
   {
    "javaType": "int",
    "name": "i2"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 30,
  "key": 2,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "sendChatGptQuziEnd",
  "line": 1607,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 30,
  "key": 3,
  "kind": "fixed",
  "fixed": [
   0
  ],
  "paramOrder": []
 },
 {
  "method": "sendChatGptAsrText",
  "line": 1611,
  "params": [
   {
    "javaType": "int",
    "name": "i"
   },
   {
    "javaType": "byte[]",
    "name": "bArr"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 30,
  "key": 1,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "noticeSpeechFail",
  "line": 1618,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 30,
  "key": 7,
  "kind": "fixed",
  "fixed": [
   0
  ],
  "paramOrder": []
 },
 {
  "method": "sendTODOReminder",
  "line": 1622,
  "params": [
   {
    "javaType": "long",
    "name": "j"
   },
   {
    "javaType": "String",
    "name": "str"
   },
   {
    "javaType": "String",
    "name": "str2"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 30,
  "key": 16,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "deleteTODOReminder",
  "line": 1643,
  "params": [
   {
    "javaType": "long",
    "name": "j"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 30,
  "key": 17,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "sendReceiveRecord",
  "line": 1657,
  "params": [
   {
    "javaType": "boolean",
    "name": "z"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 54,
  "key": 2,
  "kind": "bool",
  "fixed": [],
  "paramOrder": [
   "z"
  ]
 },
 {
  "method": "deleteRecordFile",
  "line": 1661,
  "params": [
   {
    "javaType": "String",
    "name": "str"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 54,
  "key": 4,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "deleteAllowRecordFile",
  "line": 1669,
  "params": [
   {
    "javaType": "boolean",
    "name": "z"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 54,
  "key": 4,
  "kind": "bool",
  "fixed": [],
  "paramOrder": [
   "z"
  ]
 },
 {
  "method": "sendSimTLanguage",
  "line": 1673,
  "params": [
   {
    "javaType": "int",
    "name": "i"
   },
   {
    "javaType": "int",
    "name": "i2"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 59,
  "key": 1,
  "kind": "u8",
  "fixed": [],
  "paramOrder": [
   "i",
   "i2"
  ]
 },
 {
  "method": "sendSimSoureText",
  "line": 1677,
  "params": [
   {
    "javaType": "int",
    "name": "i"
   },
   {
    "javaType": "byte[]",
    "name": "bArr"
   }
  ],
  "hint": "sim发送翻译源=====text== ",
  "variants": 1,
  "cmd": 59,
  "key": 8,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "sendSimTranslateText",
  "line": 1683,
  "params": [
   {
    "javaType": "int",
    "name": "i"
   },
   {
    "javaType": "byte[]",
    "name": "bArr"
   }
  ],
  "hint": "sim发送翻译结果=====text== ",
  "variants": 1,
  "cmd": 59,
  "key": 9,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "sendSimStartTranslate",
  "line": 1689,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 59,
  "key": 10,
  "kind": "fixed",
  "fixed": [
   0
  ],
  "paramOrder": []
 },
 {
  "method": "sendSimEndTranslate",
  "line": 1693,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 59,
  "key": 11,
  "kind": "fixed",
  "fixed": [
   0
  ],
  "paramOrder": []
 },
 {
  "method": "sendSimRecordFail",
  "line": 1697,
  "params": [],
  "hint": "",
  "variants": 1,
  "cmd": 59,
  "key": 12,
  "kind": "fixed",
  "fixed": [
   0
  ],
  "paramOrder": []
 },
 {
  "method": "requestSportLinkageType",
  "line": 1701,
  "params": [],
  "hint": "APP请求当前支持的运动",
  "variants": 1,
  "cmd": 4,
  "key": 21,
  "kind": "empty",
  "fixed": [],
  "paramOrder": []
 },
 {
  "method": "sendHrvAutoTestSetting",
  "line": 1706,
  "params": [
   {
    "javaType": "HrvAutoTestBean",
    "name": "hrvAutoTestBean"
   }
  ],
  "hint": "",
  "variants": 1,
  "cmd": 2,
  "key": 78,
  "kind": "complex",
  "fixed": [],
  "paramOrder": []
 }
];
