(function ($) {
  $.fn.multibox = function (datalist, attrs) {
    var defaults = {autocapitalize: 'off',
                    autocomplete: 'off',
                    autocorrect: 'off',
                    spellcheck: 'false',
                    multiple: 'multiple'};
    var input = $('<input>').attr($.extend(defaults, attrs));
    var output = $('<div>').css({opacity: 0}).hide();
    input
    .focus(function () {
        input.keyup();
        output.show();
        output.animate({opacity: 1}, 5e2);
      })
    .blur(function () {
        output.animate({opacity: 0}, 5e2, function () { output.hide() });
      })
    .keyup(function (e) {
        output.empty();
        $.each(datalist, function (i, data) {
            var match = data.text.match(input.val());
            if (match)
              output.append($('<button>' + data.text.split(match[0]).join('<b>' + match[0] + '</b>') + '</button>')
                            .click(function () {
                                input.val(data.value);
                              }));
          });
      });
    return this.append(input, output);
  }
})(jQuery);