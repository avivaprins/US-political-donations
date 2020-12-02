# -*- coding: utf-8 -*-
"""
Created on Sun Nov  8 12:52:45 2020

@author: Aviva Prins

Aggregates transactions WITHOUT FILTERING on:
    indiv: target_ID, election year (parsed), 
        src_city, src_state, src_zip,
        transaction_type, 
        + transaction_sum, transaction_count, transaction_mean, transaction_std
    comm: src_ID, target_ID, election year (parsed),
        transaction_type,
        + transaction_sum, transaction_count, transaction_mean, transaction_std
"""

import numpy as np
import pandas as pd
import re
import pyzipcode as pzip

def aggregate_individual_dfs(year):
    # load data
    indiv_header = pd.read_csv(f'../data/FEC/transactions/indiv_contrib/indiv_header_file.csv')
    
    indiv_filepath = f'../data/FEC/transactions/indiv_contrib/indiv{year}.txt'
    indiv = pd.read_csv(indiv_filepath, sep='|', header=0, names=indiv_header.columns, encoding='latin')
    
    # create YEAR column
    indiv.astype({'TRANSACTION_PGI': 'str',
                  'TRANSACTION_DT': 'str',
                  'ZIP_CODE': 'str'}).dtypes
    indiv['YEAR'] = np.where((indiv['TRANSACTION_PGI'].str.len()<4) | (indiv['TRANSACTION_PGI'].isnull()), 
                              indiv['TRANSACTION_DT'],
                              indiv['TRANSACTION_PGI'])
    indiv['YEAR'] = indiv['YEAR'].astype('str').apply(lambda x: x[-4:])
    indiv['YEAR'] = pd.to_numeric(indiv['YEAR'], errors='coerce')
    indiv.loc[(indiv['YEAR'] < 100) & (indiv['YEAR'] > 50), 'YEAR'] += 1900
    indiv.loc[(indiv['YEAR'] < 100) & (indiv['YEAR'] < 50), 'YEAR'] += 2000
    indiv['YEAR'] = indiv['YEAR'].astype('Int64')
    
    # clean up column names of saved data
    indiv = indiv.rename(columns={'CMTE_ID': 'TARGET_ID',
                                  'CITY': 'SRC_CITY',
                                  'STATE': 'SRC_STATE',
                                  'ZIP_CODE': 'SRC_ZIP',
                                  'TRANSACTION_TP': 'TRANSACTION_TYPE',
                                  'TRANSACTION_AMT': 'TRANSACTION_AMOUNT'})
    
    return indiv
    
    # formatting: zip code to five digit #, city and state to all caps
    indiv['SRC_CITY'] = indiv['SRC_CITY'].astype('str').apply(lambda x: x.upper())
    indiv['SRC_STATE'] = indiv['SRC_STATE'].astype('str').apply(lambda x: x.upper())
    # indiv['SRC_ZIP'] = indiv['SRC_ZIP'].astype('str').apply(lambda x: x[:5])
    # indiv['SRC_ZIP'] = np.where((indiv['SRC_ZIP'].str.match(r'[0-9]{5}')), ## ZZ indicates out of US
    #                             indiv['SRC_ZIP'],
    #                             np.nan)
    indiv['SRC_ZIP'] = pd.to_numeric(indiv['SRC_ZIP'], errors='coerce')
    indiv['SRC_ZIP'] = np.where(indiv['SRC_ZIP']<501,
                                np.nan,
                                indiv['SRC_ZIP'])
    indiv.loc[(indiv['SRC_ZIP'] > 99999), 'SRC_ZIP'] //= 10e3
    indiv['SRC_ZIP'] = indiv['SRC_ZIP'].astype('Int64')
    indiv['SRC_ZIP'] = indiv['SRC_ZIP'].apply(lambda x: str(x).zfill(5))
    indiv = indiv.replace('0<NA>', '', regex=True)
    
    
    #LAT/LONG LOOKUP
    
    # aggregate
    # update 11/22/2020: no ZIP
    indiv_saved_columns = ['TARGET_ID', 'SRC_CITY', 'SRC_STATE', 'YEAR']
    
    aggregated_indiv = indiv.groupby(indiv_saved_columns).agg({'TRANSACTION_AMOUNT':
                                                    ['count','sum', 'mean', 'std']})
    aggregated_indiv = aggregated_indiv.reset_index()
    aggregated_indiv = aggregated_indiv.rename(columns={'count': 'COUNT',
                                                        'sum': 'SUM',
                                                        'mean': 'MEAN',
                                                        'std': 'STD'})
    
    aggregated_indiv['COUNT'] = aggregated_indiv['COUNT'].astype('Int64')
    aggregated_indiv['SUM'] = aggregated_indiv['SUM'].round(2)
    aggregated_indiv['MEAN'] = aggregated_indiv['MEAN'].round(2)
    aggregated_indiv['STD'] = aggregated_indiv['STD'].round(2)
    aggregated_indiv = aggregated_indiv.replace('0<NA>', '', regex=True)
        
    # save
    save_filepath = f'../data/cleaned_tables/transactions/agg_indiv_contrib/indiv{year}.txt'
    aggregated_indiv.to_csv(save_filepath, sep='|', index=False, columns=['TARGET_ID', 
                                                                        'SRC_CITY',
                                                                        'SRC_STATE',
                                                                        'YEAR',
                                                                        'COUNT',
                                                                        'SUM',
                                                                        'MEAN',
                                                                        'STD'])
    return aggregated_indiv

