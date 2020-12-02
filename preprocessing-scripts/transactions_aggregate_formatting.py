# -*- coding: utf-8 -*-
"""
Created on Sun Nov 15 11:36:19 2020

@author: Aviva

Minor formatting touch-ups on aggregated transactions.
"""
import numpy as np
import pandas as pd

year = '00'

def year_float_to_int(year):
    indiv_filepath = f'../data/FEC/transactions/agg_indiv_contrib/indiv{year}.txt'
    comm_filepath = f'../data/FEC/transactions/agg_cm_trans/cm_trans{year}.txt'
    
    for filepath in [indiv_filepath, comm_filepath]:
        df = pd.read_csv(filepath, sep='|')
        df['YEAR'] = pd.to_numeric(df['YEAR'], errors='coerce')
        
        
        df.loc[(df['YEAR'] < 100) & (df['YEAR'] > 50), 'YEAR'] += 1900
        df.loc[(df['YEAR'] < 100) & (df['YEAR'] < 50), 'YEAR'] += 2000
        df['YEAR'] = df['YEAR'].astype('Int64')
        
        # Save
        df.to_csv(filepath, sep='|', index=False)
        
def four_digit_zip(year):
    # indiv_filepath = f'../data/FEC/transactions/agg_indiv_contrib/indiv{year}.txt'
    indiv_filepath = f'../data/cleaned_tables/transactions/agg_indiv_contrib/indiv{year}.txt'
    
    df = pd.read_csv(indiv_filepath, sep='|')
    
    df['SRC_ZIP'] = pd.to_numeric(df['SRC_ZIP'], errors='coerce')
    df['SRC_ZIP'] = np.where(df['SRC_ZIP']<501,
                                np.nan,
                                df['SRC_ZIP'])
    df.loc[(df['SRC_ZIP'] > 99999), 'SRC_ZIP'] //= 10e3
    df['SRC_ZIP'] = df['SRC_ZIP'].astype('Int64')
    df['SRC_ZIP'] = df['SRC_ZIP'].apply(lambda x: str(x).zfill(5))
    df = df.replace('0<NA>', '', regex=True)
    
    # Save
    df.to_csv(indiv_filepath, sep='|', index=False)
    
def sig_figs(year):
    transaction_types = ['indiv', 'cm']
    
    # indiv_filepath = f'../data/FEC/transactions/agg_indiv_contrib/indiv{year}.txt'
    # comm_filepath = f'../data/FEC/transactions/agg_cm_trans/cm_trans{year}.txt'
    indiv_filepath = f'../data/cleaned_tables/transactions/agg_indiv_contrib/indiv{year}.txt'
    comm_filepath = f'../data/cleaned_tables/transactions/agg_cm_trans/cm_trans{year}.txt'
    
    for transaction_type in transaction_types:
        if transaction_type == 'indiv':
            filepath = indiv_filepath
        elif transaction_type == 'cm':
            filepath = comm_filepath
        
        df = pd.read_csv(filepath, sep='|')
        
        
        # df['YEAR'] = df['YEAR'].astype('Int64')
        df['COUNT'] = df['COUNT'].astype('Int64')
        df['SUM'] = df['SUM'].round(2)
        df['MEAN'] = df['MEAN'].round(2)
        df['STD'] = df['STD'].round(2)
        df = df.replace('0<NA>', '', regex=True)
        
        # Save
        df.to_csv(filepath, sep='|', index=False)
    
decades = ['0', '1', '8', '9']
years = [decade + str(i) for decade in decades for i in range(0,10,2)] + ['20']

for year in years:
    # year_float_to_int(year)
    # four_digit_zip(year)
    sig_figs(year)
    