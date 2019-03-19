module.exports = [
  {
    route: 'register',
    path: '',
    method: 'POST',
    jsonData: {},
    requestDetails: {
      headers: {
        test: "test"
      }
    },
    endpoint: {
      scope: 'admin',
      secureKey: 'xxxx'
    }
  },
  {
    route: 'register',
    path: 'xxxxx',
    method: 'GET',
    jsonData: {},
    requestDetails: {
      headers: {
        test: "test"
      }
    },
    endpoint: {
      scope: 'admin',
      secureKey: 'xxxx'
    }
  },
  {
    route: 'repos/test',
    path: '',
    method: 'POST',
    jsonData: {},
    requestDetails: {
      headers: {
        test: "test"
      }
    },
    endpoint: {
      scope: 'admin',
      secureKey: 'xxxx'
    }
  },
  {
    route: 'repos/test',
    path: 'reponame',
    method: 'GET',
    jsonData: {},
    requestDetails: {
      headers: {
        test: "test"
      }
    },
    endpoint: {
      scope: 'admin',
      secureKey: 'xxxx'
    }
  },
  {
    route: 'repos',
    path: '',
    method: 'SEARCH',
    jsonData: {},
    requestDetails: {
      headers: {
        test: "test"
      }
    },
    endpoint: {
      scope: 'admin',
      secureKey: 'xxxx'
    }
  },
  {
    route: 'repos',
    path: 'reponame',
    method: 'GET',
    jsonData: {},
    requestDetails: {
      headers: {
        test: "test"
      }
    },
    endpoint: {
      scope: 'admin',
      secureKey: 'xxxx'
    }
  },
  {
    route: 'repos/ownername/reponame/files',
    path: '',
    method: 'POST',
    jsonData: {},
    requestDetails: {
      headers: {
        test: "test"
      }
    },
    endpoint: {
      scope: 'admin',
      secureKey: 'xxxx'
    }
  },
  {
    route: 'repos/ownername/reponame/files',
    path: 'fileid',
    method: 'GET',
    jsonData: {},
    requestDetails: {
      headers: {
        test: "test"
      }
    },
    endpoint: {
      scope: 'admin',
      secureKey: 'xxxx'
    }
  },
  {
    route: 'repos/ownername/files',
    path: '',
    method: 'SEARCH',
    jsonData: {},
    requestDetails: {
      headers: {
        test: "test"
      }
    },
    endpoint: {
      scope: 'admin',
      secureKey: 'xxxx'
    }
  },
  {
    route: 'repos/ownername/files',
    path: 'fileid',
    method: 'GET',
    jsonData: {},
    requestDetails: {
      headers: {
        test: "test"
      }
    },
    endpoint: {
      scope: 'admin',
      secureKey: 'xxxx'
    }
  }
]