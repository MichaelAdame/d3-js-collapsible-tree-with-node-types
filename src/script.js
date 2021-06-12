/**
 * 
 *
 *
 */
function CollapsibleTree (config) {
    
    this.config = config;
    
    this.defaultConfig = {
        width          : 4600,
        fullwidth      : false,
        height         : 450,
        data           : false,
        duration       : 750,
        marginTop      : 20,
        marginBottom   : 20,
        marginLeft     : 180,
        marginRight    : 120,
        appendSelector : 'body'
    };

    this.initialize = function () {
        if (!(this.config instanceof Object)) {
            this.config = {};
        }
        
        this.config = _.extend(this.defaultConfig, this.config);
    };
    
    this.collapse = function (d) {
        if (d.children && d.name) {
            d._children = d.children;
            d._children.forEach(this.collapse);
            d.children = null;
        }
        else if (d.children) {
            d.children.forEach(this.collapse);
        }
    }.bind(this);
    
    this.zoom = function () {
        var scale = d3.event.scale,
            translation = d3.event.translate,
            tbound = -this.config.height * scale,
            bbound = this.config.height * scale,
            lbound = (-this.config.width + this.config.marginLeft) * scale,
            rbound = (this.config.width - this.config.marginRight) * scale;
        // limit translation to thresholds
        translation = [
            Math.max(Math.min(translation[0], rbound), lbound),
            Math.max(Math.min(translation[1], bbound), tbound)
        ];
        d3.select(".drawarea")
            .attr("transform", "translate(" + translation + ")" +
                  " scale(" + scale + ")");
    }.bind(this);
    
    this.createTree = function (data) {
        this.config.width  = this.config.width - this.config.marginRight - this.config.marginLeft;
        this.config.height = this.config.height - this.config.marginTop - this.config.marginBottom;        
        this.tree          = d3.layout.tree().size([this.config.height, this.config.width]);
        this.diagonal      = d3.svg.diagonal().projection(function(d) { return [d.y, d.x]; });
        this.svg           = d3.select(this.config.appendSelector).append("svg")
                                .attr("height", this.config.height + this.config.marginTop + this.config.marginBottom)
                                .append("svg:g")
                                .attr("class","drawarea")
                                .append("g")
                                .attr("transform", "translate(" + this.config.marginLeft + "," + this.config.marginTop + ")");
        
        if (this.config.fullwidth) {
            d3.select(this.config.appendSelector + " svg")
              .attr("width", "100%");
        }
        else {
            d3.select(this.config.appendSelector + " svg")
              .attr("width", this.config.width + this.config.marginRight + this.config.marginLeft);
        }
         
        this.root    = data;
        this.root.x0 = this.config.height / 2;
        this.root.y0 = 0;
        
        this.update(this.root);
        
        if ( this.root.children) {
            this.root.children.forEach(this.collapse);
            this.update(this.root);
        }
        
    };
    
    this.onClick = function (d) {
        if (d.name) {
            if (d.children) {
                d._children = d.children;
                d.children  = null;
            } else {
                d.children  = d._children;
                d._children = null;
            }

            this.update(d);
        }
        
    }.bind(this);
    
    this.update = function (source) {
          var nodes    = this.tree.nodes(this.root).reverse(),
              links    = this.tree.links(nodes),
              i        = 0
              duration = this.config.duration;

          nodes.forEach(function(d) { d.y = d.depth * (this.config.width / 4); }.bind(this));

          var node = this.svg.selectAll("g.node")
                             .data(nodes, function(d) { return d.id || (d.id = ++i); });

          var nodeEnter = node.enter().append("g")
                                      .attr("class",  function(d){ return "node " + "node_" + d.type; })
                                      .attr("transform", function(d) { return "translate(" + source.y0 + "," + source.x0 + ")"; })
                                      .on("click", this.onClick);
        
          nodeEnter.append("circle")
                   .attr("r", 1e-6)
                   .attr("class", function(d) {
                        return d._children ? "children" : "";
                    });

          nodeEnter.append("text")
                   .attr("x", function(d) { return d.children || d._children ? -10 : 10; })
                   .attr("dy", ".35em")
                   .attr("text-anchor", function(d) { return d.children || d._children ? "end" : "start"; })
                   .text(function(d) { return d.name; })
                   .style("fill-opacity", 1e-6);

          var nodeUpdate = node.transition()
                               .duration(duration)
                               .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; });

          nodeUpdate.select("circle")
                    .attr("r", 4.5)
                    .attr("class", function(d) {
                        return d._children ? "children" : "";
                    });

          nodeUpdate.select("text")
              .style("fill-opacity", 1);

          var nodeExit = node.exit().transition()
                             .duration(duration)
                             .attr("transform", function(d) { return "translate(" + source.y + "," + source.x + ")"; })
                             .remove();

          nodeExit.select("circle")
                  .attr("r", 1e-6)
                  .attr("class", function(d) {
                        return d._children ? "children" : "";
                    });

          nodeExit.select("text")
                  .style("fill-opacity", 1e-6);

          var link = this.svg.selectAll("path.link")
                             .data(links, function(d) { return d.target.id; });

          link.enter().insert("path", "g")
                      .attr("class",  function(d){ console.log(d); return "link" + " link_" + d.target.type; })
                      .attr("d", function(d) {
                          var o = {x: source.x0, y: source.y0};
                          return this.diagonal({source: o, target: o});
                      }.bind(this));

          link.transition()
              .duration(duration)
              .attr("d", this.diagonal);

          link.exit().transition()
              .duration(duration)
              .attr("d", function(d) {
                  var o = {x: source.x, y: source.y};
                  return this.diagonal({source: o, target: o});
              }.bind(this))
              .remove();

          nodes.forEach(function(d) {
              d.x0 = d.x;
              d.y0 = d.y;
          });
        
        d3.select("svg")
        .call(d3.behavior.zoom()
              .scaleExtent([0.5, 2])
              .on("zoom", this.zoom));
    };
    
    this.render = function () {
        if (!(this.config.data instanceof Object)) {
            d3.json(this.config.data, function(error, json) {
                this.createTree(json);
            });
        }
        else {
            this.createTree(this.config.data);
        }        
    };
        
    this.initialize();
}

