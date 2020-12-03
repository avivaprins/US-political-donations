console.log("Loaded graph.js script")

var allNodes = new Map()
var allLinks = new Map()
var nodeGraph = new Map()
var linkGraph = new Map()
let committees = new Map()
let candidates = new Map()


let demParties = new Set(["DEM", "DNL", "DFL", "LBL", "NDP", "THD", "PRO", "PPD"])
let repParties = new Set(["REP", "CRV", "NJC"])

// console.log(demParties)
// console.log(repParties)

// var svg = d3.select('svg#Network');

var container = d3.select("#container");

var svg = container.append("svg")
                   .attr("width", 1100)
                   .attr("height", 1200);;


var width = +svg.attr('width');
var height = +svg.attr('height');
var current_id = '';

console.log(width,height)

var colorScale = d3.scaleOrdinal(d3.schemeTableau10);
var linkColorScale= d3.scaleSequentialSqrt(d3.interpolate("wheat", "brown"))
var demColorScale= d3.scaleSequentialSqrt(d3.interpolate("powderblue", "royalblue"))
var repColorScale= d3.scaleSequentialSqrt(d3.interpolate("lightpink", "crimson"))
var unkColorScale= d3.scaleSequentialSqrt(d3.interpolate("thistle", "blueviolet"))

var linkScale = d3.scaleLinear().range([1,3]);
var selectedNode;


Array.prototype.binarySearch = function (target, comparator) {
    var l = 0,
        h = this.length - 1,
        m, comparison;
    comparator = comparator || function (a, b) {
        return (a < b ? -1 : (a > b ? 1 : 0)); /* default comparison method if one was not provided */
    };
    while (l <= h) {
        m = (l + h) >>> 1; /* equivalent to Math.floor((l + h) / 2) but faster */
        comparison = comparator(this[m], target);
        if (comparison < 0) {
            l = m + 1;
        } else if (comparison > 0) {
            h = m - 1;
        } else {
            return m;
        }
    }
    return~l;
};


var linkG = svg.append('g')
    .attr('class', 'links-group');

var nodeG = svg.append('g')
    .attr('class', 'nodes-group');
var dummy1 = {
  "id": "Dummy1",
  "group": 2,
  "type": "dummy"
}
var dummy2 = {
  "id": "Dummy2",
  "group": 2,
}
var markers = svg.append('defs').append('marker')
        markers.attrs({'id':'arrowhead',
            'viewBox':'-0 -5 10 10',
            'refX':13,
            'refY':0,
            'orient':'auto',
            'markerWidth':15,
            'markerHeight':15,
            'markerUnits':"userSpaceOnUse",
            'xoverflow':'visible'})
        .append('svg:path')
        .attr('d', 'M 0,-5 L 8 ,0 L 0,5')
        .attr('fill', "#555")
        .attr('stroke-width', 5)
        .attr('opacity', 0.5)
        .style('stroke','none');


function includedNodes() {
  var relevantNodes = extractNodes(includedLinks());
  relevantNodes.sort(function(x,y){ return x == selectedNode ? -1 : y == selectedNode ? 1 : 0; });
  //console.log("R");
  relevantNodes.unshift(dummy1)
  //relevantNodes.unshift(dummy2)
  //console.log(relevantNodes);
  return relevantNodes;
}

function sortLinks (a, b) {
  if (a.value < b.value) {
    return -1;
  } else if (a.value > b.value) {
    return 1;
  } else {
    return 0;
  }
}

const maximumConnections = 30

function includedLinks() {
  //console.log(Array.from(linkGraph).some(link => link.source === undefined || link.target === undefined))
  var testLinks = immediateLinks()
  var testNodes = extractNodes(testLinks)
  var farLinks = []
  testNodes.forEach(node => {
    if (node != selectedNode) {
      var connectedLinks = Array.from(linkGraph.get(node.id))
      connectedLinks.sort(sortLinks)
      farLinks = farLinks.concat(connectedLinks.slice(Math.max(connectedLinks.length - maximumConnections, 0)))
    }
  });
  farLinks.forEach(link => {
      link.source.type = "far"
      link.target.type = "far"
      link.type = "far"
  })
  testLinks = farLinks.concat(testLinks)
  testLinks.forEach(link => {
    if (link.source === selectedNode || link.target === selectedNode) {
      link.source.type = "close"
      link.target.type = "close"
      link.type = "close"
    }
  })
  testLinks.unshift({
    "source": dummy1,
    "target": dummy1,
    "value": 1000,
    "type": "dummy"
  })
  return testLinks
}

