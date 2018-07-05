//Loads and manages views in dashboard
//allViews is a key-value pair dictionary
//the key is view name and the value is a callback function that initializes that view.
function ViewManager(allViews){

  var self = this;
  var views = allViews;
  var currView = Object.keys(allViews)[0];

  //loads a specific view
  this.load = function(view){
    var viewLoader = views[view];
    if (typeof viewLoader == "undefined"){
      console.log("ERROR: INVALID VIEW");
      return;
    }
    var loadResponse = viewLoader();

    if(currView == view)
      return;

    console.log(currView);
    console.log(view);
    $('#'+currView).removeClass('ds-active no-a-b');
    $('#'+currView).css('background-color','transparent');
    $('#'+currView+"_view").removeClass('active-view');
    $("#"+view).addClass('ds-active no-a-b');
    $("#"+view+"_view").addClass('active-view');

    currView = view;
  };

  this.load(currView);

  $('.ds-item').on('click',function(){
    self.load($(this).attr('id'));
  });

}

function showTip(parent){
  $(parent).find('.tip').show();
  setTimeout(function(){
    $(parent).find('.tip').hide();
  },3000);
}

$(document).on('ready',function(){
  //code to run at page load

  //handles button animations
  $('.a-b').on('mouseover',function(){
    if ($(this).hasClass('no-a-b'))
      return;
    var winWidth = $(document).width();
    if (winWidth < 700)
      return;
    var $btn = $(this);
    $btn.css('background-color','rgba(155,155,155,0.3)');
  });
  $('.a-b').on('mouseout',function(){
    if ($(this).hasClass('no-a-b'))
      return;
    var $btn = $(this);
    $btn.css('background-color','transparent');
  });

  //handles any dropdowns in dash
  $('.dd-toggle').on('click',function(){
    $(this).find('.dropdown').toggle();
  });


  var $grid = $('.dash-grid').packery({
    itemSelector: '.grid-item',
    gutter: 15,
    columnWidth: $('.grid-item')[0],
    rowWidth: $('.grid-item')[0],
  });

  $grid.find('.grid-item').each( function( i, gridItem ) {
    var draggie = new Draggabilly( gridItem );
    // bind drag events to Packery
    $grid.packery( 'bindDraggabillyEvents', draggie );
  });

  //handles the sidebar shrinking
  function SideHandler(){

    var self = this;
    var state = true; //not shrinked

    this.getState = function(){
      return self.state;
    };

    this.toggle = function(){
      if ($(document).width() < 700){
        if (state == true){
          $('.dash-sidebar').css('left','0px');
          state = false;
        } else {
          $('.dash-sidebar').css('left','-180px');
          state = true;
        }
      } else {
        if (state == true){
          $('.dash-sidebar').css('width','56px');
          $('.dash-sidebar').css('left','0px');
          $('.ds-item span').hide();
          $('.dash-container').css('padding-left','80px');
          $('#sb_logo').hide();
          $grid.packery()
          state = false;
        } else {
          $('.dash-sidebar').css('width','180px');
          $('.dash-sidebar').css('left','0px');
          $('.ds-item span').show();
          $('.dash-container').css('padding-left','200px');
          $('#sb_logo').show();
          $grid.packery()
          state = true;
        }
      }
    };

    //set click on toggle
    $('.ds-toggle').on('click',function(){
      self.toggle();
    });

  }

  sideHandler = new SideHandler();

});
