console.log("Loaded graph.js script")

var allNodes = new Map()
var allLinks = new Map()
var nodeGraph = new Map()
var linkGraph = new Map()

let demParties = new Set(["DEM", "DNL", "DFL", "LBL", "NDP", "THD", "PRO", "PPD"])
let repParties = new Set(["REP", "CRV", "NJC"])
console.log(demParties)
console.log(repParties)
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

var svg = d3.select('svg');
var width = +svg.attr('width');
var height = +svg.attr('height');

var selector = d3.select('#candidate')
var selector_1 = d3.select('#committee')

var colorScale = d3.scaleOrdinal(d3.schemeTableau10);
var linkColorScale= d3.scaleSequentialSqrt(d3.interpolate("lightgrey", "black"))

var linkScale = d3.scaleLinear().range([1,3]);
var selectedNode;

let committees = new Map()
Promise.all([
    d3.dsv("|", '../data/committees/cm18.txt'),
    d3.dsv("|", '../data/committees/cm16.txt'),
    d3.dsv("|", '../data/committees/cm14.txt'),
    d3.dsv("|", '../data/committees/cm12.txt'),
    d3.dsv("|", '../data/committees/cm10.txt'),
    d3.dsv("|", '../data/committees/cm08.txt'),
    d3.dsv("|", '../data/committees/cm06.txt'),
    d3.dsv("|", '../data/committees/cm04.txt'),
    d3.dsv("|", '../data/committees/cm02.txt'),
    d3.dsv("|", '../data/committees/cm00.txt'),
    d3.dsv("|", '../data/committees/cm98.txt'),
    d3.dsv("|", '../data/committees/cm96.txt'),
    d3.dsv("|", '../data/committees/cm94.txt'),
    d3.dsv("|", '../data/committees/cm92.txt'),
    d3.dsv("|", '../data/committees/cm90.txt'),
    d3.dsv("|", '../data/committees/cm88.txt'),
    d3.dsv("|", '../data/committees/cm86.txt'),
    d3.dsv("|", '../data/committees/cm84.txt'),
    d3.dsv("|", '../data/committees/cm82.txt'),
    d3.dsv("|", '../data/committees/cm80.txt'),
]).then(all_data => d3.merge(all_data))
.then(function(dataset) {
  console.log("committee")
  // console.log(dataset)


  dataset.forEach((item, i) => {
    committees.set(item.CMTE_ID, item)
  });
  //console.log(nodeTree)
  console.log(committees)
})
let candidates = new Map()
Promise.all([
    d3.dsv("|", '../data/candidates/cn18.txt'),
    d3.dsv("|", '../data/candidates/cn16.txt'),
    d3.dsv("|", '../data/candidates/cn14.txt'),
    d3.dsv("|", '../data/candidates/cn12.txt'),
    d3.dsv("|", '../data/candidates/cn10.txt'),
    d3.dsv("|", '../data/candidates/cn08.txt'),
    d3.dsv("|", '../data/candidates/cn06.txt'),
    d3.dsv("|", '../data/candidates/cn04.txt'),
    d3.dsv("|", '../data/candidates/cn02.txt'),
    d3.dsv("|", '../data/candidates/cn00.txt'),
    d3.dsv("|", '../data/candidates/cn98.txt'),
    d3.dsv("|", '../data/candidates/cn96.txt'),
    d3.dsv("|", '../data/candidates/cn94.txt'),
    d3.dsv("|", '../data/candidates/cn92.txt'),
    d3.dsv("|", '../data/candidates/cn90.txt'),
    d3.dsv("|", '../data/candidates/cn88.txt'),
    d3.dsv("|", '../data/candidates/cn86.txt'),
    d3.dsv("|", '../data/candidates/cn84.txt'),
    d3.dsv("|", '../data/candidates/cn82.txt'),
    d3.dsv("|", '../data/candidates/cn80.txt'),
]).then(all_data => d3.merge(all_data))
.then(function(dataset) {
  console.log("candidate")
  //console.log(dataset)

  dataset.forEach((item, i) => {
    candidates.set(item.CAND_ID, item)
  });
  console.log(candidates)
})

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
console.log(width)
console.log(height)
var simulation;

function toTitleCase(sentence) {
  return sentence.toLowerCase().split(" ").map((word) => {
      return word[0].toUpperCase() + word.substring(1);
    }).join(" ");
}

