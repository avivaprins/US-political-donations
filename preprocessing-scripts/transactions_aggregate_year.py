# -*- coding: utf-8 -*-
"""
Created on Fri Nov 27 09:32:39 2020

@author: Aviva Prins

Move years to their correct file; aggregate on two-year periods.
"""
import pandas as pd
import numpy as np

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
    
    if N == 1:
        return 0 # standard deviation for one sample is 0
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
    d['SRC_LAT_new'] = grand_mean(x['SRC_LAT'], x['COUNT'])
    d['SRC_LONG_new'] = grand_mean(x['SRC_LONG'], x['COUNT'])
    d['COUNT_new'] = x['COUNT'].sum()
    d['SUM_new'] = x['SUM'].sum()
    d['GRAND_MEAN'] = grand_mean(x['MEAN'], x['COUNT'])
    d['GRAND_STD'] = composite_SD(x['MEAN'], x['STD'], x['COUNT'])
    return pd.Series(d, index=['SRC_LAT_new', 'SRC_LONG_new', 'COUNT_new', 'SUM_new', 'GRAND_MEAN', 'GRAND_STD'])
    
def g(x):
    d = {}
    d['COUNT_new'] = x['COUNT'].sum()
    d['SUM_new'] = x['SUM'].sum()
    d['GRAND_MEAN'] = grand_mean(x['MEAN'], x['COUNT'])
    d['GRAND_STD'] = composite_SD(x['MEAN'], x['STD'], x['COUNT'])
    return pd.Series(d, index=['COUNT_new', 'SUM_new', 'GRAND_MEAN', 'GRAND_STD'])


decades = ['8', '9', '0', '1']
years = [decade + str(i) for decade in decades for i in range(0,10,2)]
years = ['20']

transaction_types = ['indiv', 'cm']

for transaction_type in transaction_types:
    for year_str in years:
        print(f'Starting year {year_str}')
        
        if transaction_type == 'indiv':
            saved_columns = ['TARGET_ID', 'SRC_LAT', 'SRC_LONG', 'SRC_CITY', 'SRC_STATE', 
                             'YEAR',
                             'COUNT', 'SUM', 'MEAN', 'STD']
            ungrouped_columns = ['TARGET_ID', 'SRC_CITY', 'SRC_STATE']
            
            filepath = f'../data/cleaned_tables/transactions/agg_indiv_contrib/indiv{year_str}.txt'
            save_filepath = f'../data/cleaned_tables/transactions_final/agg_indiv_contrib/indiv{year_str}.txt'
            
        elif transaction_type == 'cm':
            saved_columns = ['TARGET_ID', 'SRC_ID', 'YEAR', 
                             'SRC_CITY', 'SRC_STATE', 
                             'COUNT', 'SUM', 'MEAN', 'STD']
            ungrouped_columns = ['TARGET_ID', 'SRC_ID']

            filepath = f'../data/cleaned_tables/transactions/agg_cm_trans/cm_trans{year_str}.txt'
            save_filepath = f'../data/cleaned_tables/transactions_final/agg_cm_trans/cm_trans{year_str}.txt'
        
        # 1. load the year
        df = pd.read_csv(filepath, sep='|')
        
        # 2.
        year = int(year_str)
        year = year + 1900 if year > 70 else year + 2000
        print(f'Converted to int: {year}')
        
        year_other = year
        while (not df[df['YEAR']<year_other-1].empty) and (year_other-2>1979) and (year-year_other<5):
            # print(f'There are years before {year_other} here.')
            year_other = year_other-2
            
            #load year_other and append rows where df[df['YEAR'] == year_other]
            year_other_str = str(year_other%100).zfill(2)
           
            if transaction_type == 'indiv':
                other_filepath = f'../data/cleaned_tables/transactions/agg_indiv_contrib/indiv{year_other_str}.txt'
            elif transaction_type == 'cm':
                other_filepath = f'../data/cleaned_tables/transactions/agg_cm_trans/cm_trans{year_other_str}.txt'
            
            try:
                df2 = pd.read_csv(other_filepath, sep='|')
                rows_to_transfer = df[df['YEAR'].isin([year_other, year_other-1])]
                df2 = df2.append(rows_to_transfer, ignore_index=True)
                df2.to_csv(other_filepath, sep='|', index=False) # NOTE: need to run this code twice!
                df = df[~df['YEAR'].isin([year_other, year_other-1])] # remove from current dataframe
            except:
                pass
            
        year_other = year    
        while not (df[df['YEAR']>year_other].empty) and (year_other+2 <2019) and (year_other-year<5):
            # print(f'There are years after {year_other} here.')
            year_other = year_other + 2
            
            #load year_other and append rows where df[df['YEAR'] == year_other]
            year_other_str = str(year_other%100).zfill(2)
            if transaction_type == 'indiv':
                other_filepath = f'../data/cleaned_tables/transactions/agg_indiv_contrib/indiv{year_other_str}.txt'
            elif transaction_type == 'cm':
                other_filepath = f'../data/cleaned_tables/transactions/agg_cm_trans/cm_trans{year_other_str}.txt'
            
            try:
                df2 = pd.read_csv(other_filepath, sep='|')
                rows_to_transfer = df[df['YEAR'].isin([year_other, year_other-1])]
                df2 = df2.append(rows_to_transfer, ignore_index=True)
                df2.to_csv(other_filepath, sep='|', index=False) # NOTE: need to run this code twice!
                df = df[~df['YEAR'].isin([year_other, year_other-1])] # remove from current dataframe
            except:
                pass
    
        df.to_csv(filepath, sep='|', index=False)
        
        # aggregate on year
        # should really be in its own func
        if transaction_type == 'indiv':
            print('Starting aggregation (indiv)')
            new_df = df.groupby(ungrouped_columns).apply(f)
            new_df = new_df.reset_index()
            new_df = new_df.rename(columns={'SRC_LAT_new': 'SRC_LAT',
                                            'SRC_LONG_new': 'SRC_LONG',
                                            'COUNT_new': 'COUNT',
                                            'SUM_new': 'SUM',
                                            'GRAND_MEAN': 'MEAN',
                                            'GRAND_STD': 'STD'})
            new_df['SRC_LAT'] = new_df['SRC_LAT'].round(6)
            new_df['SRC_LONG'] = new_df['SRC_LONG'].round(6)
            # print()
            
        elif transaction_type == 'cm':
            print('Starting aggregation (comm)')
            new_df = df.groupby(ungrouped_columns).apply(g)
            new_df = new_df.reset_index()
            new_df = new_df.rename(columns={'COUNT_new': 'COUNT',
                                            'SUM_new': 'SUM',
                                            'GRAND_MEAN': 'MEAN',
                                            'GRAND_STD': 'STD'})
            # print()
            
        
        # while we're here, we might as well do the cleaning up:
        new_df['COUNT'] = new_df['COUNT'].astype('Int64')
        new_df['SUM'] = new_df['SUM'].round(2)
        new_df['MEAN'] = new_df['MEAN'].round(2)
        new_df['STD'] = new_df['STD'].round(2)
        df = df.replace('0<NA>', '', regex=True)
        new_df = new_df.fillna('')
        
        # save
        new_df.to_csv(save_filepath, sep='|', index=True, index_label='INDEX')
        
        print(f'Done with year {year}')
        print()
        