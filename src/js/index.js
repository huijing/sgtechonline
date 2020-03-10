(function () {
  const formToJSON = elements => [].reduce.call(elements, (data, element) => {
    if (isValidElement(element) && isValidValue(element)) {
      data[element.name] = element.value;
    }
    return data;
  }, {});

  const isValidElement = element => {
    return element.name && element.value;
  };

  const isValidValue = element => {
    return (!['checkbox', 'radio'].includes(element.type) || element.checked);
  };

  const init = function () {
    const userForm = document.getElementById('registration');
    const handleFormSubmit = event => {
      event.preventDefault();

      http.post('/register', formToJSON(userForm.elements))
      .then(function (test) {
        console.log(test)
      }).catch(function (error) {
        console.log(error);
      });
    };
    userForm.addEventListener('submit', handleFormSubmit, false);
  };

  document.addEventListener('DOMContentLoaded', init);
}());
