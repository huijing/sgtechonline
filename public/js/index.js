"use strict";

(function () {
  var init = function init() {
    var userForm = document.getElementById('registration');
    userForm.addEventListener('submit', function (event) {
      event.preventDefault();
      console.log(event.target);
    }, false);
  };

  document.addEventListener('DOMContentLoaded', init);
})();