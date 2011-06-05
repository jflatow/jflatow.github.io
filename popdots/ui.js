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

function repeat(fun, interval) {
  (function closure() {
    fun();
    setTimeout(closure, interval);
  })();
}

function HNItem(result, parent, paper) {
  var self = this;
  self.item = result.item;

  self.highlight = function () {
    self.label.show().animate({'opacity': 1}, 1e3);
    self.circle.animate({'stroke-width': 3, 'fill-opacity': .8}, 1e3);
    self.element.css({'overflow-y': 'visible',
                      'height': 'auto',
                      'border-bottom': '0px',
                      'background-color': 'rgba(255, 255, 0, .4)'});
  }
  self.unhighlight = function () {
    self.label.animate({'opacity': 0}, 1e2, self.label.hide);
    self.circle.animate({'stroke-width': 1, 'fill-opacity': .3}, 1e3);
    self.element.css({'overflow-y': 'scroll',
                      'height': '50px',
                      'border-bottom': '1px dotted black',
                      'background-color': 'white'});
  }
  self.select = function () {
    window.open('http://news.ycombinator.com/item?id=' + self.item.id);
  }

  self.element = $('<div class="result item"></div>').prependTo(parent)
    .hover(self.highlight, self.unhighlight);

  $.each(['username', 'title', 'points', 'text'], function (i, field) {
      var value = result.item[field];
      if (field == 'username')
        value = link('http://news.ycombinator.com/user?id=' + result.item[field], value);
      else if (field == 'title')
        value = link('http://news.ycombinator.com/item?id=' + self.item.id, value);
      if (result.item[field]) {
        self.element.append('<div class="fieldname">' + field + ': </div>');
        self.element.append('<div class="fieldvalue">' + value + '</div>');
      }
    });

  self.circle = paper.circle(paper.width,
                             Math.max(0, paper.height - self.item.points / 3 - 36),
                             result.score + 6)
    .attr({'fill': 'hsb(' + [Math.random(), Math.random(), Math.random()].join(",") + ')',
           'fill-opacity': .3,
           'cursor': 'pointer'});
  self.title = paper.text(paper.width / 2, paper.height / 4, result.item.title)
    .attr({'font-size': '14px'});
  self.user = paper.text(paper.width / 2, paper.height / 4 + 20, result.item.username)
    .attr({'font-size': '13px'});
  self.label = paper.set([self.title, self.user]).attr({'opacity': 0}).hide();
  self.circle.click(self.select);
  self.circle.mouseover(function (event) {
      self.highlight();
      $.each(Results.data, function (i, result) {
          if (result.element != self.element)
            result.element.css({'height': '0px'});
        });
    });
  self.circle.mouseout(function (event) {
      self.unhighlight();
      $.each(Results.data, function (i, result) {
          result.element.css({'height': '50px'});
        });
    });

  self.slideTo = function (x) {
    self.circle.animate({'cx': x}, 2e3);
  }

  self.remove = function () {
    self.element.remove();
    self.label.remove();
    self.circle.animate({'cx': -self.circle.attr('r') * 2}, 2e3, self.circle.remove);
  }
}

function ResultSet(parent, paper) {
  var self = this;
  self.data = [];
  self.binx = 50;
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
                 'filter[fields][type][]': 'submission',
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
                        Math.max(550, $('#content').width() - $('#results').outerWidth(true) - 40),
                        $('body').height() - $('#control').outerHeight(true) - 10);
    Results = new ResultSet($('#results'), Paper);
    Paper.text(Paper.width - 10, Paper.height - 20, "Rank").attr({'text-anchor': 'end'});
    Paper.xticks = function (num) {
      Paper._xticks && Paper._xticks.remove();
      Paper._xticks = Paper.set();
      for (var i = 0; i < num; i++)
        Paper._xticks.push(Paper.text(Math.floor((Paper.width - 20) / 51 - i) * 50,
                                      Paper.height - 20,
                                      i + 1));
    }
    Paper.text(20, 20, "Points");
    for (var i = 1; i < ticks; i++) {
      var ymarker = i * (Paper.height - 36) / ticks;
      Paper.text(20, Paper.height - ymarker - 36, Math.floor(ymarker * 3));
    }
    $('#control form').submit(change_topic);
    $('#topic').focus();
    repeat(update, 5000);
  });
