(function ($) {
  var Keys = {
    'backspace': 8,
    'del': 46,
    'enter': 13,
  };

  $.fn.multibox = function (datalist, attrs, nresults) {
    var defaults = {autocapitalize: 'off',
                    autocomplete: 'off',
                    autocorrect: 'off',
                    spellcheck: 'false',
                    multiple: 'multiple'};
    var input = $('<input class="input">').attr($.extend(defaults, attrs));
    var output = $('<div class="output">').css({opacity: .5});
    var results = $('<div class="results">').css({opacity: 1});
    var result = function (text, value) {
      var html = '<span>' + text + '</span>';
      return $('<button>' + html + '</button>').data('value', value)
      .one('click', function () {
          results.append($(this)
                         .text($(html).text())
                         .on('click keypress', function (e) {
                             if (e.keyCode == undefined || e.keyCode == Keys.backspace || e.keyCode == Keys.del || e.keyCode == Keys.enter) {
                               $(this).remove();
                               input.focus();
                             }
                           }));
          input.focus();
        });
    };
    input
    .on('focus input', function (e) {
        var ival = input.val();
        output.empty();
        $.each(datalist, function (i, data) {
            if (output.children().length < (nresults || 10)) {
              var match = data.text.match(new RegExp(ival, 'i'));
              if (match)
                output.append(result(data.text.split(match[0]).join('<b>' + match[0] + '</b>'), match[0]));
            }
          });
        if (ival)
          output.append(result('&ldquo;<b>' + ival + '</b>&rdquo;', ival));
      });
    return this.append(input, output, results);
  }
})(jQuery);