var tree = new CollapsibleTree({
    width          : 600,
    height         : 700,
    fullwidth      : true,
    appendSelector : '.d3',
    data           : {
        "name": "TTT-12345 Math 5 op",
        "children": [
            {
                "type" : "ALTERNATIVITY",
                "children" : [
                    {
                        "type" : "REQUIRED",
                        "name" : "TTT-52343 Math advanced 1 10 op",
                        "children" : [
                            {
                                "type" : "RECOMMENDED",
                                "name" : "TTT-52343 Math basics 3 op"
                            }
                        ]
                    },
                    {
                        "type" : "REQUIRED",
                        "name" : "TTT-52342 Math advanced 2 5 op",
                        "children" : [
                            {
                                "type" : "RECOMMENDED",
                                "name" : "TTT-52343 Math follow-up 8 op"
                            }
                        ]
                    }
                ]
            },
            {
                "type" : "ALTERNATIVITY",
                "children" : [
                    {
                        "type" : "RECOMMENDED",
                        "name" : "TTT-52343 Math business 2 op"
                    },
                    {
                        "type" : "RECOMMENDED",
                        "name" : "TTT-52343 Math is fun 1 op",
                        "children": [
                            {
                                "type" : "ALTERNATIVITY",
                                "children" : [
                                    {
                                        "type" : "REQUIRED",
                                        "name" : "TTT-52343 Math advanced 1 10 op",
                                        "children" : [
                                            {
                                                "type" : "RECOMMENDED",
                                                "name" : "TTT-52343 Math basics 3 op"
                                            }
                                        ]
                                    },
                                    {
                                        "type" : "REQUIRED",
                                        "name" : "TTT-52342 Math advanced 2 5 op",
                                        "children" : [
                                            {
                                                "type" : "RECOMMENDED",
                                                "name" : "TTT-52343 Math follow-up 8 op"
                                            }
                                        ]
                                    }
                                ]
                            },
                            {
                                "type" : "ALTERNATIVITY",
                                "children" : [
                                    {
                                        "type" : "RECOMMENDED",
                                        "name" : "TTT-52343 Math business 2 op"
                                    },
                                    {
                                        "type" : "RECOMMENDED",
                                        "name" : "TTT-52343 Math is fun 1 op"
                                    }
                                ]
                            },
                            {
                                "type" : "RECOMMENDED",
                                "name" : "TTT-52343 Math pro 25 op"
                            }
                        ]
                    }
                ]
            },
            {
                "type" : "RECOMMENDED",
                "name" : "TTT-52343 Math pro 25 op"
            }
        ]
    }
});
tree.render();  