function immediateLinks() {
  //console.log(selectedNode)
  var testLinks = Array.from(linkGraph.get(selectedNode.id))
  testLinks.forEach(link => {
    link.type = "close"
    link.source.type = "close"
    link.target.type = "close"
  });
  testLinks.sort(sortLinks)
  return testLinks.slice(Math.max(testLinks.length - maximumConnections, 0))
}

function extractNodes(links) {
  var exNodes = new Set();
  links.forEach(link => {
    exNodes.add(link.source)
    exNodes.add(link.target)
  })
  return Array.from(exNodes);
}

var simulation;

function toTitleCase(sentence) {
  console.log(sentence)
  return sentence.toLowerCase().split(" ").map((word) => {
      console.log(word.length)
      if (word.length == 0) {
        return ""
      }
      return word[0].toUpperCase() + word.substring(1);
    }).join(" ");
}

function normal_tooltip(d) {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  })

  var sent = 0.0;
  var received = 0.0;
  var testLinks = immediateLinks()
  testLinks.forEach((link, i) => {
    if (d === link.source) {
      sent += link.value
    } else if(d === link.target) {
      received += link.value
    }
  });

  if (committees.has(d.id)) {
    return toTitleCase(committees.get(d.id).CMTE_NAME) + "<br>Sent: " + formatter.format(sent) + "<br>Received: " + formatter.format(received);
  } else if (candidates.has(d.id)) {
    return toTitleCase(candidates.get(d.id).CAND_NAME) + "<br>Sent: " + formatter.format(sent) + "<br>Received: " + formatter.format(received);
  }
  return "ID: " + d.id  + "<br>sent: " + formatter.format(sent) + "<br>received: " + formatter.format(received);
}

function selected_tooltip(d) {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  })

  var sent = 0.0;
  var received = 0.0;
  var testLinks = immediateLinks()
  testLinks.forEach((link, i) => {
    if (d === link.source) {
      sent += link.value
    } else if(d === link.target) {
      received += link.value
    }
  });

  var total_sent = 0.0;
  var total_received = 0.0;
  var adjacentNodes = nodeGraph.get(d.id)
  adjacentNodes.forEach((node, i) => {
    links = linkGraph.get(node)
    links.forEach((link, i) => {
      if(d === link.target) {
        total_received += link.value
      }
    });
  });
  selected_links = linkGraph.get(d.id)
  selected_links.forEach((link, i) => {
    total_sent += link.value
  });


  let percent_contributed = parseFloat(total_sent) == 0 ? "100.00" : ((parseFloat(sent)/(parseFloat(total_sent) + 0.0001))*100).toFixed(2).toString()
  let percent_received = parseFloat(total_received) == 0 ? "100.00" : ((parseFloat(received)/(parseFloat(total_received) + 0.0001))*100).toFixed(2).toString()

  if (committees.has(d.id)) {
    return toTitleCase(committees.get(d.id).CMTE_NAME) + "<br>Contributed: showing " + formatter.format(parseFloat(sent)) + " out of " + formatter.format(parseFloat(total_sent)) + " (" + percent_contributed + "%)" + "<br>Received: showing " + formatter.format(parseFloat(received)) + " out of " + formatter.format(parseFloat(total_received))  + " (" + percent_received + "%)";
  } else if (candidates.has(d.id)) {
    return toTitleCase(candidates.get(d.id).CAND_NAME) + "<br>Contributed: showing " + formatter.format(parseFloat(sent)) + " out of " + formatter.format(parseFloat(total_sent)) + " (" + percent_contributed + "%)" + "<br>Received: showing " + formatter.format(parseFloat(received)) + " out of " + formatter.format(parseFloat(total_received))  + " (" + percent_received + "%)";
  }
  return "ID: " + d.id  + "<br>Contributed: showing " + formatter.format(parseFloat(sent)) + " out of " + formatter.format(parseFloat(total_sent)) + " (" + ((parseFloat(sent)/(parseFloat(total_sent) + 0.0001))*100).toFixed(2).toString() + "%)" + "<br>Received: showing " + formatter.format(parseFloat(received)) + " out of " + formatter.format(parseFloat(total_received))  + " (" + ((parseFloat(received)/(parseFloat(total_received)+0.0001))*100).toFixed(2).toString() + "%)" ;
}
// Define the div for the tooltip
var node_tip = d3.tip()
      .attr("class", "d3-tip")
      .offset([-8, 0])
      .html(function(d) {
        if (d != selectedNode) {
          return normal_tooltip(d)
        } else {
          return selected_tooltip(d)
        }
      });
