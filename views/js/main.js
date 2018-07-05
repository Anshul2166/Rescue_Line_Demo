//included on every page

$(document).on('ready',function(){
  //To perform on page load

  //handles the mobile menu
  function MenuHandler(){

    var self = this;
    //false means hidden
    var menuState = false;

    function toggleMenu(){
      var winWidth = $(document).width();
      if (menuState == true){
        menuState = false;
        if (winWidth < 700)
          $('nav').css('right','-280px');
      } else {
        menuState = true;
        $('nav').css('right','0px');
      }
    }

    this.getMenuState = function(){
      return menuState;
    };

    this.toggle = function(){
      toggleMenu();
    };

    $('.menu_toggle').on('click',function(){
      toggleMenu();
    });

  }

  var menu = new MenuHandler();

  //hover effect
  $('.a-b').on('mouseover',function(){
    var winWidth = $(document).width();
    if (winWidth < 700)
      return;
    var $btn = $(this);
    $btn.css('background-color','rgba(155,155,155,0.3)');
  });
  $('.a-b').on('mouseout',function(){
    var $btn = $(this);
    $btn.css('background-color','transparent');
  });

  //dropdown handlers
  $('.dropdown').parent().on('mouseover',function(){
    var $dropdown = $($(this).find('.dropdown')[0]);
    if ($dropdown.hasClass('mobile-hidden')) {
      if ($(document).width() < 700)
        return;
    }
    $dropdown.show();
  });
  $('.dropdown').parent().on('mouseout',function(){
    var $dropdown = $($(this).find('.dropdown')[0]);
    $dropdown.hide();
  });

  //makes sure menu always functions right when switching between mobile and desktop multiple times
  $(window).on("resize", function(){
    var winWidth = $(document).width();
    if (menu.getMenuState() == false && winWidth > 700 && $('nav').css('right') == "-280px"){
      $('nav').css('right',"0px");
      menu.toggle();
    }
  });

  $('nav ul li').on("click",function(){
    menu.toggle();
  });

});