def aggregate_committee_dfs(year):
    # load data
    comm_header = pd.read_csv(f'../data/FEC/transactions/cm_trans/cm_header_file.csv')
    
    comm_filepath = f'../data/FEC/transactions/cm_trans/cm_trans{year}.txt'
    comm = pd.read_csv(comm_filepath, sep='|', header=0, names=comm_header.columns, encoding='latin')
    
    # create YEAR column
    comm.astype({'TRANSACTION_PGI': 'str',
                  'TRANSACTION_DT': 'str'}).dtypes
    comm['YEAR'] = np.where((comm['TRANSACTION_PGI'].str.len()<4) | (comm['TRANSACTION_PGI'].isnull()), 
                            comm['TRANSACTION_DT'],
                            comm['TRANSACTION_PGI'])
    comm['YEAR'] = comm['YEAR'].astype('str').apply(lambda x: x[-4:])
    comm['YEAR'] = pd.to_numeric(comm['YEAR'], errors='coerce')  
    comm.loc[(comm['YEAR'] < 100) & (comm['YEAR'] > 50), 'YEAR'] += 1900
    comm.loc[(comm['YEAR'] < 100) & (comm['YEAR'] < 50), 'YEAR'] += 2000
    comm['YEAR'] = comm['YEAR'].astype('Int64')
    
    # clean up column names of saved data
    comm = comm.rename(columns={'CMTE_ID': 'TARGET_ID',
                                'OTHER_ID': 'SRC_ID',
                                'TRANSACTION_TP': 'TRANSACTION_TYPE',
                                'TRANSACTION_AMT': 'TRANSACTION_AMOUNT'})
    
    # aggregate
    comm_saved_columns = ['TARGET_ID', 'SRC_ID', 'YEAR']
    
    aggregated_comm = comm.groupby(comm_saved_columns).agg({'TRANSACTION_AMOUNT':
                                                    ['count','sum', 'mean', 'std']})
    aggregated_comm = aggregated_comm.reset_index()
    aggregated_comm = aggregated_comm.rename(columns={'count': 'COUNT',
                                                        'sum': 'SUM',
                                                        'mean': 'MEAN',
                                                        'std': 'STD'})
    
    aggregated_comm['COUNT'] = aggregated_comm['COUNT'].astype('Int64')
    aggregated_comm['SUM'] = aggregated_comm['SUM'].round(2)
    aggregated_comm['MEAN'] = aggregated_comm['MEAN'].round(2)
    aggregated_comm['STD'] = aggregated_comm['STD'].round(2)
    aggregated_comm = aggregated_comm.replace('0<NA>', '', regex=True)
    
    # save
    save_filepath = f'../data/cleaned_tables/transactions/agg_cm_trans/cm_trans{year}.txt'
    aggregated_comm.to_csv(save_filepath, sep='|', index=False, columns=['TARGET_ID', 
                                                                        'SRC_ID',
                                                                        'YEAR',
                                                                        'COUNT',
                                                                        'SUM',
                                                                        'MEAN',
                                                                        'STD'])
    return aggregated_comm
  
