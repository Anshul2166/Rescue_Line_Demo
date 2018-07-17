//loads and manages the dashboard grid
function GridHandler(){

  var self = this;

  this.charts = new GridChart();
  this.mapHandler = null;
  this.addViewManager = null;

  this.$grid = null;

  this.getSmallestColumn = function(){
    var smallestWidth = 1000;
    var thisWidth = null;
    $('.grid-item').each(function(index,el){
      thisWidth = $(el).width();
      if (thisWidth < smallestWidth) smallestWidth = thisWidth;
    });
    return smallestWidth;
  };

  this.getCurrentOrder = function(){
    var $el = null;
    var itemOrder = [];
    $.each(gridHandler.$grid.packery('getItemElements'),function(index,element){
      $el = $(element);
    	itemOrder.push({
    		type : $el.attr('id'),
    		mini : $el.hasClass('gi-mini')
    	});
    });
    return itemOrder;
  };

  this.addView = function(type){

    var gridItem = new GridItem({ type: type , mini : false },function(){ self.refresh(); }, self);

    $('.dash-grid').append(gridItem);
    self.$grid.packery( 'appended', gridItem );

    self.$grid.packery('destroy');

    self.$grid = $('.dash-grid').packery({
      itemSelector: '.grid-item',
      gutter: 15,
      columnWidth: self.getSmallestColumn(),
      rowWidth: 200,
    });

    self.$grid.find('.grid-item').each( function( i, gridItem ) {
      var draggie = new Draggabilly( gridItem, {
        handle: '.gi-head'
      });
      // bind drag events to Packery
      self.$grid.packery( 'bindDraggabillyEvents', draggie );
    });

    //
    // if (self.$grid[0].childElementCount == 1){
    //   self.$grid = $('.dash-grid').packery({
    //     itemSelector: '.grid-item',
    //     gutter: 15,
    //     columnWidth: self.getSmallestColumn(),
    //     rowWidth: 200,
    //   });
    // }

    // // var draggie = new Draggabilly( gridItem, {
    // //   handle: '.gi-head'
    // // });
    // //
    // // self.$grid.packery( 'bindDraggabillyEvents', draggie );
    //
    // if (gridHandler.$grid[0].childElementCount > 1)
    //   self.refresh();

  };

  this.initialize = function(){

    self.addViewManager = new AddViewManager();

    //get save order & settings from database
    $.get('/api/dashboard/settings/'+ Cookies.get('token'))
      .done(function(response) {
        var layout = [{"type" : "reports_trend","mini" : true},{"type" : "tasks_completed","mini" : true},
          {"type" : "unknown","mini" : true},{"type" : "unknown","mini" : true},{"type" : "live_feed","mini" : false},
          {"type" : "map","mini" : false},{"type" : "breakdown","mini" : false },{"type" : "unknown","mini" : false }];

        if (response.status == "success" && !$.isEmptyObject(response.data)){
          layout = response.data.settings;
        }

        for (var i = 0; i < layout.length; i++)
          $('.dash-grid').append(new GridItem(layout[i],function(){ self.refresh(); }, self));

        self.$grid = $('.dash-grid').packery({
          itemSelector: '.grid-item',
          gutter: 15,
          columnWidth: self.getSmallestColumn(),
          rowWidth: 200,
        });

        self.$grid.find('.grid-item').each( function( i, gridItem ) {
          var draggie = new Draggabilly( gridItem, {
            handle: '.gi-head'
          });
          // bind drag events to Packery
          self.$grid.packery( 'bindDraggabillyEvents', draggie );
        });

        self.addViewManager.build(layout);

      });

    $(window).on("resize", function(){
      self.refresh();
    });

    //set clicks

    $('.grid-save').on('click',function(){

      var order = self.getCurrentOrder();

      //make a post request to save settings
      $.ajax({
        method: "POST",
        url: "/api/dashboard/settings",
        contentType: "application/json",
        data: JSON.stringify({ settings: order, token: Cookies.get('token') })
      }).done(function(response){
        console.log(response);
        if (response.status == "success"){
          handleSuccess("Saved");
        } else {
          handleError(response.error);
        }
      });

    });

    $('.grid-add').on('click',function(){
      $('.add-view-drop').toggle();
    });

  };

  this.refresh = function(){
    self.$grid.packery({
      columnWidth : self.getSmallestColumn()
    });
  };

  //nested class that handles add-view-drop
  function AddViewManager(){

    var thisSelf = this;

    $addViewDrop = $('.add-view-drop');

    this.build = function(layout){
      $addViewDrop.html('');
      var defaults = { "reports_trend": true,"tasks_completed": true,"live_feed": true,"breakdown": true,"map": true };
      var inMenu = {};
      for (var i = 0; i < layout.length; i++)
        delete defaults[layout[i].type];

      $.each(defaults,function(key,value){
        console.log("inserting ",key);
        thisSelf.insert(key);
      });

      if ($addViewDrop.children().length == 0)
        $addViewDrop.append('<div id="bd-empty">Empty</div>');

    };

    this.insert = function(type){
      $addViewDrop.append(buildDropItem(type));
    };

    this.clear = function(){
      $addViewDrop.html('');
    };

    function buildDropItem(type){
      var item = document.createElement('div');
      var name = type.split('_');
      for (var i=0; i < name.length; i++)
        name[i] = name[i].charAt(0).toUpperCase() + name[i].slice(1);
      name = name.join(" ");

      item.id = "bd-"+type;
      item.className = "a-b";
      item.innerHTML = name;

      $(item).on('click',function(){
        self.addView(type);
        $(this).remove();
        $addViewDrop.hide();
        if ($addViewDrop.children().length == 0)
          $addViewDrop.append('<div id="bd-empty">Empty</div>');
      });

      return hoverEffect(item);
    }

  }

}

