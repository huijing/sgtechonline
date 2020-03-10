"use strict";

(function () {
  var formToJSON = function formToJSON(elements) {
    return [].reduce.call(elements, function (data, element) {
      if (isValidElement(element) && isValidValue(element)) {
        data[element.name] = element.value;
      }

      return data;
    }, {});
  };

  var isValidElement = function isValidElement(element) {
    return element.name && element.value;
  };

  var isValidValue = function isValidValue(element) {
    return !['checkbox', 'radio'].includes(element.type) || element.checked;
  };

  var init = function init() {
    var userForm = document.getElementById('registration');

    var handleFormSubmit = function handleFormSubmit(event) {
      event.preventDefault();
      http.post('/register', formToJSON(userForm.elements)).then(function (test) {
        console.log(test);
      })["catch"](function (error) {
        console.log(error);
      });
    };

    userForm.addEventListener('submit', handleFormSubmit, false);
  };

  document.addEventListener('DOMContentLoaded', init);
})();