console.log("Loaded map.js script")

var svg = d3.select('svg');

d3.csv('../data/placeholder.csv').then(function(dataset) {
    console.log(dataset)
});