//Creates a GridItem and sets event handlers for resizing and exiting
//onSizeChange is the callback for when a gridItem changes size (is resized or exited)
//This will typically be gridHandler.refresh() function
function GridItem(itemInfo, onSizeChange, self){
  var gridItem = document.createElement('div');

  var classString = "grid-item paper rounded";
  if (itemInfo.mini)
    classString += " gi-mini";

  gridItem.className = classString;
  gridItem.id = itemInfo.type;

  var itemBuilder = gridItemLookup[itemInfo.type];

  $(gridItem).html(itemBuilder.html);

  //set clicks for minimizing and closing
  $(gridItem).find('.fa-expand').on('click',function(){
    console.log('in resize');
    if($(gridItem).hasClass('gi-mini')){
      $(gridItem).removeClass('gi-mini');
    } else {
      $(gridItem).addClass('gi-mini');
    }
    onSizeChange();
  });

  $(gridItem).find('.fa-times-circle').on('click',function(e){
    console.log("in remove");
    self.$grid.packery('remove', gridItem );
    if ($('#bd-empty').length == 1)
      self.addViewManager.clear();
    self.addViewManager.insert(itemInfo.type);
    onSizeChange();
  });

  setTimeout(function(){
    itemBuilder.init(gridItem,self);
  },400);

  return gridItem;
}

//class that handles all charts in a grid
function GridChart(){

  var self = this;

  this.charts = {};

  this.insert = function(name,chart){
    self.charts[name] = chart;
  };

  this.remove = function(name){
    delete self.charts[name];
  };

  //redraw all charts
  this.renderAll = function(){
    $.each( self.charts, function(key, value){
      value.render();
    });
  };

  //redraw specific chart
  this.render = function(name){
    self.charts[name].render();
  };

  //update a chart
  this.update = function(name,dataset){
    self.charts[name].data.datasets[0] = dataset;
    self.charts[name].update();
  };

}

