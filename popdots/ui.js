var HNSearchBucket = 'http://api.thriftdb.com/api.hnsearch.com';
var Paper, Results;

function link(href, text) {
  return '<a href="' + href + '">' + text + '</a>';
}

function search(collection, request, callback) {
  $.ajax({'url': HNSearchBucket + '/' + collection + '/_search',
          'data': request,
          'dataType': 'jsonp',
          'success': callback});
}

function receiver(force) {
  return function (response) {
    Paper.xticks(response.results.length);
    for (var i = response.results.length; i; i--)
      Results.push(response.results[i - 1], force);
    Results.slide();
  }
}

function relative_time(timestamp) {
  var date_time = timestamp.replace('Z', '').split('T');
  var ymd = date_time[0].split('-'), hms = date_time[1].split(':');
  var date = new Date(ymd[0], ymd[1] - 1, ymd[2], hms[0], hms[1], hms[2]);
  var relative_to = (arguments.length > 1) ? arguments[1] : new Date();
  var delta = parseInt((relative_to.getTime() - date.getTime()) / 1000) +
    (relative_to.getTimezoneOffset() * 60);

  if (delta < 60) {
    return '< a minute ago';
  } else if(delta < 120) {
    return '~ a minute ago';
  } else if(delta < (60*60)) {
    return (parseInt(delta / 60)).toString() + ' minutes ago';
  } else if(delta < (120*60)) {
    return '~ an hour ago';
  } else if(delta < (24*60*60)) {
    return '~ ' + (parseInt(delta / 3600)).toString() + ' hours ago';
  } else if(delta < (48*60*60)) {
    return '~ 1 day ago';
  } else {
    return '~ ' + (parseInt(delta / 86400)).toString() + ' days ago';
  }
}

function repeat(fun, interval) {
  (function closure() {
    fun();
    setTimeout(closure, interval);
  })();
}

function HNItem(result, parent, paper) {
  var self = this;
  var title = result.item.title || 'Re: ' + result.item.discussion.title;
  var points_str = (result.item.points || 0) + ' points by ';
  var comments_str = ' | ' + (result.item.num_comments || 0) + ' comments';
  var row_height = '1.5em';
  var intensity = Math.max(result.item.num_comments || 0, 2) / 2;
  var opacity = Math.max(.1, intensity / 1e3);
  self.item = result.item;

  self.highlight = function () {
    self.label.show().animate({'opacity': 1}, 1e3);
    self.circle.animate({'stroke-width': 3, 'fill-opacity': .9}, 1e3);
    self.element.css({'background-color': 'rgba(255, 255, 0, .4)'});
    self.element.animate({'height': '3em'});
  }
  self.unhighlight = function () {
    self.label.animate({'opacity': 0}, 1e2, self.label.hide);
    self.circle.animate({'stroke-width': 1, 'fill-opacity': opacity}, 1e3);
    self.element.css({'background-color': 'white'});
    self.element.animate({'height': row_height}, 5e2, function () {
        self.ctrl && self.ctrl.text('+');
      });
  }

  self.collapse = function () {
    if (self.ctrl)
      self.element.animate({'height': row_height}, 5e2, function () {
           self.ctrl.text('+');
        });
  }
  self.expand = function () {
    if (self.ctrl) {
      self.element.animate({'height': '10%'}, 5e2, function () {
          self.ctrl.text('-');
          self.element.css({'height': 'auto'});
        });
    }
  }
  self.toggle = function () {
    if (self.ctrl)
      self.ctrl.text() == '+' ? self.expand() : self.collapse();
  }

  self.element = $('<div class="result item"></div>').prependTo(parent)
    .attr({'height': row_height})
    .hover(self.highlight, self.unhighlight);

  if (result.item.text)
    self.ctrl = $('<div class="ctrl">+</div>').click(self.toggle).appendTo(self.element);
  self.element.append('<div class="title">' +
                      link('http://news.ycombinator.com/item?id=' + self.item.id, title) +
                      '</div>');
  self.element.append('<div class="info">' +
                      points_str +
                      link('http://news.ycombinator.com/user?id=' + result.item.username, result.item.username) + ' ' +
                      relative_time(result.item.create_ts) +
                      comments_str +
                      '</div>');
  if (result.item.text)
    self.element.append('<div class="text">' + result.item.text + '</div>');

  self.circle = paper.circle(paper.width,
                             Math.max(0, paper.height - self.item.points / 3 - 36 * 2),
                             result.score + 6)
    .attr({'fill': 'rgb(' + [Math.min(255, intensity), 0, Math.max(0, 255 - intensity)].join(",") + ')',
           'fill-opacity': opacity,
           'cursor': 'pointer'});
  self.title = paper.text(paper.width / 2, 20, title)
    .attr({'font-size': '16px', 'font-weight': 'bold'});
  self.user = paper.text(paper.width / 2, 40,
                         points_str +
                         result.item.username + ' ' +
                         relative_time(result.item.create_ts) +
                         comments_str)
    .attr({'font-size': '11px'});
  self.label = paper.set([self.title, self.user]).attr({'opacity': 0}).hide();
  self.circle.click(function () {
      self.highlight();
      self.toggle();
      $.each(Results.data, function (i, result) {
          if (self.element != result.element)
            result.collapse();
        });
    });
  self.circle.mouseover(self.highlight);
  self.circle.mouseout(self.unhighlight);

  self.slideTo = function (x) {
    self.circle.animate({'cx': x}, 1e3);
  }

  self.remove = function () {
    self.element.remove();
    self.label.remove();
    self.circle.animate({'cx': -self.circle.attr('r') * 2}, 1e3, self.circle.remove);
  }
}

