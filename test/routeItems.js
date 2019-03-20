module.exports = [{
  "path": [
    "register"
  ],
  "endpointUrl": "http://127.0.0.1:8808/",
  "secureKey": "xxxx",
  "online": true,
  "scope": "admin",
  "metrics": [
    {
      "cpu": "0.27",
      "memory": 57.4375,
      "loadavg": [
        1.47900390625,
        1.99755859375,
        2.3427734375
      ]
    },
    {
      "cpu": "0.23",
      "memory": 667.46875,
      "loadavg": [
        1.47900390625,
        1.99755859375,
        2.3427734375
      ]
    }
  ],
  "type": "handler",
  "created": 1551039431949,
  "changed": 1553011381956,
  "token": "xxx",
  "id": "5c72fbc7cb542e60b8da21e4"
},
{
  "path": [
    "repos/:owner",
    "repos"
  ],
  "endpointUrl": "http://142.44.212.5:10046/",
  "secureKey": "xxx",
  "provides": {
    ":repo": {
      "field": "repository",
      "type": "string"
    }
  },
  "metrics": [
    {
      "cpu": "0.00",
      "memory": 24.75390625,
      "loadavg": [
        1.39208984375,
        2.05908203125,
        2.46337890625
      ]
    },
    {
      "cpu": "0.00",
      "memory": 27.3984375,
      "loadavg": [
        1.39208984375,
        2.05908203125,
        2.46337890625
      ]
    }
  ],
  "scope": "repos",
  "type": "handler",
  "online": true,
  "created": 1552536822294,
  "changed": 1553011395202,
  "token": "xxx",
  "id": "5c89d4f6cb542e60b8da2354"
},
{
  "path": [
    "repos/:owner/:repo/files",
    "repos/:owner/files"
  ],
  "endpointUrl": "https://api.zen.ci/http://142.44.212.5:10047/",
  "secureKey": "xxx",
  "metrics": [
    {
      "cpu": "0.00",
      "memory": 23.453125,
      "loadavg": [
        1.39208984375,
        2.05908203125,
        2.46337890625
      ]
    },
    {
      "cpu": "0.00",
      "memory": 23.59765625,
      "loadavg": [
        1.39208984375,
        2.05908203125,
        2.46337890625
      ]
    }
  ],
  "scope": "files",
  "type": "handler",
  "online": true,
  "created": 1552536823177,
  "changed": 1553011394363,
  "token": "xxx",
  "id": "5c89d4f7cf087c449c9ddc39"
},
{
  "path": [
    "register"
  ],
  "endpointUrl": "http://127.0.0.1:8808/",
  "secureKey": "xxxx",
  "online": true,
  "scope": "admin",
  "metrics": [
    {
      "cpu": "0.27",
      "memory": 57.4375,
      "loadavg": [
        1.47900390625,
        1.99755859375,
        2.3427734375
      ]
    },
    {
      "cpu": "0.23",
      "memory": 667.46875,
      "loadavg": [
        1.47900390625,
        1.99755859375,
        2.3427734375
      ]
    }
  ],
  "type": "handler",
  "created": 1551039431949,
  "changed": 1553011381956,
  "token": "xxx",
  "id": "5c72fbc7cb542e60b8da21e4"
},
{
  "path": [
    "repos/:owner",
    "repos"
  ],
  "endpointUrl": "http://142.44.212.5:10046/",
  "secureKey": "xxx",
  "provides": {
    ":repo": {
      "field": "repository",
      "type": "string"
    }
  },
  "metrics": [
    {
      "cpu": "0.00",
      "memory": 24.75390625,
      "loadavg": [
        1.39208984375,
        2.05908203125,
        2.46337890625
      ]
    },
    {
      "cpu": "0.00",
      "memory": 27.3984375,
      "loadavg": [
        1.39208984375,
        2.05908203125,
        2.46337890625
      ]
    }
  ],
  "scope": "repos",
  "type": "handler",
  "online": true,
  "created": 1552536822294,
  "changed": 1553011395202,
  "token": "xxx",
  "id": "5c89d4f6cb542e60b8da2354"
},
{
  "path": [
    "repos/:owner/:repo/files",
    "repos/:owner/files"
  ],
  "endpointUrl": "https://api.zen.ci/http://142.44.212.5:10047/",
  "secureKey": "xxx",
  "metrics": [
    {
      "cpu": "0.00",
      "memory": 23.453125,
      "loadavg": [
        1.39208984375,
        2.05908203125,
        2.46337890625
      ]
    },
    {
      "cpu": "0.00",
      "memory": 23.59765625,
      "loadavg": [
        1.39208984375,
        2.05908203125,
        2.46337890625
      ]
    }
  ],
  "scope": "files",
  "type": "handler",
  "online": true,
  "created": 1552536823177,
  "changed": 1553011394363,
  "token": "xxx",
  "id": "5c89d4f7cf087c449c9ddc39"
},
{
  "_id": "5c72edae9196913851b214f3",
  "type": "hook",
  "hook":{
      "phase": "after",
      "type": "notify",
      "group": "repo-perm"
    },
  "group": "repo-perm",
  "conditions": {
    "methods": [
      "POST"
    ]
  },
  "path": [
    "repos/:owner"
  ],
  "endpointUrl": "http://142.44.212.5:10083/",
  "secureKey": "xxxx",
  "online": true,
  "metrics": [
    {
      "cpu": "0.00",
      "memory": 31.2734375,
      "loadavg": [
        13.87158203125,
        12.900390625,
        8.81787109375
      ]
    },
    {
      "cpu": "0.00",
      "memory": 31.51171875,
      "loadavg": [
        13.87158203125,
        12.900390625,
        8.81787109375
      ]
    }
  ],
  "created": 1551035822972,
  "changed": 1551036325110,
  "token": "xxxx"
},
{
  "_id": "5c72edb07ca0193860fdef7b",
  "type": "hook",
  "hook":
    {
      "phase": "after",
      "type": "notify",
      "group": "repo-perm"
    },
  "conditions": {
    "methods": [
      "POST"
    ]
  },
  "group": "repo-perm",
  "path": [
    "repos/:owner"
  ],
  "endpointUrl": "http://142.44.212.6:10095/",
  "secureKey": "xxxx",
  "online": true,
  "metrics": [
    {
      "cpu": "0.00",
      "memory": 30.00390625,
      "loadavg": [
        13.13427734375,
        11.650390625,
        8.79296875
      ]
    },
    {
      "cpu": "0.00",
      "memory": 27.59375,
      "loadavg": [
        13.13427734375,
        11.650390625,
        8.79296875
      ]
    }
  ],
  "created": 1551035824669,
  "changed": 1551036353626,
  "token": "xxx",
},
{
  "_id": "5c72edb19196913851b214f9",
  "type": "hook",
  "hook":
    {
      "phase": "after",
      "type": "notify",
      "group": "repo-email"
    },
  "group": "repo-email",
  "conditions": {
    "methods": [
      "POST"
    ]
  },
  "path": [
    "repos/:owner"
  ],
  "endpointUrl": "http://142.44.212.6:10096/",
  "secureKey": "xxx",
  "online": true,
  "metrics": [
    {
      "cpu": "0.00",
      "memory": 22.90234375,
      "loadavg": [
        13.13427734375,
        11.650390625,
        8.79296875
      ]
    },
    {
      "cpu": "0.00",
      "memory": 23.22265625,
      "loadavg": [
        13.13427734375,
        11.650390625,
        8.79296875
      ]
    }
  ],
  "created": 1551035825950,
  "changed": 1551036353688,
  "token": "xxx",
},
{
  "_id": "5c72edb49196913851b214fa",
  "type": "hook",
  "hook":{
      "phase": "after",
      "type": "notify",
      "group": "repo-email"
    },
  "conditions": {
    "methods": [
      "POST"
    ]
  },
  "group": "repo-email",
  "path": [
    "repos/:owner"
  ],
  "endpointUrl": "http://142.44.212.5:10084/",
  "secureKey": "xxx",
  "online": true,
  "metrics": [
    {
      "cpu": "0.00",
      "memory": 30.41796875,
      "loadavg": [
        13.4814453125,
        12.83544921875,
        8.81884765625
      ]
    },
    {
      "cpu": "0.00",
      "memory": 29.5859375,
      "loadavg": [
        13.4814453125,
        12.83544921875,
        8.81884765625
      ]
    }
  ],
  "created": 1551035828020,
  "changed": 1551036353638,
  "token": "xxx",
},
{
  "path": [
    "ws"
  ],
  "endpointUrl": "http://127.0.0.1:8888/",
  "secureKey": "xx11xx",
  "scope": "ws",
  "type": "websocket",
  "methods": {
    "post": "data",
    "put": "data",
    "delete": "data",
    "search": "meta",
    "get": "meta"
  },
  "metrics": [
    {
      "cpu": "0.00",
      "memory": 70.6953125,
      "loadavg": [
        1.919921875,
        2.08984375,
        2.201171875
      ]
    },
    {
      "cpu": "0.00",
      "memory": 76.671875,
      "loadavg": [
        1.919921875,
        2.08984375,
        2.201171875
      ]
    }
  ],
  "online": true,
  "created": 1553000093132,
  "changed": 1553049380061,
  "token": "xxx",
  "id": "5c90e69d12d92e11fd978f03"
},
{
  "_id": "5c72edb07ca0193860fdef7b",
  "type": "hook",
  "hook":
    {
      "phase": "before",
      "type": "adapter",
      "group": "test1"
    },
  "conditions": {
    "methods": [
      "POST"
    ]
  },
  "path": [
    "register"
  ],
  "endpointUrl": "http://127.0.0.1:8888/",
  "secureKey": "xxxx",
  "online": true,
  "metrics": [
    {
      "cpu": "0.00",
      "memory": 30.00390625,
      "loadavg": [
        13.13427734375,
        11.650390625,
        8.79296875
      ]
    },
    {
      "cpu": "0.00",
      "memory": 27.59375,
      "loadavg": [
        13.13427734375,
        11.650390625,
        8.79296875
      ]
    }
  ],
  "created": 1551035824669,
  "changed": 1551036353626,
  "token": "xxx",
},
{
  "_id": "5c72edb07ca0193860fdef7b",
  "type": "hook",
  "hook":
    {
      "phase": "after",
      "type": "broadcast",
      "group": "test1"
    },
  "conditions": {
    "methods": [
      "POST"
    ]
  },
  "path": [
    "register"
  ],
  "endpointUrl": "http://127.0.0.1:8889/",
  "secureKey": "xxxx",
  "online": true,
  "metrics": [
    {
      "cpu": "0.00",
      "memory": 30.00390625,
      "loadavg": [
        13.13427734375,
        11.650390625,
        8.79296875
      ]
    },
    {
      "cpu": "0.00",
      "memory": 27.59375,
      "loadavg": [
        13.13427734375,
        11.650390625,
        8.79296875
      ]
    }
  ],
  "created": 1551035824669,
  "changed": 1551036353626,
  "token": "xxx",
},
{
  "_id": "5c72edb07ca0193860fdef7b",
  "type": "hook",
  "hook":
    {
      "phase": "after",
      "type": "broadcast",
      "group": "test1"
    },
  "conditions": {
    "methods": [
      "POST"
    ]
  },
  "path": [
    "register"
  ],
  "endpointUrl": "http://127.0.0.1:8890/",
  "secureKey": "xxxx",
  "online": true,
  "metrics": [
    {
      "cpu": "0.00",
      "memory": 30.00390625,
      "loadavg": [
        13.13427734375,
        11.650390625,
        8.79296875
      ]
    },
    {
      "cpu": "0.00",
      "memory": 27.59375,
      "loadavg": [
        13.13427734375,
        11.650390625,
        8.79296875
      ]
    }
  ],
  "created": 1551035824669,
  "changed": 1551036353626,
  "token": "xxx",
},
{
  "_id": "5c72edb07ca0193860fdef7b",
  "type": "hook",
  "hook":
    {
      "phase": "after",
      "type": "notify",
      "group": "test1"
    },
  "conditions": {
    "methods": [
      "POST"
    ]
  },
  "path": [
    "register"
  ],
  "endpointUrl": "http://127.0.0.1:8892/",
  "secureKey": "xxxx",
  "online": true,
  "metrics": [
    {
      "cpu": "0.00",
      "memory": 30.00390625,
      "loadavg": [
        13.13427734375,
        11.650390625,
        8.79296875
      ]
    },
    {
      "cpu": "0.00",
      "memory": 27.59375,
      "loadavg": [
        13.13427734375,
        11.650390625,
        8.79296875
      ]
    }
  ],
  "created": 1551035824669,
  "changed": 1551036353626,
  "token": "xxx",
},
{
  "_id": "5c72edb07ca0193860fdef7b",
  "type": "hook",
  "hook":
    {
      "phase": "after",
      "type": "notify",
      "group": "test1"
    },
  "conditions": {
    "methods": [
      "POST"
    ]
  },
  "path": [
    "register"
  ],
  "endpointUrl": "http://127.0.0.1:8891/",
  "secureKey": "xxxx",
  "online": true,
  "metrics": [
    {
      "cpu": "0.00",
      "memory": 30.00390625,
      "loadavg": [
        13.13427734375,
        11.650390625,
        8.79296875
      ]
    },
    {
      "cpu": "0.00",
      "memory": 27.59375,
      "loadavg": [
        13.13427734375,
        11.650390625,
        8.79296875
      ]
    }
  ],
  "created": 1551035824669,
  "changed": 1551036353626,
  "token": "xxx",
}
]