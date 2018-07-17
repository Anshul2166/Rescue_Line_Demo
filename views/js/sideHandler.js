//handles the sidebar in the dashboard
function SideHandler(){

  var self = this;
  var state = true; //not shrinked
  var gridHandler = null;

  this.getState = function(){
    return self.state;
  };

  this.setGridHandler = function(gh){
    gridHandler = gh;
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
        gridHandler.refresh();
        state = false;
      } else {
        $('.dash-sidebar').css('width','180px');
        $('.dash-sidebar').css('left','0px');
        $('.ds-item span').show();
        $('.dash-container').css('padding-left','200px');
        $('#sb_logo').show();
        gridHandler.refresh();
        state = true;
      }
    }
  };

  //set toggle on click
  $('.ds-toggle').on('click',function(){
    self.toggle();
  });

  //set toggle on click if mobile
  $('.ds-item').on('click',function(){
    if ($(document).width() < 700)
      self.toggle();
  });

  //makes sure menu always functions right when switching between mobile and desktop multiple times
  $(window).on("resize", function(){
    var winWidth = $(document).width();
    if (state == true && winWidth > 700 && $('.dash-sidebar').css('left') == '-180px'){
      $('.dash-sidebar').css('left','0px');
      self.toggle();
    } else if (winWidth < 700 && $('.dash-sidebar').css('left') == '0px') {
      $('.dash-sidebar').css('left','-180px');
      self.toggle();
    }
  });

}