svg.call(node_tip);

// Define the div for the tooltip
var link_tip = d3.tip()
      .attr("class", "d3-tip")
      .offset([-8, 0])
      .html(function(d) {
        const formatter = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2
        })
        return formatter.format(d.value)});
svg.call(link_tip);


// var lowEnd = 1;
// var highEnd = 25;
// var arr = [];
// while(lowEnd <= highEnd){
//    arr.push(lowEnd++);
// }

function Update_year(years){
  console.log(years)
  start_year = parseInt(years[0])
  end_year = parseInt(years[1])
  console.log(start_year)
  console.log(end_year)
  //var temp = year.toString().slice(-2);
  //console.log(temp);

  var Candidate_Tags = [];
  var Committee_Tags = [];
  allNodes = new Map();
  allLinks = new Map();
  nodeGraph = new Map();
  linkGraph = new Map();
  committees = new Map();
  candidates = new Map();

  var all_years = [1980,1982,1984,1986,1988,1990,1992,1994,1996,1998,2000,2002,2004,2006,2008,2010,2012,2014,2016,2018,2020]
  all_years = all_years.slice(all_years.indexOf(start_year), all_years.indexOf(end_year)+1)
  all_years = all_years.map(year => year.toString().slice(-2))
  Promise.all(
    all_years.map(year => d3.dsv("|", './data/committees/cm' + year.toString() + '.txt'))
  ).then(all_data => d3.merge(all_data))
  .then(function(dataset) {
     console.log("committee")
    dataset.forEach((item, i) => {
      committees.set(item.CMTE_ID, item)
    });
  })

  Promise.all(
      all_years.map(year => d3.dsv("|", './data/candidates/cn' + year + '.txt'))
  ).then(all_data => d3.merge(all_data))
  .then(function(dataset) {
    console.log("candidate")
    dataset.forEach((item, i) => {
      candidates.set(item.CAND_ID, item)
    });
  })

  // console.log(width)
  // console.log(height)

  //TODO fix selected node at center
  Promise.all(
      all_years.map(year => d3.dsv("|", './data/transactions/agg_cm_trans/cm_trans' + year + '.txt'))
  ).then(all_data => d3.merge(all_data))
  .then(function(dataset) {
      //dataset = dataset.slice(0,10)
      //console.log(dataset)

      var k = 0
      for (i in dataset) {
        d = dataset[i]
        //console.log(d)
        if(i === "columns") {
          break;
        }
        if (d.TARGET_ID === undefined || d.SRC_ID === undefined || d.SUM === undefined || isNaN(parseFloat(d.SUM)) || parseFloat(d.SUM) <= 0) {
          continue;
        }
        node1 = allNodes.get(d.SRC_ID)
        if (node1 === undefined) {
          var group = 0;
          if (committees.has(d.SRC_ID)) {
            group = 1;
          } else if (candidates.has(d.SRC_ID)) {
            group = 2
          }
          node1 = {
            "id": d.SRC_ID,
            "group": group,
            "freq": 0,
          }
          allNodes.set(d.SRC_ID, node1)
          nodeGraph.set(d.SRC_ID, new Set())
          linkGraph.set(d.SRC_ID, new Set())
        }
        node1.freq+=1
        node2 = allNodes.get(d.TARGET_ID)
        if (node2 === undefined) {
          var group = 0;
          if (committees.has(d.TARGET_ID)) {
            group = 1;
          } else if (candidates.has(d.TARGET_ID)) {
            group = 2
          }
          node2 = {
            "id": d.TARGET_ID,
            "group": group,
            "freq": 0,
          }
          allNodes.set(d.TARGET_ID, node2)
          nodeGraph.set(d.TARGET_ID, new Set())
          linkGraph.set(d.TARGET_ID, new Set())
        }
        node2.freq+=1
        nodeGraph.get(d.SRC_ID).add(d.TARGET_ID)
        nodeGraph.get(d.TARGET_ID).add(d.SRC_ID)

        let value = parseFloat(d.SUM)
        var link = allLinks.get(d.SRC_ID + "-" + d.TARGET_ID)
        if (link === undefined) {
          link = {
              "source": node1,
              "target": node2,
              "value": value,
          }
          allLinks.set(d.SRC_ID + "-" + d.TARGET_ID, link)
        } else {
          link.value += value;
          continue;
        }

        linkGraph.get(d.TARGET_ID).add(link)
        linkGraph.get(d.SRC_ID).add(link)
      }


      Candidate_Tags = Array.from(allNodes.keys()).filter(i => candidates.has(i)).map(function(e, i) {
        var cand = candidates.get(e);
        return {'label':cand.CAND_NAME, 'value':e};
      });

      Committee_Tags = Array.from(allNodes.keys()).filter(i => committees.has(i)).map(function(e, i) {
        var comm = committees.get(e);
        return {'label':comm.CMTE_NAME, 'value':e};
      });

      $( function() {
        $( "#can_tags" ).autocomplete({
          minLength: 3,
          source: Candidate_Tags,
          select: function(event, ui) {
            selectCandidate(ui.item.value);
            $(this).val("");
            return false;
          },
        });
      });
      $( function() {
        $( "#com_tags" ).autocomplete({
          minLength: 3,
          source: Committee_Tags,
          select: function(event, ui) {
            selectCommittee(ui.item.value);
            $(this).val("");
            return false;
          },
        });
      });
      console.log("done loading")


      // For Testing
      if (allNodes.get(current_id)){
        selectedNode = allNodes.get(current_id)
       }
      else {
        console.log(allNodes.values().next().value)
        selectedNode = allNodes.values().next().value
        if(current_id){
          var div = document.getElementById('comment');
          div.innerHTML += '<div class="alert warning"><span class="closebtn">&times;</span><strong>Warning!</strong><br>No Entity with ID:'+current_id+'.</div>';
        }
        current_id = ''
      }

      selectedNode.fx = width / 2;
      selectedNode.fy = height / 2
      //selectedNode.group = 2

      simulation = d3.forceSimulation()
          .force('link', d3.forceLink().id(function(d) { return d.id; }))
          .force('charge', d3.forceManyBody().strength(function(d, i) {
            if (d === selectedNode) {
              return -50;
            } else if (d.type === "dummy") {
              return 0;
            } else if (d.type === "close") {
              return -1000;
            } else if (d.type === "far") {
              return -10;
            }
            return d === selectedNode ? -50 : -15;
          }))
          .force('center', d3.forceCenter(width / 2, height / 2))
          .force('collide', d3.forceCollide(25).radius(function(d, i) {
            if (d.type === "dummy") {
              return 0;
            }
            return 25;
          }))
          .force('radial', d3.forceRadial(60).strength(function(d) {
            if (d.type === "dummy") {
              return .10;
            }
            return 0.1;
          }))

      updateVisualization()
  })



var div = document.getElementById('comment');

div.innerHTML += '<div class="alert success"><span class="closebtn">&times;</span><strong>Success!</strong><br>Loaded Data from ' + years[0].toString() + ' to ' + years[1].toString() + '.</div>';
setTimeout(
    function() {
        div.innerHTML = ''
    },
    5000
);


var close = document.getElementsByClassName("closebtn");
var i;

for (i = 0; i < close.length; i++) {
  close[i].onclick = function(){
    var div = this.parentElement;
    div.style.opacity = "0";
    setTimeout(function(){ div.style.display = "none"; }, 600);
  }
}

}


