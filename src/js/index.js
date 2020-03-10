(function () {
  const init = function () {
    const userForm = document.getElementById('registration');
    userForm.addEventListener('submit', function(event) {
      event.preventDefault();
      console.log(event.target)
    }, false);
  };

  document.addEventListener('DOMContentLoaded', init);
}());
