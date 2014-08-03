var BitDeli = (function (conf) {
    this.conf = conf;
    this.subs = {};
  });

BitDeli.prototype = {
  bind: function (label, func) {
    document.addEventListener(label, func, false);
  },
  fire: function (label, data) {
    var event = document.createEvent('HTMLEvents');
    event.initEvent(label, true, true);
    event.data = data;
    document.dispatchEvent(event);
  },
  log: function (object) {
    var bd = this;
    var ev = {auth: this.conf.auth, object: object};
    var ok = function (req) {
      bd.fire('bitdeli:logged', JSON.parse(req.response));
    };
    this.req(this.conf.feed, {method: 'POST', data: JSON.stringify(ev), 200: ok});
  },
  subscribe: function (asset, callback, opts) {
    var opts = opts || {};
    var self = this;
    var poll = function (req) {
      var response = JSON.parse(req.response);
      for (var i = response.groups.length; i > 0; i--) {
        var group = response.groups[i - 1];
        if (group.group_offset > (self.subs[asset] || -1)) {
          var ok = function (req) {
            callback(JSON.parse(req.response));
          };
          self.req(group.href + '?' + self.query(opts.group), {200: ok});
          self.subs[asset] = group.group_offset;
        }
      }
    };
    var req = function () {
      self.req(asset + '/groups' + '?' + self.query(opts.groups), {200: poll});
      setTimeout(req, opts.interval || 60000);
    };
    req();
  },
  query: function (dict) {
    var params = [];
    for (var key in dict)
      params.push(key + '=' + dict[key]);
    return params.join('&');
  },
  req: function (url, opts) {
    var http_request = new XMLHttpRequest();
    var opts = opts || {};
    http_request.onreadystatechange = function () {
      if (this.readyState != 4)
        return;
      if (this.status in opts)
        return opts[this.status](this);
      console.log("Unhandled", this.status, url, opts, this);
    };
    http_request.open(opts.method || 'GET', url, true);
    http_request.send(opts.data || null);
  }
};