function updateVisualization() {
    linkScale.domain(d3.extent(immediateLinks(), function(d){ return d.value;}));
    var extent = d3.extent(immediateLinks(), function(d){ return parseFloat(d.value);});
    console.log(extent)

    linkColorScale.domain(extent);
    demColorScale.domain(extent);
    repColorScale.domain(extent);
    unkColorScale.domain(extent);

    var links = linkG.selectAll('.link')
      .data(includedLinks(), function(d){
            return d.id;
        })

    var nodes = nodeG.selectAll('.node')
        .data(includedNodes(), function(d){
            return d;
        })

    var nodeEnter = nodes.enter()
    .append('circle')
    .attr('class', 'node')

    var linkEnter = links.enter()
      .append('line')
      .attr('class', 'link')

    links.merge(linkEnter)
    .attr('stroke-width', function(d) {
        if (d.type === "far") {
          return 3;
        } else {
          return 5;
        }
    })
    .style('stroke', function(d) {
      if (d.type === "far") {
        return "black"
      } else {
        var party;
        var nodeid;
        if (d.target === selectedNode) {
          nodeid = d.source.id
        } else {
          nodeid = d.target.id
        }
        if (committees.has(nodeid)) {
          party = committees.get(nodeid).CMTE_PTY_AFFILIATION
        } else if (candidates.has(nodeid)) {
          party = candidates.get(nodeid).CAND_PTY_AFFILIATION
        }
        if (demParties.has(party)) {
          return demColorScale(d.value)
        } else if (repParties.has(party)) {
          return repColorScale(d.value)
        } else {
          return unkColorScale(d.value);
        }
        return linkColorScale(d.value);
      }
    })
    .attr('opacity', function(link) {
      if (link.type === "dummy") {
        return 0;
      } else if (link.type === "close") {
        return 1.0;
      } else if (link.type === "far") {
        return 0.02;
      }
    });

    linkEnter.attr('marker-end','url(#arrowhead)')


    nodes.merge(nodeEnter)
    .attr('r', function(d) {
      if (d === selectedNode) {
        return 12;
      } else {
        return 6
      }
    })
    .style('fill', function(d) {
        if (committees.has(d.id)) {
          let party = committees.get(d.id).CMTE_PTY_AFFILIATION
          if (demParties.has(party)) {
            return "#0380fc"
          } else if (repParties.has(party)) {
            return "#fc0303"
          } else {
            return "#a103fc"
          }
        } else if (candidates.has(d.id)) {
          let party = candidates.get(d.id).CAND_PTY_AFFILIATION
          if (demParties.has(party)) {
            return "#80c0ff"
          } else if (repParties.has(party)) {
            return "#ff8080"
          } else {
            return "#d080ff"
          }
        }
        return "#80ffa8";
    })
    //.attr('fill', "url(#image)")
    .attr('opacity', function(node) {
      if (node.type === "dummy") {
        return 0;
      } else if (node.type === "close") {
        return 1.0;
      } else if (node.type === "far") {
        return 0.1;
      }
    })
    .attr('z-index', function(d) {
      if (d.type === "close") {
        return 100;
      } else {
        return 1;
      }
    })




    function tickSimulation() {
      console.log("tick")
      linkEnter
      .attr('x1', function(d) {return d.source.x;})
      .attr('y1', function(d) {return d.source.y;})
      .attr('x2', function(d) { return d.target.x;})
      .attr('y2', function(d) { return d.target.y;})
      .attr('id', function(d) { return d.source.id + d.target.id;})
      .attr('z-index', function(d) {
        if (d.type === "close") {
          return 100;
        } else {
          return 1;
        }
      });



      nodeEnter
      .attr('cx', function(d) { return d.x;})
      .attr('cy', function(d) { return d.y;})
      .attr('id', function(d) { return d.id });
        //console.log(selectedNode.x, selectedNode.y)
    }

    nodes.exit().remove();
    links.exit().remove();


    simulation
        .nodes(includedNodes().slice(1))
        .on('tick', tickSimulation);

    simulation
        .force('link')
        .links(includedLinks().slice(1));

    nodeEnter.on('mouseover', function(d) {
        var element = document.getElementById(d.id)
        if (d.type === "close") {
          node_tip.show(d, element)
        }
      })
      .on('mouseout', node_tip.hide);

    // Creates hover over text on edges (link_tip, which is currently set to transaction $)
    // linkEnter.on('mouseover', function(d) {
    //     var element = document.getElementById(d.source.id + d.target.id)
    //     if (d.source.id === selectedNode.id || d.target.id === selectedNode.id) {
    //       link_tip.show(d, element)
    //     }
    //   })
    //   .on('mouseout', link_tip.hide);

    nodeEnter.on('click', function(d) {
      selectNode(d)
    })


    //console.log(network)
}

