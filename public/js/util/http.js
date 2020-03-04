(function () {
  var http = {
    post: function (url, data) {
      var requestHeaders = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };

      var parseJSON = function (response) {
        return response.json();
      };

      var params = {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(data)
      };

      return new Promise(function (resolve, reject) {
        fetch(url, params)
          .then(parseJSON)
          .then(function (json) {
            resolve(json);
          })
          .catch(function (error) {
            reject(error);
          });
      });
    }
  };
  window.http = http;
}());
