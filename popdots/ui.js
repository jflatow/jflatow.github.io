var HNSearchBucket = 'http://api.thriftdb.com/api.hnsearch.com';
var Paper, Results;
var bitdeli = new BitDeli({auth: 'Wq0P5faqrbEoDIJOH8T243b6Ep4',
                           feed: 'http://in.bitdeli.com/events/i-04b96b8567850c-ce425ebd'});

function link(href, text) {
  return '<a href="' + $('<div>').html(href).text() + '">' + text + '</a>';
}

function search(collection, request, callback) {
  $.ajax({'url': HNSearchBucket + '/' + collection + '/_search',
          'data': request,
          'dataType': 'jsonp',
          'success': callback});
  bitdeli.log({type: 'search', collection: collection, request: request});
}

function receiver(force) {
  return function (response) {
    Paper.yticks(6);
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
  var title = result.item.title ||
    'Re: ' + ((result.item.discussion && result.item.discussion.title) || '');
  var item_url = 'http://news.ycombinator.com/item?id=' + result.item.id;
  var user_url = 'http://news.ycombinator.com/user?id=' + result.item.username;
  var num_comments = result.item.num_comments || 0;
  var points_str = (result.item.points || '-') + ' points by ';
  var text = result.item.text || '';
  var matches = text.match(/[^.^\(^\)]*?<strong>.*?<\/strong>.{0,100}/g) || [];
  var info =
    points_str +
    result.item.username + ' ' +
    relative_time(result.item.create_ts) + ' | ' +
    num_comments + ' comments';
  var row_height = '1.5em';
  var intensity = Math.max(num_comments, 2) / 2;
  var opacity = Math.max(.1, intensity / 1e3);

  self.item = result.item;
  self.selected = false;

  self.highlight = function () {
    $('#paper .detail .title').html(title);
    $('#paper .detail .info').html(info);
    $('#paper .detail .matches').empty();
    for (var i = 0; i < matches.length; i++) {
      var match = matches[i],
        from = match.search(/<strong>/),
        to = match.search(/<\/strong>/);
      $('<div class="match">')
        .html(match)
        .appendTo($('#paper .detail .matches'))
        .css({'left': paper.width / 3 - (from * 7)});
    }
    $('#paper .detail').show();
    if (self.selected)
      return;
    self.circle.animate({'stroke-width': 3, 'fill-opacity': .9}, 1e3);
    self.element.css({'background-color': 'rgba(255, 255, 0, .1)'});
    self.element.animate({'height': '3em'});
  }
  self.unhighlight = function () {
    $('#paper .detail').hide();
    if (self.selected)
      return;
    self.circle.animate({'stroke-width': 1, 'fill-opacity': opacity}, 1e3);
    self.element.css({'background-color': 'white'});
    self.element.animate({'height': row_height}, 5e2, function () {
        self.ctrl && self.ctrl.text('+');
      });
  }

  self.collapse = function () {
    self.deselect();
    if (self.ctrl)
      self.element.animate({'height': row_height}, 5e2, function () {
           self.ctrl.text('+');
        });
  }
  self.expand = function () {
    self.select();
    if (self.ctrl) {
      self.element.animate({'height': '10%'}, 5e2, function () {
          self.ctrl.text('-');
          self.element.css({'height': 'auto'});
        });
    }
  }
  self.toggle = function (event) {
    event && event.stopPropagation();
    if (self.ctrl)
      self.ctrl.text() == '+' ? self.expand() : self.collapse();
    else
      self.toggle_select(event);
  }
  self.open = function () {
    window.open('http://news.ycombinator.com/item?id=' + self.item.id);
  }
  self.select = function () {
    self.selected = true;
    self.highlight();
  }
  self.deselect = function () {
    self.selected = false;
    self.unhighlight();
  }
  self.toggle_select = function (event) {
    return self.selected ? self.deselect() : self.select();
  }
  self.force_select = function (event) {
    event.stopPropagation();
    self.select();
  }

  self.log = function (event) {
    var target = event.target;
    bitdeli.log({type: 'ux',
                 target_tag: target.tagName,
                 target_id: target.id,
                 target_href: target.href,
                 event_type: event.type,
                 event_client_x: event.clientX,
                 event_client_y: event.clientY,
                 event_screen_x: event.screenX,
                 event_screen_y: event.screenY,
                 item: self.item});
    event.stopPropagation();
  }

  self.element = $('<div class="result item"></div>').prependTo(parent)
    .attr({'height': row_height})
    .click(self.toggle_select)
    .dblclick(self.open)
    .hover(self.highlight, self.unhighlight)
    .mousedown(self.log);

  if (text)
    self.ctrl = $('<div class="ctrl">+</div>').click(self.toggle).appendTo(self.element);
  $('<div class="title">' + link(self.item.url || item_url, title) + '</div>')
    .appendTo(self.element)
    .click(self.force_select);
  $('<div class="info">' +
    points_str +
    link(user_url, result.item.username) + ' ' +
    relative_time(result.item.create_ts) + ' | ' +
    link(item_url, num_comments + ' comments') +
    '</div>')
    .appendTo(self.element)
    .click(self.force_select);
  if (text)
    self.element.append('<div class="text">' + text + '</div>');

  self.circle = paper.circle(20,
                             Math.max(0, paper.height - self.item.points / 3 - 36 * 2),
                             result.score + 10)
    .attr({'fill': 'rgb(' + [Math.min(255, intensity), 0, Math.max(0, 255 - intensity)].join(",") + ')',
           'fill-opacity': opacity,
           'cursor': 'pointer'});
  self.circle.click(function () {
      self.toggle();
      $.each(Results.data, function (i, result) {
          if (self.element != result.element)
            result.collapse();
        });
      self.highlight();
    });
  self.circle.dblclick(self.open);
  self.circle.mouseover(self.highlight);
  self.circle.mouseout(self.unhighlight);
  self.circle.mousedown(self.log);

  self.slideTo = function (x) {
    self.circle.animate({'cx': x + 5}, 2e3, function() {
        self.circle.animate({'cx': x}, 2e3, 'bounce');
      });
  }

  self.remove = function () {
    self.element.remove();
    self.circle.animate({'cx': paper.width * 2}, 1e3, self.circle.remove);
  }
}

function ResultSet(parent, paper) {
  var self = this;
  self.data = [];
  self.binx = 25;
  self.nbin = (paper.width - 20) / (self.binx + 1);
  self.push = function (result, force) {
    var item;
    for (var i = 0; i < self.data.length; i++)
      if (result.item.id == self.data[i].item.id)
        item = self.data.splice(i, 1)[0];
    self.data.unshift(item || new HNItem(result, parent, paper));
    if (self.data.length > self.nbin)
      self.data.pop().remove();
  }

  self.slide = function () {
    for (var i = 0; i < self.data.length; i++)
      self.data[i].slideTo((i + 3) * self.binx);
  }

  self.clear = function () {
    $.each(self.data, function (i, result) {
        result.unhighlight();
      });
    parent.empty();
  }
}

function update(force) {
  var topic = $('#control').data('topic');
  var sortby = $('#sortby').val();
  var request = {'q': topic,
                 'filter[fields][type][]': $('#type').val(),
                 'limit': 20,
                 'highlight[markup_items]': true};
  if (sortby == 'hotness') {
    request['sortby'] = "product(points,div(sub(points,1),pow(sum(div(ms(create_ts,NOW),-3600000),2.25),1.8)))"  + ' ' + $('#order').val();
    if (!topic)
      request['filter[fields][create_ts]'] = '[NOW-30DAYS TO NOW]';
  } else {
    request['sortby'] = sortby + ' ' + $('#order').val();
  }
  search('items', request, receiver(force));
}

function change_topic(event) {
  $('#control').data('topic', $('#topic').val());
  return update(true) || false;
}

$().ready(function () {
    Paper = new Raphael('paper',
                        Math.max(500, $('#content').width() - $('#results').outerWidth(true) - 40),
                        $('body').height() - $('#control').outerHeight(true) - 10);
    Results = new ResultSet($('#results'), Paper);
    Paper.xticks = function (num) {
      Paper._xticks && Paper._xticks.remove();
      Paper._xticks = Paper.set([Paper.text(20, Paper.height - 20, "Rank")
                                 .attr({'font-weight': 'Bold', 'text-anchor': 'start'})]);
      for (var i = 0; i < num; i++)
        Paper._xticks.push(Paper.text((i + 3) * 25,
                                      Paper.height - 20,
                                      i + 1)
                           .attr({'font-weight': 'Bold'}));
        Paper._xticks.animate({'fill-opacity': .4});
    }
    Paper.yticks = function (num) {
      if (!Paper._yticks) {
        Paper._yticks = Paper.set([Paper.text(20, 20, "Points")
                                   .attr({'font-weight': 'Bold'})]);
        for (var i = 1; i < num; i++) {
          var ymarker = i * (Paper.height - 36 * 2) / num;
          Paper._yticks.push(Paper.text(20, 20, Math.floor(ymarker * 3))
                             .attr({'font-weight': 'Bold'})
                             .animate({'y': Paper.height - ymarker - 36 * 2}, 3e3, 'bounce'));
        }
        Paper._yticks.animate({'fill-opacity': .4});
      }
    }
    $('#control form').submit(change_topic);
    $('#control form select').change(change_topic);
    $('#topic').focus();
    repeat(update, 60000);
    $(document).on('mousedown', function (event) {
        var target = event.target;
        bitdeli.log({type: 'ux',
                     target_tag: target.tagName,
                     target_id: target.id,
                     target_href: target.href,
                     event_type: event.type,
                     event_client_x: event.clientX,
                     event_client_y: event.clientY,
                     event_screen_x: event.screenX,
                     event_screen_y: event.screenY});
      });
  });