function selectNode(d) {
  if (committees.has(d.id)) {
    var div = document.getElementById('viz_title');
    div.innerHTML = '<h4>'+committees.get(d.id).CMTE_NAME+'</h4>';
  } else if (candidates.has(d.id)) {
    var div = document.getElementById('viz_title');
    div.innerHTML = '<h4>'+candidates.get(d.id).CAND_NAME+'</h4>';
  }
  current_id = d.id
  simulation.stop()
  //console.log(simulation.nodes());
  delete selectedNode.fx
  delete selectedNode.fy
  selectedNode.vx = 1
  selectedNode.vy = 1
  selectedNode.index = d.index
  //selectedNode.group = 1
  selectedNode = d;
  //selectedNode.group = 2
  selectedNode.fx = width / 2
  selectedNode.fy = height / 2
  selectedNode.index = 0;
  updateVisualization()
  simulation.alpha(1).restart();
  node_tip.hide()
  link_tip.hide()
  //console.log(simulation.nodes());
  var div = document.getElementById('comment');
  div.innerHTML += '<div class="alert success"><span class="closebtn">&times;</span><strong>Success!</strong><br>Selected Node with ID:'+current_id+'.</div>';
  var close = document.getElementsByClassName("closebtn");
  var i;

  for (i = 0; i < close.length; i++) {
    close[i].onclick = function(){
      var div = this.parentElement;
      div.style.opacity = "0";
      setTimeout(function(){ div.style.display = "none"; }, 600);
    }
  }
}

