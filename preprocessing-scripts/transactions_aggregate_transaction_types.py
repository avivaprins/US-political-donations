# -*- coding: utf-8 -*-
"""
Created on Sun Nov 15 14:22:02 2020

@author: Aviva

Aggregate different transaction types in individual/committee transaction files
and add in latitude and longitude info
"""
import numpy as np
import pandas as pd
import pyzipcode as pzip

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
    d['SRC_LAT_new'] = x['SRC_LAT'].mean()
    d['SRC_LONG_new'] = x['SRC_LONG'].mean()
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

def find_lat_long(df):
    zcdb = pzip.ZipCodeDatabase()
    
    skipped_indices = []
    for index, row in df.iterrows():
        try:
            zip_lookup = zcdb.find_zip(city=row['SRC_CITY'], state=row['SRC_STATE'])
            latitudes = [i.latitude for i in zip_lookup]
            longitudes = [i.longitude for i in zip_lookup]
            df.loc[index, 'SRC_LAT'] = np.average(latitudes)
            df.loc[index, 'SRC_LONG'] = np.average(longitudes)
        except:
            
            try:
                zip_lookup = zcdb[row['SRC_ZIP']]
                df.loc[index, 'SRC_LAT'] = zip_lookup.latitude
                df.at[index, 'SRC_LONG'] = zip_lookup.longitude
            
            except:
                # missing_zip = row['SRC_ZIP']
                # missing_city = row['SRC_CITY']
                # missing_state = row['SRC_STATE']
                # print(f'Cannot find {missing_zip}')
                # print(f'WANTED: {missing_city} {missing_state}')
                # print()
                skipped_indices = skipped_indices + [index]
    return df, skipped_indices

def aggregate_transaction_types(year):
    indiv_filepath = f'../data/FEC/transactions/agg_indiv_contrib/indiv{year}.txt'
    comm_filepath = f'../data/FEC/transactions/agg_cm_trans/cm_trans{year}.txt'
    
    # Update 11/22/2020: on city rather than zip for lowest level.
    # indiv_saved_columns = ['TARGET_ID', 'SRC_ZIP', 'SRC_CITY', 'SRC_STATE', 'YEAR']   
    indiv_saved_columns = ['TARGET_ID', 'SRC_CITY', 'SRC_STATE', 'YEAR']   
    comm_saved_columns = ['TARGET_ID', 'SRC_ID', 'YEAR']
    
    indiv_save_filepath = f'../data/cleaned_tables/transactions/agg_indiv_contrib/indiv{year}.txt'
    comm_save_filepath = f'../data/cleaned_tables/transactions/agg_cm_trans/cm_trans{year}.txt'
    
    filepaths = [indiv_filepath, comm_filepath]
    saved_columns = [indiv_saved_columns, comm_saved_columns]
    save_filepaths = [indiv_save_filepath, comm_save_filepath]
    
    for i in range(2):
        filepath = filepaths[i]
        column_list = saved_columns[i]
        save_filepath = save_filepaths[i]
        
        df = pd.read_csv(filepath, sep='|')
        
        if i == 0:
            
            if year == '80' or year == '00':
                pass # already computed
                
            else:
                print('Starting location lookup')
                df = df.reindex(columns=df.columns.tolist() + ['SRC_LAT', 'SRC_LONG'])
                df, skipped_indices = find_lat_long(df)
            
                print('Starting aggregation')
                new_df = df.groupby(column_list).apply(f)
        
                new_df = new_df.reset_index()
    
                new_df = new_df.rename(columns={'SRC_LAT_new': 'SRC_LAT',
                                                'SRC_LONG_new': 'SRC_LONG',
                                                'COUNT_new': 'COUNT',
                                                'SUM_new': 'SUM',
                                                'GRAND_MEAN': 'MEAN',
                                                'GRAND_STD': 'STD'})
            
                new_df.to_csv(save_filepath, sep='|', index=False, columns=['TARGET_ID',
                                                                            'SRC_LAT', 'SRC_LONG',
                                                                            'SRC_CITY', 'SRC_STATE', 
                                                                            'YEAR', 'COUNT', 
                                                                            'SUM', 'MEAN',
                                                                            'STD'])
        else:
            if year == '80':
                pass # already computed 
                
            else:
                print('Starting aggregation')
                new_df = df.groupby(column_list).apply(g)
        
                new_df = new_df.reset_index()
                
                new_df = new_df.rename(columns={'COUNT_new': 'COUNT',
                                                'SUM_new': 'SUM',
                                                'GRAND_MEAN': 'MEAN',
                                                'GRAND_STD': 'STD'})
            
                new_df.to_csv(save_filepath, sep='|', index=False, columns=['TARGET_ID',
                                                                            'SRC_ID',
                                                                            'YEAR', 'COUNT', 
                                                                            'SUM', 'MEAN',
                                                                            'STD'])
        print(f'Finished year {year}, i={i}')
        print()
   

     
decades = ['8', '9', '0', '1']
# decades = ['0', '1'] # finished 8 & 9
years = [decade + str(i) for decade in decades for i in range(0,10,2)] + ['20']
years = ['20']

for year in years:
    print(f'Starting year {year}')
    test = aggregate_transaction_types(year)