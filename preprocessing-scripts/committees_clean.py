# -*- coding: utf-8 -*-
"""
Created on Sun Nov 15 12:35:58 2020

@author: Aviva

Clean the committees folder
"""
import pandas as pd
import numpy as np
import pyzipcode as pzip

def find_lat_long(df):
    zcdb = pzip.ZipCodeDatabase()
    df = df.reindex(columns=df.columns.tolist() + ['CMTE_LAT', 'CMTE_LONG'])
    
    skipped_indices = []
    for index, row in df.iterrows():
        try:
            zip_lookup = zcdb.find_zip(city=row['CMTE_CITY'], state=row['CMTE_STATE'])
            latitudes = [i.latitude for i in zip_lookup]
            longitudes = [i.longitude for i in zip_lookup]
            df.loc[index, 'CMTE_LAT'] = np.average(latitudes)
            df.loc[index, 'CMTE_LONG'] = np.average(longitudes)
        except:
            
            try:
                zip_lookup = zcdb[row['CMTE_ZIP']]
                df.loc[index, 'CMTE_LAT'] = zip_lookup.latitude
                df.at[index, 'CMTE_LONG'] = zip_lookup.longitude
            
            except:
                # missing_zip = row['CMTE_ZIP']
                # missing_city = row['CMTE_CITY']
                # missing_state = row['CMTE_STATE']
                # print(f'Cannot find {missing_zip}')
                # print(f'WANTED: {missing_city} {missing_state}')
                # print()
                skipped_indices = skipped_indices + [index]
                
    return df, skipped_indices

def clean_committees(year):
    comm_header = ['CMTE_ID', 'CMTE_NAME', 'TRES_NAME', 
                   'CMTE_ST1', 'CMTE_ST2', 'CMTE_CITY', 'CMTE_STATE', 'CMTE_ZIP', 
                   'CMTE_DESIGN', 'CMTE_TYPE', 'CMTE_PTY_AFFILIATION', 
                   'CMTE_FILING_FREQ', 'CONNECTED_ORG_TYPE', 'CONNECTED_ORG_NAME', 'CAND_ID']
    comm_filepath = f'../data/FEC/committee/cm{year}.txt'
    comm = pd.read_csv(comm_filepath, sep='|', header=0, names=comm_header)
    
    comm = comm.drop(columns=['TRES_NAME', 'CMTE_ST1', 'CMTE_ST2', 'CMTE_FILING_FREQ'])
    
    comm['CMTE_ZIP'] = pd.to_numeric(comm['CMTE_ZIP'], errors='coerce')
    comm['CMTE_ZIP'] = np.where(comm['CMTE_ZIP']<501,
                                np.nan,
                                comm['CMTE_ZIP'])
    comm.loc[(comm['CMTE_ZIP'] > 99999), 'CMTE_ZIP'] //= 10e3
    comm['CMTE_ZIP'] = comm['CMTE_ZIP'].astype('Int64')
    comm['CMTE_ZIP'] = comm['CMTE_ZIP'].apply(lambda x: str(x).zfill(5))
    comm = comm.replace('0<NA>', '', regex=True)
    
    comm, skipped_indices = find_lat_long(comm)
    
    save_filepath = f'../data/cleaned_tables/committees/cm{year}.txt'
    comm.to_csv(save_filepath, sep='|', index=False, columns=['CMTE_ID', 'CMTE_NAME', 
                                                             'CMTE_DESIGN', 'CMTE_TYPE',
                                                             'CMTE_PTY_AFFILIATION', 'CAND_ID',
                                                             'CONNECTED_ORG_TYPE', 'CONNECTED_ORG_NAME',
                                                             'CMTE_LAT', 'CMTE_LONG',
                                                             'CMTE_ZIP', 'CMTE_CITY', 'CMTE_STATE'])

    return len(skipped_indices)/np.shape(comm)[0]

decades = ['0', '1', '8', '9']
years = [decade + str(i) for decade in decades for i in range(0,10,2)] + ['20']

missing_geo = []
for year in years:
    missing_geo = missing_geo + [clean_committees(year)]

    # save_filepath = f'../data/cleaned_tables/candidates/cn{year}.txt'
    # cand.to_csv(save_filepath, sep='|', index=False, header=['CAND_ID', 'CAND_NAME', 
    #                                                          'CAND_PTY_AFFILIATION', 
    #                                                          'CAND_ELECTION_YEAR',
    #                                                          'CAND_ELECTION_STATE', 
    #                                                          'CAND_ELECTION_TYPE', 
    #                                                          'CAND_INCUMBENT_STATUS',
    #                                                          'CAND_PCC', 'CAND_ZIP', 
    #                                                          'CAND_CITY', 'CAND_STATE'])