//all the possible grid items, and their HTML.
var gridItemLookup = {
  "reports_trend" : {
    html: '<div class="gi-head">'
          + ' <span class="gih-header">REPORTS TREND</span>'
          + ' <div class="gih-options">'
          + '   <i class="fas fa-expand gi-close cp"></i>'
          + '   <i class="fas fa-times-circle gi-close cp"></i>'
          + ' </div>'
          + ' </div>'
          + ' <div class="gi-body">'
          + '   <canvas id="reports_trend_chart"></canvas>'
          + '</div>',
    init: function(item,self){
      //$.get(/api/data/reports-trend-data/)
      //hourly
      var view = "Hourly";
      var ctx = $("#reports_trend_chart")[0].getContext('2d');
      self.charts.insert( "reports_trend" , new Chart(ctx, {
            type: 'line',
            data: reports_trend_data,
            options: {
              responsive : true,
              scales: {
                xAxes: [{
                  scaleLabel: {
                    display: true,
                    labelString: view
                  }
                }]
              }
            }
        })
      );
    }
  },
  "tasks_completed" : {
    html: '<div class="gi-head">'
          + ' <span class="gih-header">TASKS COMPLETED</span>'
          + ' <div class="gih-options">'
          + '   <i class="fas fa-expand gi-close cp"></i>'
          + '   <i class="fas fa-times-circle gi-close cp"></i>'
          + ' </div>'
          + ' </div>'
          + ' <div class="gi-body">'
          + '   <canvas id="n_reports_chart"></canvas>'
          + '</div>',
    init: function(item){

    }
  },
  "live_feed" : {
    html : '<div class="gi-head">'
          + ' <span class="gih-header">LIVE FEED</span>'
          + ' <div class="gih-options">'
          + '   <i class="fas fa-expand gi-close cp"></i>'
          + '   <i class="fas fa-times-circle gi-close cp"></i>'
          + '   </div>'
          + ' </div>'
          + '<div class="gi-body"></div>',
    init : function(item){
      console.log('initialized feed for',item);
    }
  },
  "map" : {
    html : '<div class="gi-head">'
          + ' <span class="gih-header">MAP</span>'
          + ' <div class="gih-options">'
          + '   <i class="fas fa-expand gi-close cp"></i>'
          + '   <i class="fas fa-times-circle gi-close cp"></i>'
          + '   </div>'
          + ' </div>'
          + '<div class="gi-body">'
          +   '<div class="grid-map wh100"></div>'
          + '</div>',
    init : function(item,self){
      self.mapHandler = new MapHandler($(item).find('.grid-map').get(0),$(item).find('.gi-body'));
      self.mapHandler.load();
    }
  },
  "breakdown" : {
    html: '<div class="gi-head">'
          + ' <span class="gih-header">BREAKDOWN</span>'
          + ' <div class="gih-options">'
          + '   <i class="fas fa-expand gi-close cp"></i>'
          + '   <i class="fas fa-times-circle gi-close cp"></i>'
          + ' </div>'
          + ' </div>'
          + ' <div class="gi-body">'
          + '   <canvas id="breakdown_chart"></canvas>'
          + '</div>',
    init: function(item,self){
      //$.get(/api/data/breakdown-chart-data/)
      var ctx = $("#breakdown_chart")[0].getContext('2d');
      breakdown_data.datasets[0].backgroundColor = getColors(breakdown_data.datasets[0].data.length);
      self.charts.insert( "breakdown" , new Chart(ctx, {
            type: 'doughnut',
            data: breakdown_data,
            options: {
              responsive : true,
              title: {
                display: true,
                text: 'Reports by Type'
              }
            }
        })
      );
    }
  },
  "unknown" : {
    html: '<div class="gi-head">'
          + ' <span class="gih-header">UNKNOWN</span>'
          + ' <div class="gih-options">'
          + '   <i class="fas fa-expand gi-close cp"></i>'
          + '   <i class="fas fa-times-circle gi-close cp"></i>'
          + ' </div>'
          + ' </div>'
          + ' <div class="gi-body">'
          + '   <canvas id="n_reports_chart"></canvas>'
          + '</div>',
    init: function(item){

    }
  }
};


//get n colors for chart, colors used are taken from a top 20 chart colors list on Google
function getColors(nColors){
  var colors = ['#3366CC','#DC3912','#FF9900','#109618','#990099','#3B3EAC','#0099C6','#DD4477','#66AA00','#B82E2E','#316395','#994499','#22AA99','#AAAA11','#6633CC','#E67300','#8B0707','#329262','#5574A6','#3B3EAC'];
  shuffleArray(colors);
  return colors.splice(0,nColors);
}

/**
 * Randomize array element order in-place.
 * Using Durstenfeld shuffle algorithm.
 */
function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}

//sample data for charts

var breakdown_data = {
  datasets : [{
    data : [30,12,192,93,10]
  }],
  labels : ["Fire","Trapped","Flooding","Broken Bridge","Supplies Needed"]
}

var reports_trend_data = {
  datasets : [{
    data : [30,121,100,93,50,30,21],
    label: "# of Reports",
    borderColor: "rgba(60,186,159,1)",
    backgroundColor: "rgba(60,186,159,0.1)"
  }],
  labels : ["12:00","1:00","2:00","3:00","4:00","5:00","now"]
}