function ResultSet(parent, paper) {
  var self = this;
  self.data = [];
  self.binx = 25;
  self.nbin = (paper.width - 20) / (self.binx + 1);
  self.push = function (result, force) {
    if (!force)
      for (var i = 0; i < self.data.length; i++)
        if (self.data[i].item.id == result.item.id)
          return;
    self.data.push(new HNItem(result, parent, paper));
    if (self.data.length > self.nbin)
      self.data.shift().remove();
  }

  self.slide = function () {
    for (var i = 0; i < self.data.length; i++)
      self.data[i].slideTo(Math.floor(i + self.nbin - self.data.length + 1) * self.binx);
  }

  self.clear = function () {
    $.each(self.data, function (i, result) {
        result.unhighlight();
      });
    parent.empty();
  }
}

function update(force) {
  var request = {'q': $('#control').data('topic'),
                 'filter[fields][type][]': $('#type').val(),
                 'limit': 20,
                 'sortby': $('#sortby').val() + ' ' + $('#order').val()};
  search('items', request, receiver(force));
}

function change_topic(event) {
  Results.clear();
  $('#control').data('topic', $('#topic').val());
  return update(true) || false;
}

$().ready(function () {
    var ticks = 6;
    Paper = new Raphael('paper',
                        Math.max(500, $('#content').width() - $('#results').outerWidth(true) - 40),
                        $('body').height() - $('#control').outerHeight(true) - 10);
    Results = new ResultSet($('#results'), Paper);
    Paper.text(Paper.width - 10, Paper.height - 20, "Rank").attr({'text-anchor': 'end'});
    Paper.xticks = function (num) {
      Paper._xticks && Paper._xticks.remove();
      Paper._xticks = Paper.set();
      for (var i = 0; i < num; i++)
        Paper._xticks.push(Paper.text(Math.floor((Paper.width - 20) / (25 + 1) - i) * 25,
                                      Paper.height - 20,
                                      i + 1));
    }
    Paper.text(20, 20, "Points");
    for (var i = 1; i < ticks; i++) {
      var ymarker = i * (Paper.height - 36 * 2) / ticks;
      Paper.text(20, Paper.height - ymarker - 36 * 2, Math.floor(ymarker * 3));
    }
    $('#control form').submit(change_topic);
    $('#control form select').change(change_topic);
    $('#topic').focus();
    repeat(update, 5000);
  });
