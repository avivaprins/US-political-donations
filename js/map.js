console.log("Loaded map.js script")

var svg = d3.select('svg');

var all_years = [1980,1982,1984,1986,1988,1990,1992,1994,1996,1998,2000,2002,2004,2006,2008,2010,2012,2014,2016,2018,2020]
var selected_years
var all_transactions = [];
all_transactions.fill(undefined, 0, 21)
var doneLoading = false;

Promise.all(
  all_years.map(year => d3.dsv("|", './data/committees/cm' + year.toString().slice(-2) + '.txt'))
).then(all_data => d3.merge(all_data))
.then(function(dataset) {
   console.log("committee")
  dataset.forEach((item, i) => {
    committees.set(item.CMTE_ID, item)
  });
  Promise.all(
      all_years.map(year => d3.dsv("|", './data/candidates/cn' + year.toString().slice(-2) + '.txt'))
  ).then(all_data => d3.merge(all_data))
  .then(function(dataset) {
    console.log("candidate")
    dataset.forEach((item, i) => {
      candidates.set(item.CAND_ID, item)
    });
    doneLoading = true;
    Update_year([2018, 2020])
  })
})
