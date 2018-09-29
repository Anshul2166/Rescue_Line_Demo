/*
 * Pretty lengthy file with the GridHandler and other classes & functions directly related to the dashboard grid.
 * I will look into separating these into simpler files when I have time.
 */

//loads and manages the dashboard grid
function GridHandler() {
  var self = this;

  this.charts = new GridChart();
  this.mapHandler = null;
  this.addViewManager = null;
  this.chatHandler = null;
  this.viewManager = null;
  this.feed = {};

  this.$grid = null;

  this.getSmallestColumn = function() {
    var smallestWidth = 1000;
    var thisWidth = null;
    $(".grid-item").each(function(index, el) {
      thisWidth = $(el).width();
      if (thisWidth < smallestWidth) smallestWidth = thisWidth;
    });
    return smallestWidth;
  };

  this.setChatHandler = function(ch) {
    self.chatHandler = ch;
  };

  this.setViewManager = function(vm) {
    self.viewManager = vm;
  };

  this.getCurrentOrder = function() {
    var $el = null;
    var itemOrder = [];
    $.each(self.$grid.packery("getItemElements"), function(index, element) {
      $el = $(element);
      itemOrder.push({
        type: $el.attr("id"),
        mini: $el.hasClass("gi-mini")
      });
    });
    return itemOrder;
  };

  this.addView = function(type) {
    var gridItem = new GridItem(
      { type: type, mini: false },
      function() {
        self.refresh();
      },
      self
    );

    $(".dash-grid").append(gridItem);
    self.$grid.packery("appended", gridItem);

    self.$grid.packery("destroy");

    self.$grid = $(".dash-grid").packery({
      itemSelector: ".grid-item",
      gutter: 15,
      columnWidth: self.getSmallestColumn(),
      rowWidth: 200
    });

    self.$grid.find(".grid-item").each(function(i, gridItem) {
      var draggie = new Draggabilly(gridItem, {
        handle: ".gi-head"
      });
      // bind drag events to Packery
      self.$grid.packery("bindDraggabillyEvents", draggie);
    });
  };

  this.initialize = function() {
    self.addViewManager = new AddViewManager();

    //get save order & settings from database
    $.get("/api/dashboard/settings/" + Cookies.get("token")).done(function(
      response
    ) {
      var layout = [
        { type: "reports_trend", mini: true },
        { type: "tasks_completed", mini: true },
        { type: "unknown", mini: true },
        { type: "unknown", mini: true },
        { type: "live_feed", mini: false },
        { type: "map", mini: false },
        { type: "breakdown", mini: false },
        { type: "unknown", mini: false }
      ];

      if (response.status == "success" && !$.isEmptyObject(response.data)) {
        layout = response.data.settings;
      }

      for (var i = 0; i < layout.length; i++)
        $(".dash-grid").append(
          new GridItem(
            layout[i],
            function() {
              self.refresh();
            },
            self
          )
        );

      self.$grid = $(".dash-grid").packery({
        itemSelector: ".grid-item",
        gutter: 15,
        columnWidth: self.getSmallestColumn(),
        rowWidth: 200
      });

      self.$grid.find(".grid-item").each(function(i, gridItem) {
        var draggie = new Draggabilly(gridItem, {
          handle: ".gi-head"
        });
        // bind drag events to Packery
        self.$grid.packery("bindDraggabillyEvents", draggie);
      });

      self.addViewManager.build(layout);
    });

    $(window).on("resize", function() {
      self.refresh();
    });

    //set clicks

    $(".grid-save").on("click", function() {
      var order = self.getCurrentOrder();

      //make a post request to save settings
      $.ajax({
        method: "POST",
        url: "/api/dashboard/settings",
        contentType: "application/json",
        data: JSON.stringify({ settings: order, token: Cookies.get("token") })
      }).done(function(response) {
        // console.log(response);
        if (response.status == "success") {
          handleSuccess("Saved");
        } else {
          handleError(response.error);
        }
      });
    });

    $(".grid-add").on("click", function() {
      $(".add-view-drop").toggle();
    });
  };

  this.refresh = function() {
    self.$grid.packery({
      columnWidth: self.getSmallestColumn()
    });
  };

  //nested class that handles add-view-drop
  function AddViewManager() {
    var thisSelf = this;

    $addViewDrop = $(".add-view-drop");

    this.build = function(layout) {
      $addViewDrop.html("");
      var defaults = {
        reports_trend: true,
        tasks_completed: true,
        live_feed: true,
        breakdown: true,
        map: true
      };
      var inMenu = {};
      for (var i = 0; i < layout.length; i++) delete defaults[layout[i].type];

      $.each(defaults, function(key, value) {
        // console.log("inserting ", key);
        thisSelf.insert(key);
      });

      if ($addViewDrop.children().length == 0)
        $addViewDrop.append('<div id="bd-empty">Empty</div>');
    };

    this.insert = function(type) {
      $addViewDrop.append(buildDropItem(type));
    };

    this.clear = function() {
      $addViewDrop.html("");
    };

    function buildDropItem(type) {
      var item = document.createElement("div");
      var name = type.split("_");
      for (var i = 0; i < name.length; i++)
        name[i] = name[i].charAt(0).toUpperCase() + name[i].slice(1);
      name = name.join(" ");

      item.id = "bd-" + type;
      item.className = "a-b";
      item.innerHTML = name;

      $(item).on("click", function() {
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
function GridItem(itemInfo, onSizeChange, self) {
  var gridItem = document.createElement("div");

  var classString = "grid-item paper rounded";
  if (itemInfo.mini) classString += " gi-mini";

  gridItem.className = classString;
  gridItem.id = itemInfo.type;

  var itemBuilder = gridItemLookup[itemInfo.type];

  $(gridItem).html(itemBuilder.html);

  //set clicks for minimizing and closing
  $(gridItem)
    .find(".fa-expand")
    .on("click", function() {
      // console.log("in resize");
      if ($(gridItem).hasClass("gi-mini")) {
        $(gridItem).removeClass("gi-mini");
      } else {
        $(gridItem).addClass("gi-mini");
      }
      onSizeChange();
    });

  $(gridItem)
    .find(".fa-times-circle")
    .on("click", function(e) {
      // console.log("in remove");
      self.$grid.packery("remove", gridItem);
      if ($("#bd-empty").length == 1) self.addViewManager.clear();
      self.addViewManager.insert(itemInfo.type);
      onSizeChange();
    });

  setTimeout(function() {
    itemBuilder.init(gridItem, self);
  }, 400);

  return gridItem;
}

//class that handles all charts in a grid
function GridChart() {
  var self = this;

  this.charts = {};

  this.insert = function(name, chart) {
    self.charts[name] = chart;
  };

  this.remove = function(name) {
    delete self.charts[name];
  };

  //redraw all charts
  this.renderAll = function() {
    $.each(self.charts, function(key, value) {
      value.render();
    });
  };

  //redraw specific chart
  this.render = function(name) {
    self.charts[name].render();
  };

  //update a chart
  this.update = function(name, dataset) {
    self.charts[name].data.datasets[0] = dataset;
    self.charts[name].update();
  };
}

var intentPhrases = {
  fire: "reported a fire",
  earthquake: "reported an earthquake",
  avalanche: "reported an avalanche",
  tornado: "reported a tornado",
  volcano: "reported experiencing the effects of a volcano",
  flood: "reported flooding",
  landslide: "reported a landslide",
  tsunami: "reported a tsunami",
  sandstorm: "reported a sandstorm",
  need_medic: "needs medical attention",
  trapped: "is trapped",
  needs_supplies: "needs supplies",
  reported_incident: "reported a safety hazard"
};

var colorDisaster = {
  fire: "#e25822",
  earthquake: "#0abf27",
  avalanche: "#6F263D",
  tornado: "#b2825f",
  volcano: "#97ab12",
  flood: "#8ff1f7",
  landslide: "#236192",
  tsunami: "#94d9e8",
  sandstorm: "#bbe20a"
};

var breakdown_data = {
  datasets: [
    {
      data: []
    }
  ],
  labels: []
};

function getTimefromDate(timestamp) {
  return new Date(timestamp * 1000).getTime();
}

var date = new Date();
var d1 = new Date(new Date() * 1 - 1000 * 3600 * 1);
var d2 = new Date(new Date() * 1 - 1000 * 3600 * 2);
var d3 = new Date(new Date() * 1 - 1000 * 3600 * 3);
var d4 = new Date(new Date() * 1 - 1000 * 3600 * 4);
var d5 = new Date(new Date() * 1 - 1000 * 3600 * 5);
// var d6=new Date((new Date)*1 - 1000*3600*6);
var reports_trend_data = {
  datasets: [
    {
      data: [0, 0, 0, 0, 0, 0],
      label: "# of Reports",
      borderColor: "rgba(60,186,159,1)",
      backgroundColor: "rgba(60,186,159,0.1)"
    }
  ],
  labels: [
    d5.getHours(),
    d4.getHours(),
    d3.getHours(),
    d2.getHours(),
    d1.getHours(),
    "now"
  ]
};

var specialKeyProcessing = {
  address_geocoded: function(val, gridHandler, eventId) {
    var link = document.createElement("span");
    // console.log("Showing address geocoded");
    link.className = "cp cl-light";
    $(link).html(
      "<div class='inva rel tooltip-right' data-tooltip='View on map' style='margin:5px 0px 0px 5px'><i class='fas fa-map-marked-alt' style='font-size: 25px;'></i></div>"
    );
    $(link).on("click", function() {
      //will open on map
      var addPopup = function() {
        //mm is for map marker
        var markerId = "mm_" + eventId;
        gridHandler.mapHandler.map.setZoom(15);
        //start panning to marker
        gridHandler.mapHandler.map.panTo(val.geometry.coordinates);

        var exists = false;
        //check if marker already exists
        $.each(gridHandler.mapHandler.map._canvasContainer.children, function(
          index,
          item
        ) {
          // console.log("ITEM.ID", item.id);
          if (item.id == markerId) exists = true;
        });

        // console.log("EXISTS", exists);
        if (exists) return false;

        // create the popup
        var popup = new mapboxgl.Popup().setText("Info here");

        // create the marker
        var marker = new mapboxgl.Marker();
        marker._element.id = markerId;
        // console.log(markerId);
        // console.log("MARKER", marker);

        //attach popup and add to map
        marker
          .setLngLat(val.geometry.coordinates)
          .setPopup(popup)
          .addTo(gridHandler.mapHandler.map);
      };

      if (gridHandler.mapHandler === null) {
        gridHandler.addView("map");
        setTimeout(addPopup, 1000);
      } else {
        addPopup();
      }
    });
    return { key: "Address Coordinates", val: link };
  },
  user_country: function(val) {
    return { key: "User Country", val: val.toUpperCase() };
  },
  identifier: function(val, gridHandler, eventId) {
    var link = document.createElement("span");
    link.className = "cp cl-light";
    $(link).html(
      "<div class='inva rel tooltip-right' data-tooltip='Start chat' style='margin:5px 0px 0px 5px'><i class='fas fa-comments' style='font-size: 25px;'></i></div>"
    );
    //start chat
    $(link).on("click", function() {
      gridHandler.viewManager.load("get_help");
      $(".ch-head-name").html(val);
      gridHandler.chatHandler.startChat(val, Cookies.get("token"));
    });

    return { key: "Chat", val: link };
  }
};

//This class builds a live_feed item and sets relevant clicks
//TODO: implement a 'refresh' method where you input new data received from websocket, and it refreshes that FeedItem
function FeedItem(itemInfo, gridHandler) {
  var self = this;

  this.feedItem = document.createElement("div");

  //builder is refresher, so we can conveniently refresh when needed
  this.refresh = function(itemInfo) {
    // console.log(itemInfo);
    var priority = { text: "LOW", class: "" };
    let coordinates = itemInfo.address_geocoded.geometry.coordinates;
    var keyToText = function(key) {
      return key
        .split("_")
        .map(function(item, index) {
          return item.charAt(0).toUpperCase() + item.slice(1);
        })
        .join(" ");
    };

    //format intent. Example: needs_medic -> Needs Medic
    var processedIntent = {
      text: keyToText(itemInfo.verified_intent),
      phrase: intentPhrases[itemInfo.verified_intent]
    };
    let disaster=processedIntent.text;
    let address=itemInfo.address;
    lat=itemInfo.address_geocoded.geometry.coordinates[1];
    lng=itemInfo.address_geocoded.geometry.coordinates[0];
    //lf_ is live_feed, + docID
    self.feedItem.id = "lf_" + itemInfo._id;

    if (itemInfo.priority_weight > 0.8) {
      priority = { text: "HIGH", class: "prio-red" };
    } else if (itemInfo.priority_weight > 0.5) {
      priority = { text: "MEDIUM", class: "prio-yellow" };
    }
    let totalInjured = itemInfo.minor_injuries + itemInfo.serious_injuries;
    //TODO: have similiar_nearby field, will have to get in DB
    self.feedItem.className = "feed-item rel " + priority.class;
    $(self.feedItem).html(
      '<img src="/assets/placeholder.jpg">' +
        '<div class="fi-info inva">' +
        '<div class="fi-header inva">' +
        processedIntent.text +
        "</div>" +
        '<div class="blinker inva tooltip-bottom" data-tooltip="Collecting info realtime"><i class="fas fa-circle Blink inva" style="margin:4px 0px 0px 5px;"></i></div><br>' +
        '<div class="fi-description roboto-thin">' +
        itemInfo.identifier +
        " " +
        processedIntent.phrase +
        "." +
        totalInjured +
        " might be involved. Estimated priority: " +
        priority.text +
        "</div>" +
        "</div>" +
        '<div class="fi-i fii-share inva rel tooltip-left" data-tooltip="Send to responder" style="margin-top:12px;"><i class="fas fa-share-square c-align-abs"></i></div>' +
        '<div class="fi-i fii-details inva rel tooltip-left" data-tooltip="Details" style="margin-top:12px;"><i class="fas fa-info-circle c-align-abs"></i></div>' +
        '<div class="fi-details">' +
        "</div>"
    );

    var $fi = $(self.feedItem);
    var $fid = $fi.find(".fi-details");

    //if this item is old, don't show realtime blinker
    if (Date.now() - itemInfo.timestamp > 120000) $fi.find(".blinker").hide();

    //set minimize & maximize
    $fi.find(".fii-details").on("click", function() {
      // console.log($fid.css("height"));
      if ($fid.css("height") == "0px") {
        //if is minimized, then maximize
        $fid.animate(
          {
            height: $fid.get(0).scrollHeight
          },
          400,
          function() {
            $fid.height("auto");
          }
        );
      } else {
        //if is maximized, minimize
        $fid.animate(
          {
            height: "0px"
          },
          400
        );
      }
    });

    //open share-modal to send event directly to a responder
    $fi.find(".fii-share").on("click", function() {
      // console.log("open share modal");
      $.ajax({
        method: "POST",
        url: "/api/responder/nearby",
        contentType: "application/json",
        data: JSON.stringify({
          location: coordinates,
          token: Cookies.get("token")
        })
      }).done(function(response) {
        // console.log("Sharing response");
        // console.log(response);
        if (response.status == "success") {
          $(".share-modal").show();
          $("#share-box-body").html('');
          for (var i = 0; i < response.data.length; i++) {
            let distance_from_responder=getDistanceFromLatLonInKm(response.data[i].geo[1],response.data[i].geo[0],coordinates[1],coordinates[0]).toFixed(2);
            $("#share-box-body").append(
                '<div class="ch-item no-cp rel tl">' +
                  '<div class="ch-item-pic inva">' +
                    '<img src="/assets/placeholder.jpg">' +
                  "</div>" +
                  '<div class="ch-item-preview inva" style="margin:3px 0px 0px 10px;">' +
                    '<div class="ch-item-name f-med">' +
                      response.data[i].name +
                     "</div>" +
                     '<span class="ch-msg roboto-thin cl-light-gray">'+distance_from_responder+' km away+</span>' +
                  "</div>" +
                '  <div id="send-to-responder" class="send-to-responder ci-i ci-plane bg-light cp cl-white tc abs top-right-0"><i class="fab fa-telegram-plane"></i></div>' +
                "</div>"
            );
            $('#send-to-responder').click(function(){
               let message="Please check this out.";
               message+=" Our current enquiry suggests that there has been an incident of "+disaster+" in which we estimate around "+totalInjured+" injuries. The address is "+address+" with latitude "+lat+" and longitude "+lng+" .The distance from your current location to this place should be approximately "+distance_from_responder+" km" ;
               let attachment=$("#msg-to-responders").val();
               // console.log("Here is the attachment");
               // console.log(attachment);
               gridHandler.chatHandler.startChat(response.data[0].username, Cookies.get("token"));
               gridHandler.chatHandler.sendChat(message,Cookies.get("token"));
               gridHandler.chatHandler.sendChat(attachment,Cookies.get("token"));
               handleSuccess("Chat send");
            });
           
          }
        } else {
          handleError(response.error);
        }
      });
    });

    itemInfo.timestamp = new Date(itemInfo.timestamp).toLocaleString();
    itemInfo.verified_intent = keyToText(itemInfo.verified_intent);
    var eventId = itemInfo._id;

    delete itemInfo._id;
    delete itemInfo._rev;
    delete itemInfo.current_state;
    delete itemInfo.is_live;
    delete itemInfo.priority_weight;
    delete itemInfo.verified_intent;

    //build details
    $.each(itemInfo, function(key, val) {
      var div = document.createElement("div");
      var pair = {};
      pair.key = key;
      pair.val = val;

      if (typeof specialKeyProcessing[key] != "undefined")
        pair = specialKeyProcessing[key](val, gridHandler, eventId);

      $(div).html("<div>" + keyToText(pair.key) + "</div><span></span>");
      $(div)
        .find("span")
        .append(pair.val);
      $fid.append(div);
    });

    //hide blinker that says "Collecting info realtime" after 30 secs
    setTimeout(function() {
      $(self.feedItem)
        .find(".blinker")
        .hide();
    }, 30000);

    gridHandler.feed[eventId] = self;

    return self.feedItem;
  };

  return this.refresh(itemInfo);
}

//all the possible grid items, and their HTML.
var gridItemLookup = {
  reports_trend: {
    html:
      '<div class="gi-head">' +
      ' <span class="gih-header">REPORTS TREND</span>' +
      ' <div class="gih-options">' +
      '   <i data-tooltip="Snapshot" class="tooltip-bottom rel"><i class="fas fa-camera cp"></i></i>' +
      '   <i class="fas fa-expand cp"></i>' +
      '   <i class="fas fa-times-circle cp"></i>' +
      " </div>" +
      " </div>" +
      ' <div class="gi-body">' +
      '   <canvas id="reports_trend_chart"></canvas>' +
      "</div>",
    init: function(item, self) {
      //$.get(/api/data/reports-trend-data/)
      //hourly
      // console.log("Getting the data");
      // console.log(reports_trend_data);
      var view = "Hourly";
      var ctx = $("#reports_trend_chart")[0].getContext("2d");
      self.charts.insert(
        "reports_trend",
        new Chart(ctx, {
          type: "line",
          data: reports_trend_data,
          options: {
            responsive: true,
            scales: {
              xAxes: [
                {
                  scaleLabel: {
                    display: true,
                    labelString: view
                  }
                }
              ]
            }
          }
        })
      );

      $(item)
        .find(".fa-camera")
        .on("click", function() {
          window.open(
            window.URL.createObjectURL(
              base64toBlob(
                self.charts.charts.reports_trend.toBase64Image().slice(22),
                "image/png"
              )
            ),
            "_blank"
          );
        });
    }
  },
  tasks_completed: {
    html:
      '<div class="gi-head">' +
      ' <span class="gih-header">TASKS COMPLETED</span>' +
      ' <div class="gih-options">' +
      '   <i class="fas fa-expand cp"></i>' +
      '   <i class="fas fa-times-circle cp"></i>' +
      " </div>" +
      " </div>" +
      ' <div class="gi-body">' +
      '   <canvas id="n_reports_chart"></canvas>' +
      "</div>",
    init: function(item) {}
  },
  live_feed: {
    html:
      '<div class="gi-head">' +
      ' <span class="gih-header">LIVE FEED</span>' +
      ' <div class="gih-options">' +
      "   <!-- Will be able to sort by: Priority, Newest, Oldest -->" +
      '   <i data-tooltip="Filter" class="tooltip-bottom rel"><i class="fas fa-filter cp" style="font-size:11px;"></i></i>' +
      '   <i data-tooltip="Sort" class="tooltip-bottom rel"><i class="fas fa-sort cp"></i></i>' +
      '   <i class="fas fa-expand cp"></i>' +
      '   <i class="fas fa-times-circle cp"></i>' +
      "   </div>" +
      " </div>" +
      '<div class="gi-body touch-scroll" style="display:block;padding-top:0;overflow-x:visible;">' +
      "</div>",
    init: function(item, self) {
      var feedData = [];
      var finalInfo = [];
      let map_marks = [];

      $.ajax({
        method: "POST",
        url: "/api/data/feed",
        contentType: "application/json",
        data: JSON.stringify({ token: Cookies.get("token") })
      }).done(function(response) {
        feedData = response.data.feed;
        // console.log("Here is the reponse to init");
        // console.log(response);
        if (response != undefined) {
          for (var i = 0; i < feedData.length; i++) {
            var curInfo = {};
            let map_marks_element = {
              disaster: "",
              coordinates: { lng: "", lat: "" }
            };
            curInfo._id = feedData[i]._id;
            curInfo._rev = feedData[i]._rev;
            curInfo.first_explanation = feedData[i].first_explanation;
            curInfo.verified_intent = feedData[i].verified_intent;
            map_marks_element.disaster = curInfo.verified_intent;
            let index = breakdown_data.labels.indexOf(curInfo.verified_intent);
            if (index == -1) {
              //element is not found, then push the intent in labels
              breakdown_data.labels.push(curInfo.verified_intent);
              //push the number in dataset
              breakdown_data.datasets[0].data.push(1);
            } else {
              //intent is already registered, then add another incident to that, i.e, simply increment the value in it
              breakdown_data.datasets[0].data[index] =
                breakdown_data.datasets[0].data[index] + 1;
            }
            curInfo.serious_injuries = feedData[i].serious_injuries || 0;
            curInfo.minor_injuries = feedData[i].minor_injuries || 0;
            curInfo.priority_weight = feedData[i].priority_weight;
            curInfo.address = feedData[i].address;
            let location = feedData[i].device_location.geometry.coordinates;
            curInfo.address_geocoded = {
              geometry: {
                type: "Point",
                coordinates: [location[0], location[1]]
              }
            };
            curInfo.timestamp = feedData[i].timestamp;
            map_marks_element.coordinates.lat = location[1];
            map_marks_element.coordinates.lng = location[0];
            // console.log(map_marks_element);
            map_marks.push(map_marks_element);
            // console.log(map_marks);
            //get the time from timestamp
            let cur_date = new Date(curInfo.timestamp);
            let time_diff = Math.abs(date - cur_date) / 36e5;
            time_diff = Math.floor(time_diff);
            reports_trend_data.datasets[0].data[5 - time_diff] =
              1 + reports_trend_data.datasets[0].data[5 - time_diff];
            curInfo.user_country = "us";
            curInfo.is_live = true;
            curInfo.identifier = feedData[i].identifier;
            curInfo.current_state = "serious_injury_yesno";
            finalInfo.push(curInfo);
          }
          $fb = $("#live_feed .gi-body");
          gridItemLookup.breakdown.init(true, self);
          gridItemLookup.reports_trend.init(true, self);
          // gridItemLookup.map.init(true, self);
          markOnMap(self, map_marks);
          for (var i = 0; i < finalInfo.length; i++)
            $fb.append(new FeedItem(finalInfo[i], self));
        } else {
          handleError(response.error);
        }
      });
    }
  },
  map: {
    html:
      '<div class="gi-head">' +
      ' <span class="gih-header">MAP</span>' +
      ' <div class="gih-options">' +
      '   <i class="fas fa-expand cp"></i>' +
      '   <i class="fas fa-times-circle cp"></i>' +
      "   </div>" +
      " </div>" +
      '<div class="gi-body">' +
      '<div class="grid-map wh100"></div>' +
      "</div>",
    init: function(item, self) {
      self.mapHandler = new MapHandler(
        $(item)
          .find(".grid-map")
          .get(0),
        $(item).find(".gi-body")
      );
      // console.log("===================Loading map");
      self.mapHandler.load();
    }
  },
  breakdown: {
    html:
      '<div class="gi-head">' +
      ' <span class="gih-header">BREAKDOWN</span>' +
      ' <div class="gih-options">' +
      '   <i data-tooltip="Snapshot" class="tooltip-bottom rel"><i class="fas fa-camera cp"></i></i>' +
      '   <i class="fas fa-expand cp"></i>' +
      '   <i class="fas fa-times-circle cp"></i>' +
      " </div>" +
      " </div>" +
      ' <div class="gi-body">' +
      '   <canvas id="breakdown_chart"></canvas>' +
      "</div>",
    init: function(item, self) {
      //$.get(/api/data/breakdown-chart-data/)
      var ctx = $("#breakdown_chart")[0].getContext("2d");
      if (breakdown_data.datasets.length == 0) {
        // console.log("Nothing here");
      } else {
        // console.log("Finally getting here");
        // console.log(breakdown_data);
        breakdown_data.datasets[0].backgroundColor = getColors(
          breakdown_data.datasets[0].data.length
        );

        self.charts.insert(
          "breakdown",
          new Chart(ctx, {
            type: "doughnut",
            data: breakdown_data,
            options: {
              responsive: true,
              title: {
                display: true,
                text: "Reports by Type"
              }
            }
          })
        );

        $(item)
          .find(".fa-camera")
          .on("click", function() {
            window.open(
              window.URL.createObjectURL(
                base64toBlob(
                  self.charts.charts.breakdown.toBase64Image().slice(22),
                  "image/png"
                )
              ),
              "_blank"
            );
          });
      }
    }
  },
  unknown: {
    html:
      '<div class="gi-head">' +
      ' <span class="gih-header">UNKNOWN</span>' +
      ' <div class="gih-options">' +
      '   <i class="fas fa-expand cp"></i>' +
      '   <i class="fas fa-times-circle cp"></i>' +
      " </div>" +
      " </div>" +
      ' <div class="gi-body">' +
      '   <canvas id="n_reports_chart"></canvas>' +
      "</div>",
    init: function(item) {}
  }
};

//get n colors for chart, colors used are taken from a top 20 chart colors list on Google
function getColors(nColors) {
  var colors = [
    "#3366CC",
    "#DC3912",
    "#FF9900",
    "#109618",
    "#990099",
    "#3B3EAC",
    "#0099C6",
    "#DD4477",
    "#66AA00",
    "#B82E2E",
    "#316395",
    "#994499",
    "#22AA99",
    "#AAAA11",
    "#6633CC",
    "#E67300",
    "#8B0707",
    "#329262",
    "#5574A6",
    "#3B3EAC"
  ];
  shuffleArray(colors);
  return colors.splice(0, nColors);
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

function base64toBlob(base64Data, contentType) {
  contentType = contentType || "";
  var sliceSize = 1024;
  var byteCharacters = atob(base64Data);
  var bytesLength = byteCharacters.length;
  var slicesCount = Math.ceil(bytesLength / sliceSize);
  var byteArrays = new Array(slicesCount);

  for (var sliceIndex = 0; sliceIndex < slicesCount; ++sliceIndex) {
    var begin = sliceIndex * sliceSize;
    var end = Math.min(begin + sliceSize, bytesLength);

    var bytes = new Array(end - begin);
    for (var offset = begin, i = 0; offset < end; ++i, ++offset) {
      bytes[i] = byteCharacters[offset].charCodeAt(0);
    }
    byteArrays[sliceIndex] = new Uint8Array(bytes);
  }
  return new Blob(byteArrays, { type: contentType });
}

function markOnMap(gridHandler, map_marks) {
  // console.log("Showing markOnMap");
  var addMarks = function() {
    //mm is for map marker
    for (let i = 0; i < map_marks.length; i++) {
      let coordinates = map_marks[i].coordinates;
      let disaster = map_marks[i].disaster;
      let eventId = i;
      var markerId = "mm_" + i;
      gridHandler.mapHandler.map.setZoom(15);
      //start panning to marker
      gridHandler.mapHandler.map.panTo(coordinates);

      var exists = false;
      //check if marker already exists
      $.each(gridHandler.mapHandler.map._canvasContainer.children, function(
        index,
        item
      ) {
        // console.log("ITEM.ID", item.id);
        if (item.id == markerId) exists = true;
      });

      // console.log("EXISTS", exists);
      if (exists) return false;

      // create the popup
      var popup = new mapboxgl.Popup().setText(disaster);

      // create the marker
      var marker = new mapboxgl.Marker({
        color: colorDisaster[disaster]
      });
      marker._element.id = markerId;
      // console.log(markerId);
      // console.log("MARKER", marker);

      //attach popup and add to map
      marker
        .setLngLat(coordinates)
        .setPopup(popup)
        .addTo(gridHandler.mapHandler.map);
      $("#mm_3>svg").css("fill", "red");
    }
  };
  if (gridHandler.mapHandler == null) {
    gridHandler.addView("map");
    setTimeout(addMarks, 2000);
  } else if (gridHandler.mapHandler.map == null) {
    gridItemLookup.map.init(true, gridHandler);
  } else {
    addMarks();
  }
}

function getDistanceFromLatLonInKm(lat1,lon1,lat2,lon2) {
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2-lat1);  // deg2rad below
  var dLon = deg2rad(lon2-lon1); 
  var a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
    ; 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  var d = R * c; // Distance in km
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI/180)
}


//sample data for charts

// var breakdown_data = {
//   datasets: [
//     {
//       data: [30, 12, 192, 93, 10]
//     }
//   ],
//   labels: ["Fire", "Trapped", "Flooding", "Broken Bridge", "Supplies Needed"]
// };

// var reports_trend_data = {
//   datasets: [
//     {
//       data: [30, 121, 100, 93, 50, 30, 21],
//       label: "# of Reports",
//       borderColor: "rgba(60,186,159,1)",
//       backgroundColor: "rgba(60,186,159,0.1)"
//     }
//   ],
//   labels: ["12:00", "1:00", "2:00", "3:00", "4:00", "5:00", "now"]
// };