// Define the div for the tooltip
var node_tip = d3.tip()
      .attr("class", "d3-tip")
      .offset([-8, 0])
      .html(function(d) {
        if (committees.has(d.id)) {
          return toTitleCase(committees.get(d.id).CMTE_NAME);
        } else if (candidates.has(d.id)) {
          return toTitleCase(candidates.get(d.id).CAND_NAME);
        }
        return "ID: " + d.id
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

//TODO fix selected node at center
Promise.all([
    d3.dsv("|", '../data/transactions/agg_cm_trans/cm_trans18.txt'),
    d3.dsv("|", '../data/transactions/agg_cm_trans/cm_trans16.txt'),
    d3.dsv("|", '../data/transactions/agg_cm_trans/cm_trans14.txt'),
    d3.dsv("|", '../data/transactions/agg_cm_trans/cm_trans12.txt'),
    d3.dsv("|", '../data/transactions/agg_cm_trans/cm_trans10.txt'),
    d3.dsv("|", '../data/transactions/agg_cm_trans/cm_trans08.txt'),
    d3.dsv("|", '../data/transactions/agg_cm_trans/cm_trans06.txt'),
    d3.dsv("|", '../data/transactions/agg_cm_trans/cm_trans04.txt'),
    d3.dsv("|", '../data/transactions/agg_cm_trans/cm_trans02.txt'),
    d3.dsv("|", '../data/transactions/agg_cm_trans/cm_trans00.txt'),
    d3.dsv("|", '../data/transactions/agg_cm_trans/cm_trans98.txt'),
    d3.dsv("|", '../data/transactions/agg_cm_trans/cm_trans96.txt'),
    d3.dsv("|", '../data/transactions/agg_cm_trans/cm_trans94.txt'),
    d3.dsv("|", '../data/transactions/agg_cm_trans/cm_trans92.txt'),
    d3.dsv("|", '../data/transactions/agg_cm_trans/cm_trans90.txt'),
    d3.dsv("|", '../data/transactions/agg_cm_trans/cm_trans88.txt'),
    d3.dsv("|", '../data/transactions/agg_cm_trans/cm_trans86.txt'),
    d3.dsv("|", '../data/transactions/agg_cm_trans/cm_trans84.txt'),
    d3.dsv("|", '../data/transactions/agg_cm_trans/cm_trans82.txt'),
    d3.dsv("|", '../data/transactions/agg_cm_trans/cm_trans80.txt'),
]).then(all_data => d3.merge(all_data))
.then(function(dataset) {
    //dataset = dataset.slice(0,10)
    //console.log(dataset)

    network = {"links": [], "nodes": []}
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
          "freq": 0
        }
        allNodes.set(d.SRC_ID, node1)
        network["nodes"].push(node1)
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
          "freq": 0
        }
        allNodes.set(d.TARGET_ID, node2)
        network["nodes"].push(node2)
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
      // function equalLinks(a, b) {
      //   return a.source === b.source && a.target === b.target;
      // }
      // if (network["links"].some(l => equalLinks(l, link))) {
      //   console.log("duplicate")
      // } else {
      //   console.log("no duplicate")
      // }
      network["links"].push(link)
      //console.log("1")
    }

    // Populate selectors
    var opts = selector.selectAll('option')
      .data(Array.from(allNodes.keys()).filter(i => candidates.has(i)))
      .enter()
      .append('option')
      .attr('value', function (d) {
        if (candidates.has(d)) {
          var cand = candidates.get(d)
          return cand.CAND_ID;
        } else if (committees.has(d)) {
          var comm = committees.get(d)
          return comm.CMTE_ID;
        } else {
          return d
        }
      })
      .text(function (d) {
        if (candidates.has(d)) {
          var cand = candidates.get(d)
          return cand.CAND_NAME;
        } else if (committees.has(d)) {
          var comm = committees.get(d)
          return comm.CMTE_NAME;
        } else {
          return d;
        }
      });

    var opts_1 = selector_1.selectAll('option')
      .data(Array.from(allNodes.keys()).filter(i => committees.has(i)))
      .enter()
      .append('option')
      .attr('value', function (d) {
        if (candidates.has(d)) {
          var cand = candidates.get(d)
          return cand.CAND_ID;
        } else if (committees.has(d)) {
          var comm = committees.get(d)
          return comm.CMTE_ID;
        } else {
          return d
        }
      })
      .text(function (d) {
        if (candidates.has(d)) {
          var cand = candidates.get(d)
          return cand.CAND_NAME;
        } else if (committees.has(d)) {
          var comm = committees.get(d)
          return comm.CMTE_NAME;
        } else {
          return d;
        }
      });
    console.log(document.getElementById("candidate").length)
    console.log(document.getElementById("committee").length)


    console.log("done loading")
    // console.log(network)
    // console.log(linkGraph)

    dataset = network

    // For Testing
    selectedNode = network.nodes[50];
    selectedNode.fx = width / 2;
    selectedNode.fy = height / 2
    //selectedNode.group = 2

    simulation = d3.forceSimulation()
        .force('link', d3.forceLink().id(function(d) { return d.id; }))
        .force('charge', d3.forceManyBody().strength(function(d, i) {
          if (d.type === "dummy") {
            return 0;
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

function updateVisualization() {
    linkScale.domain(d3.extent(immediateLinks(), function(d){ return d.value;}));
    var extent = d3.extent(immediateLinks(), function(d){ return parseFloat(d.value);});
    extent[0] = 0;
    console.log(extent)

    linkColorScale.domain(extent);

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
        return 0.05;
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

    linkEnter.on('mouseover', function(d) {
        var element = document.getElementById(d.source.id + d.target.id)
        if (d.source.id === selectedNode.id || d.target.id === selectedNode.id) {
          link_tip.show(d, element)
        }
      })
      .on('mouseout', link_tip.hide);

    nodeEnter.on('click', function(d) {
      selectNode(d)
    })


    //console.log(network)
}

function selectNode(d) {
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
}

function selectCandidate(d) {
  var select = document.getElementById("candidate")
  var element = select.options[select.selectedIndex]
  var id = element.value
  var node = allNodes.get(id)
  selectNode(node)
}

function selectCommittee(d) {
  var select = document.getElementById("committee")
  var element = select.options[select.selectedIndex]
  var id = element.value
  var node = allNodes.get(id)
  selectNode(node)
}
