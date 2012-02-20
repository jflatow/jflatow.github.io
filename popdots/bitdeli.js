var BitDeli = (function (conf) {
    this.conf = conf;
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