decades = ['0', '1', '8', '9']
years = [decade + str(i) for decade in decades for i in range(0,10,2)] + ['20']

# for year in years:
#     test = aggregate_committee_dfs(year)

year = '00'
test = aggregate_individual_dfs(year)
    
zcdb = pzip.ZipCodeDatabase()
test = test.reindex(columns=test.columns.tolist() + ['SRC_LAT', 'SRC_LONG'])

skipped_indices = []
for index, row in test.iterrows():
    try:
        zip_lookup = zcdb.find_zip(city=row['SRC_CITY'], state=row['SRC_STATE'])
        latitudes = [i.latitude for i in zip_lookup]
        longitudes = [i.longitude for i in zip_lookup]
        test.loc[index, 'SRC_LAT'] = np.average(latitudes)
        test.loc[index, 'SRC_LONG'] = np.average(longitude)
    except:
        
        try:
            zip_lookup = zcdb[row['SRC_ZIP']]
            test.loc[index, 'SRC_LAT'] = zip_lookup.latitude
            test.at[index, 'SRC_LONG'] = zip_lookup.longitude
        
        except:
            # missing_zip = row['SRC_ZIP']
            # missing_city = row['SRC_CITY']
            # missing_state = row['SRC_STATE']
            # print(f'Cannot find {missing_zip}')
            # print(f'WANTED: {missing_city} {missing_state}')
            # print()
            skipped_indices = skipped_indices + [index]
    

# for index, row in test.iterrows():
#     try:
#         zip_lookup = zcdb[row['SRC_ZIP']]
#         test.loc[index, 'SRC_LAT'] = zip_lookup.latitude
#         test.at[index, 'SRC_LONG'] = zip_lookup.longitude
    
#     except:
        
#         try:
#             zip_list = zcdb.find_zip(city=row['SRC_CITY'], state=row['SRC_STATE'])
#             latitudes = [i.latitude for i in zip_list]
#             longitudes = [i.longitude for i in zip_list]
#             test.loc[index, 'SRC_LAT'] = zip_list[0].latitude
#             test.loc[index, 'SRC_LONG'] = zip_list[0].longitude
        
#         except: 
#             # missing_zip = row['SRC_ZIP']
#             # missing_city = row['SRC_CITY']
#             # missing_state = row['SRC_STATE']
#             # print(f'Cannot find {missing_zip}')
#             # print(f'WANTED: {missing_city} {missing_state}')
#             # print()
#             skipped_indices = skipped_indices + [index]
            
# test1 = [zcdb[zip_val] for zip_val in test['SRC_ZIP']]

# test1 = [zcdb.find_zip(city=city, state=state) for city, state in zip(test['SRC_CITY'], test['SRC_STATE'])]
# test2 = [(zipcode.longitude, zipcode.latitude)]


# zipcode = zcdb[]
# location = geolocator.geocode

# unless years needs to be split into parts, in which case run in parts:
######## 

# year = '20'

# # # load data
# indiv_header = pd.read_csv(f'../data/FEC/transactions/indiv_contrib/indiv_header_file.csv')

# indiv_filepath = f'../data/FEC/transactions/indiv_contrib/indiv{year}.txt'

