# -*- coding: utf-8 -*-
"""
Created on Sun Nov 15 12:03:20 2020

@author: Aviva

Clean the candidates folder
"""

import pandas as pd
import numpy as np
import pyzipcode as pzip

def find_lat_long(df):
    zcdb = pzip.ZipCodeDatabase()
    df = df.reindex(columns=df.columns.tolist() + ['CAND_LAT', 'CAND_LONG'])
    
    skipped_indices = []
    for index, row in df.iterrows():
        try:
            zip_lookup = zcdb.find_zip(city=row['CAND_CITY'], state=row['CAND_STATE'])
            latitudes = [i.latitude for i in zip_lookup]
            longitudes = [i.longitude for i in zip_lookup]
            df.loc[index, 'CAND_LAT'] = np.average(latitudes)
            df.loc[index, 'CAND_LONG'] = np.average(longitudes)
        except:
            
            try:
                zip_lookup = zcdb[row['CAND_ZIP']]
                df.loc[index, 'CAND_LAT'] = zip_lookup.latitude
                df.at[index, 'CAND_LONG'] = zip_lookup.longitude
            
            except:
                # missing_zip = row['CAND_ZIP']
                # missing_city = row['CAND_CITY']
                # missing_state = row['CAND_STATE']
                # print(f'Cannot find {missing_zip}')
                # print(f'WANTED: {missing_city} {missing_state}')
                # print()
                skipped_indices = skipped_indices + [index]
                
    return df, skipped_indices

def clean_candidates(year):
    cand_header = ['CAND_ID', 'CAND_NAME', 
                   'CAND_PTY_AFFILIATION', 'CAND_ELECTION_YR', 'CAND_OFFICE_ST', 
                   'CAND_OFFICE', 'CAND_OFFICE_DISTRICT', 'CAND_ICI', 'CAND_STATUS', 
                   'CAND_PCC', 'CAND_ST1', 'CAND_ST2', 'CAND_CITY', 'CAND_ST', 'CAND_ZIP']
    
    cand_filepath = f'../data/FEC/candidate/cn{year}.txt'
    cand = pd.read_csv(cand_filepath, sep='|', header=0, names=cand_header)
    
    cand = cand.rename(columns={'CAND_ELECTION_YR': 'CAND_ELECTION_YEAR',
                                'CAND_OFFICE_ST': 'CAND_ELECTION_STATE',
                                'CAND_OFFICE': 'CAND_ELECTION_TYPE',
                                'CAND_ICI': 'CAND_INCUMBENT_STATUS',
                                'CAND_ST': 'CAND_STATE'})
    
    cand = cand.drop(columns=['CAND_OFFICE_DISTRICT', 'CAND_STATUS', 'CAND_ST1', 'CAND_ST2'])
    
    cand['CAND_ELECTION_YEAR'] = pd.to_numeric(cand['CAND_ELECTION_YEAR'], errors='coerce')
    cand.loc[(cand['CAND_ELECTION_YEAR'] < 100) & (cand['CAND_ELECTION_YEAR'] > 50), 'CAND_ELECTION_YEAR'] += 1900
    cand.loc[(cand['CAND_ELECTION_YEAR'] < 100) & (cand['CAND_ELECTION_YEAR'] < 50), 'CAND_ELECTION_YEAR'] += 2000
    cand['CAND_ELECTION_YEAR'] = cand['CAND_ELECTION_YEAR'].astype('Int64')
    
    cand['CAND_ZIP'] = pd.to_numeric(cand['CAND_ZIP'], errors='coerce')
    cand['CAND_ZIP'] = np.where(cand['CAND_ZIP']<501,
                                np.nan,
                                cand['CAND_ZIP'])
    cand.loc[(cand['CAND_ZIP'] > 99999), 'CAND_ZIP'] //= 10e3
    cand['CAND_ZIP'] = cand['CAND_ZIP'].astype('Int64')
    cand['CAND_ZIP'] = cand['CAND_ZIP'].apply(lambda x: str(x).zfill(5))
    cand = cand.replace('0<NA>', '', regex=True)
    
    cand, skipped_indices = find_lat_long(cand)
    
    save_filepath = f'../data/cleaned_tables/candidates/cn{year}.txt'
    cand.to_csv(save_filepath, sep='|', index=False, columns=['CAND_ID', 'CAND_NAME', 
                                                              'CAND_PTY_AFFILIATION', 
                                                              'CAND_ELECTION_YEAR',
                                                              'CAND_ELECTION_STATE', 
                                                              'CAND_ELECTION_TYPE', 
                                                              'CAND_INCUMBENT_STATUS',
                                                              'CAND_PCC', 
                                                              'CAND_LAT', 'CAND_LONG',
                                                              'CAND_ZIP', 'CAND_CITY', 
                                                              'CAND_STATE'])
    
    return len(skipped_indices)/np.shape(cand)[0]

# cand, skipped_indices = clean_candidates('00')

decades = ['0', '1', '8', '9']
years = [decade + str(i) for decade in decades for i in range(0,10,2)] + ['20']

missing_geo = []
for year in years:
    missing_geo = missing_geo + [clean_candidates(year)]