function selectCandidate(id) {
  // var select = document.getElementById("candidate")
  // var element = select.options[select.selectedIndex]
  // var id = element.value
  console.log(id)
  var node = allNodes.get(id)
  selectNode(node)
}

function selectCommittee(id) {
  // var select = document.getElementById("committee")
  // var element = select.options[select.selectedIndex]
  // var id = element.value
  var node = allNodes.get(id)
  selectNode(node)
}


var mySlider = new rSlider({
  target: '#sampleSlider',
  values: [1980,1982,1984,1986,1988,1990,1992,1994,1996,1998,2000,2002,2004,2006,2008,2010,2012,2014,2016,2018,2020],
  range: true,
  tooltip: true,
  scale: true,
  labels: false,
  onChange: function (vals) {
      let years = vals.split(",")
      Update_year(years);
      },
  set: [2020],
});


// create a list of keys
var keys = [
  {"label":"Democratic Candidate","value":"#80c0ff"},
  {"label":"Republican Candidate","value":"#ff8080"},
  {"label":"Other/Independent Candidate","value":"#d080ff"},
  {"label":"Democratic Committee","value":"#0380fc"},
  {"label":"Republican Committee","value":"#fc0303"},
  {"label":"Other/Independent Committee","value":"#a103fc"},
  {"label":"Unknown","value":"#80ffa8"}
]

// Add one dot in the legend for each name.
var size = 20
svg.selectAll("mydots")
  .data(keys)
  .enter()
  .append("rect")
    .attr("x", 20)
    .attr("y", function(d,i){ return 20 + i*(size+5)}) // 100 is where the first dot appears. 25 is the distance between dots
    .attr("width", size/2)
    .attr("height", size/2)
    .style("fill", function(d){ return d.value});

// Add one dot in the legend for each name.
svg.selectAll("mylabels")
  .data(keys)
  .enter()
  .append("text")
    .attr("x", 20 + size/1.5)
    .attr("y", function(d,i){ return 20 + i*(size+5) + (size/2.5)}) // 100 is where the first dot appears. 25 is the distance between dots
    .text(function(d){ return d.label})
    .attr("text-anchor", "left")
    .style("font-weight","bold")
    .style("font-size", "10px");

$(document).ready(function () {
  var top = $('#comment').offset().top - parseFloat($('#comment').css('marginTop').replace(/auto/, 0));

  $(window).scroll(function (event) {
    // what the y position of the scroll is
    var y = $(this).scrollTop();

    // whether that's below the form
    if (y >= top) {
      // if so, ad the fixed class
      $('#comment').addClass('fixed');
    } else {
      // otherwise remove it
      $('#comment').removeClass('fixed');
    }
  });
});


// Get the modal
var modal = document.getElementById("myModal");

// Get the button that opens the modal
var btn = document.getElementById("myBtn");

// Get the <span> element that closes the modal
var span = document.getElementsByClassName("close")[0];

// When the user clicks the button, open the modal
btn.onclick = function() {
  modal.style.display = "block";
}

// When the user clicks on <span> (x), close the modal
span.onclick = function() {
  modal.style.display = "none";
}

// When the user clicks anywhere outside of the modal, close it
window.onclick = function(event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
}

modal.style.display = "block";
