$(document).ready(function () {
  let fullYear = new Date().getFullYear()
  var getDiv = document.createElement('div')
  getDiv.className = 'footer'
  getDiv.innerHTML = '<div class="container-fluid"><div class="row"><div class="col-sm-6">' +fullYear + '\xA9 MPWA-7.0</div><div class="col-sm-6">  <div class="text-sm-end d-none d-sm-block"> Crafted with <i class="mdi mdi-heart text-danger"></i> by <a href="https://m-pedia.co.id - v7.0">M Pedia</a></div></div></div></div>'
  document.querySelector('.wrapper').appendChild(getDiv)
})
