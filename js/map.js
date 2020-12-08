console.log("Loaded map.js script")

var svg = d3.select('svg');

var all_years = [1980,1982,1984,1986,1988,1990,1992,1994,1996,1998,2000,2002,2004,2006,2008,2010,2012,2014,2016,2018,2020]
all_years = all_years.map(year => year.toString().slice(-2))

var all_transactions = all_years.map(year => d3.dsv("|", './data/transactions/agg_cm_trans/cm_trans' + year + '.txt'));
console.log(all_transactions.length);