# # for i in range(0,41):
# for i in range(7,41):
#     indiv = pd.read_csv(indiv_filepath, 
#                         sep='|', header=0, 
#                         encoding='latin', 
#                         names=indiv_header.columns, 
#                         error_bad_lines=False,
#                         skiprows = int(1e6*i),
#                         nrows=1e6)
#     # extra_row = pd.read_csv(indiv_filepath, sep='|', header=0, encoding='latin', skiprows=7962713, nrows=1)
    
    
#     # create YEAR column
#     indiv.astype({'TRANSACTION_PGI': 'str',
#                   'TRANSACTION_DT': 'str',
#                   'ZIP_CODE': 'str'}).dtypes
#     if indiv['TRANSACTION_PGI'].isnull().all():
#         indiv['YEAR'] = indiv['TRANSACTION_DT']
#     else:
#         indiv['YEAR'] = np.where(((indiv['TRANSACTION_PGI'].isnull()) | indiv['TRANSACTION_PGI'].str.len()<4), 
#                                   indiv['TRANSACTION_DT'],
#                                   indiv['TRANSACTION_PGI'])
#     indiv['YEAR'] = indiv['YEAR'].astype('str').apply(lambda x: x[-4:])
    
#     # clean up column names of saved data
#     indiv = indiv.rename(columns={'CMTE_ID': 'TARGET_ID',
#                                   'CITY': 'SRC_CITY',
#                                   'STATE': 'SRC_STATE',
#                                   'ZIP_CODE': 'SRC_ZIP',
#                                   'TRANSACTION_TP': 'TRANSACTION_TYPE',
#                                   'TRANSACTION_AMT': 'TRANSACTION_AMOUNT'})
    
#     # formatting: zip code to five digit #, city and state to all caps
#     indiv['SRC_CITY'] = indiv['SRC_CITY'].astype('str').apply(lambda x: x.upper())
#     indiv['SRC_STATE'] = indiv['SRC_STATE'].astype('str').apply(lambda x: x.upper())
#     indiv['SRC_ZIP'] = indiv['SRC_ZIP'].astype('str').apply(lambda x: x[:5])
#     indiv['SRC_ZIP'] = np.where((indiv['SRC_ZIP'].str.match(r'[0-9]{5}')),
#                                 indiv['SRC_ZIP'],
#                                 np.nan)
    
#     # aggregate
#     indiv_saved_columns = ['TARGET_ID', 'SRC_ZIP', 'SRC_CITY', 'SRC_STATE', 'TRANSACTION_TYPE', 'YEAR']
    
#     aggregated_indiv = indiv.groupby(indiv_saved_columns).agg({'TRANSACTION_AMOUNT':
#                                                     ['count','sum', 'mean', 'std']})
#     aggregated_indiv = aggregated_indiv.reset_index()
#     aggregated_indiv = aggregated_indiv.rename(columns={'count': 'COUNT',
#                                                         'sum': 'SUM',
#                                                         'mean': 'MEAN',
#                                                         'std': 'STD'})
    
#     # save
#     save_filepath = f'../data/FEC/transactions/agg_indiv_contrib/indiv{year}_part{i}.txt'
#     aggregated_indiv.to_csv(save_filepath, sep='|', index=False, header=['TARGET_ID', 
#                                                                         'SRC_ZIP',
#                                                                         'SRC_CITY',
#                                                                         'SRC_STATE',
#                                                                         'TRANSACTION_TYPE',
#                                                                         'YEAR',
#                                                                         'COUNT',
#                                                                         'SUM',
#                                                                         'MEAN',
#                                                                         'STD'])
    
    
#     indiv_head = indiv.head(200)

######################

# test = aggregate_individual_dfs('00')
  
# test2 = test.head(200)
# indiv_head = indiv.head(200)
# df.groupby('group').agg({'a':['sum', 'max'], 
#                          'b':'mean', 
#                          'c':'sum', 
#                          'd': max_min})



# comm_filepath = f'../data/FEC/transactions/cm_trans/cm_trans{year}.txt'
# comm_header = pd.read_csv(f'../data/FEC/transactions/cm_trans/cm_header_file.csv')
# comm_00 = pd.read_csv(comm_filepath, sep='|', header=0, names=comm_header.columns)

# transaction_types_in_comm = np.unique(comm_00['TRANSACTION_TP'])
# df_comm_with_EMPLOYER = comm_00[~comm_00['EMPLOYER'].isnull()]
# transaction_types_in_comm_EMPLOYER = np.unique(df_comm_with_EMPLOYER['TRANSACTION_TP'])
# transaction_types_not_in_comm_EMPLOYER = np.unique(comm_00[comm_00['EMPLOYER'].isnull()]['TRANSACTION_TP'])