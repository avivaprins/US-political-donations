# -*- coding: utf-8 -*-
"""
Created on Mon Nov  9 15:53:43 2020

@author: Aviva Prins

Individual transactions for 2020 are saved in multiple parts due to file size.
However, after aggregation it is possible to reduce them to one file.
"""
import numpy as np
import pandas as pd

year = '20'

# # # load data
indiv_header = pd.read_csv(f'../data/FEC/transactions/indiv_contrib/indiv_header_file.csv')
header = ['TARGET_ID', 'SRC_ZIP', 'SRC_CITY', 'SRC_STATE', 'TRANSACTION_TYPE',
          'YEAR', 'COUNT', 'SUM', 'MEAN', 'STD']

aggregated_df = pd.DataFrame(columns=header)

# 1. load all the files
for i in range(0,41):
    indiv_agg_filepath = f'../data/FEC/transactions/agg_indiv_contrib/indiv{year}_part{i}.txt'
    df = pd.read_csv(indiv_agg_filepath, sep='|',header=0,names=header)
    
    aggregated_df = aggregated_df.append(df)

# 2. aggregate - count, sum can be added, mean and std are tricky:
# mean: sum count*mean/mean
# std: 
    
def grand_mean(mean, count):
    numerator = np.sum(np.multiply(mean,count))
    return numerator/np.sum(count)

def composite_SD(means, SDs, ncounts):
    '''Calculate combined standard deviation via ANOVA (ANalysis Of VAriance)
       See:  http://www.burtonsys.com/climate/composite_standard_deviations.html
       Inputs are:
         means, the array of group means
         SDs, the array of group standard deviations
         ncounts, number of samples in each group (can be scalar
                  if all groups have same number of samples)
       Result is the overall standard deviation.
    '''
    G = len(means)  # number of groups
    N = np.sum(ncounts)  # total number of samples
    means = np.array(means)
    SDs = np.array(SDs)
    SDs[np.isnan(SDs)] = 0
    ncounts = np.array(ncounts)
    
    # if G != len(SDs):
    #     raise Exception('inconsistent list lengths')
    # if not iterable(ncounts):
    #     ncounts = [ncounts] * G  # convert scalar ncounts to array
    # elif G != len(ncounts):
    #     raise Exception('wrong ncounts list length')

    # calculate total number of samples, N, and grand mean, GM
    # N = np.sum(ncounts)  # total number of samples
    if N == 1:
        return 0 # standard deviation for one sample is 0
    # GM = 0.0
    # for i in range(G):
    #     GM += means[i] * ncounts[i]
    # GM /= N  # grand mean
    GM = grand_mean(means, ncounts)

    # calculate Error Sum of Squares
    ESS = np.sum(np.multiply(np.square(SDs),(ncounts-1)))

    # calculate Total Group Sum of Squares
    means_recentered = means-GM
    TGSS = np.sum(np.multiply(np.square(means_recentered),ncounts))
    # calculate standard deviation as square root of grand variance
    result = np.sqrt((ESS+TGSS)/(N-1))
    return result

def f(x):
    d = {}
    d['COUNT_new'] = x['COUNT'].sum()
    d['SUM_new'] = x['SUM'].sum()
    d['GRAND_MEAN'] = grand_mean(x['MEAN'], x['COUNT'])
    d['GRAND_STD'] = composite_SD(x['MEAN'], x['STD'], x['COUNT'])
    return pd.Series(d, index=['COUNT_new', 'SUM_new', 'GRAND_MEAN', 'GRAND_STD'])

indiv_saved_columns = ['TARGET_ID', 'SRC_ZIP', 'SRC_CITY', 'SRC_STATE', 'TRANSACTION_TYPE', 'YEAR']    
new_df = aggregated_df.groupby(indiv_saved_columns).apply(f)

new_df = new_df.reset_index()
new_df = new_df.rename(columns={'COUNT_new': 'COUNT',
                                'SUM_new': 'SUM',
                                'GRAND_MEAN': 'MEAN',
                                'GRAND_STD': 'STD'})

# save
save_filepath = f'../data/FEC/transactions/agg_indiv_contrib/indiv{year}.txt'
new_df.to_csv(save_filepath, sep='|', index=False, columns=['TARGET_ID', 
                                                            'SRC_ZIP',
                                                            'SRC_CITY',
                                                            'SRC_STATE',
                                                            'TRANSACTION_TYPE',
                                                            'YEAR',
                                                            'COUNT',
                                                            'SUM',
                                                            'MEAN',
                                                            'STD'])
