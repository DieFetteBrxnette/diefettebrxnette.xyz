$(document).ready(function(){
  $(window).scroll(function(){
    if (this.scrollY > 20) {
      $('.navbar').addClass("sticky");
    }else{
      $('.navbar').removeClass("sticky");
    }
    if (this.scrollY > 500) {
      $('.scroll-up-btn').addClass("show");
    }else{
      $('.scroll-up-btn').removeClass("show");
    }
  });

  //slide up script
  $('.scroll-up-btn').click(function(){
    $('html').animate({scrollTop: 0});
  });

  //toggle menu/navbar script
  $('.bars').click(function(){
    $('.menu').toggleClass("active");
    $('.menu-btn i').toggleClass("active")
    $('body').toggleClass("stop-scrolling");
  });
  //Toast
    const wrapper = document.querySelector(".toast-wrapper");
    closeIcon = wrapper.querySelector(".close-icon");
    closeIcon.onclick = ()=>{
      wrapper.classList.add("hide");
    }

    setTimeout(()=>{
      wrapper.classList.add("hide");
    }, 10000);
  //window.onload = ()=>{$('.toast-wrapper').addClass("show");}
  //owl-carousel script
  $('.carousel').owlCarousel({
    margin: 20,
    loop: true,
    autoplayTimeOut: 2000,
    autoplay: true,
    autoplayHoverPause: true,
    responsive: {
      0:{
        items: 1,
        nav: false
      },
      600:{
        items: 2,
        nav: false
      },
      1000:{
        items: 3,
        nav: false
      }
    }
  });
});
