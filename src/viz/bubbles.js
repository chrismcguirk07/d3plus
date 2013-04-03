vizwhiz.viz.bubbles = function() {

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Public Variables with Default Settings
  //-------------------------------------------------------------------

  var width = 300,
      height = 300,
      value_var = "value",
      id_var = "id",
      text_var = "name",
      grouping = "name",
      tooltip_info = []
      arc_angles = {},
      arc_sizes = {},
      arc_inners = {},
      avail_var = "available",
      layout = "pie",
      donut = "false";

  //===================================================================


  function chart(selection) {
    selection.each(function(data, i) {

      //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      // Private Variables
      //-------------------------------------------------------------------
      
      var this_selection = this,
          timing = vizwhiz.timing,
          groups = {},
          value_extent = d3.extent(d3.values(data),function(d){ return d[value_var]; }),
          value_map = d3.scale.linear().domain(value_extent).range([1,4]),
          donut_size = 0.4;
            
      if (donut) var arc_offset = donut_size;
      else var arc_offset = 0;

      //===================================================================
      
      //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      // Calculate positioning for each bubble
      //-------------------------------------------------------------------
        
      data.forEach(function(value,index){
        if (!groups[value[grouping]]) { 
          groups[value[grouping]] = {
                                      "name": value[grouping],
                                      "value": 0,
                                      "x": 0,
                                      "y": 0,
                                      "width": 0,
                                      "height": 0,
                                      "total": 0,
                                      "elsewhere": 0
                                   }
        }
        if (!groups[value[grouping]][avail_var]) groups[value[grouping]][avail_var] = 0
        groups[value[grouping]].value += value[value_var] ? value_map(value[value_var]) : value_map(value_extent[0])
        groups[value[grouping]][avail_var] += value[avail_var] ? value[avail_var] : value.active ? 1 : 0
        groups[value[grouping]].total += value.total ? value.total : 1
        groups[value[grouping]].elsewhere += value.elsewhere ? value.elsewhere : 0
      })
      
      if (Object.keys(groups).length == 1) {

        for (var g in groups) {
          groups[g].x = (width)/2
          groups[g].y = (height)/2
          groups[g].width = width
          groups[g].height = height
        }
        
      } else if (grouping == "id" || grouping == "name") {
        
        if(data.length == 1) {
          var columns = 1,
              rows = 1
        } else {
          var rows = Math.ceil(Math.sqrt(data.length/(width/height))),
              columns = Math.ceil(Math.sqrt(data.length*(width/height)))
        }
        
        while ((rows-1)*columns >= data.length) rows--
        
        var r = 0, c = 0
        for (var g in groups) {
          groups[g].x = ((width/columns)*c)+((width/columns)/2)
          groups[g].y = ((height/rows)*r)+((height/rows)/2)
          groups[g].width = (width/columns)
          groups[g].height = (height/rows)

          if (c < columns-1) c++
          else {
            c = 0
            r++
          }
          
        }
        
      } else if (Object.keys(groups).length == 2) {
        
        var total = d3.sum(d3.values(groups),function(d){return d.value;})
        var offset = 0;
        for (var g in groups) {
          groups[g].width = width*(groups[g].value/total)
          groups[g].height = height
          groups[g].x = (groups[g].width/2)+offset
          groups[g].y = height/2
          offset += groups[g].width;
        }
        
      } else {

        var groups_tm = [],
            positions = {}
        
        for (var i in groups) {
          groups_tm.push({'key': i, 'values': Math.sqrt(groups[i].value)})
        }
        
        var tm = d3.layout.treemap()
          .round(false)
          .size([width,height])
          .value(function(d) { return d.values; })
          .sort(function(a,b) {
            return a.values - b.values
          })
          .nodes({"name": "root", "children": groups_tm})

        tm.forEach(function(value,index){
          if (value.name != 'root') {
            groups[value.key].width = value.dx
            groups[value.key].height = value.dy
            groups[value.key].x = value.x+value.dx/2
            groups[value.key].y = value.y+value.dy/2
          }
        })
        
      }

      var constraints = [d3.min(data,function(d){
                            return groups[d[grouping]].width/Math.ceil(Math.sqrt(groups[d[grouping]].value))
                          })/2,
                         d3.min(data,function(d){
                           return groups[d[grouping]].height/Math.ceil(Math.sqrt(groups[d[grouping]].value))
                         })/2],
          max_size = d3.min(constraints)*0.9
          
      if (grouping != "id" && grouping != "name") max_size = max_size*1.75
      var node_size = d3.scale.linear().domain(value_extent).range([max_size/4,max_size])
      
      data.forEach(function(d){
        if (value_var != 'none') var size = d[value_var] ? node_size(d[value_var]) : node_size(value_extent[0])
        else var size = max_size
        d.radius = size
        d.cx = groups[d[grouping]].x
        d.cy = groups[d[grouping]].y
      })
        
      //===================================================================
      
      //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      // Set up initial SVG and groups
      //-------------------------------------------------------------------
      
      // Select the svg element, if it exists.
      var svg = d3.select(this_selection).selectAll("svg").data([data]);
      
      var svg_enter = svg.enter().append("svg")
        .attr('width',width)
        .attr('height',height);
        
      svg_enter.append('g')
        .attr('class','bubbles');
        
      svg_enter.append('g')
        .attr('class','labels');
        
      //===================================================================
      
      //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      // New nodes and links enter, initialize them here
      //-------------------------------------------------------------------
      
      var label = d3.select("g.labels").selectAll("text")
        .data(d3.values(groups), function(d) { return d.name+d.x+d.y })
        
      label.enter().append("text")
        .attr("opacity",0)
        .attr("text-anchor","middle")
        .attr("font-weight","bold")
        .attr("font-size","12px")
        .attr("font-family","Helvetica")
        .attr("fill","#4c4c4c")
        .attr('x',function(d) { return d.x; })
        .attr('y',function(d) {
          if (Object.keys(groups).length == 2) var y_offset = height
          else var y_offset = d3.min([d.width,d.height]);
          return d.y+(y_offset/2)-45;
        })
        .each(function(d){
          if (grouping == 'active') {
            var t = d.name == true ? 'Available' : 'Not Available'
          } else {
            var t = d.name
          }
          vizwhiz.utils.wordwrap({
            "text": t,
            "parent": this,
            "width": d.width,
            "height": 20
          })
          
          if (!d.total) {
            if (!d.active) var t = "Not "+avail_var
            else var t = avail_var
          } else {
            var t2 = null
            if (d[avail_var] < d.total) {
              var t = d[avail_var] + " of " + d.total + " " + avail_var
              if (d.elsewhere > 0) t2 = "(" +(d.elsewhere)+ " elsewhere)"
            } else if (d[avail_var] >= d.total) {
              var t = d.total + " " + avail_var
              if (d[avail_var] > d.total) t2 = "(" +(d[avail_var]-d.total)+ " extra)"
            }
          }
          
          d3.select(this).append("tspan")
            .attr("x",d.x)
            .attr("dy","14px")
            .style("font-weight","normal")
            .text(t)
          
          if (t2) {
            d3.select(this).append("tspan")
              .attr("x",d.x)
              .attr("dy","14px")
              .style("font-weight","normal")
              .text(t2)
          }
        })
      
      var arc = d3.svg.arc()
        .startAngle(0)
        .innerRadius(function(d) { return d.arc_inner })
        .outerRadius(function(d) { return d.arc_radius })
        .endAngle(function(d) { return d.arc_angle })
      
      var arc_else = d3.svg.arc()
        .startAngle(0)
        .innerRadius(function(d) { return d.arc_inner_else })
        .outerRadius(function(d) { return d.arc_radius_else })
        .endAngle(function(d) { return d.arc_angle_else })

      var bubble = d3.select("g.bubbles").selectAll("g.bubble")
        .data(data, function(d) { return d[id_var] })
        
      bubble.enter().append("g")
        .attr("class", "bubble")
        .attr("transform", function(d){ return "translate("+d.cx+","+d.cy+")"; })
        .on(vizwhiz.evt.over, function(d){
          
          var tooltip_data = {}
          tooltip_info.forEach(function(t){
            if (d[t]) tooltip_data[t] = d[t]
          })
          
          vizwhiz.tooltip.create({
            "parent": svg,
            "id": d[id_var],
            "data": tooltip_data,
            "title": d[text_var],
            "x": d.x,
            "y": d.y,
            "offset": d.radius,
            "arrow": true
          })
          
        })
        .on(vizwhiz.evt.out, function(d){
          vizwhiz.tooltip.remove(d[id_var])
        })
        .each(function(d){
          
          d3.select(this).append("circle")
            .attr("class","bg")
            .attr("fill", d.color )
            .style('fill-opacity', 0.1 )
            .attr("r",0);
            
          arc_angles[d[id_var]] = 0
          arc_sizes[d[id_var]] = 0
          arc_inners[d[id_var]] = 0
          
          if (d.elsewhere) {
          
            arc_angles[d[id_var]+"else"] = 0
            arc_sizes[d[id_var]+"else"] = 0
            arc_inners[d[id_var]+"else"] = 0
            
            d3.select(this).append("path")
              .attr("class","elsewhere")
              .style('fill', d.color )
              .style('fill-opacity', 0.5 )
            
            d3.select(this).select("path").transition().duration(vizwhiz.timing)
              .attrTween("d",arcTween)
          }
            
          d3.select(this).append("path")
            .each(function(dd) { dd.arc_id = dd[id_var]; })
            .attr("class","available")
            .style('fill', d.color )
            
          d3.select(this).select("path").transition().duration(vizwhiz.timing)
            .attrTween("d",arcTween)
          
          d3.select(this).append("circle")
            .attr("class","hole")
            .attr("fill", "#ffffff")
            .attr("r",0);
            
        });
      
      //===================================================================
      
      //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      // Update, for things that are already in existance
      //-------------------------------------------------------------------
        
      bubble.transition().duration(vizwhiz.timing)
        .each(function(d){
          
          d3.select(this).select("circle.bg").transition().duration(vizwhiz.timing)
            .attr("r", d.radius )
          
          if (layout != "inner") d.arc_radius = d.radius;
          else d.arc_radius = d.radius*(arc_offset+(1-arc_offset)/2);
          
          if (d.total) d.arc_angle = (((d[avail_var] / d.total)*360) * (Math.PI/180));
          else if (d.active) d.arc_angle = 360; 
          
          if (layout == "outer") d.arc_inner = d.radius*(arc_offset+(1-arc_offset)/2);
          else d.arc_inner = d.radius*arc_offset;

          d3.select(this).select("path.available").transition().duration(vizwhiz.timing)
            .attrTween("d",arcTween)
            .each("end", function(dd) {
              arc_angles[d[id_var]] = d.arc_angle
              arc_sizes[dd[id_var]] = d.arc_radius
              arc_inners[dd[id_var]] = d.arc_inner
            })
          
          if (d.elsewhere) {
            
            if (layout != "donut" && layout != "pie") d.arc_angle_else = (((d.elsewhere / d.total)*360) * (Math.PI/180));
            else d.arc_angle_else = d.arc_angle + (((d.elsewhere / d.total)*360) * (Math.PI/180));
            
            if (layout == "outer") d.arc_radius_else = d.radius*(arc_offset+(1-arc_offset)/2);
            else d.arc_radius_else = d.radius;
          
            if (layout == "inner") d.arc_inner_else = d.radius*(arc_offset+(1-arc_offset)/2);
            else d.arc_inner_else = d.radius*arc_offset;
            
            d3.select(this).select("path.elsewhere").transition().duration(vizwhiz.timing)
              .attrTween("d",arcTween_else)
              .each("end", function(dd) {
                arc_angles[d[id_var]+"else"] = d.arc_angle_else
                arc_sizes[d[id_var]+"else"] = d.arc_radius_else
                arc_inners[d[id_var]+"else"] = d.arc_inner_else
              })
          }

          d3.select(this).select("circle.hole").transition().duration(vizwhiz.timing)
            .attr("r", d.radius*arc_offset )
            .attr("opacity",function(){
              if (donut) return 1;
              else return 0;
            })
          
        })

      label.transition().duration(timing/2)
        .attr('opacity',1)
        
      svg.transition().duration(timing)
        .attr("width", width)
        .attr("height", height);
          
      //===================================================================
      
      //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      // Exit, for nodes and links that are being removed
      //-------------------------------------------------------------------

      bubble.exit().transition().duration(timing)
        .attr('opacity',0)
        .remove()

      label.exit().transition().duration(timing/2)
        .attr('opacity',0)
        .remove()

      //===================================================================
      
      //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      // Force layout, to control hit detection
      //-------------------------------------------------------------------
      var bool = false
      d3.layout.force()
        .friction(0.2)
        .charge(0)
        .gravity(0)
        .size([width,height])
        .nodes(data)
        .on("tick",function(e) {
          
          bubble
            .each(function(d) {
              d.y += (d.cy - d.y) * e.alpha;
              d.x += (d.cx - d.x) * e.alpha;
              if (grouping != "id" && grouping != "name") {
                for (var group in groups) {
                  if (group == "true") var g = true
                  else if (group == "false") var g = false
                  else var g = group
                  
                  var nodegroup = data.filter(function(d){ return d[grouping] == g; }),
                      q = d3.geom.quadtree(nodegroup),
                      i = 0,
                      n = nodegroup.length;
                  
                  while (++i < n) {
                    q.visit(collide(nodegroup[i]))
                  }
                }
              }
            })
            .attr("transform", function(d){ return "translate("+d.x+","+d.y+")"; });
            
        }).start()
        
      // Resolve collisions between nodes.
      function collide(node) {
        var r = node.radius + node_size.domain()[1],
            nx1 = node.x - r,
            nx2 = node.x + r,
            ny1 = node.y - r,
            ny2 = node.y + r;
        return function(quad, x1, y1, x2, y2) {
          if (quad.point && (quad.point !== node)) {
            var x = node.x - quad.point.x,
                y = node.y - quad.point.y,
                l = Math.sqrt(x * x + y * y),
                r = node.radius + quad.point.radius;
            if (l < r) {
              l = (l - r) / l * .5;
              node.x -= x *= l;
              node.y -= y *= l;
              quad.point.x += x;
              quad.point.y += y;
            }
          }
          return x1 > nx2
              || x2 < nx1
              || y1 > ny2
              || y2 < ny1;
        };
      }
      
      function arcTween(b) {
        var i = d3.interpolate({arc_angle: arc_angles[b[id_var]], arc_radius: arc_sizes[b[id_var]], arc_inner: arc_inners[b[id_var]]}, b);
        return function(t) {
          return arc(i(t));
        };
      }
      
      function arcTween_else(b) {
        var i = d3.interpolate({arc_angle_else: arc_angles[b[id_var]+"else"], arc_radius_else: arc_sizes[b[id_var]+"else"], arc_inner_else: arc_inners[b[id_var]+"else"]}, b);
        return function(t) {
          return arc_else(i(t));
        };
      }

      //===================================================================
      
    });
    
    return chart;
    
  }


  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Expose Public Variables
  //-------------------------------------------------------------------

  chart.width = function(x) {
    if (!arguments.length) return width;
    width = x;
    return chart;
  };

  chart.height = function(x) {
    if (!arguments.length) return height;
    height = x;
    return chart;
  };

  chart.grouping = function(x) {
    if (!arguments.length) return grouping;
    grouping = x;
    return chart;
  };
  
  chart.value_var = function(x) {
    if (!arguments.length) return value_var;
    value_var = x;
    return chart;
  };
  
  chart.id_var = function(x) {
    if (!arguments.length) return id_var;
    id_var = x;
    return chart;
  };
  
  chart.text_var = function(x) {
    if (!arguments.length) return text_var;
    text_var = x;
    return chart;
  };
  
  chart.avail_var = function(x) {
    if (!arguments.length) return avail_var;
    avail_var = x;
    return chart;
  };
  
  chart.tooltip_info = function(x) {
    if (!arguments.length) return tooltip_info;
    tooltip_info = x;
    return chart;
  };
  
  chart.layout = function(x) {
    if (!arguments.length) return layout;
    layout = x;
    return chart;
  };
  
  chart.donut = function(x) {
    if (!arguments.length) return donut;
    if (x == "true") donut = true;
    else if (x == "false") donut = false;
    else donut = x;
    return chart;
  };

  //===================================================================


  return chart;
};
